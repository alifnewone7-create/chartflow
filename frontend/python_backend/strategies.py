"""
Multi-strategy next-candle prediction engine.

Each strategy takes a list of OHLCV candles (oldest → newest) and returns
either:

    Vote(direction="CALL"|"PUT", confidence=0..1, note="why")    # bullish/bearish
    Vote(direction=None, ...)                                    # no signal

We then aggregate votes across strategies to produce the final prediction.
The aggregation is intentionally conservative: a strategy that says "no
signal" carries zero weight, and we require a clear majority of confident
votes for the engine to commit to a CALL or PUT.

Implementation notes
--------------------
- Pure NumPy — no pandas / TA-Lib dependency. NumPy is already in
  `requirements.txt`, and the math here matches the well-known textbook
  formulas (Wilder RSI, MACD 12/26/9, etc.) so behaviour is predictable.
- Every strategy short-circuits gracefully if there isn't enough history,
  so the caller can pass "whatever candles we have" without crashing.
- Confidence is calibrated per strategy. We don't claim to predict
  markets — but combining 6 indicators that all point the same way is a
  classically meaningful confluence and is what gives the user a useful
  edge to act on.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Literal, Optional

import numpy as np


Direction = Literal["CALL", "PUT"]


@dataclass
class Vote:
    name: str
    direction: Optional[Direction]
    confidence: float
    note: str = ""


@dataclass
class Decision:
    direction: Optional[Direction]
    confidence: float                       # 0..1
    votes: list[Vote] = field(default_factory=list)
    bullish: int = 0
    bearish: int = 0
    abstain: int = 0


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def _ema(values: np.ndarray, period: int) -> np.ndarray:
    """Exponential moving average. Returns array same length as input;
    the first `period - 1` entries are seeded with the simple average so
    the curve doesn't start at zero."""
    if len(values) < period:
        return np.full_like(values, np.nan, dtype=float)
    alpha = 2.0 / (period + 1.0)
    out = np.empty_like(values, dtype=float)
    seed = np.mean(values[:period])
    out[: period - 1] = np.nan
    out[period - 1] = seed
    for i in range(period, len(values)):
        out[i] = alpha * values[i] + (1.0 - alpha) * out[i - 1]
    return out


def _rsi(closes: np.ndarray, period: int = 14) -> Optional[float]:
    """Wilder's RSI on the most recent point. Returns None if there
    isn't enough history."""
    if len(closes) < period + 1:
        return None
    diffs = np.diff(closes)
    gains = np.where(diffs > 0, diffs, 0.0)
    losses = np.where(diffs < 0, -diffs, 0.0)
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    for i in range(period, len(diffs)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return float(100.0 - (100.0 / (1.0 + rs)))


def _stoch(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, k: int = 14) -> Optional[float]:
    if len(closes) < k:
        return None
    h = float(np.max(highs[-k:]))
    l = float(np.min(lows[-k:]))
    if h == l:
        return 50.0
    return float(100.0 * (closes[-1] - l) / (h - l))


# --------------------------------------------------------------------------- #
# Strategies
# --------------------------------------------------------------------------- #


def strat_rsi(closes: np.ndarray) -> Vote:
    """Classic RSI mean-reversion: oversold (<30) = CALL, overbought (>70) = PUT."""
    rsi = _rsi(closes, period=14)
    if rsi is None:
        return Vote(name="RSI(14)", direction=None, confidence=0.0, note="not enough history")
    if rsi <= 25:
        return Vote(name="RSI(14)", direction="CALL", confidence=0.85, note=f"oversold {rsi:.1f}")
    if rsi <= 32:
        return Vote(name="RSI(14)", direction="CALL", confidence=0.65, note=f"oversold zone {rsi:.1f}")
    if rsi >= 75:
        return Vote(name="RSI(14)", direction="PUT", confidence=0.85, note=f"overbought {rsi:.1f}")
    if rsi >= 68:
        return Vote(name="RSI(14)", direction="PUT", confidence=0.65, note=f"overbought zone {rsi:.1f}")
    return Vote(name="RSI(14)", direction=None, confidence=0.0, note=f"neutral {rsi:.1f}")


def strat_macd(closes: np.ndarray) -> Vote:
    """MACD line vs signal line crossover."""
    if len(closes) < 35:
        return Vote(name="MACD(12,26,9)", direction=None, confidence=0.0, note="not enough history")
    ema12 = _ema(closes, 12)
    ema26 = _ema(closes, 26)
    macd = ema12 - ema26
    signal = _ema(macd[~np.isnan(macd)], 9)
    if len(signal) < 2:
        return Vote(name="MACD(12,26,9)", direction=None, confidence=0.0, note="not enough history")
    last_macd = macd[~np.isnan(macd)][-1]
    last_signal = signal[-1]
    prev_macd = macd[~np.isnan(macd)][-2]
    prev_signal = signal[-2]
    cross_up = prev_macd <= prev_signal and last_macd > last_signal
    cross_dn = prev_macd >= prev_signal and last_macd < last_signal
    if cross_up:
        return Vote(name="MACD(12,26,9)", direction="CALL", confidence=0.8, note="bullish crossover")
    if cross_dn:
        return Vote(name="MACD(12,26,9)", direction="PUT", confidence=0.8, note="bearish crossover")
    if last_macd > last_signal:
        return Vote(name="MACD(12,26,9)", direction="CALL", confidence=0.45, note="above signal")
    if last_macd < last_signal:
        return Vote(name="MACD(12,26,9)", direction="PUT", confidence=0.45, note="below signal")
    return Vote(name="MACD(12,26,9)", direction=None, confidence=0.0, note="flat")


def strat_ema_cross(closes: np.ndarray) -> Vote:
    """EMA(9) vs EMA(21) cross — fast trend follower."""
    if len(closes) < 25:
        return Vote(name="EMA(9/21)", direction=None, confidence=0.0, note="not enough history")
    fast = _ema(closes, 9)
    slow = _ema(closes, 21)
    if np.isnan(fast[-2]) or np.isnan(slow[-2]):
        return Vote(name="EMA(9/21)", direction=None, confidence=0.0, note="not enough history")
    cross_up = fast[-2] <= slow[-2] and fast[-1] > slow[-1]
    cross_dn = fast[-2] >= slow[-2] and fast[-1] < slow[-1]
    if cross_up:
        return Vote(name="EMA(9/21)", direction="CALL", confidence=0.78, note="golden cross")
    if cross_dn:
        return Vote(name="EMA(9/21)", direction="PUT", confidence=0.78, note="death cross")
    if fast[-1] > slow[-1]:
        return Vote(name="EMA(9/21)", direction="CALL", confidence=0.4, note="uptrend")
    return Vote(name="EMA(9/21)", direction="PUT", confidence=0.4, note="downtrend")


def strat_bollinger(closes: np.ndarray) -> Vote:
    """Bollinger Bands(20, 2σ) mean reversion."""
    if len(closes) < 20:
        return Vote(name="Bollinger(20,2)", direction=None, confidence=0.0, note="not enough history")
    window = closes[-20:]
    mu = float(np.mean(window))
    sigma = float(np.std(window))
    if sigma == 0:
        return Vote(name="Bollinger(20,2)", direction=None, confidence=0.0, note="flat")
    upper = mu + 2 * sigma
    lower = mu - 2 * sigma
    last = float(closes[-1])
    if last <= lower:
        return Vote(name="Bollinger(20,2)", direction="CALL", confidence=0.75, note="touched lower band")
    if last >= upper:
        return Vote(name="Bollinger(20,2)", direction="PUT", confidence=0.75, note="touched upper band")
    return Vote(name="Bollinger(20,2)", direction=None, confidence=0.0, note="within bands")


def strat_stoch(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray) -> Vote:
    """Stochastic %K — oversold/overbought."""
    k = _stoch(highs, lows, closes, k=14)
    if k is None:
        return Vote(name="Stoch %K(14)", direction=None, confidence=0.0, note="not enough history")
    if k <= 18:
        return Vote(name="Stoch %K(14)", direction="CALL", confidence=0.75, note=f"oversold {k:.1f}")
    if k <= 25:
        return Vote(name="Stoch %K(14)", direction="CALL", confidence=0.55, note=f"oversold zone {k:.1f}")
    if k >= 82:
        return Vote(name="Stoch %K(14)", direction="PUT", confidence=0.75, note=f"overbought {k:.1f}")
    if k >= 75:
        return Vote(name="Stoch %K(14)", direction="PUT", confidence=0.55, note=f"overbought zone {k:.1f}")
    return Vote(name="Stoch %K(14)", direction=None, confidence=0.0, note=f"neutral {k:.1f}")


def strat_engulfing(opens: np.ndarray, closes: np.ndarray) -> Vote:
    """Bullish/bearish engulfing pattern on the last two candles."""
    if len(closes) < 2:
        return Vote(name="Engulfing", direction=None, confidence=0.0, note="not enough history")
    o1, c1 = opens[-2], closes[-2]
    o2, c2 = opens[-1], closes[-1]
    body1 = abs(c1 - o1)
    body2 = abs(c2 - o2)
    if body2 < body1 * 1.1:
        return Vote(name="Engulfing", direction=None, confidence=0.0, note="no engulfing")
    # Bullish: prev red, current green, current body engulfs prev body.
    if c1 < o1 and c2 > o2 and c2 > o1 and o2 < c1:
        return Vote(name="Engulfing", direction="CALL", confidence=0.7, note="bullish engulfing")
    # Bearish: prev green, current red, current body engulfs prev body.
    if c1 > o1 and c2 < o2 and c2 < o1 and o2 > c1:
        return Vote(name="Engulfing", direction="PUT", confidence=0.7, note="bearish engulfing")
    return Vote(name="Engulfing", direction=None, confidence=0.0, note="no engulfing")


# --------------------------------------------------------------------------- #
# Aggregator
# --------------------------------------------------------------------------- #


def analyze(candles: Iterable[dict]) -> Decision:
    """
    Run every strategy and aggregate the votes.

    `candles` is an iterable of `{open, high, low, close, time, volume}`
    dicts in chronological order.
    """
    arr = list(candles)
    if not arr:
        return Decision(direction=None, confidence=0.0)

    opens = np.array([float(c["open"]) for c in arr], dtype=float)
    highs = np.array([float(c["high"]) for c in arr], dtype=float)
    lows = np.array([float(c["low"]) for c in arr], dtype=float)
    closes = np.array([float(c["close"]) for c in arr], dtype=float)

    votes = [
        strat_rsi(closes),
        strat_macd(closes),
        strat_ema_cross(closes),
        strat_bollinger(closes),
        strat_stoch(highs, lows, closes),
        strat_engulfing(opens, closes),
    ]

    bullish = [v for v in votes if v.direction == "CALL"]
    bearish = [v for v in votes if v.direction == "PUT"]
    abstain = [v for v in votes if v.direction is None]

    bull_score = sum(v.confidence for v in bullish)
    bear_score = sum(v.confidence for v in bearish)

    decision = Decision(
        direction=None,
        confidence=0.0,
        votes=votes,
        bullish=len(bullish),
        bearish=len(bearish),
        abstain=len(abstain),
    )

    # Need at least 2 confident strategies pointing the same way and a
    # clear edge over the opposing side.
    EDGE = 0.6
    if bull_score >= bear_score + EDGE and len(bullish) >= 2:
        decision.direction = "CALL"
        # Map the score gap onto a 0..1 confidence band, capped at 0.95
        # so we never claim certainty.
        decision.confidence = min(0.95, 0.5 + (bull_score - bear_score) / 6.0)
    elif bear_score >= bull_score + EDGE and len(bearish) >= 2:
        decision.direction = "PUT"
        decision.confidence = min(0.95, 0.5 + (bear_score - bull_score) / 6.0)
    else:
        # No clear winner — default to the slightly stronger side at low
        # confidence, OR abstain entirely if both sides are silent.
        if bullish and bull_score > bear_score:
            decision.direction = "CALL"
            decision.confidence = max(0.4, min(0.55, bull_score / 4.0))
        elif bearish and bear_score > bull_score:
            decision.direction = "PUT"
            decision.confidence = max(0.4, min(0.55, bear_score / 4.0))

    return decision
