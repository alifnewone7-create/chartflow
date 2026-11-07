"""Signal engine tests (no Quotex / Firebase needed): python -m pytest tests_signal_engine.py -q"""

from __future__ import annotations

import asyncio
import time
from typing import Any

import pytest

from signal_engine import rtdb, reports
from signal_engine.evaluation import EvaluationWorker, evaluate
from signal_engine.features import AutoSessions, ChartToSignal, FutureSignals
from signal_engine.market_data import MarketData, valid_candle
from signal_engine.telegram_bot import result_caption, signal_caption
from signal_engine.timeutil import mono, next_entry


# ---------------------------------------------------------------- fakes
class FakeDB:
    def __init__(self) -> None:
        self.root: dict[str, Any] = {}

    def _parts(self, path: str) -> list[str]:
        return [p for p in path.strip("/").split("/") if p]

    def get(self, path: str) -> Any:
        node: Any = self.root
        for p in self._parts(path):
            if not isinstance(node, dict) or p not in node:
                return None
            node = node[p]
        return node

    def set(self, path: str, value: Any) -> None:
        parts = self._parts(path)
        if not parts:
            self.root = value or {}
            return
        node = self.root
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        if value is None:
            node.pop(parts[-1], None)
        else:
            node[parts[-1]] = value


@pytest.fixture()
def db(monkeypatch: pytest.MonkeyPatch) -> FakeDB:
    fake = FakeDB()

    async def get(path: str) -> Any:
        import copy
        return copy.deepcopy(fake.get(path))

    async def set_(path: str, value: Any) -> None:
        fake.set(path, value)

    async def update(path: str, value: dict[str, Any]) -> None:
        for k, v in value.items():
            fake.set(f"{path}/{k}", v)

    async def delete(path: str) -> None:
        fake.set(path, None)

    async def transaction(path: str, fn: Any) -> Any:
        import copy
        new = fn(copy.deepcopy(fake.get(path)))
        fake.set(path, new)
        return new

    async def create_if_absent(path: str, value: Any) -> bool:
        if fake.get(path) is not None:
            return False
        fake.set(path, value)
        return True

    async def user_tier(uid: str) -> str:
        return fake.get(f"users/{uid}/tier") or "free"

    for name, fn in dict(get=get, set_=set_, update=update, delete=delete, transaction=transaction,
                         create_if_absent=create_if_absent, user_tier=user_tier).items():
        monkeypatch.setattr(rtdb, name, fn)
    return fake


class Store:
    def __init__(self) -> None:
        self.data: dict[tuple[str, int], list[dict[str, Any]]] = {}

    def get(self, key: tuple[str, int]) -> list[dict[str, Any]]:
        return list(self.data.get(key, []))


class Collector:
    def assets(self) -> list[dict[str, Any]]:
        return [{"symbol": "EURUSD_otc", "name": "EUR/USD (OTC)", "payout": 91, "is_open": True},
                {"symbol": "USDINR_otc", "name": "USD/INR (OTC)", "payout": 75, "is_open": True}]


class Ctx:
    def __init__(self) -> None:
        self.candle_store = Store()
        self.collector = Collector()
        self.session = None


def c(t: int, o: float, cl: float) -> dict[str, Any]:
    return {"time": t, "open": o, "close": cl, "high": max(o, cl) + 0.001, "low": min(o, cl) - 0.001}


def sig(direction: str, entry: int = 600, steps: int = 1) -> dict[str, Any]:
    return {"direction": direction, "entry_at": entry, "mtg_steps": steps}


def trend_history(end_minute: int, n: int = 80) -> list[dict[str, Any]]:
    out, p = [], 1.1
    for i in range(n):
        t = end_minute - (n - i) * 60
        step = 0.0004 if i % 5 else -0.0002
        out.append(c(t, p, p + step))
        p += step
    return out


# ---------------------------------------------------------------- pure evaluation rules
def test_call_win_and_put_win() -> None:
    assert evaluate(sig("CALL"), {600: c(600, 1.0, 1.1)})["status"] == "WIN"
    assert evaluate(sig("PUT"), {600: c(600, 1.1, 1.0)})["status"] == "WIN"


def test_mtg_win_and_final_loss() -> None:
    r = evaluate(sig("CALL"), {600: c(600, 1.1, 1.0), 660: c(660, 1.0, 1.2)})
    assert r["status"] == "MTG WIN" and r["first_result"] == "LOSS" and r["attempts"]["1"]["color"] == "green"
    r = evaluate(sig("PUT"), {600: c(600, 1.0, 1.1), 660: c(660, 1.0, 1.1)})
    assert r["status"] == "LOSS" and len(r["attempts"]) == 2


def test_no_mtg_means_first_loss_is_final() -> None:
    assert evaluate(sig("CALL", steps=0), {600: c(600, 1.1, 1.0)})["status"] == "LOSS"


def test_pending_cases_never_void() -> None:
    assert evaluate(sig("CALL"), {})["status"] == "PENDING"
    r = evaluate(sig("CALL"), {600: c(600, 1.1, 1.0)})
    assert r["status"] == "PENDING" and r["eval_state"] == "mtg_waiting"
    r = evaluate(sig("PUT"), {600: c(600, 1.0, 1.0)})
    assert r["status"] == "PENDING" and r["eval_state"] == "doji_hold"
    for case in ({}, {600: c(600, 1.0, 1.0)}, {600: c(600, 1.0, 1.1)}):
        assert evaluate(sig("CALL"), case)["status"] in ("PENDING", "WIN", "MTG WIN", "LOSS")


def test_identical_inputs_identical_results_across_features() -> None:
    candles = {600: c(600, 1.1, 1.0), 660: c(660, 1.0, 1.2)}
    results = {f: evaluate({**sig("CALL"), "feature": f}, candles) for f in ("c2s", "future", "auto")}
    assert len({r["status"] for r in results.values()}) == 1


def test_candle_validation() -> None:
    assert valid_candle(c(600, 1.0, 1.1), 600)
    assert not valid_candle(c(601, 1.0, 1.1))
    assert not valid_candle({"time": 600, "open": 1, "close": 1.2, "high": 1.1, "low": 0.9})
    assert not valid_candle({"time": 600, "open": 1})


def test_exact_m1_entry() -> None:
    e = next_entry(1000.5)
    assert e == 1020 and e % 60 == 0
    assert next_entry(1015, min_lead_s=10) == 1080


# ---------------------------------------------------------------- formatting
def test_captions_and_report(monkeypatch: pytest.MonkeyPatch) -> None:
    from signal_engine import bot_style

    async def no_cfg() -> dict:
        return {}

    monkeypatch.setattr(bot_style, "config", no_cfg)
    s = {"asset": "USDINR_otc", "asset_name": "USD/INR (OTC)", "direction": "PUT", "entry_at": 1757408340, "payout": 91, "mtg_steps": 1, "status": "WIN"}
    cap = run(signal_caption(s))
    assert mono("USD/INR (OTC)") in cap and "🟥 " + mono("PUT") in cap and mono("91%") in cap and mono("1 - Step") in cap
    res = run(result_caption(s))
    assert "✅ " + mono("WIN") in res and "ChartFlow Ai" not in res and mono("Candle") not in res
    sigs = [{**s, "status": st, "entry_at": 1757408340 + i * 240} for i, st in enumerate(["WIN", "MTG WIN", "LOSS", "PENDING"])]
    rep = reports.build(sigs, 1757408340)
    assert rep["stats"] == {"total": 4, "finalized": 3, "win": 1, "mtg_win": 1, "loss": 1, "pending": 1, "accuracy": 66.7}
    assert "👍¹" in rep["text"] and "❌" in rep["text"] and mono("USDINR-OTC") in rep["text"] and mono("67%") in rep["text"]


# ---------------------------------------------------------------- integration with fake RTDB
def run(coro: Any) -> Any:
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


def test_c2s_persist_dedupe_and_evaluate(db: FakeDB, monkeypatch: pytest.MonkeyPatch) -> None:
    ctx = Ctx()
    market = MarketData(ctx)
    worker = EvaluationWorker(market)
    c2s = ChartToSignal(market, worker)
    now_min = int(time.time() // 60) * 60
    ctx.candle_store.data[("EURUSD_otc", 60)] = trend_history(now_min)

    async def go() -> None:
        with pytest.raises(Exception):
            await c2s.generate("u1", "free", "EURUSD_otc")
        a = await c2s.generate("u1", "basic", "EURUSD_otc")
        b = await c2s.generate("u1", "basic", "EURUSD_otc")
        assert a["key"] == b["key"] and a["status"] == "PENDING"
        assert len(db.get("signals/c2s/u1")) == 1 and len(db.get("eval/pending")) == 1
        # make entry candle close in the signal's favour + a later candle
        e = a["entry_at"]
        win = c(e, 1.0, 1.1) if a["direction"] == "CALL" else c(e, 1.1, 1.0)
        ctx.candle_store.data[("EURUSD_otc", 60)] += [win, c(e + 60, 1.0, 1.0)]
        monkeypatch.setattr(time, "time", lambda: e + 125)
        # restart recovery: a brand-new worker loads the queue from RTDB
        w2 = EvaluationWorker(market)
        await w2.load()
        for qid, item in list(w2.items.items()):
            await w2._process(qid, item)
        rec = db.get(f"signals/c2s/u1/{a['key']}")
        assert rec["status"] == "WIN" and rec["attempts"]["0"]["outcome"] == "WIN"
        assert not db.get("eval/pending")
        # double evaluation is a no-op
        await w2._persist("x", {"path": f"signals/c2s/u1/{a['key']}", "feature": "c2s"}, {"status": "LOSS", "attempts": {}, "first_result": "LOSS", "eval_state": "final"}, "ok")
        assert db.get(f"signals/c2s/u1/{a['key']}")["status"] == "WIN"

    run(go())


def test_delayed_data_stays_pending(db: FakeDB, monkeypatch: pytest.MonkeyPatch) -> None:
    ctx = Ctx()
    market = MarketData(ctx)
    worker = EvaluationWorker(market)
    e = int(time.time() // 60) * 60 - 600
    path = "signals/future/u1/k"
    db.set(path, {"status": "PENDING", "direction": "CALL", "entry_at": e})

    async def go() -> None:
        await worker.register(path, {"feature": "future", "uid": "u1", "key": "k", "asset": "EURUSD_otc", "direction": "CALL", "entry_at": e, "mtg_steps": 1})
        qid = next(iter(worker.items))
        await worker._process(qid, worker.items[qid])
        assert db.get(path)["status"] == "PENDING" and db.get(path)["eval_state"] == "waiting_data"
        ctx.candle_store.data[("EURUSD_otc", 60)] = [c(e, 1.0, 1.0), c(e + 60, 1.0, 1.1)]
        await worker._process(qid, worker.items[qid])
        assert db.get(path)["status"] == "PENDING" and db.get(path)["eval_state"] == "doji_hold"

    run(go())


def test_future_signals_unique_exact_m1(db: FakeDB) -> None:
    ctx = Ctx()
    market = MarketData(ctx)
    fut = FutureSignals(market, EvaluationWorker(market))
    now_min = int(time.time() // 60) * 60
    ctx.candle_store.data[("EURUSD_otc", 60)] = trend_history(now_min)
    ctx.candle_store.data[("USDINR_otc", 60)] = trend_history(now_min)

    async def go() -> None:
        res = await fut.generate("u1", ["EURUSD_otc", "USDINR_otc", "CLOSED_otc"], 5)
        sigs = res["signals"]
        assert 1 <= len(sigs) <= 5
        for s in sigs:
            assert s["entry_at"] % 60 == 0 and s["expiry_at"] - s["entry_at"] == 60 and s["timeframe"] == "M1"
        assert len({(s["asset"], s["entry_at"]) for s in sigs}) == len(sigs)
        assert not db.get("signals/c2s")

    run(go())


def test_auto_session_flow(db: FakeDB) -> None:
    ctx = Ctx()
    market = MarketData(ctx)
    worker = EvaluationWorker(market)

    class TG:
        enabled, username, sent = True, "bot", []

        async def send_photo(self, chat: Any, png: bytes, cap: str, premium: bool = False) -> int:
            self.sent.append(("photo", chat, cap))
            return len(self.sent)

        async def send_text(self, chat: Any, text: str, reply_to: int | None = None, premium: bool = False) -> int:
            self.sent.append(("text", chat, text))
            return len(self.sent)

        async def edit_caption(self, chat: Any, mid: int, cap: str) -> None:
            self.sent.append(("edit", chat, cap))

    tg = TG()
    auto = AutoSessions(market, worker, tg)  # type: ignore[arg-type]
    now_min = int(time.time() // 60) * 60
    ctx.candle_store.data[("EURUSD_otc", 60)] = trend_history(now_min)
    db.set("users/u1/tier", "pro")

    async def go() -> None:
        with pytest.raises(Exception):
            await auto.start_session("u1", {"mode": "payout"})  # telegram not connected
        db.set("telegram/links/u1", {"telegram_id": 5, "chat_id": 5})
        await auto.save_settings("u1", {"min_payout": 80, "min_confidence": 40})
        rec = await auto.start_session("u1", {"mode": "payout"})
        sid = rec["session_id"]
        with pytest.raises(Exception):
            await auto.start_session("u1", {"mode": "payout"})  # one active session
        await auto._tick("u1", sid)
        sigs = db.get(f"auto/signals/u1/{sid}") or {}
        if not sigs:
            pytest.skip("strategies produced no direction for synthetic data")
        assert db.get(f"auto/sessions/u1/{sid}/active_markets") == ["EURUSD_otc"]  # 75% market filtered out
        await auto._tick("u1", sid)
        assert len(db.get(f"auto/signals/u1/{sid}")) == 1  # no new signal while one is open
        await asyncio.sleep(0.5)
        await auto.control("u1", sid, "close")
        assert db.get(f"auto/sessions/u1/{sid}/status") == "closed"
        s = next(iter(db.get(f"auto/signals/u1/{sid}").values()))
        assert s["status"] == "PENDING"
        qid = next(iter(worker.items))
        await worker._persist(qid, worker.items[qid], {"status": "MTG WIN", "attempts": {}, "first_result": "LOSS", "eval_state": "final"}, "ok")
        st = db.get(f"auto/sessions/u1/{sid}/stats")
        assert st["mtg_win"] == 1 and st["pending"] == 0 and st["accuracy"] == 100.0
        rep = await auto.send_report("u1", sid, resend=False)
        assert rep["results"]["personal"]["state"] == "sent"
        with pytest.raises(Exception):
            await auto.send_report("u1", sid, resend=False)  # duplicate prevented

    run(go())


def test_premium_emoji_and_templates() -> None:
    from signal_engine import bot_style

    assert bot_style.premium_html("hi <b>", {}) is None
    out = bot_style.premium_html("🔥 a<b> 💎", {"🔥": "5368324170671202286"})
    assert out == '<tg-emoji emoji-id="5368324170671202286">🔥</tg-emoji> a&lt;b&gt; 💎'
    assert bot_style.valid("signal", "{asset} {direction} {entry_time}")
    assert not bot_style.valid("signal", "{asset} {direction}")
    assert not bot_style.valid("result", "{asset} {direction} {entry_time} {result} {oops}")
    assert bot_style.render("a {pending}\nb {win}", {"pending": "", "win": "3"}, drop_empty=("pending",)) == "b 3"


def test_premium_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    from signal_engine import bot_style, telegram_bot

    calls: list[dict] = []

    async def emojis() -> dict:
        return {"🔥": "123"}

    async def fake_call(self: Any, method: str, data: dict | None = None, files: Any = None, timeout: float = 30, retries: int = 2) -> Any:
        calls.append(dict(data or {}))
        if data and data.get("parse_mode") == "HTML":
            raise telegram_bot.TelegramError("Bad Request: invalid custom emoji")
        return {"message_id": 7}

    monkeypatch.setattr(bot_style, "emoji_map", emojis)
    monkeypatch.setattr(telegram_bot.Telegram, "call", fake_call)
    tg = telegram_bot.Telegram()
    assert run(tg.send_text(1, "🔥 hi", premium=True)) == 7
    assert calls[0]["parse_mode"] == "HTML" and "parse_mode" not in calls[1] and calls[1]["text"] == "🔥 hi"
    calls.clear()
    run(tg.send_text(1, "🔥 hi"))
    assert len(calls) == 1 and "parse_mode" not in calls[0]


def test_start_status(db: FakeDB, monkeypatch: pytest.MonkeyPatch) -> None:
    from signal_engine import telegram_bot

    sent: list[dict] = []

    async def fake_call(self: Any, method: str, data: dict | None = None, files: Any = None, timeout: float = 30, retries: int = 2) -> Any:
        sent.append(dict(data or {}))
        return {"message_id": 1}

    monkeypatch.setattr(telegram_bot.Telegram, "call", fake_call)
    tg = telegram_bot.Telegram()
    run(tg._handle({"text": "/start", "chat": {"id": 5, "type": "private"}, "from": {"id": 5}}))
    assert sent[-1]["text"].startswith("Status : Not Connected\n\nOpen the connection link")
    db.set("telegram/by_tg/5", "u1")
    db.set("telegram/links/u1", {"telegram_id": 5})
    db.set("users/u1", {"email": "a@b.com"})
    run(tg._handle({"text": "/start", "chat": {"id": 5, "type": "private"}, "from": {"id": 5}}))
    assert sent[-1]["text"] == "Status : Connected\n\nYour Email : <tg-spoiler>a@b.com</tg-spoiler>" and sent[-1]["parse_mode"] == "HTML"


def test_bot_test_send(monkeypatch: pytest.MonkeyPatch) -> None:
    from signal_engine import bot_style, telegram_bot

    async def no_cfg() -> dict:
        return {}

    sent: list[dict] = []
    mode = {"fail": False}

    async def fake_call(self: Any, method: str, data: dict | None = None, files: Any = None, timeout: float = 30, retries: int = 2) -> Any:
        if mode["fail"]:
            raise telegram_bot.TelegramError("Forbidden: bot can't initiate conversation with a user")
        sent.append(dict(data or {}))
        return {"message_id": 1}

    monkeypatch.setattr(bot_style, "config", no_cfg)
    monkeypatch.setattr(telegram_bot.Telegram, "call", fake_call)
    tg = telegram_bot.Telegram()
    tg.username = "ChartFlowBot"
    assert run(tg.send_test(42))["sent"] == 3 and len(sent) == 3 and all(s["chat_id"] == 42 for s in sent)
    mode["fail"] = True
    with pytest.raises(telegram_bot.TelegramError, match="has not started the bot"):
        run(tg.send_test(42))


def test_market_type_filter() -> None:
    from signal_engine.features import _type_ok

    assert _type_ok("USDBRL_otc", "otc") and not _type_ok("EURUSD", "otc")
    assert _type_ok("EURUSD", "real") and not _type_ok("USDBRL_otc", "real")
    assert _type_ok("EURUSD", "both") and _type_ok("USDBRL_otc", "both")
