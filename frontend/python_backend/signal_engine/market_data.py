"""Shared Market Data Service + M1 candle validation.

Reads candles from the live ``candle_store`` the collector maintains and,
only when no live collector is running, falls back to a broker history
fetch. Nothing here ever fabricates a candle.
"""

from __future__ import annotations

import logging
import math
import time
from typing import Any

from .timeutil import M1, is_otc

log = logging.getLogger("signal-engine.market")

BROKER_FALLBACK_AFTER_S = 20


def valid_candle(c: Any, t: int | None = None) -> bool:
    """Structural OHLC validation for a single M1 candle."""
    if not isinstance(c, dict):
        return False
    try:
        o, h, l, cl, ts = (float(c["open"]), float(c["high"]), float(c["low"]), float(c["close"]), int(c["time"]))
    except (KeyError, TypeError, ValueError):
        return False
    if any(math.isnan(v) or v <= 0 for v in (o, h, l, cl)):
        return False
    if ts % M1 != 0 or (t is not None and ts != t):
        return False
    return h >= max(o, cl) - 1e-12 and l <= min(o, cl) + 1e-12


class MarketData:
    """Thin adapter over main.py's live state (passed in as a module)."""

    def __init__(self, ctx: Any) -> None:
        self.ctx = ctx
        self._assets_cache: tuple[float, list[dict[str, Any]]] = (0.0, [])

    @property
    def session(self) -> Any:
        return getattr(self.ctx, "session", None)

    @property
    def collector(self) -> Any:
        return getattr(self.ctx, "collector", None)

    @property
    def store(self) -> Any:
        return self.ctx.candle_store

    def logged_in(self) -> bool:
        s = self.session
        return bool(s and getattr(s, "logged_in", False))

    # ------------------------------------------------------------ markets
    async def active_markets(self) -> list[dict[str, Any]]:
        """Open markets with payout: [{symbol, name, type, payout, open}]."""
        ts, cached = self._assets_cache
        if time.time() - ts < 10 and cached:
            return cached
        raw: list[dict[str, Any]] = []
        if self.collector is not None:
            raw = self.collector.assets()
        elif self.logged_in():
            try:
                raw = await self.session.get_assets()
            except Exception as exc:  # noqa: BLE001
                log.warning("get_assets failed: %s", exc)
                raw = []
        out = []
        for a in raw or []:
            sym = str(a.get("symbol") or "")
            payout = a.get("payout")
            is_open = a.get("is_open", a.get("open", True))
            if not sym or not isinstance(payout, (int, float)) or payout <= 0 or is_open is False:
                continue
            out.append({
                "symbol": sym,
                "name": str(a.get("name") or sym),
                "type": "OTC" if is_otc(sym) else "Regular",
                "payout": int(payout),
                "open": True,
            })
        out.sort(key=lambda m: (-m["payout"], m["symbol"]))
        if out:
            self._assets_cache = (time.time(), out)
        return out

    async def market(self, symbol: str) -> dict[str, Any] | None:
        for m in await self.active_markets():
            if m["symbol"] == symbol:
                return m
        return None

    # ------------------------------------------------------------ candles
    def closed_candles(self, symbol: str, count: int = 120) -> list[dict[str, Any]]:
        """Most recent fully closed, validated M1 candles (forming candle dropped)."""
        buf = self.store.get((symbol, M1)) or []
        current = int(time.time() // M1) * M1
        closed = [c for c in buf if valid_candle(c) and int(c["time"]) < current]
        return closed[-count:]

    def history_for_analysis(self, symbol: str, count: int = 120) -> list[dict[str, Any]]:
        """Closed candles plus the forming one (what the live chart shows)."""
        buf = self.store.get((symbol, M1)) or []
        return [c for c in buf if valid_candle(c)][-count:]

    async def final_candle(self, symbol: str, t: int) -> tuple[dict[str, Any] | None, str]:
        """The completed M1 candle that opened at ``t``.

        Returns (candle, reason). A candle is only returned once it is
        provably closed: a later candle exists in the live buffer, or the
        broker history lists it after its close time.
        """
        now_t = time.time()
        if now_t < t + M1:
            return None, "not_expired"
        buf = self.store.get((symbol, M1)) or []
        found = None
        later = False
        for c in buf:
            ct = int(c.get("time", 0))
            if ct == t:
                found = c
            elif ct > t:
                later = True
        if found is not None and later:
            return (found, "ok") if valid_candle(found, t) else (None, "incomplete")
        if now_t < t + M1 + BROKER_FALLBACK_AFTER_S:
            return None, "delayed"
        if self.collector is None and self.logged_in():
            try:
                hist = await self.session.get_history(symbol, M1, count=10)
            except Exception as exc:  # noqa: BLE001
                log.info("broker history for %s failed: %s", symbol, exc)
                hist = []
            for c in hist or []:
                if int(c.get("time", 0)) == t and valid_candle(c, t):
                    return c, "ok"
        return None, "missing" if found is None else "incomplete"
