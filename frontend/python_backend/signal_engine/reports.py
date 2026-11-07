"""Automatic Signal partial report (finalized signals only)."""

from __future__ import annotations

from typing import Any

from . import bot_style
from .timeutil import compact_asset, hhmm, mono, report_date

SEP = "━━━━━━━━━・━━━━━━━━━"
ICON = {"WIN": "👍", "MTG WIN": "👍¹", "LOSS": "❌"}


def stats(signals: list[dict[str, Any]]) -> dict[str, Any]:
    win = sum(1 for s in signals if s.get("status") == "WIN")
    mtg = sum(1 for s in signals if s.get("status") == "MTG WIN")
    loss = sum(1 for s in signals if s.get("status") == "LOSS")
    pending = sum(1 for s in signals if s.get("status") == "PENDING")
    done = win + mtg + loss
    return {
        "total": len(signals),
        "finalized": done,
        "win": win,
        "mtg_win": mtg,
        "loss": loss,
        "pending": pending,
        "accuracy": round((win + mtg) / done * 100, 1) if done else None,
    }


def build(signals: list[dict[str, Any]], at_ts: float, tpl: str | None = None) -> dict[str, Any]:
    rows = sorted(signals, key=lambda s: int(s["entry_at"]))
    final = [s for s in rows if s.get("status") in ICON]
    st = stats(rows)
    lines = [f"{mono('M1')} {mono(compact_asset(s['asset']))} {mono(hhmm(int(s['entry_at'])))} {mono(s['direction'])} {ICON[s['status']]}" for s in final]
    acc = f"{round(st['accuracy'])}%" if st["accuracy"] is not None else "-"
    text = bot_style.render(tpl or bot_style.DEFAULTS["partial"], {
        "date": mono(report_date(at_ts)),
        "total": mono(str(st["finalized"])),
        "rows": "\n".join(lines) or "-",
        "win": mono(str(st["win"] + st["mtg_win"])),
        "loss": mono(str(st["loss"])),
        "accuracy": mono(acc),
        "pending": mono(str(st["pending"])) if st["pending"] else "",
    }, drop_empty=("pending",))
    return {"text": text, "stats": st}
