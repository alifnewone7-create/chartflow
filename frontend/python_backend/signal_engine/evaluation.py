"""Shared Signal Evaluation Engine — the ONLY place results are computed.

Rules (identical for every feature)
-----------------------------------
* M1 only; attempt 0 is the entry candle [entry_at, entry_at+60).
* CALL wins on a green candle (close > open), PUT wins on red (close < open).
* A losing attempt moves to the next consecutive M1 candle (MTG) with the
  same direction, up to ``mtg_steps``. Win on step 0 = WIN, win on a later
  step = MTG WIN, all attempts lost = LOSS.
* Final statuses: WIN, MTG WIN, LOSS. Everything else is PENDING.
* Missing / delayed / incomplete candle -> stays PENDING and is retried.
* Doji (open == close) -> stays PENDING (eval_state ``doji_hold``) and the
  candle is re-read every DOJI_RETRY_S for DOJI_WINDOW_S (live buffer may
  be corrected by a later tick or broker backfill). If it is still a doji
  after the window the signal stays PENDING with ``review_required`` set —
  it is never forced into WIN or LOSS.
* Data that is still missing after MISSING_WINDOW_S stays PENDING with
  ``eval_state = unverifiable`` and keeps being retried slowly.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Awaitable, Callable

from . import rtdb
from .market_data import MarketData
from .timeutil import M1

log = logging.getLogger("signal-engine.eval")

FINAL = ("WIN", "MTG WIN", "LOSS")
DOJI_RETRY_S = 20
DOJI_WINDOW_S = 600
MISSING_WINDOW_S = 1800
SLOW_RETRY_S = 120
FAST_RETRY_S = 3


def candle_outcome(direction: str, candle: dict[str, Any]) -> str | None:
    """'WIN' / 'LOSS' for one attempt, or None for a doji (undecidable)."""
    o, c = float(candle["open"]), float(candle["close"])
    if c == o:
        return None
    green = c > o
    return "WIN" if (direction == "CALL") == green else "LOSS"


def evaluate(signal: dict[str, Any], candles: dict[int, dict[str, Any]]) -> dict[str, Any]:
    """Pure evaluation. ``candles`` maps candle open-time -> verified M1 candle.

    Returns {status, eval_state, attempts, first_result?, blocked_at?}. Same
    input always gives the same output, for every feature.
    """
    direction = signal["direction"]
    entry = int(signal["entry_at"])
    steps = int(signal.get("mtg_steps", 1))
    attempts: dict[str, Any] = {}
    first = None
    for step in range(steps + 1):
        t = entry + step * M1
        c = candles.get(t)
        if c is None:
            state = "waiting_data" if step == 0 else "mtg_waiting"
            return {"status": "PENDING", "eval_state": state, "attempts": attempts, "first_result": first, "blocked_at": t}
        res = candle_outcome(direction, c)
        rec = {
            "step": step,
            "candle_time": t,
            "open": float(c["open"]),
            "high": float(c["high"]),
            "low": float(c["low"]),
            "close": float(c["close"]),
            "color": "green" if float(c["close"]) > float(c["open"]) else "red" if float(c["close"]) < float(c["open"]) else "doji",
            "outcome": res or "DOJI",
        }
        attempts[str(step)] = rec
        if res is None:
            return {"status": "PENDING", "eval_state": "doji_hold", "attempts": attempts, "first_result": first, "blocked_at": t}
        if step == 0:
            first = res
        if res == "WIN":
            return {"status": "WIN" if step == 0 else "MTG WIN", "eval_state": "final", "attempts": attempts, "first_result": first}
    return {"status": "LOSS", "eval_state": "final", "attempts": attempts, "first_result": first}


FinalHook = Callable[[dict[str, Any], dict[str, Any]], Awaitable[None]]


class EvaluationWorker:
    """Monitors every PENDING signal (all features) from one queue.

    Queue: ``eval/pending/{qid}`` -> {path, asset, direction, entry_at, mtg_steps, feature, uid, session_id}
    It is loaded at startup so pending signals survive a backend restart.
    """

    def __init__(self, market: MarketData) -> None:
        self.market = market
        self.items: dict[str, dict[str, Any]] = {}
        self.hooks: dict[str, FinalHook] = {}
        self._stop = asyncio.Event()
        self._lock = asyncio.Lock()

    @staticmethod
    def queue_id(signal: dict[str, Any]) -> str:
        return f"{signal['feature']}~{signal['uid']}~{signal.get('session_id') or '-'}~{signal['key']}"

    async def load(self) -> None:
        data = await rtdb.get("eval/pending") or {}
        for qid, item in data.items():
            if isinstance(item, dict) and item.get("path"):
                item["_next"] = 0.0
                item.setdefault("_first_seen", time.time())
                self.items[qid] = item
        log.info("evaluation worker recovered %d pending signals", len(self.items))

    async def register(self, path: str, signal: dict[str, Any]) -> None:
        qid = self.queue_id(signal)
        item = {
            "path": path,
            "asset": signal["asset"],
            "direction": signal["direction"],
            "entry_at": signal["entry_at"],
            "mtg_steps": signal["mtg_steps"],
            "feature": signal["feature"],
            "uid": signal["uid"],
            "session_id": signal.get("session_id"),
        }
        await rtdb.set_(f"eval/pending/{qid}", item)
        self.items[qid] = {**item, "_next": float(signal["entry_at"] + M1), "_first_seen": time.time()}

    def stop(self) -> None:
        self._stop.set()

    async def run(self) -> None:
        while not self._stop.is_set():
            now_t = time.time()
            due = [(q, i) for q, i in list(self.items.items()) if i["_next"] <= now_t]
            for qid, item in due:
                try:
                    await self._process(qid, item)
                except Exception as exc:  # noqa: BLE001
                    log.warning("evaluation of %s failed: %s", qid, exc)
                    item["_next"] = time.time() + FAST_RETRY_S * 5
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=1.0)
            except asyncio.TimeoutError:
                pass

    async def _process(self, qid: str, item: dict[str, Any]) -> None:
        entry = int(item["entry_at"])
        steps = int(item.get("mtg_steps", 1))
        candles: dict[int, dict[str, Any]] = {}
        reason = "ok"
        for step in range(steps + 1):
            t = entry + step * M1
            c, reason = await self.market.final_candle(item["asset"], t)
            if c is None:
                break
            candles[t] = c
            # stop fetching further candles as soon as the attempt decides the trade
            res = candle_outcome(item["direction"], c)
            if res != "LOSS":
                break
        result = evaluate(item, candles)
        await self._persist(qid, item, result, reason)

    async def _persist(self, qid: str, item: dict[str, Any], result: dict[str, Any], reason: str) -> None:
        now_t = time.time()
        now_ms = int(now_t * 1000)
        path = item["path"]
        if result["status"] in FINAL:
            committed = {"v": False}

            def fn(cur: Any) -> Any:
                if not isinstance(cur, dict) or cur.get("status") in FINAL:
                    committed["v"] = False
                    return cur
                committed["v"] = True
                cur.update({
                    "status": result["status"],
                    "eval_state": "final",
                    "attempts": result["attempts"],
                    "first_result": result["first_result"],
                    "evaluated_at": now_ms,
                    "updated_at": now_ms,
                    "review_required": None,
                })
                return cur

            snap = await rtdb.transaction(path, fn)
            await rtdb.delete(f"eval/pending/{qid}")
            self.items.pop(qid, None)
            if committed["v"]:
                hook = self.hooks.get(item["feature"])
                if hook and isinstance(snap, dict):
                    try:
                        await hook(item, snap)
                    except Exception as exc:  # noqa: BLE001
                        log.warning("final hook for %s failed: %s", qid, exc)
            return

        blocked_at = int(result.get("blocked_at", item["entry_at"]))
        age = now_t - (blocked_at + M1)
        state = result["eval_state"]
        review = None
        if state == "doji_hold":
            nxt = DOJI_RETRY_S if age < DOJI_WINDOW_S else SLOW_RETRY_S * 5
            review = age >= DOJI_WINDOW_S or None
        elif reason in ("not_expired",):
            nxt = max(0.5, blocked_at + M1 - now_t + 0.5)
        elif age > MISSING_WINDOW_S:
            state, nxt = "unverifiable", SLOW_RETRY_S
        else:
            nxt = FAST_RETRY_S
        item["_next"] = now_t + nxt
        if item.get("_state") != (state, len(result["attempts"]), review):
            item["_state"] = (state, len(result["attempts"]), review)
            await rtdb.update(path, {
                "eval_state": state,
                "attempts": result["attempts"] or None,
                "first_result": result["first_result"],
                "data_reason": reason,
                "review_required": review,
                "updated_at": now_ms,
            })
