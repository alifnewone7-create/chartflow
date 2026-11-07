"""Admin-editable Telegram message styles + premium (custom) emoji mapping.

Stored in RTDB under bot_config/ (written by the admin panel):
  bot_config/templates/{signal,result,partial} : str with {placeholders}
  bot_config/emojis/{id}                       : {emoji, emoji_id}
Values for placeholders are always filled by the engine, never by the admin.
"""

from __future__ import annotations

import html
import re
import time
from typing import Any

from . import rtdb
from .timeutil import mono

SEP = "━━━━━━━━━━━━━━━━━━━━"
SEP_R = "━━━━━━━━━━━━━━━━━━━━━"
SEP_P = "━━━━━━━━━・━━━━━━━━━"

PLACEHOLDERS: dict[str, tuple[set[str], set[str]]] = {
    # kind: (allowed, required)
    "signal": ({"asset", "direction", "entry_time", "payout", "mtg"}, {"asset", "direction", "entry_time"}),
    "result": ({"asset", "direction", "entry_time", "result"}, {"asset", "direction", "entry_time", "result"}),
    "partial": ({"date", "total", "rows", "win", "loss", "accuracy", "pending"}, {"rows", "win", "loss"}),
}

DEFAULTS: dict[str, str] = {
    "signal": "\n".join([
        "✨ ChartFlow Ai",
        SEP,
        f"💎 {mono('Asset')} : {{asset}}",
        f"🔥 {mono('Signal')} : {{direction}}",
        f"⏳ {mono('Entry Time')} : {{entry_time}}",
        f"💵 {mono('Payout')} : {{payout}}",
        f"🛡 {mono('MTG')} : {{mtg}}",
        SEP,
    ]),
    "result": "\n".join([
        f"📊 {mono('SIGNAL RESULT')}",
        SEP_R,
        f"💎 {mono('Asset')} : {{asset}}",
        f"🔥 {mono('Signal')} : {{direction}}",
        f"⏳ {mono('Entry Time')} : {{entry_time}}",
        f"🎯 {mono('Result')} : {{result}}",
        SEP_R,
    ]),
    "partial": "\n".join([
        "=========== " + mono("PARTIAL") + " ===========",
        SEP_P,
        "🗓 {date}",
        SEP_P,
        f"☠️ {mono('Total')} : {{total}}",
        SEP_P,
        "{rows}",
        SEP_P,
        f"🔥 {mono('Win')}: {{win}} | ❌ {mono('Loss')}: {{loss}} | ⚖️ Accuracy ({{accuracy}})",
        SEP_P,
        f"⏳ {mono('Pending')}: {{pending}} ({mono('not counted')})",
    ]),
}

_TOKEN = re.compile(r"\{([a-z_]+)\}")
_CACHE: dict[str, Any] = {"at": 0.0, "cfg": {}}
TTL_S = 30


def valid(kind: str, tpl: Any) -> bool:
    if not isinstance(tpl, str) or not tpl.strip():
        return False
    allowed, required = PLACEHOLDERS[kind]
    used = set(_TOKEN.findall(tpl))
    return used <= allowed and required <= used


async def config() -> dict[str, Any]:
    if time.time() - _CACHE["at"] > TTL_S:
        try:
            _CACHE["cfg"] = await rtdb.get("bot_config") or {}
        except Exception:  # noqa: BLE001
            pass
        _CACHE["at"] = time.time()
    return _CACHE["cfg"] if isinstance(_CACHE["cfg"], dict) else {}


async def template(kind: str) -> str:
    tpl = ((await config()).get("templates") or {}).get(kind)
    return tpl if valid(kind, tpl) else DEFAULTS[kind]


def render(tpl: str, values: dict[str, str], drop_empty: tuple[str, ...] = ()) -> str:
    lines = []
    for line in tpl.split("\n"):
        if any(f"{{{k}}}" in line and not values.get(k) for k in drop_empty):
            continue
        lines.append(_TOKEN.sub(lambda m: values.get(m.group(1), m.group(0)), line))
    return "\n".join(lines)


async def emoji_map() -> dict[str, str]:
    raw = (await config()).get("emojis") or {}
    items = raw.values() if isinstance(raw, dict) else raw if isinstance(raw, list) else []
    out: dict[str, str] = {}
    for it in items:
        if isinstance(it, dict):
            e, i = str(it.get("emoji") or "").strip(), str(it.get("emoji_id") or "").strip()
            if e and i.isdigit():
                out[e] = i
    return out


def premium_html(text: str, emojis: dict[str, str]) -> str | None:
    """HTML version of text with mapped emojis as <tg-emoji>; None when nothing to convert."""
    if not emojis:
        return None
    keys = sorted(emojis, key=len, reverse=True)
    pat = re.compile("|".join(re.escape(k) for k in keys))
    if not pat.search(text):
        return None
    out, last = [], 0
    for m in pat.finditer(text):
        out.append(html.escape(text[last:m.start()], quote=False))
        out.append(f'<tg-emoji emoji-id="{emojis[m.group(0)]}">{html.escape(m.group(0), quote=False)}</tg-emoji>')
        last = m.end()
    out.append(html.escape(text[last:], quote=False))
    return "".join(out)
