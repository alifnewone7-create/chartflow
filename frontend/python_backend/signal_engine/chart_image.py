"""Telegram chart images (signal + result) from real M1 candles — terminal-style ChartFlow Ai theme, headless matplotlib."""

from __future__ import annotations

import io
from datetime import datetime
from typing import Any

import matplotlib
import numpy as np

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.gridspec import GridSpec  # noqa: E402
from matplotlib.patches import Rectangle  # noqa: E402

from .generation import levels  # noqa: E402
from .timeutil import TZ, hhmm, pretty_asset  # noqa: E402

BG, PANEL, GRID, BORDER = "#0A0E17", "#0C111C", "#18202E", "#2A3447"
FG, MUTED, DIM = "#D7DEE8", "#7B8899", "#4A5668"
GREEN, RED, GOLD, BLUE, YELLOW, SKY = "#22C55E", "#EF4444", "#B8962E", "#3B82F6", "#EAB308", "#38BDF8"
MONO = "DejaVu Sans Mono"
BRAND, HANDLE = "ChartFlow Ai", "@Iamhear1"
RESULT_COLOR = {"WIN": GREEN, "MTG WIN": SKY, "LOSS": RED}


# ------------------------------------------------------------------ indicators
def _ema(vals: list[float], n: int = 20) -> list[float]:
    k, out = 2 / (n + 1), []
    for i, v in enumerate(vals):
        out.append(v if i == 0 else v * k + out[-1] * (1 - k))
    return out


def _rsi(vals: list[float], n: int = 14) -> list[float]:
    out, gains, losses = [50.0], 0.0, 0.0
    for i in range(1, len(vals)):
        d = vals[i] - vals[i - 1]
        g, l = max(d, 0.0), max(-d, 0.0)
        if i <= n:
            gains, losses = gains + g, losses + l
            ag, al = gains / i, losses / i
        else:
            ag, al = (ag * (n - 1) + g) / n, (al * (n - 1) + l) / n  # noqa: F821
        out.append(100.0 if al == 0 else 100 - 100 / (1 + ag / al))
    return out


def _fmt(v: float) -> str:
    return f"{v:.5g}" if v < 10 else f"{v:.3f}" if v < 1000 else f"{v:.2f}"


# ------------------------------------------------------------------ frame
def _frame(symbol: str, name: str, data: list[dict[str, Any]], x_right: float, stamp_ts: int, trend: str, p_level: float | None, p_tag: str):
    n = len(data)
    o = [float(c["open"]) for c in data]
    h = [float(c["high"]) for c in data]
    l = [float(c["low"]) for c in data]
    cl = [float(c["close"]) for c in data]
    vol = [float(c.get("volume") or 0) for c in data]
    has_vol = any(v > 0 for v in vol)
    if not has_vol:
        vol = [hi - lo for hi, lo in zip(h, l)]

    fig = plt.figure(figsize=(20, 11.25), dpi=100)
    fig.patch.set_facecolor(BG)
    gs = GridSpec(3, 1, height_ratios=[7.2, 1.3, 1.6], hspace=0.04, left=0.008, right=0.935, top=0.945, bottom=0.045)
    ax, av, ar = fig.add_subplot(gs[0]), fig.add_subplot(gs[1]), fig.add_subplot(gs[2])
    for a in (ax, av, ar):
        a.set_facecolor(PANEL)
        a.grid(color=GRID, linewidth=0.7, zorder=0)
        a.set_axisbelow(True)
        a.yaxis.tick_right()
        a.tick_params(colors=MUTED, labelsize=10, length=0)
        for s in a.spines.values():
            s.set_color(BORDER)
            s.set_linewidth(0.8)
        a.set_xlim(-1, x_right)
        for lbl in a.get_yticklabels() + a.get_xticklabels():
            lbl.set_fontfamily(MONO)

    # candles
    for i in range(n):
        col = GREEN if cl[i] >= o[i] else RED
        ax.vlines(i, l[i], h[i], color=col, linewidth=1.2, zorder=3)
        body = max(abs(cl[i] - o[i]), (h[i] - l[i]) * 0.03 or 1e-9)
        ax.add_patch(Rectangle((i - 0.36, min(o[i], cl[i])), 0.72, body, facecolor=col, edgecolor=col, linewidth=0.5, zorder=4))
        av.bar(i, vol[i], width=0.72, color=col, alpha=0.9, zorder=3)

    # EMA20 + regression channel
    xs = np.arange(n)
    ema = _ema(cl)
    ax.plot(xs, ema, color=BLUE, linewidth=1.8, zorder=5)
    if n >= 10:
        ext = np.arange(0, int(x_right) - 1)
        for series in (h, l, cl):
            k, b = np.polyfit(xs, series, 1)
            ax.plot(ext, k * ext + b, color=GOLD, linewidth=1.1, alpha=0.9, zorder=2)
    ema_dir = "UP" if n > 5 and ema[-1] > ema[-5] else "DOWN"

    # support / resistance / pivot tags
    lv = levels(data)
    lo, hi = min(l), max(h)
    pad = (hi - lo or abs(hi) * 0.001 or 1e-6) * 0.14
    y0, y1 = lo - pad * 2.8, hi + pad * 2.4
    span = y1 - y0
    tagged: list[float] = []
    for tag, val, col, ls in (("R", lv["resistance"], RED, "-"), ("S", lv["support"], GREEN, "-"), (p_tag, p_level, YELLOW, (0, (5, 4)))):
        if val is None:
            continue
        ax.axhline(val, color=col, linewidth=1.3 if tag != p_tag else 1.1, linestyle=ls, alpha=0.95, zorder=2)
        crowded = any(abs(val - v) < span * 0.035 for v in tagged)
        tagged.append(val)
        ax.text(1.003, val + (span * 0.012 if crowded else 0), f"{tag} {_fmt(val)}", transform=ax.get_yaxis_transform(), color=BG, fontsize=9.5, fontweight="bold", fontfamily=MONO,
                va="bottom" if crowded else "center", ha="left", zorder=8, bbox={"boxstyle": "square,pad=0.2", "facecolor": col, "edgecolor": "none"})

    # y range with headroom (arrows below, info box above)
    ax.set_ylim(y0, y1)
    ax.set_yticks([t for t in ax.get_yticks() if y0 <= t <= y1 and all(abs(t - v) > span * 0.04 for v in tagged)])
    ax.set_xticks([])
    av.set_xticks([])
    av.set_yticks([])

    # RSI
    rsi = _rsi(cl)
    ar.plot(xs, rsi, color=GOLD, linewidth=1.4, zorder=3)
    ar.axhline(70, color=RED, linewidth=0.8, linestyle=(0, (5, 4)), alpha=0.7)
    ar.axhline(30, color=GREEN, linewidth=0.8, linestyle=(0, (5, 4)), alpha=0.7)
    ar.axhline(50, color=MUTED, linewidth=0.7, linestyle=(0, (2, 3)), alpha=0.6)
    ar.set_ylim(0, 100)
    ar.set_yticks([30, 70])
    ar.text(0.004, 0.9, f"RSI14 {rsi[-1]:.1f}", transform=ar.transAxes, color=MUTED, fontsize=10, fontfamily=MONO, va="top")
    av.text(0.004, 0.88, "VOLUME" if has_vol else "RANGE", transform=av.transAxes, color=MUTED, fontsize=10, fontfamily=MONO, va="top", zorder=9,
            bbox={"boxstyle": "square,pad=0.15", "facecolor": PANEL, "edgecolor": "none"})
    step = max(1, n // 10)
    ticks = list(range(0, n, step))
    ar.set_xticks(ticks)
    ar.set_xticklabels([datetime.fromtimestamp(int(data[i]["time"]), TZ).strftime("%H:%M") for i in ticks], color=MUTED, fontsize=10, fontfamily=MONO)

    # header
    fig.text(0.008, 0.985, pretty_asset(symbol, name), color=FG, fontsize=22, fontweight="bold", fontfamily=MONO, va="top")
    fig.text(0.04, 0.957, "CANDLE VIEW", color=MUTED, fontsize=9.5, fontfamily=MONO, va="top")
    if lv["resistance"] is not None:
        fig.text(0.36, 0.982, f"RES {_fmt(lv['resistance'])}", color=RED, fontsize=11, fontweight="bold", fontfamily=MONO, va="top")
    if lv["support"] is not None:
        fig.text(0.6, 0.982, f"SUP {_fmt(lv['support'])}", color=GREEN, fontsize=11, fontweight="bold", fontfamily=MONO, va="top")
    fig.text(0.99, 0.982, datetime.fromtimestamp(stamp_ts, TZ).strftime("%Y-%m-%d %H:%M UTC+6"), color=FG, fontsize=10.5, fontfamily=MONO, va="top", ha="right",
             bbox={"boxstyle": "square,pad=0.35", "facecolor": PANEL, "edgecolor": BORDER})
    ax.text(0.006, 0.975, f"TF: M1 | {trend} {'▲' if trend == 'UP' else '▼'} | EMA20 {ema_dir}", transform=ax.transAxes, color=FG, fontsize=10, fontweight="bold", fontfamily=MONO, va="top", zorder=9,
            bbox={"boxstyle": "square,pad=0.4", "facecolor": PANEL, "edgecolor": BORDER})

    # watermark + footer branding
    ax.text(0.5, 0.5, BRAND, transform=ax.transAxes, color="#9AA6B8", alpha=0.10, fontsize=92, fontweight="bold", fontfamily=MONO, ha="center", va="center", zorder=1)
    ax.text(0.5, 0.40, "AI SIGNAL ENGINE", transform=ax.transAxes, color="#9AA6B8", alpha=0.08, fontsize=24, fontfamily=MONO, ha="center", va="center", zorder=1)
    ax.text(0.006, 0.02, f"{BRAND.upper()}  |  {HANDLE.upper()}", transform=ax.transAxes, color=DIM, fontsize=10, fontfamily=MONO, va="bottom", zorder=9)
    return fig, ax, (lo, hi, pad)


def _tag(ax, x: float, y: float, text: str, col: str, above: bool) -> None:
    """Small bordered label like the reference 'WIN' box."""
    ax.text(x, y, text, color=col, fontsize=10.5, fontweight="bold", fontfamily=MONO, ha="center", va="bottom" if above else "top", zorder=9,
            bbox={"boxstyle": "square,pad=0.35", "facecolor": PANEL, "edgecolor": col, "linewidth": 1.2})


def _arrow(ax, x: float, y_from: float, y_to: float, col: str) -> None:
    ax.annotate("", xy=(x, y_to), xytext=(x, y_from), zorder=8,
                arrowprops={"arrowstyle": "-|>,head_width=0.45,head_length=0.8", "color": col, "linewidth": 1.8, "shrinkA": 0, "shrinkB": 0})


def _infobox(ax, small: str, big: str, col: str) -> None:
    """Top-right box like the reference '1M TIMER / 00:58'."""
    ax.text(0.988, 0.96, f"\n{big}", transform=ax.transAxes, color=col, fontsize=17, fontweight="bold", fontfamily=MONO, ha="right", va="top", zorder=10, linespacing=0.9,
            bbox={"boxstyle": "square,pad=0.5", "facecolor": "#0B1A14" if col == GREEN else PANEL, "edgecolor": col, "linewidth": 1.4})
    ax.annotate(small, xy=(0.988, 0.96), xycoords="axes fraction", xytext=(-7, -7), textcoords="offset points", color=col, fontsize=9, fontfamily=MONO, ha="right", va="top", zorder=11)


def _save(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", facecolor=BG)
    plt.close(fig)
    return buf.getvalue()


# ------------------------------------------------------------------ public
def render(symbol: str, name: str, candles: list[dict[str, Any]], direction: str, entry_at: int, count: int = 110) -> bytes:
    """Signal chart: arrow on the NEXT candle slot where the trade is taken + entry box."""
    data = candles[-count:]
    n = len(data)
    up = direction == "CALL"
    col = GREEN if up else RED
    last = float(data[-1]["close"]) if data else 0.0
    fig, ax, (lo, hi, pad) = _frame(symbol, name, data, n + 9, entry_at, "UP" if up else "DOWN", last, "P")

    ax.axvspan(n - 0.5, n + 0.5, color=YELLOW, alpha=0.08, zorder=1)
    ax.axvline(n, color=YELLOW, linewidth=0.9, linestyle=(0, (3, 3)), alpha=0.7, zorder=2)
    if up:
        _arrow(ax, n, last - pad * 1.9, last - pad * 0.15, col)
        _tag(ax, n, last - pad * 2.05, f"CALL ▲ {hhmm(entry_at)}", col, above=False)
    else:
        _arrow(ax, n, last + pad * 1.9, last + pad * 0.15, col)
        _tag(ax, n, last + pad * 2.05, f"PUT ▼ {hhmm(entry_at)}", col, above=True)
    _infobox(ax, "1M ENTRY", hhmm(entry_at), GREEN)
    return _save(fig)


def render_result(symbol: str, name: str, candles: list[dict[str, Any]], sig: dict[str, Any], before: int = 100) -> bytes:
    """Result chart: entry + MTG candles marked with arrows, WIN / MTG WIN / LOSS tags, result box."""
    attempts = sorted((a for a in (sig.get("attempts") or {}).values() if isinstance(a, dict)), key=lambda a: int(a.get("step", 0)))
    by_time = {int(a["candle_time"]): a for a in attempts if a.get("candle_time")}
    entry_at = int(sig["entry_at"])
    idx = next((i for i, c in enumerate(candles) if int(c["time"]) == entry_at), None)
    if idx is None:
        idx = max(0, next((i for i, c in enumerate(candles) if int(c["time"]) > entry_at), len(candles)) - 1)
    start = max(0, idx - before)
    data = candles[start:min(len(candles), idx + len(attempts) + 3)]
    n = len(data)
    status = str(sig.get("status") or "PENDING")
    rcol = RESULT_COLOR.get(status, YELLOW)
    up = sig["direction"] == "CALL"
    dcol = GREEN if up else RED
    entry_price = next((float(c["open"]) for c in data if int(c["time"]) == entry_at), float(data[-1]["close"]) if data else None)
    fig, ax, (lo, hi, pad) = _frame(symbol, name, data, n + 9, int(sig.get("evaluated_at", entry_at * 1000) / 1000) if sig.get("evaluated_at") else entry_at, "UP" if up else "DOWN", entry_price, "E")

    win_step = max((int(a["step"]) for a in attempts if a.get("outcome") == "WIN"), default=None)
    for i, c in enumerate(data):
        t = int(c["time"])
        a = by_time.get(t)
        if a is None and t != entry_at:
            continue
        step = int(a["step"]) if a else 0
        outcome = (a or {}).get("outcome")
        is_win = win_step is not None and step == win_step
        tcol = GREEN if is_win else RED if outcome == "LOSS" else YELLOW
        label = ("WIN" if step == 0 else "MTG WIN") if is_win else "LOSS" if outcome == "LOSS" else "ENTRY"
        if step > 0 or (status == "MTG WIN" and step == 0):
            label = f"{'ENTRY' if step == 0 else f'MTG {step}'} · {label}"
        hi_c, lo_c = float(c["high"]), float(c["low"])
        off = 1.6 + step * 1.5
        ax.axvspan(i - 0.5, i + 0.5, color=tcol, alpha=0.14 if is_win else 0.07, zorder=1)
        if up:
            _arrow(ax, i, lo_c - pad * off, lo_c - pad * 0.12, tcol)
            _tag(ax, i, lo_c - pad * (off + 0.15), f"{label} ▲", tcol, above=False)
        else:
            _arrow(ax, i, hi_c + pad * off, hi_c + pad * 0.12, tcol)
            _tag(ax, i, hi_c + pad * (off + 0.15), f"{label} ▼", tcol, above=True)

    _infobox(ax, "RESULT", status, rcol)
    return _save(fig)
