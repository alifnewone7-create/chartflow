"""
Per-user candle session store.

Why this exists
---------------
The shared :class:`CandleStore` (``candle_store.py``) holds ONE rolling
buffer per (asset, period) — every subscriber on the same market reads
from the same in-memory list. That's the right architecture for the
display side, but the product spec for the running-candle wait flow
asks for a stricter guarantee:

  * Every individual user's chart should be backed by their OWN history
    record on disk, captured at the moment their wait gate opened.
  * Subsequent closed buckets for that user are appended to that
    record so their personal candle history is never overwritten by a
    fresh authoritative refresh on the shared buffer.
  * When the user pair-changes / unsubscribes / disconnects, their
    file is deleted — no stale data ever survives a session.

This module owns those per-(ws_id, asset, period) JSON files and
nothing else. It is intentionally tiny: ``create``, ``append_closed``,
``delete``, and ``cleanup_all_for_ws`` are the only public functions.

File layout
-----------
``data/user_sessions/<ws_id>_<asset>_<period>.json`` containing::

    {
      "ws_id": "<ws session id>",
      "asset": "EURUSD_otc",
      "period": 60,
      "created_at": 1714600000.0,
      "updated_at": 1714600060.0,
      "candles": [ {time, open, high, low, close, volume}, ... ]
    }

Writes are atomic (``os.replace`` of a temp file in the same dir) so
partial / corrupt JSON is impossible even if the process is killed
mid-write. Each path also has its own asyncio Lock so concurrent
appends from different streamer ticks for the same user serialize
cleanly.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any

log = logging.getLogger("user-session-store")

# Storage directory. Override via env var if you want to put it on a
# different disk (e.g. tmpfs for ephemeral state).
USER_SESSION_DIR = Path(
    os.getenv("USER_SESSION_DIR", "./data/user_sessions")
).resolve()

# Cap how many candles we keep per user file. Mirrors the shared
# CandleStore's MAX_CANDLES default (200) — older buckets are dropped
# from the front so the file size stays bounded.
USER_SESSION_MAX_CANDLES = int(os.getenv("USER_SESSION_MAX_CANDLES", "200"))

# A per-path lock dict. Guarded by a module-level lock to avoid
# TOCTOU when two coroutines simultaneously look up + create a path
# lock. asyncio Locks are bound to the running event loop, so we
# lazy-create them on first use.
_path_locks: dict[Path, asyncio.Lock] = {}
_locks_dict_lock: asyncio.Lock | None = None


def _get_locks_dict_lock() -> asyncio.Lock:
    global _locks_dict_lock
    if _locks_dict_lock is None:
        _locks_dict_lock = asyncio.Lock()
    return _locks_dict_lock


async def _path_lock(path: Path) -> asyncio.Lock:
    async with _get_locks_dict_lock():
        lock = _path_locks.get(path)
        if lock is None:
            lock = asyncio.Lock()
            _path_locks[path] = lock
        return lock


# Sanitise pieces of the filename to avoid any path traversal / shell
# weirdness if upstream code passes a malformed asset name.
_SAFE_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_segment(s: str) -> str:
    return _SAFE_RE.sub("_", str(s))[:64]


def _path(ws_id: str, asset: str, period: int) -> Path:
    """Return the canonical file path for one (ws_id, asset, period) tuple."""
    name = f"{_safe_segment(ws_id)}_{_safe_segment(asset)}_{int(period)}.json"
    return USER_SESSION_DIR / name


def _ensure_dir() -> None:
    try:
        USER_SESSION_DIR.mkdir(parents=True, exist_ok=True)
    except Exception as exc:  # noqa: BLE001
        log.warning("could not ensure %s: %s", USER_SESSION_DIR, exc)


def _atomic_write(path: Path, payload: dict[str, Any]) -> None:
    """Serialize + atomic-replace. Safe against partial writes."""
    _ensure_dir()
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(payload, f, separators=(",", ":"))
            f.flush()
            try:
                os.fsync(f.fileno())
            except OSError:
                pass
        os.replace(tmp, path)
    except Exception as exc:  # noqa: BLE001
        log.warning("user-session write failed for %s: %s", path, exc)
        with _suppress_errors():
            tmp.unlink(missing_ok=True)


def _read_or_none(path: Path) -> dict[str, Any] | None:
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except Exception as exc:  # noqa: BLE001
        log.warning("user-session read failed for %s: %s — discarding", path, exc)
        return None


class _suppress_errors:
    """Tiny context manager: like contextlib.suppress(Exception) but local."""

    def __enter__(self) -> None:
        return None

    def __exit__(self, *_: Any) -> bool:
        return True


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #


async def create(
    ws_id: str, asset: str, period: int, candles: list[dict[str, Any]]
) -> None:
    """Create / overwrite the per-user file with the initial 199-candle dump.

    Called the moment a subscriber's wait gate opens — the freshly
    re-fetched 199 candles become this user's authoritative starting
    point. Any pre-existing file at the same path (from a previous
    subscription on this ws_id, possibly to a different asset that we
    failed to clean up) is overwritten.
    """
    if not ws_id or not asset:
        return
    path = _path(ws_id, asset, period)
    lock = await _path_lock(path)
    async with lock:
        # Cap to MAX_CANDLES from the *back* — newest is what matters.
        cleaned = [c for c in candles if isinstance(c, dict) and "time" in c]
        if len(cleaned) > USER_SESSION_MAX_CANDLES:
            cleaned = cleaned[-USER_SESSION_MAX_CANDLES:]
        now = time.time()
        _atomic_write(
            path,
            {
                "ws_id": ws_id,
                "asset": asset,
                "period": int(period),
                "created_at": now,
                "updated_at": now,
                "candles": cleaned,
            },
        )


async def append_closed(
    ws_id: str, asset: str, period: int, candle: dict[str, Any]
) -> None:
    """Append (or in-place patch) a closed-bucket candle to the user's file.

    Idempotent: if the candle's ``time`` matches the last entry already
    on disk, the row is updated in place (a corrected close arriving
    via the backend's drain-pending-closed path). If the time is older
    than the last entry, it is dropped — the user's history is
    monotonically forward-only by design.

    The file's ``candles`` list is FIFO-capped at
    :data:`USER_SESSION_MAX_CANDLES`.
    """
    if not ws_id or not asset:
        return
    if not isinstance(candle, dict) or "time" not in candle:
        return
    path = _path(ws_id, asset, period)
    lock = await _path_lock(path)
    async with lock:
        doc = _read_or_none(path)
        if doc is None:
            # No initial dump on disk — defensively start one. This
            # shouldn't happen in normal flow (create() runs first),
            # but a missing file should not silently lose data.
            doc = {
                "ws_id": ws_id,
                "asset": asset,
                "period": int(period),
                "created_at": time.time(),
                "updated_at": time.time(),
                "candles": [],
            }
        candles: list[dict[str, Any]] = doc.get("candles") or []
        try:
            new_t = int(candle["time"])
        except (TypeError, ValueError):
            return
        if candles:
            try:
                last_t = int(candles[-1]["time"])
            except (TypeError, ValueError):
                last_t = -1
            if new_t == last_t:
                # In-place correction.
                candles[-1] = candle
            elif new_t > last_t:
                candles.append(candle)
            else:
                # Older than what we already have — drop.
                return
        else:
            candles.append(candle)
        if len(candles) > USER_SESSION_MAX_CANDLES:
            candles = candles[-USER_SESSION_MAX_CANDLES:]
        doc["candles"] = candles
        doc["updated_at"] = time.time()
        _atomic_write(path, doc)


async def delete(ws_id: str, asset: str, period: int) -> None:
    """Remove the per-user file. Called on unsubscribe / pair-change."""
    if not ws_id or not asset:
        return
    path = _path(ws_id, asset, period)
    lock = await _path_lock(path)
    async with lock:
        try:
            path.unlink(missing_ok=True)
        except Exception as exc:  # noqa: BLE001
            log.debug("user-session delete failed for %s: %s", path, exc)
        # Drop the lock entry too so this dict doesn't grow forever
        # across long-running deployments. The lock dict access is
        # already guarded by the locks-dict lock in _path_lock().
    async with _get_locks_dict_lock():
        _path_locks.pop(path, None)


async def cleanup_all_for_ws(ws_id: str) -> None:
    """Delete every per-user file owned by this WS session.

    Called from the WebSocket disconnect handler. We glob by prefix so
    we catch files whose (asset, period) we may not be tracking in
    memory anymore (e.g. after a pair change followed by disconnect).
    """
    if not ws_id:
        return
    safe_id = _safe_segment(ws_id)
    if not USER_SESSION_DIR.exists():
        return
    pattern = f"{safe_id}_*.json"
    try:
        for p in USER_SESSION_DIR.glob(pattern):
            try:
                p.unlink(missing_ok=True)
            except Exception as exc:  # noqa: BLE001
                log.debug("cleanup unlink %s failed: %s", p, exc)
            # Also drop any in-memory lock entry for that path.
            async with _get_locks_dict_lock():
                _path_locks.pop(p, None)
    except Exception as exc:  # noqa: BLE001
        log.debug("cleanup_all_for_ws(%s) failed: %s", ws_id, exc)


def purge_all_sync() -> int:
    """Synchronous purge of every per-user file.

    Called once on backend bootstrap: every WS session from a previous
    process is gone, so every JSON file in this directory is by
    definition stale. Returns the number of files deleted (best-effort).
    """
    if not USER_SESSION_DIR.exists():
        return 0
    count = 0
    try:
        for p in USER_SESSION_DIR.glob("*.json"):
            try:
                p.unlink(missing_ok=True)
                count += 1
            except Exception as exc:  # noqa: BLE001
                log.debug("purge unlink %s failed: %s", p, exc)
    except Exception as exc:  # noqa: BLE001
        log.debug("purge_all_sync failed: %s", exc)
    if count:
        log.info(
            "user-session purge: removed %d stale files from %s",
            count,
            USER_SESSION_DIR,
        )
    return count
