"""M1 time synchronisation + display formatting (Asia/Dhaka)."""

from __future__ import annotations

import time
from datetime import datetime
from zoneinfo import ZoneInfo

M1 = 60
TZ = ZoneInfo("Asia/Dhaka")


def now() -> float:
    return time.time()


def minute_floor(ts: float) -> int:
    return int(ts // M1) * M1


def next_entry(ts: float | None = None, min_lead_s: int = 0) -> int:
    """Start of the next whole minute that is at least ``min_lead_s`` away."""
    t = now() if ts is None else ts
    entry = minute_floor(t) + M1
    while entry - t < min_lead_s:
        entry += M1
    return entry


def hhmm(ts: int) -> str:
    return datetime.fromtimestamp(ts, TZ).strftime("%H:%M")


def report_date(ts: float) -> str:
    return datetime.fromtimestamp(ts, TZ).strftime("%d.%m. %Y")


_MONO_UPPER = 0x1D670
_MONO_LOWER = 0x1D68A
_MONO_DIGIT = 0x1D7F6


def mono(text: str) -> str:
    """Convert ASCII letters/digits to Unicode Mathematical Monospace."""
    out = []
    for ch in text:
        if "A" <= ch <= "Z":
            out.append(chr(_MONO_UPPER + ord(ch) - 65))
        elif "a" <= ch <= "z":
            out.append(chr(_MONO_LOWER + ord(ch) - 97))
        elif "0" <= ch <= "9":
            out.append(chr(_MONO_DIGIT + ord(ch) - 48))
        else:
            out.append(ch)
    return "".join(out)


def is_otc(symbol: str) -> bool:
    return symbol.lower().endswith("_otc")


def pretty_asset(symbol: str, name: str | None = None) -> str:
    """USDINR_otc -> 'USD/INR (OTC)'."""
    base = symbol.upper().replace("_OTC", "")
    if len(base) == 6 and base.isalpha():
        label = f"{base[:3]}/{base[3:]}"
    else:
        label = (name or base).replace("(OTC)", "").strip()
    return f"{label} (OTC)" if is_otc(symbol) else label


def compact_asset(symbol: str) -> str:
    """USDINR_otc -> 'USDINR-OTC' (report lines)."""
    base = symbol.upper().replace("_OTC", "")
    return f"{base}-OTC" if is_otc(symbol) else base
