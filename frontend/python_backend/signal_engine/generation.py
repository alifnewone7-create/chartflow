"""Shared Signal Generation Engine (used by all three features)."""

from __future__ import annotations

import time
from typing import Any

import numpy as np

from strategies import analyze as strategies_analyze

from .timeutil import M1, is_otc

MIN_CANDLES = 30


def _ema(x: np.ndarray, n: int) -> float:
    k = 2 / (n + 1)
    e = x[0]
    for v in x[1:]:
        e = v * k + e * (1 - k)
    return float(e)


def levels(candles: list[dict[str, Any]], lookback: int = 60) -> dict[str, float | None]:
    """Nearest support/resistance from swing lows/highs in the recent window."""
    arr = candles[-lookback:]
    if len(arr) < 5:
        return {"support": None, "resistance": None}
    highs = [float(c["high"]) for c in arr]
    lows = [float(c["low"]) for c in arr]
    last = float(arr[-1]["close"])
    swing_h = [highs[i] for i in range(2, len(arr) - 2) if highs[i] == max(highs[i - 2:i + 3])]
    swing_l = [lows[i] for i in range(2, len(arr) - 2) if lows[i] == min(lows[i - 2:i + 3])]
    res = min((h for h in swing_h if h >= last), default=max(highs))
    sup = max((l for l in swing_l if l <= last), default=min(lows))
    return {"support": sup, "resistance": res}


def technical_summary(candles: list[dict[str, Any]]) -> dict[str, Any]:
    closes = np.array([float(c["close"]) for c in candles])
    highs = np.array([float(c["high"]) for c in candles])
    lows = np.array([float(c["low"]) for c in candles])
    ema20, ema50 = _ema(closes[-60:], 20), _ema(closes[-100:], 50)
    tr = highs[-14:] - lows[-14:]
    atr = float(tr.mean()) if len(tr) else 0.0
    momentum = float(closes[-1] - closes[-6]) if len(closes) > 6 else 0.0
    trend = "up" if ema20 > ema50 else "down" if ema20 < ema50 else "flat"
    lv = levels(candles)
    return {
        "trend": trend,
        "ema20": round(ema20, 6),
        "ema50": round(ema50, 6),
        "atr14": round(atr, 6),
        "momentum5": round(momentum, 6),
        "volatility": "high" if closes[-1] and atr / closes[-1] > 0.0008 else "normal",
        **{k: (round(v, 6) if v is not None else None) for k, v in lv.items()},
    }


def analyze(candles: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Run every strategy + TA. Returns None when data is insufficient or no direction."""
    if len(candles) < MIN_CANDLES:
        return None
    decision = strategies_analyze(candles)
    if decision.direction not in ("CALL", "PUT"):
        return None
    ta = technical_summary(candles)
    votes = [
        {"name": v.name, "direction": v.direction, "confidence": round(float(v.confidence), 3), "note": v.note}
        for v in decision.votes
    ]
    agree = [v["name"] for v in votes if v["direction"] == decision.direction]
    summary = (
        f"{decision.direction} — {len(agree)}/{len(votes)} strategies agree ({', '.join(agree) or 'none'}); "
        f"trend {ta['trend']}, volatility {ta['volatility']}."
    )
    return {
        "direction": decision.direction,
        "confidence": round(float(decision.confidence), 3),
        "bullish": decision.bullish,
        "bearish": decision.bearish,
        "abstain": decision.abstain,
        "votes": votes,
        "technical": ta,
        "summary": summary,
        "candle_count": len(candles),
        "last_candle_time": int(candles[-1]["time"]),
    }


def signal_key(entry_at: int, symbol: str) -> str:
    """Deterministic RTDB key: one signal per (market, entry candle) per scope."""
    return f"{entry_at}_{symbol}"


def build_signal(
    *,
    feature: str,
    uid: str,
    market: dict[str, Any],
    analysis: dict[str, Any],
    entry_at: int,
    mtg_steps: int,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    key = signal_key(entry_at, market["symbol"])
    now_ms = int(time.time() * 1000)
    prefix = {"c2s": "C2S", "future": "FUT", "auto": "AUT"}[feature]
    return {
        "signal_id": f"{prefix}-{entry_at}-{market['symbol']}-{uid[:6]}",
        "key": key,
        "feature": feature,
        "uid": uid,
        "asset": market["symbol"],
        "asset_name": market.get("name") or market["symbol"],
        "market_type": "OTC" if is_otc(market["symbol"]) else "Regular",
        "direction": analysis["direction"],
        "timeframe": "M1",
        "entry_at": entry_at,
        "expiry_at": entry_at + M1,
        "payout": market.get("payout"),
        "confidence": analysis["confidence"],
        "analysis": {
            "summary": analysis["summary"],
            "votes": analysis["votes"],
            "technical": analysis["technical"],
            "candle_count": analysis["candle_count"],
            "last_candle_time": analysis["last_candle_time"],
        },
        "mtg_steps": mtg_steps,
        "status": "PENDING",
        "eval_state": "waiting_expiry",
        "attempts": {},
        "generated_at": now_ms,
        "updated_at": now_ms,
        **(extra or {}),
    }
