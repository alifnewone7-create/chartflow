"""Firebase RTDB repository + auth helpers (Admin SDK, backend only)."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Callable

import firebase_admin
from firebase_admin import auth as fb_auth
from firebase_admin import credentials, db

log = logging.getLogger("signal-engine.rtdb")

DEFAULT_DB_URL = "https://chartflow-ai-476d2-default-rtdb.asia-southeast1.firebasedatabase.app"
PREMIUM_TIERS = {"basic", "smart", "pro", "dominator", "personal"}
TIERS = {"free", *PREMIUM_TIERS}

_app: firebase_admin.App | None = None


def _parse_service_account(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if not text.startswith("{") and os.path.isfile(text):
        with open(text, encoding="utf-8") as fh:
            text = fh.read()
    try:
        sa = json.loads(text)
    except json.JSONDecodeError:
        sa = json.loads(text.replace('\\"', '"').replace("\r\n", "\\n").replace("\n", "\\n"))
    if isinstance(sa.get("private_key"), str):
        sa["private_key"] = sa["private_key"].replace("\\n", "\n")
    return sa


def init() -> bool:
    """Initialise the Admin SDK from FIREBASE_SERVICE_ACCOUNT (JSON or file path)."""
    global _app
    if _app is not None:
        return True
    raw = os.getenv("FIREBASE_SERVICE_ACCOUNT", "").strip()
    if not raw:
        log.error("FIREBASE_SERVICE_ACCOUNT is not set — signal engine disabled")
        return False
    url = os.getenv("FIREBASE_DATABASE_URL", DEFAULT_DB_URL).strip()
    _app = firebase_admin.initialize_app(
        credentials.Certificate(_parse_service_account(raw)), {"databaseURL": url}, name="signal-engine"
    )
    return True


def ready() -> bool:
    return _app is not None


def ref(path: str) -> db.Reference:
    return db.reference(path or "/", app=_app)


async def get(path: str) -> Any:
    return await asyncio.to_thread(lambda: ref(path).get())


async def set_(path: str, value: Any) -> None:
    await asyncio.to_thread(lambda: ref(path).set(value))


async def update(path: str, value: dict[str, Any]) -> None:
    """Atomic multi-path update rooted at ``path``."""
    await asyncio.to_thread(lambda: ref(path).update(value))


async def delete(path: str) -> None:
    await asyncio.to_thread(lambda: ref(path).delete())


async def transaction(path: str, fn: Callable[[Any], Any]) -> Any:
    """Run ``fn`` atomically; ``fn`` returns the new value (return the input unchanged to abort)."""
    return await asyncio.to_thread(lambda: ref(path).transaction(fn))


async def create_if_absent(path: str, value: Any) -> bool:
    """Atomically write ``value`` only when the node is empty. Returns True if we wrote it."""
    won = {"v": False}

    def fn(cur: Any) -> Any:
        if cur is not None:
            won["v"] = False
            return cur
        won["v"] = True
        return value

    await transaction(path, fn)
    return won["v"]


async def verify_token(token: str) -> dict[str, Any] | None:
    try:
        return await asyncio.to_thread(lambda: fb_auth.verify_id_token(token, app=_app))
    except Exception as exc:  # noqa: BLE001
        log.info("id token rejected: %s", exc)
        return None


async def user_tier(uid: str) -> str:
    tier = str((await get(f"users/{uid}/tier")) or "").strip().lower()
    return tier if tier in TIERS else "free"


def is_premium(tier: str) -> bool:
    return tier in PREMIUM_TIERS
