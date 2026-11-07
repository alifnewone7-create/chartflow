"""Feature managers: Chart-to-Signal, Future Signals, Automatic Signal sessions.

Each feature owns its RTDB subtree; all of them use the shared generation
and evaluation engines.

RTDB layout
-----------
signals/c2s/{uid}/{entry}_{asset}            Chart-to-Signal history
signals/future/{uid}/{entry}_{asset}         Future Signals history
auto/settings/{uid}                          Automatic Signal settings
auto/sessions/{uid}/{sid}                    Session record + stats
auto/signals/{uid}/{sid}/{entry}_{asset}     Session signals (+ telegram delivery)
auto/active/{sid}                            uid of running/paused sessions (worker recovery)
auto/reports/{uid}/{sid}                     Partial report + delivery log
eval/pending/{qid}                           Shared evaluation queue
telegram/links/{uid}, telegram/by_tg/{tgId}, telegram/tokens/{sha256}
"""

from __future__ import annotations

import asyncio
import logging
import secrets
import time
from typing import Any

from . import chart_image, reports, rtdb
from .evaluation import FINAL, EvaluationWorker
from .generation import MIN_CANDLES, analyze, build_signal, signal_key
from .market_data import MarketData
from . import bot_style
from .telegram_bot import Telegram, TelegramError, result_caption, signal_caption
from .timeutil import M1, is_otc, minute_floor, next_entry

log = logging.getLogger("signal-engine.features")

MAX_FUTURE = 10
FUTURE_SPACING_S = 120
AUTO_TICK_SECOND = 35


class FeatureError(Exception):
    def __init__(self, status: int, detail: str) -> None:
        super().__init__(detail)
        self.status, self.detail = status, detail


async def _analyze_market(market: MarketData, symbol: str) -> dict[str, Any] | None:
    closed = market.closed_candles(symbol, 120)
    if len(closed) < MIN_CANDLES or int(closed[-1]["time"]) < minute_floor(time.time()) - M1 * 2:
        return None  # not enough or stale data — never generate on bad data
    return await asyncio.to_thread(analyze, market.history_for_analysis(symbol, 120))


# ============================================================== Chart-to-Signal
class ChartToSignal:
    def __init__(self, market: MarketData, worker: EvaluationWorker) -> None:
        self.market, self.worker = market, worker

    async def generate(self, uid: str, tier: str, symbol: str) -> dict[str, Any]:
        if tier == "free":
            raise FeatureError(403, "Your plan does not include Chart-to-Signal.")
        m = await self.market.market(symbol)
        if not m:
            raise FeatureError(409, "This market is closed or unavailable right now.")
        entry = next_entry()
        path = f"signals/c2s/{uid}/{signal_key(entry, symbol)}"
        existing = await rtdb.get(path)
        if isinstance(existing, dict):
            return existing
        a = await _analyze_market(self.market, symbol)
        if not a:
            raise FeatureError(409, "Not enough verified candle data for a confident signal yet. Try again shortly.")
        sig = build_signal(feature="c2s", uid=uid, market=m, analysis=a, entry_at=entry, mtg_steps=1)
        if not await rtdb.create_if_absent(path, sig):
            return await rtdb.get(path)
        await self.worker.register(path, sig)
        return sig


# ============================================================== Future Signals
class FutureSignals:
    def __init__(self, market: MarketData, worker: EvaluationWorker) -> None:
        self.market, self.worker = market, worker

    async def generate(self, uid: str, symbols: list[str], quantity: int) -> dict[str, Any]:
        active = {m["symbol"]: m for m in await self.market.active_markets()}
        chosen = [active[s] for s in dict.fromkeys(symbols) if s in active]
        if not chosen:
            raise FeatureError(409, "None of the selected markets are open right now.")
        analyses = []
        for m in chosen:
            a = await _analyze_market(self.market, m["symbol"])
            if a:
                analyses.append((m, a))
        if not analyses:
            raise FeatureError(409, "No selected market has enough verified data for a signal right now.")
        analyses.sort(key=lambda x: -x[1]["confidence"])
        batch = f"B{int(time.time())}{secrets.token_hex(2)}"
        base = next_entry(min_lead_s=60)
        created: list[dict[str, Any]] = []
        slot = 0
        tries = 0
        while len(created) < quantity and tries < quantity * 4:
            m, a = analyses[len(created) % len(analyses)]
            entry = base + slot * FUTURE_SPACING_S
            slot += 1
            tries += 1
            path = f"signals/future/{uid}/{signal_key(entry, m['symbol'])}"
            sig = build_signal(feature="future", uid=uid, market=m, analysis=a, entry_at=entry, mtg_steps=1, extra={"batch_id": batch})
            if await rtdb.create_if_absent(path, sig):
                await self.worker.register(path, sig)
                created.append(sig)
        return {"batch_id": batch, "requested": quantity, "signals": created, "skipped_markets": len(chosen) - len(analyses)}


# ============================================================== Automatic Signal
SETTINGS_DEFAULT = {
    "destination": "personal",
    "channel_id": None,
    "channel_title": None,
    "channel_verified": False,
    "min_payout": 80,
    "market_type": "both",
    "min_confidence": 60,
    "mtg_steps": 1,
    "show_chart": False,
    "result_notifications": True,
    "auto_report": False,
    "timezone": "Asia/Dhaka",
}


def _type_ok(symbol: str, mtype: str) -> bool:
    return mtype == "both" or (is_otc(symbol) if mtype == "otc" else not is_otc(symbol))


class AutoSessions:
    def __init__(self, market: MarketData, worker: EvaluationWorker, tg: Telegram) -> None:
        self.market, self.worker, self.tg = market, worker, tg
        self.active: dict[str, str] = {}
        self._stop = asyncio.Event()
        self._tasks: set[asyncio.Task] = set()
        worker.hooks["auto"] = self.on_final

    async def load(self) -> None:
        self.active = {k: v for k, v in (await rtdb.get("auto/active") or {}).items() if isinstance(v, str)}
        log.info("auto sessions recovered: %d", len(self.active))

    def stop(self) -> None:
        self._stop.set()

    def _spawn(self, coro: Any) -> None:
        t = asyncio.create_task(coro)
        self._tasks.add(t)
        t.add_done_callback(self._tasks.discard)

    # ------------------------------------------------------------ settings
    async def settings(self, uid: str) -> dict[str, Any]:
        return {**SETTINGS_DEFAULT, **(await rtdb.get(f"auto/settings/{uid}") or {})}

    async def save_settings(self, uid: str, body: dict[str, Any]) -> dict[str, Any]:
        cur = await self.settings(uid)
        dest = body.get("destination", cur["destination"])
        if dest not in ("personal", "channel", "both"):
            raise FeatureError(400, "Invalid destination.")
        mtype = body.get("market_type", cur.get("market_type", "both"))
        if mtype not in ("otc", "real", "both"):
            raise FeatureError(400, "Invalid market type.")
        new = {
            "destination": dest,
            "market_type": mtype,
            "min_payout": int(min(100, max(1, int(body.get("min_payout", cur["min_payout"]))))),
            "min_confidence": int(min(95, max(40, int(body.get("min_confidence", cur["min_confidence"]))))),
            "mtg_steps": int(min(2, max(0, int(body.get("mtg_steps", cur["mtg_steps"]))))),
            "show_chart": bool(body.get("show_chart", cur["show_chart"])),
            "result_notifications": bool(body.get("result_notifications", cur["result_notifications"])),
            "auto_report": bool(body.get("auto_report", cur["auto_report"])),
            "timezone": "Asia/Dhaka",
            "updated_at": int(time.time() * 1000),
        }
        if "channel_id" in body and str(body.get("channel_id") or "").strip() != str(cur.get("channel_id") or ""):
            new.update(channel_id=str(body.get("channel_id") or "").strip() or None, channel_verified=False, channel_title=None)
        await rtdb.update(f"auto/settings/{uid}", new)
        return await self.settings(uid)

    async def verify_channel(self, uid: str, chat_id: str) -> dict[str, Any]:
        chat_id = chat_id.strip()
        if not chat_id or len(chat_id) > 64:
            raise FeatureError(400, "Enter a channel chat ID (e.g. -1001234567890 or @yourchannel).")
        try:
            info = await self.tg.verify_channel(chat_id)
        except TelegramError as exc:
            await rtdb.update(f"auto/settings/{uid}", {"channel_id": chat_id, "channel_verified": False, "channel_error": str(exc)})
            raise FeatureError(400, str(exc)) from exc
        await rtdb.update(f"auto/settings/{uid}", {"channel_id": info["chat_id"], "channel_title": info["title"], "channel_verified": True, "channel_error": None})
        return info

    # ------------------------------------------------------------ lifecycle
    async def start_session(self, uid: str, body: dict[str, Any]) -> dict[str, Any]:
        for sid, owner in self.active.items():
            if owner == uid:
                raise FeatureError(409, "You already have an active session. Close it before starting a new one.")
        st = await self.settings(uid)
        link = await rtdb.get(f"telegram/links/{uid}")
        if not isinstance(link, dict):
            raise FeatureError(400, "Connect your Telegram account first.")
        if st["destination"] in ("channel", "both") and not st.get("channel_verified"):
            raise FeatureError(400, "Verify your Telegram channel before starting.")
        mode = body.get("mode")
        if mode not in ("manual", "payout"):
            raise FeatureError(400, "Choose a market selection mode.")
        markets: list[str] = []
        if mode == "manual":
            raw = body.get("markets") or []
            if not isinstance(raw, list) or not raw or len(raw) > 60:
                raise FeatureError(400, "Select at least one market.")
            active = {m["symbol"] for m in await self.market.active_markets()}
            markets = [s for s in dict.fromkeys(str(x) for x in raw) if s in active]
            if not markets:
                raise FeatureError(409, "None of the selected markets are open right now.")
        sid = f"S{int(time.time())}{secrets.token_hex(3)}"
        now_ms = int(time.time() * 1000)
        rec = {
            "session_id": sid,
            "status": "running",
            "mode": mode,
            "markets": markets or None,
            "min_payout": st["min_payout"],
            "market_type": st.get("market_type", "both") if mode == "payout" else "both",
            "min_confidence": st["min_confidence"],
            "mtg_steps": st["mtg_steps"],
            "destination": st["destination"],
            "channel_id": st.get("channel_id") if st["destination"] != "personal" else None,
            "result_notifications": st["result_notifications"],
            "auto_report": st["auto_report"],
            "created_at": now_ms,
            "updated_at": now_ms,
            "stats": {"total": 0, "pending": 0, "win": 0, "mtg_win": 0, "loss": 0, "accuracy": None},
        }
        await rtdb.update("", {f"auto/sessions/{uid}/{sid}": rec, f"auto/active/{sid}": uid})
        self.active[sid] = uid
        return rec

    async def control(self, uid: str, sid: str, action: str) -> dict[str, Any]:
        path = f"auto/sessions/{uid}/{sid}"
        rec = await rtdb.get(path)
        if not isinstance(rec, dict):
            raise FeatureError(404, "Session not found.")
        status = rec.get("status")
        now_ms = int(time.time() * 1000)
        if action == "pause" and status == "running":
            await rtdb.update(path, {"status": "paused", "pause_reason": "user", "updated_at": now_ms})
        elif action == "resume" and status == "paused":
            await rtdb.update(path, {"status": "running", "pause_reason": None, "updated_at": now_ms})
        elif action == "close" and status in ("running", "paused"):
            await rtdb.update("", {f"{path}/status": "closed", f"{path}/closed_at": now_ms, f"{path}/updated_at": now_ms, f"auto/active/{sid}": None})
            self.active.pop(sid, None)
            self._spawn(self._maybe_auto_report(uid, sid))
        else:
            raise FeatureError(409, f"Cannot {action} a {status} session.")
        return await rtdb.get(path)

    # ------------------------------------------------------------ worker
    async def run(self) -> None:
        while not self._stop.is_set():
            now_t = time.time()
            wait = (minute_floor(now_t) + AUTO_TICK_SECOND) - now_t
            if wait <= 0:
                wait += M1
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=wait)
                return
            except asyncio.TimeoutError:
                pass
            for sid, uid in list(self.active.items()):
                try:
                    await self._tick(uid, sid)
                except Exception as exc:  # noqa: BLE001
                    log.warning("auto tick %s failed: %s", sid, exc)

    def _has_open_trade(self, sid: str) -> bool:
        return any(i.get("session_id") == sid for i in self.worker.items.values())

    async def _tick(self, uid: str, sid: str) -> None:
        path = f"auto/sessions/{uid}/{sid}"
        rec = await rtdb.get(path)
        if not isinstance(rec, dict) or rec.get("status") == "closed":
            self.active.pop(sid, None)
            await rtdb.delete(f"auto/active/{sid}")
            return
        if rec.get("status") != "running":
            return
        if not rtdb.is_premium(await rtdb.user_tier(uid)):
            await rtdb.update(path, {"status": "paused", "pause_reason": "subscription_inactive", "updated_at": int(time.time() * 1000)})
            return
        if self._has_open_trade(sid):
            return  # one live trade (incl. MTG) at a time per session
        markets = await self.market.active_markets()
        if rec["mode"] == "manual":
            wanted = set(rec.get("markets") or [])
            pool = [m for m in markets if m["symbol"] in wanted]
        else:
            mtype = rec.get("market_type") or "both"
            pool = [m for m in markets if m["payout"] >= int(rec["min_payout"]) and _type_ok(m["symbol"], mtype)]
            symbols = [m["symbol"] for m in pool]
            if symbols != (rec.get("active_markets") or []):
                await rtdb.update(path, {"active_markets": symbols or None})
        best = None
        for m in pool:
            a = await _analyze_market(self.market, m["symbol"])
            if a and a["confidence"] * 100 >= int(rec["min_confidence"]) and (best is None or a["confidence"] > best[1]["confidence"]):
                best = (m, a)
        if not best:
            return
        m, a = best
        entry = next_entry(min_lead_s=10)
        spath = f"auto/signals/{uid}/{sid}/{signal_key(entry, m['symbol'])}"
        sig = build_signal(feature="auto", uid=uid, market=m, analysis=a, entry_at=entry, mtg_steps=int(rec["mtg_steps"]), extra={"session_id": sid})
        if not await rtdb.create_if_absent(spath, sig):
            return
        await self.worker.register(spath, sig)
        await self._bump(uid, sid, None, "PENDING")
        await rtdb.update(path, {"last_signal_at": int(time.time() * 1000)})
        self._spawn(self._deliver_signal(uid, rec, spath, sig))

    async def _bump(self, uid: str, sid: str, old: str | None, new: str) -> None:
        key = {"WIN": "win", "MTG WIN": "mtg_win", "LOSS": "loss"}

        def fn(cur: Any) -> Any:
            s = {"total": 0, "pending": 0, "win": 0, "mtg_win": 0, "loss": 0, **(cur or {})}
            if old is None:
                s["total"] += 1
                s["pending"] += 1
            else:
                s["pending"] = max(0, s["pending"] - 1)
                s[key[new]] += 1
            done = s["win"] + s["mtg_win"] + s["loss"]
            s["accuracy"] = round((s["win"] + s["mtg_win"]) / done * 100, 1) if done else None
            return s

        await rtdb.transaction(f"auto/sessions/{uid}/{sid}/stats", fn)

    def _destinations(self, rec: dict[str, Any], link: dict[str, Any] | None) -> dict[str, Any]:
        out: dict[str, Any] = {}
        if rec.get("destination") in ("personal", "both") and link:
            out["personal"] = link.get("chat_id")
        if rec.get("destination") in ("channel", "both") and rec.get("channel_id"):
            out["channel"] = rec["channel_id"]
        return out

    async def _claim(self, path: str) -> bool:
        return await rtdb.create_if_absent(path, {"state": "sending", "at": int(time.time() * 1000)})

    async def _deliver_signal(self, uid: str, rec: dict[str, Any], spath: str, sig: dict[str, Any]) -> None:
        link = await rtdb.get(f"telegram/links/{uid}")
        dests = self._destinations(rec, link if isinstance(link, dict) else None)
        png = None
        try:
            candles = self.market.closed_candles(sig["asset"], 130)
            png = await asyncio.to_thread(chart_image.render, sig["asset"], sig["asset_name"], candles, sig["direction"], sig["entry_at"])
        except Exception as exc:  # noqa: BLE001
            log.warning("chart render failed: %s", exc)
        caption = await signal_caption(sig)
        for name, chat in dests.items():
            dpath = f"{spath}/delivery/{name}"
            if not await self._claim(dpath):
                continue
            if time.time() >= sig["entry_at"]:
                await rtdb.update(dpath, {"state": "skipped_late", "chat_id": str(chat)})
                continue
            try:
                premium = name == "personal"
                mid = await (self.tg.send_photo(chat, png, caption, premium=premium) if png else self.tg.send_text(chat, caption, premium=premium))
                await rtdb.update(dpath, {"state": "sent", "chat_id": str(chat), "message_id": mid, "photo": bool(png)})
            except Exception as exc:  # noqa: BLE001
                await rtdb.update(dpath, {"state": "failed", "chat_id": str(chat), "error": str(exc)[:300]})

    async def on_final(self, item: dict[str, Any], sig: dict[str, Any]) -> None:
        uid, sid = item["uid"], item["session_id"]
        await self._bump(uid, sid, "PENDING", sig["status"])
        rec = await rtdb.get(f"auto/sessions/{uid}/{sid}") or {}
        if rec.get("result_notifications", True):
            caption = await result_caption(sig)
            png = None
            try:
                candles = self.market.closed_candles(sig["asset"], 140)
                png = await asyncio.to_thread(chart_image.render_result, sig["asset"], sig["asset_name"], candles, sig)
            except Exception as exc:  # noqa: BLE001
                log.warning("result chart render failed: %s", exc)
            for name, d in (sig.get("delivery") or {}).items():
                if not isinstance(d, dict) or d.get("state") != "sent":
                    continue
                rpath = f"{item['path']}/delivery/{name}/result"
                if not await self._claim(rpath):
                    continue
                try:
                    # Separate result message (never edits the signal message)
                    premium = name == "personal"
                    mid = await (self.tg.send_photo(d["chat_id"], png, caption, premium=premium) if png else self.tg.send_text(d["chat_id"], caption, premium=premium))
                    await rtdb.update(rpath, {"state": "sent", "message_id": mid, "photo": bool(png)})
                except Exception as exc:  # noqa: BLE001
                    await rtdb.update(rpath, {"state": "failed", "error": str(exc)[:300]})
        if rec.get("status") == "closed":
            await self._maybe_auto_report(uid, sid)

    # ------------------------------------------------------------ reports
    async def report(self, uid: str, sid: str) -> dict[str, Any]:
        rec = await rtdb.get(f"auto/sessions/{uid}/{sid}")
        if not isinstance(rec, dict):
            raise FeatureError(404, "Session not found.")
        sigs = list((await rtdb.get(f"auto/signals/{uid}/{sid}") or {}).values())
        built = reports.build([s for s in sigs if isinstance(s, dict)], (rec.get("closed_at") or time.time() * 1000) / 1000, await bot_style.template("partial"))
        log_ = await rtdb.get(f"auto/reports/{uid}/{sid}") or {}
        return {**built, "session_status": rec.get("status"), "sends": log_.get("sends") or {}}

    async def send_report(self, uid: str, sid: str, resend: bool) -> dict[str, Any]:
        rec = await rtdb.get(f"auto/sessions/{uid}/{sid}")
        if not isinstance(rec, dict):
            raise FeatureError(404, "Session not found.")
        if rec.get("status") != "closed":
            raise FeatureError(409, "Close the session before sending its partial report.")
        rpath = f"auto/reports/{uid}/{sid}"
        claimed = {"v": False}
        now_ms = int(time.time() * 1000)

        def fn(cur: Any) -> Any:
            cur = cur or {}
            last = int(cur.get("last_sent_at") or 0)
            if (last and not resend) or now_ms - last < 60_000:
                claimed["v"] = False
                return cur
            claimed["v"] = True
            return {**cur, "last_sent_at": now_ms}

        await rtdb.transaction(rpath, fn)
        if not claimed["v"]:
            raise FeatureError(409, "This report was already sent. Confirm a resend (allowed once per minute).")
        rep = await self.report(uid, sid)
        link = await rtdb.get(f"telegram/links/{uid}")
        results = {}
        for name, chat in self._destinations(rec, link if isinstance(link, dict) else None).items():
            try:
                mid = await self.tg.send_text(chat, rep["text"], premium=name == "personal")
                results[name] = {"state": "sent", "message_id": mid}
            except Exception as exc:  # noqa: BLE001
                results[name] = {"state": "failed", "error": str(exc)[:300]}
        await rtdb.update(rpath, {"text": rep["text"], "stats": rep["stats"], f"sends/{now_ms}": results})
        return {"sent_at": now_ms, "results": results}

    async def _maybe_auto_report(self, uid: str, sid: str) -> None:
        rec = await rtdb.get(f"auto/sessions/{uid}/{sid}") or {}
        if not rec.get("auto_report") or (rec.get("stats") or {}).get("pending"):
            return
        try:
            await self.send_report(uid, sid, resend=False)
        except FeatureError:
            pass
