"""
Quotex live chart backend.

Flow
----
  1. You start this script in a terminal (`python main.py`).
  2. It prompts for Quotex email / password in the terminal.
  3. pyquotex connects; if 2FA is required it will prompt for the code
     directly in the terminal (native pyquotex behaviour).
  4. Once logged in, a WebSocket + HTTP server starts on 0.0.0.0:8000.
  5. The Next.js website opens a WebSocket to ws://<host>:8000/ws and:
        - receives the full asset list (all markets) on connect
        - subscribes to whichever asset/timeframe the user picks
        - receives historical candles + live updates
  6. ALSO: a public, always-running USD/BRL OTC 60s stream is started
     automatically on bootstrap. The marketing site (home page) connects
     to /public-otc/ws and receives an immediate snapshot of the rolling
     history buffer plus live candle updates — no subscribe handshake,
     no per-visitor upstream cost.

IMPORTANT: keep your VPN active before running this script, otherwise
Quotex will block the connection.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import signal
import sys
import time
import uuid
from contextlib import suppress
from getpass import getpass
from pathlib import Path
from typing import Any

# --------------------------------------------------------------------------- #
# Load .env file (production deployment on VPS reads credentials from here)
# --------------------------------------------------------------------------- #
# Best-effort: if python-dotenv is installed we auto-load python_backend/.env
# so systemd / Docker / bare uvicorn launches all see QUOTEX_EMAIL etc. without
# anyone having to `export` them by hand. Missing dotenv is NOT fatal — local
# dev users can still type their credentials at the terminal prompt.
try:
    from dotenv import load_dotenv  # type: ignore

    _env_path = Path(__file__).resolve().parent / ".env"
    if _env_path.exists():
        load_dotenv(_env_path)
except Exception:
    pass

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import hmac
import uvicorn

from simple_buffer import SimpleBuffer, MAX_CANDLES
from quotex_session import QuotexSession
from live_collector import LiveCollector
from strategies import analyze as strategies_analyze
import user_session_store
from delayed_replay import recorder as replay_recorder, router as replay_router
import signal_engine
import pyquotex.http.login as _pq_login

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("quotex-backend")


# --------------------------------------------------------------------------- #
# Silence uvicorn access-log noise from unauthorized WS handshakes.
# --------------------------------------------------------------------------- #
# When an unallowed origin (or invalid shared secret) hits /ws or
# /public-otc/ws we close the socket with HTTP 403/401 BEFORE accept().
# Uvicorn's default access logger then emits three INFO lines per
# attempt:
#   - WebSocket /public-otc/ws" 403
#   - connection rejected (403 Forbidden)
#   - connection closed
# At any meaningful probe rate that floods the console and buries real
# events. We attach a filter to ``uvicorn.access`` and ``uvicorn.error``
# that drops those specific lines while leaving every other access log
# intact (legit 101/200/etc. still show up).
class _DropRejectedHandshakes(logging.Filter):
    _PATTERNS = (
        '" 403',
        '" 401',
        "connection rejected (403",
        "connection rejected (401",
    )

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            msg = record.getMessage()
        except Exception:
            return True
        if any(p in msg for p in self._PATTERNS):
            return False
        # Also drop the trailing "connection closed" line that follows
        # an immediate-reject handshake. We can't tell from the message
        # alone whether it followed a 403 or a real disconnect, but in
        # practice rejected sockets are by far the dominant source of
        # this line on a public endpoint, and legitimate disconnects
        # are already logged elsewhere with more context.
        if msg.strip() == "connection closed":
            return False
        return True


for _name in ("uvicorn.access", "uvicorn.error"):
    logging.getLogger(_name).addFilter(_DropRejectedHandshakes())

# Silence chatty third-party loggers. pyquotex pulls in `websockets` and
# `engineio`/`socketio` which spam DEBUG-level frame dumps for every single
# tick — at ~10 ticks/sec across multiple assets this fills disk fast and
# buries our own INFO/ERROR messages. Cap them at WARNING so we still see
# real problems but not the per-frame chatter.
for _noisy in (
    "websockets",
    "websockets.client",
    "websockets.server",
    "websockets.protocol",
    "engineio",
    "engineio.client",
    "socketio",
    "socketio.client",
    "urllib3",
    "asyncio",
):
    logging.getLogger(_noisy).setLevel(logging.WARNING)

# --------------------------------------------------------------------------- #
# Globals (single-user backend)
# --------------------------------------------------------------------------- #

session: QuotexSession | None = None
connected_clients: set[WebSocket] = set()
# key = (asset, period) -> websockets subscribed to that pair
subscriptions: dict[tuple[str, int], set[WebSocket]] = {}
streamer_tasks: dict[tuple[str, int], asyncio.Task] = {}

# Per-WebSocket session metadata. Each connected client gets a unique
# ``ws_id`` (used as the prefix for its per-user JSON file in
# :pymod:`user_session_store`) and ``active_sub`` tracks the single
# (asset, period) pair the client currently has open. The "single pair
# per user" requirement is enforced server-side by auto-unsubscribing
# the previous active_sub the moment a new subscribe arrives.
connected_clients_meta: dict[WebSocket, dict[str, Any]] = {}

# Per access-token -> the single live WebSocket allowed for that user.
# When a second tab / browser / device opens the same access token, the
# new socket evicts the old one with a ``session_replaced`` close so the
# backend never accumulates duplicate clients for one user. This is the
# server-side counterpart to the frontend single-pair lock — the lock
# keeps two tabs in the same browser from racing on chart state, and
# this map keeps the *transport* layer to one socket per user across
# every browser and device.
active_token_ws: dict[str, WebSocket] = {}

# Per-(asset, period) set of subscribers that have passed the
# "wait for closing running candle" gate. Frames of type ``candle`` and
# ``history`` from the shared streamer are only delivered to subscribers
# in this set — gated subscribers see ``phase`` frames only.
released_subscribers: dict[tuple[str, int], set[WebSocket]] = {}

# Per-(ws, key) reference to the wait task spawned by ``_subscribe`` so
# we can cancel it on early unsubscribe / disconnect (otherwise the
# task would wake up after the user is gone, do a wasted history fetch,
# and try to send to a dead WebSocket).
pending_release_tasks: dict[
    tuple[int, tuple[str, int]], asyncio.Task
] = {}

# Per-(asset, period) bookkeeping for the on-release history refetch
# dedupe. Multiple subscribers waking on the same bucket close share a
# single fresh ``get_history`` call instead of hammering the broker N
# times in parallel.
release_refetch_done: dict[tuple[str, int], int] = {}
release_refetch_locks: dict[tuple[str, int], asyncio.Lock] = {}

# Grace period after the bucket boundary before we re-fetch history.
# Quotex publishes a closed bucket ~0.5-1 s after wall-clock close, so
# we sleep slightly past the boundary to be sure the new closed candle
# is included in the get_history response.
RELEASE_GRACE_S = float(os.getenv("RELEASE_GRACE_S", "0.75"))

# Per-(asset, period) rolling buffer of the merged history + live candle
# stream. Now backed by ``CandleStore`` (JSON-persisted, capped at 200
# candles, with closed-bucket lock semantics) so:
#
#   1. A fresh subscriber on an already-running streamer instantly gets
#      the full back-history replayed (originally the fix for the
#      "sometimes only recent candles show up" bug).
#   2. A user who briefly leaves a market and comes back sees the chart
#      render immediately from the persisted buffer while the new
#      streamer task fetches a fresh authoritative history in the
#      background.
#   3. Closed candles can no longer be silently overwritten by a stale /
#      buggy late tick — the store locks every bucket the moment it
#      rolls over, fixing the "maje maje candle vul dekhay" bug.
#   4. The Node.js website always shows exactly MAX_CANDLES (= 200)
#      candles. Each new bucket pushes the oldest off the back.
#
# ``live_buffers`` is kept as a thin read-mirror of the store's internal
# dict so existing read sites (``live_buffers.get(key)`` etc.) keep
# working without churning every call site.
LIVE_BUFFER_MAX = MAX_CANDLES
LIVE_BUFFER_TARGET = 100  # we keep retrying history until at least this many

candle_store = SimpleBuffer()
live_buffers: dict[tuple[str, int], list[dict[str, Any]]] = candle_store._buffers  # type: ignore[attr-defined]

# Per-(asset, period) warm-up gate. A subscriber that joins a brand-new
# market sees `{"type": "loading"}` immediately, and only receives the
# 200-candle snapshot once BOTH (a) ``get_history`` has succeeded for
# this key, AND (b) at least one live tick for the *current* bucket has
# been recorded. This ensures that a chart never renders intermediate
# state where the forming candle is missing or stale, satisfying the
# "1 second er jonno o vul candle dekhabe na" requirement.
warm_up_ready: dict[tuple[str, int], asyncio.Event] = {}


def _get_warm_up_event(key: tuple[str, int]) -> asyncio.Event:
    ev = warm_up_ready.get(key)
    if ev is None:
        ev = asyncio.Event()
        warm_up_ready[key] = ev
    return ev


# Time we'll wait for the first live tick before falling back to a
# history-only snapshot. Quotex emits OTC ticks several times per
# second on liquid pairs, so 5 s is generous; a fully dead pair will
# still surface its 199 closed candles after this fallback.
WARM_UP_FIRST_TICK_TIMEOUT_S = float(
    os.getenv("WARM_UP_FIRST_TICK_TIMEOUT_S", "5.0")
)

# --- Concurrency caps ----------------------------------------------------- #
# Hard cap on how many (asset, period) streamers can run at once. Beyond
# this we refuse new subscriptions with a clear error so pyquotex isn't
# overloaded and the on-disk JSON store doesn't grow unbounded. Public
# OTC counts as one of the 50 (it grabs a slot on startup), leaving 49
# slots for chart subscribers.
MAX_ACTIVE_MARKETS = int(os.getenv("MAX_ACTIVE_MARKETS", "50"))

# --- ALWAYS-ON MARKETS (all markets stream 24/7) -------------------------- #
# When enabled, the backend subscribes to EVERY configured market x period
# right after login and keeps collecting tick-by-tick data forever — even
# when no browser is connected. A user opening any chart then joins an
# already-warm shared session and sees the full 200-candle chart + live
# ticks INSTANTLY (no "waiting for running candle" overlay).
#
#   ALWAYS_ON_ENABLED   1 / 0                         (default 1)
#   ALWAYS_ON_MARKETS   "allowed" | "all" | CSV list  (default "allowed")
#       allowed -> the same 43-market allow-list the website shows
#       all     -> every OPEN OTC market the broker exposes
#       CSV     -> explicit symbols, e.g. "EURUSD_otc,USDBRL_otc"
#   ALWAYS_ON_PERIODS   CSV of candle sizes in seconds (default "60,15" —
#                       60 = chart-to-signal / 2-candle, 15 = 15s page)
#   ALWAYS_ON_REFRESH_S how often the keeper re-checks health / newly
#                       opened markets (default 60)
#
# Always-on streams do NOT count against MAX_ACTIVE_MARKETS (that cap now
# only limits extra, non-always-on markets a user may request).
ALWAYS_ON_ENABLED = os.getenv("ALWAYS_ON_ENABLED", "1").strip().lower() in {
    "1", "true", "yes", "on",
}
ALWAYS_ON_MARKETS = os.getenv("ALWAYS_ON_MARKETS", "allowed").strip() or "allowed"
ALWAYS_ON_PERIODS: list[int] = [
    int(p) for p in os.getenv("ALWAYS_ON_PERIODS", "60,15").replace(" ", "").split(",")
    if p.strip().isdigit() and int(p) > 0
] or [60]
ALWAYS_ON_REFRESH_S = float(os.getenv("ALWAYS_ON_REFRESH_S", "60"))
# Delay after the aligned subscribe burst before background history fetches
# start, so every market's subscribe reply has landed first.
ALWAYS_ON_HISTORY_DELAY_S = float(os.getenv("ALWAYS_ON_HISTORY_DELAY_S", "3"))

# --- MINUTE-ALIGNED COLLECTION START -------------------------------------- #
# After login the backend does NOT start collecting market data
# immediately. It waits for the next wall-clock boundary of
# COLLECTION_ALIGN_S seconds (default 60 = start of the next minute).
# Example: server logged in at 06:45:20 -> every market (always-on,
# public OTC, and any chart a user opens) starts collecting at 06:46:00
# sharp, so the first collected candle is a complete one.
# Set COLLECTION_ALIGN_S=0 to start immediately.
COLLECTION_ALIGN_S = int(os.getenv("COLLECTION_ALIGN_S", "60"))
_collection_start_at: float = 0.0


def _schedule_collection_start() -> float:
    """Compute the next aligned boundary (strictly in the future)."""
    global _collection_start_at
    now = time.time()
    if COLLECTION_ALIGN_S <= 0:
        _collection_start_at = now
    else:
        _collection_start_at = float((int(now) // COLLECTION_ALIGN_S + 1) * COLLECTION_ALIGN_S)
    return _collection_start_at


async def _wait_collection_start() -> None:
    """Sleep until the scheduled minute boundary (no-op once passed)."""
    while True:
        remaining = _collection_start_at - time.time()
        if remaining <= 0:
            return
        await asyncio.sleep(min(remaining, 0.5))

# REST fallback throttle. The WebSocket tick stream is the primary data
# source; the REST ``get_candles`` fallback only fires for a market whose
# live ticks have been silent for REST_FALLBACK_STALE_S. With ~90 streams
# running at once an unconditional 1 s REST poll per stream would flood
# the broker and get the account throttled.
REST_FALLBACK_STALE_S = float(os.getenv("REST_FALLBACK_STALE_S", "3"))
REST_FALLBACK_MIN_INTERVAL_S = float(os.getenv("REST_FALLBACK_MIN_INTERVAL_S", "1"))
REST_FALLBACK_SLOW_INTERVAL_S = float(os.getenv("REST_FALLBACK_SLOW_INTERVAL_S", "10"))

# Python mirror of ``lib/allowed-markets.ts`` (keep both in sync).
# (label, [symbols], name-regex)
ALLOWED_MARKETS_PY: list[tuple[str, list[str], str]] = [
    ("EUR/USD (OTC)", ["EURUSD_otc"], r"eur.*usd"),
    ("GBP/USD (OTC)", ["GBPUSD_otc"], r"gbp.*usd"),
    ("USD/JPY (OTC)", ["USDJPY_otc"], r"usd.*jpy"),
    ("EUR/JPY (OTC)", ["EURJPY_otc"], r"eur.*jpy"),
    ("GBP/JPY (OTC)", ["GBPJPY_otc"], r"gbp.*jpy"),
    ("USD/CHF (OTC)", ["USDCHF_otc"], r"usd.*chf"),
    ("AUD/USD (OTC)", ["AUDUSD_otc"], r"aud.*usd"),
    ("USD/CAD (OTC)", ["USDCAD_otc"], r"usd.*cad"),
    ("NZD/USD (OTC)", ["NZDUSD_otc"], r"nzd.*usd"),
    ("EUR/GBP (OTC)", ["EURGBP_otc"], r"eur.*gbp"),
    ("AUD/JPY (OTC)", ["AUDJPY_otc"], r"aud.*jpy"),
    ("EUR/AUD (OTC)", ["EURAUD_otc"], r"eur.*aud"),
    ("GBP/AUD (OTC)", ["GBPAUD_otc"], r"gbp.*aud"),
    ("CAD/CHF (OTC)", ["CADCHF_otc"], r"cad.*chf"),
    ("NZD/JPY (OTC)", ["NZDJPY_otc"], r"nzd.*jpy"),
    ("EUR/CAD (OTC)", ["EURCAD_otc"], r"eur.*cad"),
    ("GBP/CAD (OTC)", ["GBPCAD_otc"], r"gbp.*cad"),
    ("AUD/CAD (OTC)", ["AUDCAD_otc"], r"aud.*cad"),
    ("CHF/JPY (OTC)", ["CHFJPY_otc"], r"chf.*jpy"),
    ("NZD/CHF (OTC)", ["NZDCHF_otc"], r"nzd.*chf"),
    ("AUD/CHF (OTC)", ["AUDCHF_otc"], r"aud.*chf"),
    ("CAD/JPY (OTC)", ["CADJPY_otc"], r"cad.*jpy"),
    ("EUR/NZD (OTC)", ["EURNZD_otc"], r"eur.*nzd"),
    ("GBP/NZD (OTC)", ["GBPNZD_otc"], r"gbp.*nzd"),
    ("NZD/CAD (OTC)", ["NZDCAD_otc"], r"nzd.*cad"),
    ("USD/BRL (OTC)", ["USDBRL_otc"], r"usd.*brl"),
    ("USD/MXN (OTC)", ["USDMXN_otc"], r"usd.*mxn"),
    ("USD/ARS (OTC)", ["USDARS_otc"], r"usd.*ars"),
    ("USD/PKR (OTC)", ["USDPKR_otc"], r"usd.*pkr"),
    ("USD/PHP (OTC)", ["USDPHP_otc"], r"usd.*php"),
    ("Binance Coin (OTC)", ["BNBUSD_otc", "BNB_otc"], r"binance.*coin|\bbnb\b"),
    ("Bitcoin (OTC)", ["BTCUSD_otc", "BTC_otc"], r"\bbitcoin\b|\bbtc\b"),
    ("Ethereum (OTC)", ["ETHUSD_otc", "ETH_otc"], r"\bethereum\b|\beth\b"),
    ("Trump (OTC)", ["TRUMPUSD_otc", "TRUMP_otc"], r"\btrump\b"),
    ("Toncoin (OTC)", ["TONUSD_otc", "TON_otc", "TONCOIN_otc"], r"\btoncoin\b|\bton\b"),
    ("UKBrent (OTC)", ["UKBrent_otc", "BRENT_otc", "UKOIL_otc"], r"uk.*brent|brent"),
    ("Gold (OTC)", ["XAUUSD_otc", "GOLD_otc"], r"\bgold\b|xauusd"),
    ("Silver (OTC)", ["XAGUSD_otc", "SILVER_otc"], r"\bsilver\b|xagusd"),
    ("USCrude (OTC)", ["USCrude_otc", "WTI_otc", "USOIL_otc"], r"us.*crude|wti|usoil"),
    ("Intel (OTC)", ["INTC_otc"], r"\bintel\b|intc"),
    ("Microsoft (OTC)", ["MSFT_otc"], r"microsoft|msft"),
    ("Facebook Inc (OTC)", ["FB_otc", "META_otc"], r"facebook|\bmeta\b|\bfb\b"),
    ("American Express (OTC)", ["AXP_otc"], r"american.*express|amex|axp"),
]

# Horizontal history fetching. Concurrent ``get_history`` calls share
# pyquotex's internal candle buffer, which is the actual root cause of
# the "kichu candle proper dekhay na, vul dekhacche" bug — when several
# fetches arrive together the broker returns partial/stale rows. By
# serialising history fetches across the whole process (semaphore = 1)
# and inserting a small inter-fetch delay we let the buffer settle
# between calls so every pair gets clean 199-candle history.
HISTORY_FETCH_CONCURRENCY = int(os.getenv("HISTORY_FETCH_CONCURRENCY", "1"))
HISTORY_FETCH_INTER_DELAY = float(os.getenv("HISTORY_FETCH_INTER_DELAY", "0.25"))

_history_fetch_semaphore: asyncio.Semaphore | None = None
_history_last_fetch_at: float = 0.0


def _get_history_semaphore() -> asyncio.Semaphore:
    """Lazy-init so the semaphore binds to the running event loop."""
    global _history_fetch_semaphore
    if _history_fetch_semaphore is None:
        _history_fetch_semaphore = asyncio.Semaphore(max(1, HISTORY_FETCH_CONCURRENCY))
    return _history_fetch_semaphore


async def _fetch_history_serialized(
    sess: QuotexSession, asset: str, period: int, count: int
) -> list[dict[str, Any]]:
    """Acquire the global history-fetch slot, space requests apart, fetch.

    This is the "horizontal" fetch the product spec asks for: at most
    ``HISTORY_FETCH_CONCURRENCY`` (default 1) ``get_history`` call is in
    flight at any time, and consecutive calls are separated by at least
    ``HISTORY_FETCH_INTER_DELAY`` seconds so pyquotex's internal candle
    buffer can settle between requests. Both the per-pair streamer
    history pull and the public-OTC bootstrap share this gate.
    """
    global _history_last_fetch_at
    sem = _get_history_semaphore()
    async with sem:
        now = time.time()
        wait = HISTORY_FETCH_INTER_DELAY - (now - _history_last_fetch_at)
        if wait > 0:
            await asyncio.sleep(wait)
        try:
            return await sess.get_history(asset, period, count=count)
        finally:
            _history_last_fetch_at = time.time()


# --- Live-tick freshness + throttled REST fallback ------------------------ #
# asset -> (last seen ``session._last_tick[asset]`` value, local monotonic
# time at which that value was first observed). Local clock is used so a
# skewed broker timestamp can't make a healthy stream look stale.
_tick_seen: dict[str, tuple[Any, float]] = {}
_rest_last_call: dict[tuple[str, int], float] = {}


def _asset_tick_age(asset: str) -> float:
    """Seconds since the last *live* tick for ``asset`` (inf = never)."""
    if session is None:
        return float("inf")
    cur = session._last_tick.get(asset)  # type: ignore[attr-defined]
    now = time.monotonic()
    if cur is None:
        return float("inf")
    rec = _tick_seen.get(asset)
    if rec is None or rec[0] != cur:
        _tick_seen[asset] = (cur, now)
        return 0.0
    return now - rec[1]


async def _maybe_rest_fallback(asset: str, period: int) -> dict[str, Any] | None:
    """Call the REST forming-candle fallback ONLY when it is really needed.

    * Skipped while the WS tick stream for ``asset`` is fresh.
    * Rate-limited per (asset, period): every REST_FALLBACK_MIN_INTERVAL_S,
      backing off to REST_FALLBACK_SLOW_INTERVAL_S once the market has been
      silent for over a minute (closed / dead pair).
    * Shares the global broker-request semaphore with history fetches so
      concurrent ``get_candles`` calls never corrupt pyquotex's single
      shared candle buffer. Non-blocking: if the slot is busy we skip.
    """
    if session is None:
        return None
    age = _asset_tick_age(asset)
    if age < REST_FALLBACK_STALE_S:
        return None
    interval = (
        REST_FALLBACK_MIN_INTERVAL_S if age < 60 else REST_FALLBACK_SLOW_INTERVAL_S
    )
    key = (asset, period)
    now = time.monotonic()
    if now - _rest_last_call.get(key, 0.0) < interval:
        return None
    sem = _get_history_semaphore()
    if sem.locked():
        return None
    _rest_last_call[key] = now
    prev_seen = _tick_seen.get(asset)
    async with sem:
        c = await session.fetch_forming_candle_rest(asset, period)
    # A REST-fed price must NOT count as a live tick, otherwise the
    # freshness check would think the WS stream recovered.
    cur = session._last_tick.get(asset)  # type: ignore[attr-defined]
    _tick_seen[asset] = (cur, prev_seen[1] if prev_seen else float("-inf"))
    return c


def _validate_history(
    candles: list[dict[str, Any]], period: int, *, min_count: int = 10
) -> tuple[bool, str]:
    """Return ``(ok, reason)`` for a freshly fetched history slice.

    A history fetch is only accepted into the persistent store if it
    passes every check below — otherwise it's rejected and the caller
    retries. This prevents the "vul candle" bug from getting baked into
    the on-disk JSON.

    .. note::

       ``min_count`` was tightened from 50 to 10 to support VPS-side
       chunked fetching. The new ``get_history`` walk-back accumulator
       returns whatever the broker delivers (could be as few as 10-20
       candles on the very first fetch right after a cold connect when
       only a few chunks arrived in time), and we'd rather show those
       than discard them and leave the chart empty. The chunked fetch
       keeps growing in the background and the rolling-tick poller
       fills in newer buckets, so a partial first paint converges to
       the full 199-candle view within seconds.
    """
    if not candles:
        return False, "empty"
    if len(candles) < min_count:
        return False, f"too few candles ({len(candles)} < {min_count})"
    if period <= 0:
        return True, "ok"
    last_t = -1
    for i, c in enumerate(candles):
        try:
            t = int(c["time"])
            o = float(c["open"])
            h = float(c["high"])
            lo = float(c["low"])
            cl = float(c["close"])
        except (KeyError, TypeError, ValueError):
            return False, f"malformed candle at index {i}"
        # Period-alignment: every candle must sit on a bucket boundary.
        if t % period != 0:
            return False, f"unaligned time {t} at index {i} (period={period})"
        # Monotonic non-decreasing time (duplicates are fine — we'll
        # dedupe — but going backwards means corrupt data).
        if t < last_t:
            return False, f"non-monotonic time at index {i}: {t} < {last_t}"
        last_t = t
        # OHLC sanity. NaN/Inf survive float() so check them explicitly.
        for name, v in (("open", o), ("high", h), ("low", lo), ("close", cl)):
            if v != v or v in (float("inf"), float("-inf")):  # NaN or Inf
                return False, f"non-finite {name} at index {i}"
            if v <= 0:
                return False, f"non-positive {name}={v} at index {i}"
        if not (lo <= min(o, cl) and max(o, cl) <= h):
            return False, (
                f"OHLC inconsistent at index {i}: "
                f"o={o} h={h} l={lo} c={cl}"
            )
    return True, "ok"

# --- Public OTC stream (always-running, shared by every home-page visitor) - #
PUBLIC_OTC_PERIOD = 60
PUBLIC_OTC_BUFFER_SIZE = MAX_CANDLES
# The hint we use to find the right symbol in the asset list. The actual
# symbol pyquotex returns is usually "USDBRL_otc" but this lets us be
# flexible across forks / market name changes.
PUBLIC_OTC_HINT = os.getenv("PUBLIC_OTC_HINT", "USDBRL").upper()

public_otc_state: dict[str, Any] = {
    "asset": None,           # resolved symbol once found
    "candles": [],           # rolling buffer of last N candles
    "last_update": 0.0,      # wall-clock time of last broadcast
    "ready": False,          # True once we've sent at least one snapshot
    # --- Boot-time running-candle gate -------------------------------- #
    # When the backend starts mid-bucket (e.g. wall-clock 19:12:35 while
    # the 19:12:00 candle is still forming), we MUST NOT push any chart
    # data to the frontend yet — otherwise users see a partially-formed
    # candle that the home page is supposed to wait for. Once the boot
    # bucket closes (19:13:00) we re-fetch a fresh 199-candle history
    # so the just-closed candle is included as the most recent closed
    # bar, then open the gate and start broadcasting. From that moment
    # the live tick stream paints the new (200th) forming bucket from
    # scratch and OHLC locking semantics of CandleStore take over as
    # usual.
    "gate_open": False,      # True after the running-at-boot candle has closed
    "boot_bucket_start": 0,  # epoch-sec start of the bucket in flight at boot
}
public_otc_clients: set[WebSocket] = set()


app = FastAPI(title="Quotex Live Chart Backend")
app.include_router(replay_router)
app.include_router(signal_engine.router)

# --------------------------------------------------------------------------- #
# Origin allow-list (defense against unauthorized 3rd-party sites stealing
# the live tick stream)
# --------------------------------------------------------------------------- #
#
# Background
# ----------
# Starlette's ``CORSMiddleware`` only governs HTTP — it does NOT apply to
# WebSocket handshakes. That means even with a strict ALLOWED_ORIGINS list,
# a browser on any third-party site could still open
# ``wss://api.chartflow.online/ws`` and pull live ticks. The fix is
# to read the ``Origin`` header on every websocket handshake (browsers
# always send it on cross-origin WS upgrades and JS cannot spoof it) and
# reject the connection before ``ws.accept()``. We also add an HTTP
# middleware that enforces the same rule on REST endpoints with
# state-changing intent, in case ``ALLOWED_ORIGINS`` is left wide open.
#
# Production
# ----------
# Set ``ALLOWED_ORIGINS`` to a comma-separated list of fully-qualified
# origins, e.g.
#   ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
# Wildcards like ``https://*.yourdomain.com`` are supported via
# fnmatch-style matching. Origin enforcement on the WebSocket can be
# turned off (NOT recommended) by setting ``ALLOW_ANY_ORIGIN=1`` — useful
# only for local curl / wscat debugging.
#
# Optional shared secret
# ----------------------
# Browsers can't spoof Origin, but non-browser clients (curl, custom
# scripts, scrapers) can. If you set ``WS_SHARED_SECRET`` the backend
# will additionally require ``?key=<secret>`` on the WS URL or an
# ``X-API-Key`` header on REST. The frontend embeds it via
# NEXT_PUBLIC_WS_SHARED_SECRET when it's safe for that environment, or
# proxies through your own server when it isn't.
import fnmatch as _fnmatch

_allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
if _allowed_origins_env:
    _allowed_origins: list[str] = [
        o.strip().rstrip("/")
        for o in _allowed_origins_env.split(",")
        if o.strip()
    ]
else:
    _allowed_origins = ["https://chartflow.online", "https://www.chartflow.online"]

# Only ALLOWED_ORIGINS may connect by default (set ALLOW_ANY_ORIGIN=1 to allow every website).
_allow_any_origin = (
    os.getenv("ALLOW_ANY_ORIGIN", "0").strip().lower() in ("1", "true", "yes")
    or _allowed_origins == ["*"]
)
_ws_shared_secret = os.getenv("WS_SHARED_SECRET", "").strip() or None

if _allow_any_origin:
    log.warning(
        "ALLOWED_ORIGINS not configured (or ALLOW_ANY_ORIGIN=1) — "
        "any website can connect to this backend. Set ALLOWED_ORIGINS "
        "in production to restrict access."
    )


def _origin_allowed(origin: str | None) -> bool:
    """
    Return True if ``origin`` matches the configured allow-list.

    - ``None`` / empty origin (e.g. server-to-server, native apps,
      curl without --header) is rejected unless ``ALLOW_ANY_ORIGIN=1``.
      Browsers always set this header on cross-origin WS handshakes,
      so a missing Origin from a browser context is suspicious.
    - Exact match (case-insensitive, trailing-slash-insensitive) wins.
    - fnmatch-style wildcards are supported, e.g.
      ``https://*.yourdomain.com``.
    """
    if _allow_any_origin:
        return True
    if not origin:
        return False
    norm = origin.strip().rstrip("/").lower()
    for allowed in _allowed_origins:
        a = allowed.lower()
        if norm == a:
            return True
        if "*" in a and _fnmatch.fnmatchcase(norm, a):
            return True
    return False


def _shared_secret_ok(provided: str | None) -> bool:
    """Constant-time comparison against ``WS_SHARED_SECRET`` if set."""
    if _ws_shared_secret is None:
        return True
    if not provided:
        return False
    return hmac.compare_digest(provided, _ws_shared_secret)


# CORS middleware. Note this only covers HTTP — WebSocket handshakes are
# guarded separately inside each ``@app.websocket`` handler.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_any_origin else _allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _cors_error_response(request, payload: dict, status_code: int) -> JSONResponse:
    """
    Build an error JSONResponse that still carries the appropriate CORS
    headers, so that browsers can actually surface the body / status to
    the page instead of swallowing it as an opaque CORS failure.

    This is needed because ``_origin_guard_http`` short-circuits the
    request *before* ``CORSMiddleware`` gets a chance to attach the
    ``Access-Control-Allow-Origin`` header (the guard runs on the outer
    side of the middleware stack), so without this helper the browser
    sees e.g. "401 + missing CORS header" and reports it as a CORS
    error rather than the real auth failure.
    """
    resp = JSONResponse(payload, status_code=status_code)
    origin = request.headers.get("origin")
    if origin and _origin_allowed(origin):
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Credentials"] = "true"
    return resp


@app.middleware("http")
async def _origin_guard_http(request, call_next):  # type: ignore[no-untyped-def]
    """
    Reject HTTP requests whose ``Origin`` (browser cross-origin) or
    ``Referer`` (fallback) is not in the allow-list. ``/health`` is
    exempt so platform health checks keep working without an Origin.
    Same-origin browser requests and non-browser server-to-server
    callers (no Origin/Referer at all) are allowed through — they're
    further gated by ``WS_SHARED_SECRET`` when configured.
    """
    path = request.url.path
    if path in ("/health",) or path.startswith("/public-otc/ws"):
        return await call_next(request)

    # CORS preflight requests must pass through untouched so that
    # CORSMiddleware (which runs *after* this guard in the stack) can
    # respond with the proper Access-Control-Allow-* headers. Browsers
    # never attach an X-API-Key on preflight, so the shared-secret check
    # below would otherwise 401 the OPTIONS request and the browser
    # would report "No 'Access-Control-Allow-Origin' header is present
    # on the requested resource" for the actual POST.
    if request.method == "OPTIONS":
        return await call_next(request)

    origin = request.headers.get("origin")
    referer = request.headers.get("referer")

    # Browser cross-origin: Origin will be present and must match.
    # Same-origin / non-browser: Origin will be missing — fall back to
    # Referer if present, otherwise allow (server-to-server).
    if origin is not None:
        if not _origin_allowed(origin):
            return _cors_error_response(
                request, {"error": "origin not allowed"}, 403
            )
    elif referer:
        # Strip path → scheme://host[:port]
        try:
            from urllib.parse import urlparse

            p = urlparse(referer)
            ref_origin = f"{p.scheme}://{p.netloc}"
        except Exception:
            ref_origin = None
        if ref_origin and not _origin_allowed(ref_origin):
            return _cors_error_response(
                request, {"error": "referer not allowed"}, 403
            )

    # Optional shared-secret check on state-changing routes.
    if _ws_shared_secret is not None and request.method != "GET":
        provided = request.headers.get("x-api-key") or request.query_params.get(
            "key"
        )
        if not _shared_secret_ok(provided):
            return _cors_error_response(
                request, {"error": "invalid api key"}, 401
            )

    return await call_next(request)


# --------------------------------------------------------------------------- #
# Utilities
# --------------------------------------------------------------------------- #


async def send_json(ws: WebSocket, payload: dict[str, Any]) -> None:
    with suppress(Exception):
        await ws.send_text(json.dumps(payload))


async def broadcast(payload: dict[str, Any]) -> None:
    data = json.dumps(payload)
    dead: list[WebSocket] = []
    for ws in list(connected_clients):
        try:
            await ws.send_text(data)
        except Exception:  # noqa: BLE001
            dead.append(ws)
    for ws in dead:
        connected_clients.discard(ws)


# How many synthetic carry-forward candles we're willing to insert in a
# single gap. Stops a pathological history return (e.g. last seen candle
# is days old) from blowing up the buffer with thousands of synthetic
# bars. 600 buckets covers ~10h of 1m candles or ~2.5h of 15s candles —
# anything wider than that is treated as a hard market reset and the gap
# is left unfilled (frontend will still render a visible time-axis break).
_MAX_GAP_FILL = 600

def _make_flat_candle(t: int, prev_close: float) -> dict[str, Any]:
    """
    Build a synthetic carry-forward candle (O = H = L = C = prev_close,
    volume = 0) used to plug missing bucket holes from sparse Quotex
    history responses or skipped websocket buckets on quiet OTC pairs.

    Marked with ``synthetic: True`` so any downstream consumer (signal
    evaluator, indicator engine, …) can decide whether to treat it as
    real or skip it. The candle is still numerically valid OHLC, so
    EMAs / RSI / MACD don't break — they just see a no-movement bar,
    which is the correct semantic for "no trades happened this minute".
    """
    return {
        "time": int(t),
        "open": float(prev_close),
        "high": float(prev_close),
        "low": float(prev_close),
        "close": float(prev_close),
        "volume": 0.0,
        "synthetic": True,
    }


def _fill_candle_gaps(
    candles: list[dict[str, Any]], period: int
) -> list[dict[str, Any]]:
    """
    Insert flat carry-forward candles between adjacent buckets that are
    more than one ``period`` apart, so the buffer is contiguous on the
    time axis.

    Why this matters
    ----------------
    Quotex sometimes returns sparse history for illiquid OTC pairs — a
    quiet minute simply has no candle. The bucket state machine in
    :pyfile:`quotex_session.py` can also overwrite ``_bucket_state``
    when a tick lands in a non-adjacent future bucket, dropping the
    intermediate closed buckets entirely. Without this fill, those gaps
    propagate all the way to lightweight-charts on the frontend and
    render as visible empty slots in the time axis ("chart e gap
    dekhacche"). Filling at the buffer layer fixes the issue once for
    every downstream consumer (WS subscribers, public OTC stream,
    /history HTTP route, signal engine).
    """
    if not candles or period <= 0:
        return candles
    out: list[dict[str, Any]] = [candles[0]]
    for curr in candles[1:]:
        prev = out[-1]
        try:
            prev_t = int(prev["time"])
            curr_t = int(curr["time"])
        except (KeyError, TypeError, ValueError):
            out.append(curr)
            continue
        if curr_t <= prev_t:
            # Duplicate or out-of-order — skip; the caller already sorted.
            continue
        gap_buckets = (curr_t - prev_t) // period - 1
        if gap_buckets >= 1:
            fill_count = min(gap_buckets, _MAX_GAP_FILL)
            close = float(prev.get("close", prev.get("open", 0.0)))
            for k in range(1, fill_count + 1):
                t = prev_t + period * k
                if t >= curr_t:
                    break
                out.append(_make_flat_candle(t, close))
        out.append(curr)
    return out


def _replace_live_buffer(
    key: tuple[str, int], candles: list[dict[str, Any]]
) -> None:
    """Replace the per-key buffer with fresh broker history.

    SIMPLIFIED VERSION: We now trust pyquotex data completely.
    No complex merging, no WS-aggregated preservation, no disk persistence.
    
    pyquotex handles candle aggregation properly per their documentation —
    we just store what it gives us and send to frontend.

    Only two simple transformations:
      1. Forward-fill gaps (for sparse OTC pairs)
      2. Preserve current forming candle (so chart doesn't flicker)
    """
    cleaned = [c for c in candles if isinstance(c, dict) and "time" in c]
    cleaned.sort(key=lambda c: int(c["time"]))
    period = key[1]

    # Capture the existing forming candle (if any) before the replace
    forming: dict[str, Any] | None = None
    if period > 0:
        existing = candle_store.get(key)
        if existing:
            now = int(time.time())
            current_bucket = (now // period) * period
            last = existing[-1]
            try:
                last_t = int(last.get("time", 0))
            except (TypeError, ValueError):
                last_t = 0
            if last_t == current_bucket:
                forming = last

    # Store fresh history directly — trust pyquotex completely
    candle_store.set_history(key, cleaned, period)

    # Re-append forming candle if it exists
    if forming is not None:
        try:
            forming_t = int(forming.get("time", 0))
        except (TypeError, ValueError):
            forming_t = 0
        history_last_t = int(cleaned[-1]["time"]) if cleaned else -1
        if forming_t > history_last_t:
            candle_store.push(key, forming, period)


def _push_live_candle(key: tuple[str, int], candle: dict[str, Any]) -> None:
    """Insert / update a candle in the per-key rolling buffer.

    Simple push to SimpleBuffer — no complex locking or persistence.
    pyquotex handles candle aggregation properly, we just store it.
    """
    if not isinstance(candle, dict) or "time" not in candle:
        return
    period = key[1]
    candle_store.push(key, candle, period)


async def _replay_buffer_to(ws: WebSocket, key: tuple[str, int]) -> bool:
    """Send the persisted buffer (if any) directly to a single subscriber."""
    buf = candle_store.get(key)
    if not buf:
        return False
    try:
        await ws.send_text(
            json.dumps(
                {
                    "type": "history",
                    "asset": key[0],
                    "period": key[1],
                    "candles": buf,
                }
            )
        )
        return True
    except Exception:  # noqa: BLE001
        return False


async def _broadcast_to_subscribers(
    key: tuple[str, int], payload: dict[str, Any]
) -> None:
    dead: list[WebSocket] = []
    # Gate ``candle`` and ``history`` frames behind the per-subscriber
    # release set: a brand-new subscriber that's still waiting for the
    # current running candle to close must NOT receive partially-formed
    # candles or a stale history snapshot — they only get the
    # authoritative refresh once their wait task fires. ``phase``,
    # ``error``, ``status``, etc. always pass through.
    payload_type = payload.get("type")
    gated_type = payload_type in {"candle", "history"}
    released = released_subscribers.get(key, set()) if gated_type else None
    # Always-on / public-OTC sentinels silently absorb frames; skip them so
    # ~90 background streams with zero viewers cost no JSON encoding.
    real_subs = [
        ws for ws in list(subscriptions.get(key, set()))
        if not isinstance(ws, (_AlwaysOnSentinel, _PublicOtcSentinel))
    ]
    data = json.dumps(payload) if real_subs else ""
    for ws in real_subs:
        if gated_type and released is not None and ws not in released:
            continue
        try:
            await ws.send_text(data)
        except Exception:  # noqa: BLE001
            dead.append(ws)
    for ws in dead:
        await _unsubscribe(ws, key[0], key[1])

    # Also feed the always-running public OTC pipeline whenever the broadcast
    # happens to be for our public asset/period �� that way the public stream
    # benefits from the same fast/REST poller running in the regular
    # subscribers' streamer task if any /ws clients are watching it too.
    if (
        public_otc_state["asset"]
        and key == (public_otc_state["asset"], PUBLIC_OTC_PERIOD)
    ):
        if payload.get("type") == "candle":
            candle = payload.get("candle")
            if isinstance(candle, dict):
                _public_otc_push_candle(candle)
        elif payload.get("type") == "history":
            cs = payload.get("candles") or []
            if isinstance(cs, list) and cs:
                _public_otc_set_history(cs)


async def stream_candles(asset: str, period: int) -> None:
    """Background task: one per (asset, period), fans candles to subscribers."""
    assert session is not None
    key = (asset, period)
    # Minute-aligned start: no market collects data before the scheduled
    # boundary (e.g. boot 06:45:20 -> first collection at 06:46:00).
    await _wait_collection_start()
    log.info("streamer started asset=%s period=%s", asset, period)

    # COMPLETELY CLEAR any stale candles left over from a previous backend
    # run / previous subscription — both in-memory AND on-disk. This is
    # the ROOT FIX for the "dash candles / vul candles" bug: old persisted
    # candles from previous sessions were being loaded at startup and
    # interfering with fresh broker history.
    #
    # The product spec says the chart must show ONLY freshly fetched live
    # history — never resurrected disk cache. Without this clear, a fresh
    # subscriber would briefly see yesterday's candles (loaded by
    # CandleStore at startup) and some of those old candles could even
    # override fresh broker data if the merging logic thought they were
    # "better". That's exactly the "candle broker er sathe mil nai" bug
    # the user reported.
    try:
        candle_store.clear(key)
        log.info(
            "cleared all stale stored candles for %s/%s before fresh fetch",
            asset, period,
        )
    except Exception as exc:  # noqa: BLE001
        log.debug("stale-buffer clear failed for %s/%s: %s", asset, period, exc)

    # Subscribe + fetch history IN PARALLEL — they are independent and both
    # touch the network, so running them sequentially doubles the time the
    # user sees an empty chart. Whichever finishes first fires immediately.
    async def _do_subscribe() -> None:
        try:
            await session.start_candles_stream(asset, period)
        except Exception as exc:  # noqa: BLE001
            log.exception("failed to start stream: %s", exc)
            await _broadcast_to_subscribers(
                key,
                {
                    "type": "error",
                    "asset": asset,
                    "period": period,
                    "message": str(exc),
                },
            )

    async def _do_history() -> bool:
        """
        Synchronously fetch the 199-candle history into the live buffer.

        This call is **awaited before any tick polling starts** so the
        chart always renders the full historical back-history first, and
        only then begins receiving live tick updates. The cap of 199
        comes from the product spec: pyquotex serves 199 historical
        candles, and the 200th displayed candle is the live forming
        bucket fed by the tick pollers below.

        Retries with a small backoff while the streamer is alive and
        the (asset, period) still has subscribers. Returns ``True`` on
        a successful fetch+broadcast, ``False`` if the budget is
        exhausted (in which case the caller proceeds to start tick
        pollers anyway — better to show a live-only chart than to
        hang indefinitely on a dead history endpoint).
        """
        backoffs = [0.0, 0.4, 1.0, 2.0, 3.0, 5.0, 5.0, 8.0]
        # Hard cap on attempts (~24s of cumulative backoff) so we never
        # block tick pollers forever if pyquotex's history endpoint is
        # genuinely unreachable.
        max_attempts = 8
        attempt = 0
        while (
            attempt < max_attempts
            and key in subscriptions
            and subscriptions[key]
        ):
            try:
                # Horizontal fetch: serialized through the global
                # semaphore so pyquotex's internal candle buffer is not
                # contended by parallel get_history calls (root cause
                # of the "vul candle" bug).
                history = await _fetch_history_serialized(
                    session, asset, period, MAX_CANDLES - 1
                )
            except Exception as exc:  # noqa: BLE001
                log.warning(
                    "history fetch failed for %s/%s: %s", asset, period, exc
                )
                history = []

            if history:
                ok, reason = _validate_history(history, period)
                if not ok:
                    log.warning(
                        "history validation FAILED for %s/%s (%s) — "
                        "discarding %d candles, will retry",
                        asset,
                        period,
                        reason,
                        len(history),
                    )
                    history = []

            if history:
                # Authoritative refresh. We replace rather than merge
                # because `get_history` returns a contiguous, sorted
                # series that strictly supersedes whatever live ticks
                # we may have accumulated in the meantime.
                _replace_live_buffer(key, history)
                snapshot = candle_store.get(key)
                log.info(
                    "history -> buffer: %s/%s now %d candles (attempt %d)",
                    asset,
                    period,
                    len(snapshot),
                    attempt + 1,
                )
                # NOTE: we deliberately DO NOT broadcast the snapshot
                # here. The broadcast happens once below, after the
                # first live tick for the *current* bucket has landed
                # and the warm-up event is set — at that point the
                # snapshot includes the freshly-formed live candle, so
                # subscribers never see the brief "199 closed candles
                # only" intermediate state.
                return True

            attempt += 1
            delay = backoffs[min(attempt, len(backoffs) - 1)]
            log.info(
                "history empty/invalid for %s/%s — retrying in %.1fs "
                "(attempt %d/%d)",
                asset,
                period,
                delay,
                attempt + 1,
                max_attempts,
            )
            await asyncio.sleep(delay)

        # Budget exhausted. We deliberately do NOT fall back to the
        # on-disk candle cache here, even though one may exist. The
        # product requirement is explicit: the chart shows ONLY freshly
        # fetched live candles + the rolling forming candle — never
        # stored data from previous sessions. Showing yesterday's stale
        # candles would be misleading and was the exact bug the user
        # reported ("store kora candle dekhay seta jeno na dekhay").
        #
        # Wipe any stale buffer for this key so a later successful
        # history fetch starts from a clean slate, then return False so
        # the caller proceeds to tick pollers with an empty chart that
        # will populate from live ticks alone.
        try:
            _replace_live_buffer(key, [])
        except Exception as exc:  # noqa: BLE001
            log.debug("buffer wipe after exhausted budget failed: %s", exc)
        log.warning(
            "history fetch budget exhausted for %s/%s — NOT falling back "
            "to disk cache (per product spec); starting tick pollers with "
            "empty chart, history will retry on next subscribe",
            asset,
            period,
        )
        return False

    # === ORDER MATTERS — DO NOT REORDER WITHOUT READING THIS ===
    #
    # We fetch the 199-candle history FIRST and only THEN subscribe
    # to the live tick stream. This is the exact order the reference
    # qxlivechart project (engine.py::start_streaming, lines 562-569)
    # uses, and it's the order that works reliably on a VPS.
    #
    # Why ordering matters
    # --------------------
    # pyquotex's ``get_candles`` internally does, on every call::
    #
    #     api.candles.candles_data = None
    #     await api.event_registry.clear_event(f'candles_ready_{asset}')
    #     await self.start_candles_stream(asset, period)
    #     await api.get_candles(...)
    #     await api.event_registry.wait_event(f'candles_ready_{asset}', timeout)
    #
    # If WE call ``start_candles_stream`` FIRST (the old order), pyquotex
    # accepts our subscribe and starts populating ``candles_data``. Then
    # ``get_candles`` wipes ``candles_data`` and ``clears`` the very
    # event the broker is about to fire. On local PC that's harmless —
    # the WS roundtrip is sub-100ms so the broker re-fires within the
    # 15s ``wait_event`` window. On a VPS in a different region the
    # roundtrip can exceed that window and ``get_candles`` times out
    # empty (the "199 candle fetch hocche na" bug).
    #
    # Doing history first lets ``get_candles`` install its own
    # subscribe + wait_event in a clean state, with no prior
    # subscribe stomping on the event registry. After history lands
    # we issue our own ``start_candles_stream`` for ongoing tick
    # delivery — at that point pyquotex's subscribed-asset registry
    # already has this pair so the second subscribe is essentially
    # a no-op that just hooks up our tick callback.
    history_task: asyncio.Task | None = None
    if key in always_on_keys:
        # Always-on: subscribe FIRST so every market starts collecting ticks
        # at the same aligned minute; history loads serialized in background.
        history_ok = False
        await _do_subscribe()

        async def _background_history() -> None:
            nonlocal history_ok
            await asyncio.sleep(ALWAYS_ON_HISTORY_DELAY_S)
            history_ok = await _do_history()
            if history_ok:
                await _broadcast_to_subscribers(
                    key,
                    {
                        "type": "history",
                        "asset": asset,
                        "period": period,
                        "candles": candle_store.get(key),
                    },
                )

        history_task = asyncio.create_task(_background_history())
    else:
        history_ok = await _do_history()
        # Tiny settle — matches the reference repo's ``await asyncio.sleep(1)``
        # between history load and live subscribe.
        await asyncio.sleep(1.0)
        await _do_subscribe()

    # We run pollers in parallel:
    #   fast (0.1s) — pulls from pyquotex internal dicts via the unified
    #     bucket state machine in QuotexSession, giving a smooth pulse
    #     every 100ms (10 updates / second).
    #   rest (1s) — calls Quotex REST get_candles() so the chart catches
    #     up to real time even when the tick ws subscription failed. REST
    #     prices feed into the SAME state machine, so no flip-flopping.
    last_sig: tuple | None = None
    last_emit_ts: float = 0.0
    warm_up_event = _get_warm_up_event(key)

    async def _emit_if_changed(candle: dict[str, Any] | None) -> None:
        nonlocal last_sig, last_emit_ts
        if not candle:
            return
        sig = (
            candle.get("time"),
            candle.get("open"),
            candle.get("high"),
            candle.get("low"),
            candle.get("close"),
        )
        now = time.time()
        # Always emit if the OHLC signature changed OR the bucket rolled over
        # OR it's been more than 1s since the last emit (keep chart heartbeat
        # alive even when price is flat). Repeated identical updates are a
        # no-op for lightweight-charts' series.update().
        bucket_rolled = last_sig is not None and sig[0] != last_sig[0]
        stale = now - last_emit_ts > 1.0
        if sig == last_sig and not bucket_rolled and not stale:
            return
        last_sig = sig
        last_emit_ts = now
        # Keep our authoritative rolling buffer up-to-date so any
        # subscriber that joins after `_do_history` finished still sees
        # the full back-history on subscribe (via _replay_buffer_to).
        _push_live_candle(key, candle)
        # Signal warm-up complete on the first tick whose bucket is the
        # current forming bucket. Subscribers that joined while the
        # market was still warming up are now safe to receive a
        # snapshot — we know the chart's right edge will not flicker
        # because the forming candle is real, current-bucket data.
        if not warm_up_event.is_set() and period > 0:
            try:
                ct = int(candle.get("time", 0))
                cur_bucket = (int(time.time()) // period) * period
                if ct == cur_bucket:
                    warm_up_event.set()
                    log.info(
                        "warm-up complete for %s/%s — first current-bucket "
                        "tick received, gated subscribers will be released",
                        asset,
                        period,
                    )
            except (TypeError, ValueError):
                pass
        await _broadcast_to_subscribers(
            key,
            {
                "type": "candle",
                "asset": asset,
                "period": period,
                "candle": candle,
            },
        )

    async def _drain_pending_closed() -> None:
        """
        Pull every just-closed bucket from the session's pending queue and
        broadcast it as a regular candle message. This guarantees each
        closed candle's FINAL wick (with all accumulated high/low) lands
        on every subscriber's chart exactly once at the bucket boundary.

        Without this drain, the polling loop only ever emits the *forming*
        bucket — and when that forming bucket rolls over, the previous
        bucket's last few hundred ms of tick activity (i.e. its full wick)
        is silently overwritten in ``_bucket_state`` and never delivered.

        Side-effect: every released subscriber on this (asset, period)
        gets the closed candle appended to their per-user JSON file via
        :pymod:`user_session_store`. Gated subscribers (still waiting for
        their first running-candle close) are excluded — their JSON is
        seeded by the release task with the freshly fetched 199 candles
        and starts appending from the *next* close.
        """
        try:
            closed = session.pull_pending_closed(asset, period)
        except Exception as exc:  # noqa: BLE001
            log.debug("pull_pending_closed error for %s/%s: %s", asset, period, exc)
            return
        for c in closed:
            await _emit_if_changed(c)
            # Persist the closed candle to every released subscriber's
            # per-user JSON. Done after _emit_if_changed so the in-memory
            # broadcast happens first (frontend sees the bar instantly)
            # and disk I/O is on the back path.
            for ws in list(released_subscribers.get(key, set())):
                meta = connected_clients_meta.get(ws)
                if not meta:
                    continue
                ws_id = meta.get("ws_id")
                if not ws_id:
                    continue
                with suppress(Exception):
                    await user_session_store.append_closed(
                        ws_id, asset, period, c
                    )

    async def fast_poller() -> None:
        consecutive_nulls = 0
        total_polls = 0
        first_candle_received = False
        while key in subscriptions and subscriptions[key]:
            try:
                # Drain closed buckets BEFORE fetching the new forming
                # candle so subscribers receive bars in strict time order:
                # …, closed[t-1] (final wick), forming[t], …
                await _drain_pending_closed()
                c = await session.get_latest_candle(asset, period)
                # The state machine inside get_latest_candle may itself have
                # archived a bucket via wall-clock rollover — drain again
                # so the closed candle ships out on this same poll instead
                # of waiting for the next 100 ms tick.
                await _drain_pending_closed()
                
                # If get_latest_candle returns None for several consecutive
                # polls, fall back to REST endpoint to kickstart the chart.
                # This handles markets where the WS hook failed and internal
                # dicts are empty (e.g. AUD/CAD OTC).
                if c is None:
                    consecutive_nulls += 1
                    if consecutive_nulls >= 5:  # 500ms of no data
                        try:
                            c = await _maybe_rest_fallback(asset, period)
                            if c is not None:
                                log.debug(
                                    "fast_poller: REST fallback provided candle for %s/%s",
                                    asset, period
                                )
                        except Exception as rest_exc:
                            log.debug("fast_poller REST fallback error: %s", rest_exc)
                else:
                    consecutive_nulls = 0
                    if not first_candle_received:
                        first_candle_received = True
                        log.info(
                            "fast_poller: first candle received for %s/%s after %d polls",
                            asset, period, total_polls
                        )
                
                await _emit_if_changed(c)
                total_polls += 1
                
                # If after 100 polls (10 seconds) we still haven't received any
                # candle, log a warning. This helps diagnose markets where pyquotex
                # cannot fetch data.
                if total_polls == 100 and not first_candle_received:
                    log.warning(
                        "fast_poller: NO DATA after 10s for %s/%s — market may be "
                        "unsupported or temporarily unavailable. REST fallback active.",
                        asset, period
                    )
                    # Send a warning to all subscribers on this key
                    await _broadcast_to_subscribers(
                        key,
                        {
                            "type": "warning",
                            "code": "no_data_yet",
                            "asset": asset,
                            "period": period,
                            "message": (
                                f"No live data received for {asset} yet. "
                                "The market may be temporarily unavailable."
                            ),
                        },
                    )
            except Exception as exc:  # noqa: BLE001
                log.debug("fast_poller error: %s", exc)
            await asyncio.sleep(0.1)

    async def rest_poller() -> None:
        # Give the ws a small head start before hitting the REST endpoint,
        # but not too long — some markets have broken WS but working REST.
        await asyncio.sleep(0.5)
        poll_count = 0
        while key in subscriptions and subscriptions[key]:
            try:
                # Same closed-bucket drain pattern as fast_poller — the
                # REST path also feeds the same bucket state machine, so
                # if it triggers a wall-clock rollover the closed bucket
                # must ship out before the new forming candle.
                # Only hits the broker when live WS ticks for this asset
                # are stale (see ``_maybe_rest_fallback``) — keeps ~90
                # always-on streams from flooding Quotex with REST calls.
                c = await _maybe_rest_fallback(asset, period)
                if c is not None:
                    await _drain_pending_closed()
                    await _emit_if_changed(c)
            except Exception as exc:  # noqa: BLE001
                log.debug("rest_poller error: %s", exc)
            poll_count += 1
            # Poll faster initially (first 10 polls every 0.5s) to bootstrap
            # markets where WS is broken but REST works. Then settle to 1s.
            if poll_count < 10:
                await asyncio.sleep(0.5)
            else:
                await asyncio.sleep(1.0)

    async def diag_poller() -> None:
        """
        Periodic tick-health log. Quiet by default — the user explicitly
        asked to keep the backend console clean (no per-tick price spam,
        only subscribe events). Set ``DIAG_LOG_INTERVAL_S`` to a positive
        integer in ``.env`` to turn it back on for debugging stalled
        streams. ``0`` (default) disables entirely; we only emit a one-shot
        warning if no raw ticks have arrived after the first 30 s, which
        is the signal that the upstream subscription is actually broken.
        """
        interval = float(os.getenv("DIAG_LOG_INTERVAL_S", "0"))
        if interval <= 0:
            # Silent mode: just one health probe after 30s. If still no
            # ticks, warn once so a genuinely dead subscription is still
            # visible in the log without flooding it every 5s.
            await asyncio.sleep(30.0)
            if key not in subscriptions or not subscriptions[key]:
                return
            hooked = session._last_tick.get(asset)  # type: ignore[attr-defined]
            if not hooked:
                log.warning(
                    "[diag] %s/%s: no raw ticks after 30s — upstream "
                    "subscription may be stalled",
                    asset,
                    period,
                )
            return

        await asyncio.sleep(interval)
        while key in subscriptions and subscriptions[key]:
            hooked = session._last_tick.get(asset)  # type: ignore[attr-defined]
            if hooked:
                age = time.time() - hooked[0]
                log.info(
                    "[diag] %s: last tick %.2fs ago @ %s",
                    asset,
                    age,
                    hooked[1],
                )
            else:
                log.info(
                    "[diag] %s: no raw ticks captured yet — using REST fallback",
                    asset,
                )
            await asyncio.sleep(interval)

    try:
        # STRICT SEQUENCING:
        #   1. (already done above) Fetched the 199-candle history into
        #      the on-disk store BEFORE subscribing — this matches the
        #      reference qxlivechart repo's order and is the actual fix
        #      for the VPS "199 candle fetch hocche na" bug. See the
        #      long comment near ``_do_history()`` above for the full
        #      pyquotex race-condition explanation.
        #   2. Start tick pollers and wait for the FIRST tick whose
        #      bucket matches the current wall-clock forming bucket.
        #      This is the warm-up gate.
        #   3. Broadcast the full 200-candle snapshot (199 closed +
        #      1 freshly-formed live) to every subscriber as a single
        #      atomic frame. Subscribers never see the "199 closed
        #      only" intermediate state, never see a stale forming
        #      candle from a previous run, and never see synthetic
        #      flat-candle gap fillers.
        #
        # Note: ``history_ok`` was set above by the early _do_history()
        # call; we deliberately do NOT call it again here. Calling it
        # twice was the OLD pattern (which also called _do_subscribe
        # first) and that ordering is what broke 199-candle fetch on
        # VPS — the second get_candles raced against pyquotex's still-
        # warming candle buffer and timed out empty.
        if key not in subscriptions or not subscriptions[key]:
            return

        async def _broadcast_warm_snapshot() -> None:
            """Publish the full 200-candle snapshot once warm-up gates open."""
            try:
                await asyncio.wait_for(
                    warm_up_event.wait(), timeout=WARM_UP_FIRST_TICK_TIMEOUT_S
                )
                reason = "first-tick"
            except asyncio.TimeoutError:
                reason = "timeout-fallback"
                log.warning(
                    "warm-up timeout for %s/%s after %.1fs — broadcasting "
                    "history-only snapshot (no live tick yet)",
                    asset,
                    period,
                    WARM_UP_FIRST_TICK_TIMEOUT_S,
                )
                # Even if the broker is silent, mark warm-up as complete
                # so any subscribers gated on this event get released
                # with the closed-candle history they have.
                warm_up_event.set()
            snapshot = candle_store.get(key)
            log.info(
                "warm-up snapshot for %s/%s: %d candles (%s)",
                asset,
                period,
                len(snapshot),
                reason,
            )
            await _broadcast_to_subscribers(
                key,
                {
                    "type": "history",
                    "asset": asset,
                    "period": period,
                    "candles": snapshot,
                    "warm_up": reason,
                    "history_ok": history_ok,
                },
            )

        await asyncio.gather(
            fast_poller(),
            rest_poller(),
            diag_poller(),
            _broadcast_warm_snapshot(),
        )
    finally:
        if history_task is not None and not history_task.done():
            history_task.cancel()
        with suppress(Exception):
            await session.stop_candles_stream(asset, period)
        streamer_tasks.pop(key, None)
        # Reset warm-up gate so the NEXT streamer for this key starts
        # fresh. Subscribers that connect during the gap will see a
        # new "loading" frame and wait for the next first-tick.
        warm_up_ready.pop(key, None)
        log.info("streamer stopped asset=%s period=%s", asset, period)


async def _subscribe(ws: WebSocket, asset: str, period: int) -> None:
    # Prominent subscribe-event log line. The user explicitly requested
    # that the backend console "only show which pair is subscribed" (and
    # nothing else for the tick stream), so this is the headline log
    # emitted on every subscribe call. Per-tick prices are silenced via
    # the websockets/socketio loggers being capped at WARNING in the
    # bootstrap, plus DIAG_LOG_INTERVAL_S defaulting to 0.
    log.info(">>> SUBSCRIBE %s @ %ss (client requested)", asset, period)

    # Always-on mode: clients only JOIN markets the backend is already
    # collecting — no broker request is ever made on a client's behalf.
    if ALWAYS_ON_ENABLED and not _is_live_key((asset, period)):
        await send_json(
            ws,
            {
                "type": "error",
                "code": "market_not_live",
                "message": f"{asset} is not live right now. Pick another market.",
                "asset": asset,
                "period": period,
            },
        )
        return
    if collector is not None:
        await _collector_join(ws, (asset, period))
        return

    # ----------------------------------------------------------------- #
    # Asset open / OTC fallback resolution.
    #
    # Per pyquotex's documented ``get_available_asset(asset, force_open=True)``
    # contract, a closed regular pair (e.g. ``EURUSD`` outside trading
    # hours) silently returns NO ticks if you subscribe to it directly —
    # which would wedge our wait-for-running-candle overlay forever
    # because no bucket close ever fires. The official remedy is to
    # auto-flip to the OTC variant when the regular pair is closed.
    #
    # We resolve up-front: if the broker hands back a different asset
    # name we honour it (it's the OTC version of the same pair); if
    # the resolved asset is also closed we refuse the subscribe with a
    # clear error so the user gets a chip in the UI instead of an
    # eternally-spinning chart.
    # ----------------------------------------------------------------- #
    if session is not None and not ALWAYS_ON_ENABLED:
        try:
            resolved, is_open = await session.resolve_asset(asset, force_open=True)
        except Exception as exc:  # noqa: BLE001
            log.debug("resolve_asset(%s) failed, proceeding raw: %s", asset, exc)
            resolved, is_open = asset, True
        if resolved != asset:
            log.info(
                "asset auto-fallback: %s (closed) -> %s (OTC variant)",
                asset,
                resolved,
            )
            asset = resolved
        if not is_open:
            await send_json(
                ws,
                {
                    "type": "error",
                    "code": "asset_closed",
                    "message": (
                        f"{asset} is currently closed by the broker. "
                        "Pick another pair or try again when the market reopens."
                    ),
                    "asset": asset,
                    "period": period,
                },
            )
            log.warning("subscribe refused for %s/%s — asset closed", asset, period)
            return

    key = (asset, period)

    # ----------------------------------------------------------------- #
    # Single-pair-per-user enforcement (server-side defense in depth).
    # The frontend already tears down the previous subscription before
    # opening a new one, but a buggy / multi-tab client could send two
    # subscribes back to back. We auto-unsubscribe the previous active
    # pair so this client only ever has ONE (asset, period) running.
    # ----------------------------------------------------------------- #
    meta = connected_clients_meta.get(ws)
    if meta is None:
        # Defensive: every accepted ws is registered in
        # ``websocket_endpoint`` before any subscribe arrives, but if
        # that path was bypassed we still want a working ws_id.
        meta = {"ws_id": uuid.uuid4().hex, "active_sub": None}
        connected_clients_meta[ws] = meta
    prev = meta.get("active_sub")
    if prev and prev != key:
        await _unsubscribe(ws, prev[0], prev[1])

    # MAX_ACTIVE_MARKETS gate: if this would be a *new* streamer and we
    # already have the cap's worth running, refuse cleanly rather than
    # quietly overloading pyquotex. Existing streamers (someone else is
    # already subscribed to this exact key) are always allowed through —
    # they cost zero extra slots.
    is_new_market = key not in streamer_tasks
    # Always-on + public-OTC streams don't consume slots of the cap.
    _pub_key = _public_otc_key()
    dynamic_markets = sum(
        1 for k in streamer_tasks if k not in always_on_keys and k != _pub_key
    )
    if is_new_market and dynamic_markets >= MAX_ACTIVE_MARKETS:
        await send_json(
            ws,
            {
                "type": "error",
                "code": "market_cap_reached",
                "message": (
                    f"Backend is already streaming {len(streamer_tasks)} "
                    f"markets (cap = {MAX_ACTIVE_MARKETS}). Close another "
                    "chart and try again."
                ),
                "asset": asset,
                "period": period,
            },
        )
        log.warning(
            "subscribe refused for %s/%s — market cap reached (%d/%d)",
            asset,
            period,
            len(streamer_tasks),
            MAX_ACTIVE_MARKETS,
        )
        return

    subscriptions.setdefault(key, set()).add(ws)
    meta["active_sub"] = key

    # ----------------------------------------------------------------- #
    # "Wait for closing running candle" gate.
    #
    # Every new subscriber — even one joining an already-warm streamer —
    # is held behind the gate until the *next* bucket boundary. We send
    # a ``phase: waiting_running_candle`` frame immediately so the
    # frontend can render the wait overlay with a live countdown. While
    # the gate is closed, the broadcaster filters out ``candle`` and
    # ``history`` frames for this ws (see ``_broadcast_to_subscribers``).
    #
    # When the bucket actually closes, the wait task below:
    #   1. Re-fetches a fresh 199-candle history from pyquotex (deduped
    #      across simultaneous waiters via ``release_refetch_locks``).
    #   2. Adds this ws to ``released_subscribers[key]`` so future live
    #      candle broadcasts reach it.
    #   3. Sends a ``phase: running_candle_closed`` + ``history`` frame
    #      directly to this ws (so OTHER already-released subscribers
    #      don't see a redundant history blast).
    #   4. Seeds the per-user JSON file with the freshly fetched 199.
    # ----------------------------------------------------------------- #
    now = int(time.time())
    if period > 0:
        current_bucket_end = ((now // period) + 1) * period
        seconds_until_close = max(1, current_bucket_end - now)
    else:
        # Defensive — period 0 has no bucket boundary; release immediately.
        current_bucket_end = now
        seconds_until_close = 0

    # ----------------------------------------------------------------- #
    # Shared-session fast path (checked BEFORE we even send the
    # ``waiting_running_candle`` phase, so a 2nd / Nth joiner never
    # flashes a "waiting" overlay on a market that's already warm).
    #
    # The backend keeps exactly ONE upstream Quotex stream per
    # (asset, period) — see ``streamer_tasks`` / ``candle_store`` /
    # ``_broadcast_to_subscribers``. When a pair is already warm
    # (released_subscribers[key] is non-empty → at least one previous
    # subscriber is past the running-candle gate, the shared buffer is
    # populated, and live ticks are flowing) the new joiner is
    # released immediately into the same realtime session: they get
    # the shared snapshot replayed and live ticks fanned out to them
    # on every subsequent _broadcast_to_subscribers call. This is the
    # behaviour the user requested: one (asset, period) → one shared
    # session → many users.
    #
    # Cold path (no released subscribers yet — either this is the
    # first user on a brand-new streamer, or every prior user
    # disconnected before the first bucket close) keeps the original
    # wait-then-release behaviour below so we still serve a clean,
    # boundary-aligned 199-candle history on the very first release.
    # ----------------------------------------------------------------- #
    if period > 0 and (released_subscribers.get(key) or key in always_on_keys):
        # Make sure the streamer is actually running before fast-joining.
        # If the prior subscriber was released and then the streamer
        # task crashed for some reason, fall through to the cold path.
        if key in streamer_tasks and not streamer_tasks[key].done():
            released_subscribers.setdefault(key, set()).add(ws)
            try:
                await send_json(
                    ws,
                    {
                        "type": "phase",
                        "phase": "running_candle_closed",
                        "asset": asset,
                        "period": period,
                    },
                )
            except Exception as exc:  # noqa: BLE001
                log.debug(
                    "fast-join phase send failed for %s/%s: %s",
                    asset, period, exc,
                )
            await _replay_buffer_to(ws, key)
            log.info(
                "fast-join: %s/%s — joined shared session (%d total subscribers)",
                asset, period, len(subscriptions.get(key, set())),
            )
            snapshot = candle_store.get(key)
            ws_id = meta.get("ws_id")
            if ws_id:
                with suppress(Exception):
                    await user_session_store.create(
                        ws_id, asset, period, snapshot
                    )
            return

    try:
        await send_json(
            ws,
            {
                "type": "phase",
                "phase": "waiting_running_candle",
                "asset": asset,
                "period": period,
                "current_bucket_end": current_bucket_end,
                "seconds_until_close": seconds_until_close,
            },
        )
        log.info(
            "sent phase=waiting_running_candle for %s/%s (closes in %ds)",
            asset, period, seconds_until_close
        )
    except Exception as exc:  # noqa: BLE001
        log.warning(
            "failed to send waiting_running_candle phase for %s/%s: %s",
            asset, period, exc
        )

    if key not in streamer_tasks:
        streamer_tasks[key] = asyncio.create_task(stream_candles(asset, period))
        log.info(
            "streamer started for %s/%s (%d/%d markets active)",
            asset,
            period,
            len(streamer_tasks),
            MAX_ACTIVE_MARKETS,
        )

    # Period <= 0 has no meaningful gate — release immediately so the
    # subscriber receives the existing buffer.
    if period <= 0:
        released_subscribers.setdefault(key, set()).add(ws)
        await _replay_buffer_to(ws, key)
        return

    # Schedule the wait-then-release task. We key the registry by
    # ``id(ws)`` so a single ws across pair-changes can't collide.
    task_key = (id(ws), key)
    # Cancel any stale wait task for this exact (ws, key) — shouldn't
    # happen in normal flow but defends against rapid re-subscribe.
    existing = pending_release_tasks.pop(task_key, None)
    if existing and not existing.done():
        existing.cancel()
    task = asyncio.create_task(
        _wait_running_candle_then_release(ws, key, current_bucket_end)
    )
    pending_release_tasks[task_key] = task


async def _wait_running_candle_then_release(
    ws: WebSocket, key: tuple[str, int], current_bucket_end: int
) -> None:
    """Sleep until the bucket closes, refetch 199, release the subscriber.

    Wakes up ``RELEASE_GRACE_S`` after the bucket boundary (so
    pyquotex has had a chance to publish the just-closed candle into
    its history endpoint), refetches the 199 closed candles, and pushes
    them to this single ws as a ``phase: running_candle_closed`` +
    ``history`` pair. The candle broadcaster begins flowing live ticks
    to this ws on the very next ``_emit_if_changed`` call.
    """
    asset, period = key
    task_key = (id(ws), key)
    try:
        delay = max(0.0, current_bucket_end - time.time()) + RELEASE_GRACE_S
        await asyncio.sleep(delay)

        # Subscriber may have unsubscribed / disconnected during the wait.
        if ws not in subscriptions.get(key, set()):
            return
        if connected_clients_meta.get(ws) is None:
            return

        # Per-key dedupe: if another waiter on the same bucket close
        # already refetched, reuse the shared buffer.
        just_closed_bucket = current_bucket_end - period
        lock = release_refetch_locks.setdefault(key, asyncio.Lock())
        async with lock:
            if release_refetch_done.get(key, -1) < just_closed_bucket:
                history: list[dict[str, Any]] = []
                # Modest retry budget — if pyquotex is wedged we'd rather
                # release the user with a cached buffer than hold them
                # waiting forever.
                for attempt, backoff in enumerate((0.0, 0.5, 1.0)):
                    if backoff > 0:
                        await asyncio.sleep(backoff)
                    try:
                        history = await _fetch_history_serialized(
                            session, asset, period, MAX_CANDLES - 1  # type: ignore[arg-type]
                        )
                    except Exception as exc:  # noqa: BLE001
                        log.debug(
                            "release refetch attempt %d for %s/%s failed: %s",
                            attempt + 1,
                            asset,
                            period,
                            exc,
                        )
                        history = []
                    if history:
                        ok, reason = _validate_history(history, period)
                        if ok:
                            break
                        log.debug(
                            "release refetch validation failed for %s/%s: %s",
                            asset,
                            period,
                            reason,
                        )
                        history = []
                if history:
                    _replace_live_buffer(key, history)
                    release_refetch_done[key] = just_closed_bucket
                    log.info(
                        "release refetch ok for %s/%s — closed bucket %d, "
                        "%d candles in shared buffer",
                        asset,
                        period,
                        just_closed_bucket,
                        len(history),
                    )
                else:
                    log.warning(
                        "release refetch budget exhausted for %s/%s — "
                        "releasing subscriber with cached buffer",
                        asset,
                        period,
                    )

        # Re-check the subscriber survived the (possibly long) lock wait.
        if ws not in subscriptions.get(key, set()):
            return
        meta = connected_clients_meta.get(ws)
        if meta is None:
            return

        snapshot = candle_store.get(key)
        released_subscribers.setdefault(key, set()).add(ws)

        try:
            await send_json(
                ws,
                {
                    "type": "phase",
                    "phase": "running_candle_closed",
                    "asset": asset,
                    "period": period,
                },
            )
            await send_json(
                ws,
                {
                    "type": "history",
                    "asset": asset,
                    "period": period,
                    "candles": snapshot,
                },
            )
            log.info(
                "sent phase=running_candle_closed for %s/%s with %d candles",
                asset, period, len(snapshot)
            )
        except Exception as exc:  # noqa: BLE001
            log.warning(
                "failed to send running_candle_closed for %s/%s: %s",
                asset, period, exc
            )

        # Seed the per-user JSON with the fresh 199 (or whatever we
        # have cached) — subsequent closed buckets are appended via
        # ``_drain_pending_closed``.
        ws_id = meta.get("ws_id")
        if ws_id:
            with suppress(Exception):
                await user_session_store.create(
                    ws_id, asset, period, snapshot
                )
    except asyncio.CancelledError:
        raise
    except Exception as exc:  # noqa: BLE001
        log.exception(
            "release task failed for %s/%s: %s", asset, period, exc
        )
    finally:
        pending_release_tasks.pop(task_key, None)


async def _unsubscribe(ws: WebSocket, asset: str, period: int) -> None:
    key = (asset, period)

    # Cancel any in-flight release task for this (ws, key) so it doesn't
    # wake up after we've torn the subscription down.
    task_key = (id(ws), key)
    pending = pending_release_tasks.pop(task_key, None)
    if pending and not pending.done():
        pending.cancel()
        with suppress(asyncio.CancelledError, Exception):
            await pending

    subs = subscriptions.get(key)
    if subs and ws in subs:
        subs.remove(ws)
    released = released_subscribers.get(key)
    if released:
        released.discard(ws)
        if not released:
            released_subscribers.pop(key, None)

    # Clear the per-user JSON file for this exact (ws, asset, period).
    meta = connected_clients_meta.get(ws)
    ws_id = meta.get("ws_id") if meta else None
    if ws_id:
        with suppress(Exception):
            await user_session_store.delete(ws_id, asset, period)
    if meta and meta.get("active_sub") == key:
        meta["active_sub"] = None

    if subs is not None and not subs:
        subscriptions.pop(key, None)
        task = streamer_tasks.pop(key, None)
        if task:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task
        # Drop per-key dedupe state so a future streamer for the same
        # key starts with a fresh release/refetch ledger.
        release_refetch_done.pop(key, None)
        release_refetch_locks.pop(key, None)


# --------------------------------------------------------------------------- #
# Public OTC stream — runs forever after bootstrap, regardless of clients
# --------------------------------------------------------------------------- #


def _public_otc_key() -> tuple[str, int] | None:
    asset = public_otc_state["asset"]
    if not asset:
        return None
    return (asset, PUBLIC_OTC_PERIOD)


def _public_otc_sync_state_from_store(key: tuple[str, int]) -> list[dict[str, Any]]:
    """Mirror the persisted store buffer into ``public_otc_state``.

    Returns the snapshot so callers can use it directly without taking
    a second pass through the store.
    """
    snapshot = candle_store.get(key)
    public_otc_state["candles"] = snapshot
    public_otc_state["last_update"] = time.time()
    public_otc_state["ready"] = True
    return snapshot


def _public_otc_set_history(candles: list[dict[str, Any]]) -> None:
    """Replace the rolling buffer with the latest history.

    Behaviour:
      * No synthetic gap-fill — the buffer reflects exactly what the
        broker served.
      * Existing forming-bucket candle is preserved across the replace
        so the marketing-page chart never visibly drops to 199 candles
        between the periodic history refresh and the next live tick.
        (This is the source of the "snapshot 199 -> 200 flicker" the
        user noticed in the logs.)
    """
    key = _public_otc_key()
    if key is None:
        return
    _replace_live_buffer(key, candles)
    _public_otc_sync_state_from_store(key)


def _public_otc_push_candle(candle: dict[str, Any]) -> None:
    """Insert / update a candle in the rolling buffer.

    Delegates to :class:`CandleStore.push` which performs:
      * FIFO sliding-window cap at MAX_CANDLES (200),
      * closed-bucket locking + wall-clock current-bucket guard
        (no more "previous candle er pore porer 30s er tick add hoy"
        rewrites),
      * atomic JSON persistence.

    Gaps in the broker feed are forward-filled with flat synthetic
    candles (O=H=L=C=prev_close, volume=0) so the marketing-page
    chart never displays empty slots between candles. The synthetic
    bars are tagged ``synthetic: True`` so consumers can distinguish
    them from broker-served data.
    """
    if not isinstance(candle, dict) or "time" not in candle:
        return
    key = _public_otc_key()
    if key is None:
        return
    # Snapshot before/after so we can fan out exactly the buckets that
    # changed to /public-otc/ws clients in strict period-aligned order.
    # Synthetic gap-fill candles are emitted alongside real ones via the
    # `emitted` filter below.
    before = candle_store.get(key)
    changed, after = candle_store.push(
        key, candle, PUBLIC_OTC_PERIOD, gap_filler=_make_flat_candle
    )
    _public_otc_sync_state_from_store(key)
    if not changed:
        return
    last_before_t = int(before[-1].get("time", 0)) if before else -1
    input_t = int(candle.get("time", 0))
    if before and input_t < last_before_t:
        # Out-of-order / corrective patch — the push just repaired an
        # already-closed bucket (e.g. broker-authoritative REST refetch
        # landed after the bucket rolled, or a delayed gap-fill
        # candle). Emit ONLY the affected slot so clients fix the
        # specific bar without re-touching forward buckets. Before this
        # special case, the ``time >= last_before_t`` filter below
        # silently dropped these correction frames — meaning the home
        # page chart could not self-heal a wrong recent candle until
        # the periodic full-history refresh kicked in 60 s later.
        target = next(
            (c for c in after if int(c.get("time", 0)) == input_t),
            candle,
        )
        emitted = [target]
    else:
        # Find the candles that were appended OR updated. The simple,
        # safe approach: emit any candle whose ``time`` is >= the time
        # of the last entry from the previous snapshot (covers
        # same-bucket patches, new buckets, and synthetic gap fillers).
        emitted = [
            c for c in after if int(c.get("time", 0)) >= last_before_t
        ]
        # If nothing matched (extremely cold buffer, no ``before``),
        # emit the incoming candle so the client at least sees a
        # heartbeat.
        if not emitted:
            emitted = [candle]
    asset = public_otc_state["asset"]
    for c in emitted:
        asyncio.create_task(
            _public_otc_broadcast({"type": "candle", "candle": c, "asset": asset})
        )


async def _public_otc_broadcast(payload: dict[str, Any]) -> None:
    # Boot-time gate: while the running-at-boot candle has not yet
    # closed, suppress any chart-painting frames (``snapshot`` /
    # ``candle``). Control frames (``ready`` / ``status`` / ``loading``
    # / ``pong``) are always allowed through so the frontend can keep
    # rendering its connection state. Once
    # ``_public_otc_open_gate_when_running_candle_closes`` flips
    # ``gate_open`` to True it broadcasts a fresh snapshot itself, and
    # subsequent live-tick pushes flow normally from that point on.
    if not public_otc_state.get("gate_open", False):
        ptype = payload.get("type")
        if ptype in ("snapshot", "candle"):
            return
    if not public_otc_clients:
        return
    data = json.dumps(payload)
    dead: list[WebSocket] = []
    for ws in list(public_otc_clients):
        try:
            await ws.send_text(data)
        except Exception:  # noqa: BLE001
            dead.append(ws)
    for ws in dead:
        public_otc_clients.discard(ws)


def _resolve_public_otc_symbol(assets: list[dict[str, Any]]) -> str | None:
    """Find USD/BRL OTC inside the asset list. Hint is "USDBRL" by default."""
    hint = PUBLIC_OTC_HINT.lower()
    norm = lambda s: str(s or "").lower().replace("/", "").replace(" ", "").replace("-", "").replace("_", "")
    has_otc = lambda s: "otc" in str(s or "").lower()

    candidates = []
    for a in assets:
        sym = a.get("symbol", "")
        name = a.get("name", "")
        atype = a.get("type", "")
        if (norm(sym).startswith(hint) or norm(name).startswith(hint)) and (
            has_otc(sym) or has_otc(name) or has_otc(atype)
        ):
            candidates.append(a)

    if not candidates:
        # Loosen: any asset whose symbol contains the hint and has _otc suffix
        for a in assets:
            sym = a.get("symbol", "")
            if hint in norm(sym) and ("_otc" in str(sym).lower()):
                candidates.append(a)

    if not candidates:
        return None

    # Prefer markets the server reports as open.
    open_first = sorted(
        candidates, key=lambda a: 0 if a.get("is_open") else 1
    )
    return open_first[0].get("symbol") or None


async def _public_otc_open_gate_when_running_candle_closes() -> None:
    """
    Wait for the running-at-boot candle to close, then fetch a fresh
    199-candle history and open the broadcast gate.

    Why this exists
    ---------------
    The home page must NEVER render a candle that was already mid-formation
    when the Python backend started. If the backend boots at wall-clock
    19:12:35 the in-flight 19:12:00 candle is partially built (we missed
    the first 35 s of ticks) — surfacing it would show a "wrong" candle.

    This coroutine sleeps until 19:13:00 + a small grace period, refetches
    a clean 199-bar history (which now contains the just-closed 19:12:00
    bucket as its most recent entry), flips ``gate_open`` to True, and
    broadcasts the fresh snapshot to every connected /public-otc/ws
    client. From that moment on:

      * The chart paints exactly 199 broker-authoritative closed candles
        plus 1 brand-new forming candle (= 200 total displayed).
      * Live ticks for the new (post-boundary) bucket flow through
        normally, populating the 200th candle from open onwards.
      * CandleStore's closed-bucket locking semantics still apply, so
        OHLC for the 199 closed bars is immutable.
    """
    assert session is not None
    period = PUBLIC_OTC_PERIOD

    # Anchor the gate to the bucket boundary that was in flight at boot.
    now = time.time()
    boot_bucket_start = int(now // period) * period
    public_otc_state["boot_bucket_start"] = boot_bucket_start
    next_bucket_start = boot_bucket_start + period
    log.info(
        "public-otc gate: waiting %.1fs for running candle (bucket %d) "
        "to close before painting the chart",
        max(0.0, next_bucket_start - now),
        boot_bucket_start,
    )

    # Sleep until the running-at-boot bucket has rolled over. The
    # RELEASE_GRACE_S buffer matches what the per-(asset, period) gate
    # uses elsewhere in this module so the broker has time to finalise
    # the just-closed bucket before we ask for it via REST.
    while time.time() < next_bucket_start + RELEASE_GRACE_S:
        await asyncio.sleep(0.25)

    # Wait until an asset is resolved (the runner usually has it within
    # seconds, but guard against an unlucky race).
    for _ in range(60):
        if public_otc_state.get("asset"):
            break
        await asyncio.sleep(0.5)

    asset = public_otc_state.get("asset")
    if not asset:
        log.warning(
            "public-otc gate: no asset resolved after waiting — leaving "
            "gate closed; runner will re-trigger on next resolve"
        )
        return

    # Retry the fetch a few times: the broker occasionally returns the
    # boundary candle one cycle late. We require the most recent candle
    # in the returned slice to be at least the boot bucket itself,
    # i.e. the candle that just closed.
    fetched: list[dict[str, Any]] | None = None
    for attempt in range(8):
        try:
            history = await _fetch_history_serialized(
                session, asset, period, 199
            )
        except Exception as exc:  # noqa: BLE001
            log.warning(
                "public-otc gate: history fetch attempt %d failed: %s",
                attempt + 1,
                exc,
            )
            await asyncio.sleep(1.0)
            continue
        ok, reason = _validate_history(history, period, min_count=50)
        if not ok:
            log.warning(
                "public-otc gate: history validation failed (%s) — retry",
                reason,
            )
            await asyncio.sleep(1.0)
            continue
        last_t = int(history[-1].get("time", 0))
        if last_t < boot_bucket_start:
            log.info(
                "public-otc gate: last candle (%d) is older than boot "
                "bucket (%d) — broker still finalising, retry",
                last_t,
                boot_bucket_start,
            )
            await asyncio.sleep(1.0)
            continue
        fetched = history
        break

    if fetched is None:
        log.warning(
            "public-otc gate: failed to fetch clean 199-candle history "
            "after retries — opening gate with whatever buffer the WS "
            "stream has built so far"
        )
    else:
        _public_otc_set_history(fetched)
        log.info(
            "public-otc gate: fresh history loaded (%d candles, last "
            "bucket=%d) — opening broadcast gate",
            len(fetched),
            int(fetched[-1].get("time", 0)),
        )

    # Flip the gate BEFORE broadcasting so _public_otc_broadcast lets
    # the snapshot through.
    public_otc_state["gate_open"] = True
    await _public_otc_broadcast(
        {
            "type": "snapshot",
            "asset": asset,
            "candles": public_otc_state["candles"],
        }
    )
    log.info(
        "public-otc gate: OPEN — chart is now live for %d connected client(s)",
        len(public_otc_clients),
    )


async def public_otc_runner() -> None:
    """
    Resolve USD/BRL OTC, load REST history **once**, start the candle
    stream, and hold a rolling buffer forever. Auto-recovers if pyquotex
    drops the subscription.

    History-load policy (matches the reference engine.py from
    ``cleitonleonel/pyquotex``'s qxlivechart sample, and pyquotex's own
    Section 7 WebSocket guidance):
      * REST ``get_candles`` / ``get_historical_candles`` is fetched
        **only on first resolve** (or when the persistent buffer is
        empty after a restart). It seeds the rolling buffer.
      * From that point on every subsequent candle — both the
        currently-forming bucket and each just-closed bucket — comes
        from the WebSocket realtime tick stream via
        :meth:`QuotexSession.stream_candles` and the
        :class:`CandleStore` bucket-state machine. The WS stream is
        the authoritative source for recent buckets; REST is allowed
        to silently return flat OHLC for buckets it has not yet
        finalised.
      * We never re-fetch REST history on a timer. The previous
        revision did this every 60 s and clobbered the WS-built
        buffer with REST's flat-OHLC trailing candles — which is the
        root cause of the "ager 1 theke 7 ta candle line dekhay → 30
        s te heal → abar same" cycle the user reported. Removing the
        periodic REST refresh removes the bug at its source.
    """
    assert session is not None
    history_loaded = False
    # Minute-aligned start (see COLLECTION_ALIGN_S).
    await _wait_collection_start()
    while True:
        try:
            # Resolve the symbol once. Asset list refreshes every 30s, so we
            # retry until we get one.
            asset = public_otc_state["asset"]
            if not asset:
                try:
                    assets = await session.get_assets()
                    asset = _resolve_public_otc_symbol(assets)
                except Exception as exc:  # noqa: BLE001
                    log.warning("public-otc: get_assets failed: %s", exc)
                    asset = None

                if not asset:
                    log.info(
                        "public-otc: USD/BRL OTC not found yet (hint=%s) — "
                        "retrying in 10s",
                        PUBLIC_OTC_HINT,
                    )
                    await asyncio.sleep(10)
                    continue

                public_otc_state["asset"] = asset
                log.info("public-otc: resolved %s", asset)
                # If the persistent store already has data for this key
                # (e.g. from a previous run), surface it immediately so
                # the very next /public-otc/ws connect gets a populated
                # snapshot without waiting for the REST history fetch
                # below.
                _public_otc_sync_state_from_store((asset, PUBLIC_OTC_PERIOD))
                await _public_otc_broadcast(
                    {"type": "status", "status": "resolved", "asset": asset}
                )

            # Make sure the underlying stream is live. We register a fake
            # placeholder subscriber so the existing dedupe logic in _subscribe
            # / _unsubscribe doesn't tear the stream down between visitors.
            key = (asset, PUBLIC_OTC_PERIOD)

            # One-shot REST history seed. Re-run only if the in-memory
            # buffer is empty (cold start, or buffer evicted somehow).
            existing_buffer = candle_store.get(key)
            need_initial_load = not history_loaded and (
                not existing_buffer or len(existing_buffer) < 20
            )
            if need_initial_load:
                try:
                    history = await _fetch_history_serialized(
                        session, asset, PUBLIC_OTC_PERIOD, 199
                    )
                    if history:
                        ok, reason = _validate_history(
                            history, PUBLIC_OTC_PERIOD
                        )
                        if not ok:
                            log.warning(
                                "public-otc: initial history validation "
                                "FAILED (%s) — discarding %d candles, "
                                "will retry next loop",
                                reason,
                                len(history),
                            )
                        else:
                            _public_otc_set_history(history)
                            await _public_otc_broadcast(
                                {
                                    "type": "snapshot",
                                    "asset": asset,
                                    "candles": public_otc_state["candles"],
                                }
                            )
                            history_loaded = True
                            log.info(
                                "public-otc: initial REST history loaded "
                                "(%d candles) — switching to WS-only mode",
                                len(history),
                            )
                except Exception as exc:  # noqa: BLE001
                    log.debug(
                        "public-otc: initial history fetch failed: %s", exc
                    )
            else:
                # Buffer already populated → mark history as loaded so
                # we never refetch. The WS stream owns the buffer from
                # here on.
                history_loaded = True

            # Make sure the upstream stream is running. We piggyback on the
            # regular streamer_tasks dispatcher so we share infrastructure
            # with any /ws clients. _public_otc_owner is a sentinel object
            # that keeps the stream alive without being a real WebSocket.
            if key not in streamer_tasks:
                streamer_tasks[key] = asyncio.create_task(
                    stream_candles(asset, PUBLIC_OTC_PERIOD)
                )
            # Add a sentinel "subscriber" so the stream never tears itself
            # down. The sentinel is just a dummy WebSocket-like object that
            # silently discards messages.
            sentinel = subscriptions.setdefault(key, set())
            sentinel.add(_PublicOtcSentinel.singleton())  # type: ignore[arg-type]

            # Sleep, then loop back to re-verify the streamer task is
            # still alive. NOTE: we deliberately do NOT refetch REST
            # history here — see the docstring at the top of this
            # function for the reasoning.
            await asyncio.sleep(60)

            # Health checks
            if key not in streamer_tasks or streamer_tasks[key].done():
                log.warning("public-otc: streamer task ended — restarting")
                streamer_tasks[key] = asyncio.create_task(
                    stream_candles(asset, PUBLIC_OTC_PERIOD)
                )

        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.exception("public-otc runner crashed: %s", exc)
            await asyncio.sleep(5)


class _PublicOtcSentinel:
    """A minimal WebSocket-shaped object that absorbs sends without doing
    anything. Used as a permanent subscriber on the public OTC (asset, period)
    so the streamer task is never torn down between human visitors."""

    _instance: "_PublicOtcSentinel | None" = None

    @classmethod
    def singleton(cls) -> "_PublicOtcSentinel":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def send_text(self, _data: str) -> None:  # noqa: D401
        return None

    async def send_json(self, _data: Any) -> None:  # noqa: D401
        return None


# --------------------------------------------------------------------------- #
# ALWAYS-ON MARKETS — every configured market streams 24/7
# --------------------------------------------------------------------------- #


class _AlwaysOnSentinel:
    """Permanent no-op subscriber attached to every always-on (asset, period).

    * In ``subscriptions[key]``  -> the streamer task never tears down, so
      history + tick-by-tick collection continues with zero viewers.
    * In ``released_subscribers[key]`` (added once the market is warm) ->
      every real user takes the *fast-join* path in ``_subscribe`` and gets
      the full 200-candle snapshot + live ticks INSTANTLY.
    """

    _instance: "_AlwaysOnSentinel | None" = None

    @classmethod
    def singleton(cls) -> "_AlwaysOnSentinel":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def send_text(self, _data: str) -> None:  # noqa: D401
        return None

    async def send_json(self, _data: Any) -> None:  # noqa: D401
        return None

    async def close(self, *_a: Any, **_k: Any) -> None:  # noqa: D401
        return None


# Keys the keeper currently owns, plus bookkeeping for /health.
always_on_keys: set[tuple[str, int]] = set()
always_on_warm_tasks: dict[tuple[str, int], asyncio.Task] = {}
always_on_state: dict[str, Any] = {
    "resolved_symbols": [],
    "unresolved": [],
    "last_refresh": None,
}


def _is_live_key(key: tuple[str, int]) -> bool:
    """True once a market is live and being collected."""
    if collector is not None:
        return collector.is_live(key)
    return key in always_on_keys and time.time() >= _collection_start_at


def _client_assets(assets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Assets shown to browsers: only markets live at Quotex right now."""
    if collector is not None:
        return collector.assets()
    if not ALWAYS_ON_ENABLED:
        return assets
    if time.time() < _collection_start_at:
        return []
    live = {k[0] for k in always_on_keys}
    return [a for a in assets if a.get("symbol") in live]


# --------------------------------------------------------------------------- #
# LIVE COLLECTOR — every open market, one websocket, tick-built candles
# --------------------------------------------------------------------------- #
collector: LiveCollector | None = None


async def _collector_on_candle(key: tuple[str, int], candle: dict[str, Any]) -> None:
    replay_recorder.record(key, candle)
    await _broadcast_to_subscribers(
        key, {"type": "candle", "asset": key[0], "period": key[1], "candle": candle}
    )


async def _collector_on_history(key: tuple[str, int], candles: list[dict[str, Any]]) -> None:
    await _broadcast_to_subscribers(
        key, {"type": "history", "asset": key[0], "period": key[1], "candles": candles}
    )


async def _collector_on_markets() -> None:
    assert collector is not None
    assets = collector.assets()
    await broadcast({"type": "assets", "assets": assets})
    # Home-page chart is fed from the same collector (see _broadcast_to_subscribers).
    if not public_otc_state.get("asset"):
        sym = _resolve_public_otc_symbol(assets)
        if sym:
            public_otc_state["asset"] = sym
            _public_otc_sync_state_from_store((sym, PUBLIC_OTC_PERIOD))
    if public_otc_state.get("asset") and not public_otc_state.get("gate_open"):
        public_otc_state["gate_open"] = True
        await _public_otc_broadcast(
            {"type": "snapshot", "asset": public_otc_state["asset"], "candles": public_otc_state["candles"]}
        )
    log.info("live markets published: %d", len(assets))


async def _collector_join(ws: WebSocket, key: tuple[str, int]) -> None:
    """Attach a browser to an already-collecting market (no broker call)."""
    meta = connected_clients_meta.setdefault(ws, {"ws_id": uuid.uuid4().hex, "active_sub": None})
    prev = meta.get("active_sub")
    if prev and prev != key:
        await _unsubscribe(ws, prev[0], prev[1])
    subscriptions.setdefault(key, set()).add(ws)
    released_subscribers.setdefault(key, set()).add(ws)
    meta["active_sub"] = key
    await send_json(ws, {"type": "phase", "phase": "running_candle_closed", "asset": key[0], "period": key[1]})
    await _replay_buffer_to(ws, key)
    log.info("join: %s/%s (%d viewers)", key[0], key[1], len(subscriptions.get(key, set())))


def _resolve_always_on_symbols(assets: list[dict[str, Any]]) -> tuple[list[str], list[str]]:
    """Return (symbols_to_stream, unresolved_labels) based on ALWAYS_ON_MARKETS."""
    import re as _re

    by_lower = {str(a.get("symbol", "")).lower(): a for a in assets if a.get("symbol")}

    def _is_otc(a: dict[str, Any]) -> bool:
        s = str(a.get("symbol", "")).lower()
        n = str(a.get("name", "") or "")
        return "_otc" in s or bool(_re.search(r"\botc\b", n, _re.I))

    def _is_closed(a: dict[str, Any]) -> bool:
        return a.get("is_open") is False

    mode = ALWAYS_ON_MARKETS.lower()
    out: list[str] = []
    unresolved: list[str] = []

    if mode == "all":
        for a in assets:
            if _is_otc(a) and not _is_closed(a):
                out.append(str(a["symbol"]))
        return out, unresolved

    if mode != "allowed":
        # Explicit CSV list of symbols.
        for raw in ALWAYS_ON_MARKETS.split(","):
            sym = raw.strip()
            if not sym:
                continue
            a = by_lower.get(sym.lower())
            if a is None:
                unresolved.append(sym)
            elif not _is_closed(a):
                out.append(str(a["symbol"]))
        return out, unresolved

    # "allowed" — mirror of the website's 43-market allow-list.
    otc_assets = [a for a in assets if _is_otc(a)]
    for label, symbols, pattern in ALLOWED_MARKETS_PY:
        found: dict[str, Any] | None = None
        for s in symbols:
            a = by_lower.get(s.lower())
            if a is not None and _is_otc(a):
                found = a
                break
        if found is None:
            rx = _re.compile(pattern, _re.I)
            for a in otc_assets:
                if rx.search(str(a.get("name", "") or "")):
                    found = a
                    break
        if found is None:
            unresolved.append(label)
            continue
        if _is_closed(found):
            continue
        sym = str(found["symbol"])
        if sym not in out:
            out.append(sym)
    return out, unresolved


async def _mark_warm_when_ready(key: tuple[str, int]) -> None:
    """Add the sentinel to ``released_subscribers`` once warm-up finishes.

    Until then new users follow the normal cold path (wait overlay) so they
    never receive an empty / half-loaded chart.
    """
    try:
        ev = _get_warm_up_event(key)
        await ev.wait()
        if key in always_on_keys:
            released_subscribers.setdefault(key, set()).add(
                _AlwaysOnSentinel.singleton()  # type: ignore[arg-type]
            )
            log.info("always-on: %s/%s WARM — users now load instantly", *key)
    except asyncio.CancelledError:
        raise
    except Exception as exc:  # noqa: BLE001
        log.debug("always-on warm marker failed for %s/%s: %s", key[0], key[1], exc)
    finally:
        always_on_warm_tasks.pop(key, None)


def _ensure_always_on(key: tuple[str, int]) -> bool:
    """Attach the sentinel + make sure the streamer runs. Returns True if a
    new streamer task had to be (re)started."""
    sentinel = _AlwaysOnSentinel.singleton()
    always_on_keys.add(key)
    subscriptions.setdefault(key, set()).add(sentinel)  # type: ignore[arg-type]
    started = False
    task = streamer_tasks.get(key)
    if task is None or task.done():
        # Fresh streamer -> its warm-up gate is new; drop stale release
        # state so users wait for the new warm snapshot.
        rel = released_subscribers.get(key)
        if rel is not None:
            rel.discard(sentinel)  # type: ignore[arg-type]
        warm_up_ready.pop(key, None)
        _get_warm_up_event(key)  # create BEFORE the streamer so we share it
        streamer_tasks[key] = asyncio.create_task(stream_candles(key[0], key[1]))
        started = True
    ev = _get_warm_up_event(key)
    rel = released_subscribers.get(key, set())
    if ev.is_set():
        if sentinel not in rel:
            released_subscribers.setdefault(key, set()).add(sentinel)  # type: ignore[arg-type]
    elif key not in always_on_warm_tasks:
        always_on_warm_tasks[key] = asyncio.create_task(_mark_warm_when_ready(key))
    return started


async def _drop_always_on(key: tuple[str, int]) -> None:
    """Detach the sentinel (e.g. market closed). Streamer stops only if no
    real user is still watching."""
    sentinel = _AlwaysOnSentinel.singleton()
    always_on_keys.discard(key)
    t = always_on_warm_tasks.pop(key, None)
    if t and not t.done():
        t.cancel()
    rel = released_subscribers.get(key)
    if rel is not None:
        rel.discard(sentinel)  # type: ignore[arg-type]
        if not rel:
            released_subscribers.pop(key, None)
    subs = subscriptions.get(key)
    if subs is not None:
        subs.discard(sentinel)  # type: ignore[arg-type]
        if not subs:
            subscriptions.pop(key, None)
            task = streamer_tasks.pop(key, None)
            if task:
                task.cancel()
                with suppress(asyncio.CancelledError, Exception):
                    await task
            release_refetch_done.pop(key, None)
            release_refetch_locks.pop(key, None)
    log.info("always-on: dropped %s/%s", key[0], key[1])


async def always_on_runner() -> None:
    """Keep EVERY configured market x period streaming forever.

    Startup: streamers are launched one by one (all 60s first, then 15s).
    Their 199-candle history fetches are serialised by the global history
    semaphore, so warm-up of ~90 streams takes a few minutes on first boot;
    after that every chart opens instantly.

    Every ALWAYS_ON_REFRESH_S seconds: restart any dead streamer, pick up
    newly opened markets, drop markets the broker reports closed.
    """
    assert session is not None
    if not ALWAYS_ON_ENABLED:
        log.info("always-on: disabled (ALWAYS_ON_ENABLED=0)")
        return
    # Streamers are created BEFORE the aligned minute; each one waits for
    # COLLECTION_ALIGN_S inside stream_candles, so every market starts
    # collecting at the same second.
    first_round = True
    live_published: set[str] | None = None
    while True:
        try:
            assets = await session.get_assets()
            symbols, unresolved = _resolve_always_on_symbols(assets)
            always_on_state["resolved_symbols"] = symbols
            always_on_state["unresolved"] = unresolved
            always_on_state["last_refresh"] = time.time()
            if unresolved and first_round:
                log.warning("always-on: not found at broker: %s", ", ".join(unresolved))

            target = [(s, p) for p in ALWAYS_ON_PERIODS for s in symbols]
            target_set = set(target)

            started = 0
            for key in target:
                if _ensure_always_on(key):
                    started += 1
                    # Tiny stagger for markets added later (not the aligned burst).
                    if not first_round:
                        await asyncio.sleep(0.2)

            # Markets that closed / left the configured list.
            for key in list(always_on_keys - target_set):
                await _drop_always_on(key)

            if first_round or started:
                log.info(
                    "always-on: %d markets x %s = %d streams (%d (re)started this round)",
                    len(symbols), ALWAYS_ON_PERIODS, len(target), started,
                )
            if first_round:
                await _wait_collection_start()
            first_round = False

            # Publish the live market list to every browser when it changes.
            live_now = {k[0] for k in always_on_keys}
            if live_now != live_published:
                live_published = live_now
                await broadcast({"type": "assets", "assets": _client_assets(assets)})
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.exception("always-on runner error: %s", exc)
        await asyncio.sleep(ALWAYS_ON_REFRESH_S)


# --------------------------------------------------------------------------- #
# WebSocket endpoints
# --------------------------------------------------------------------------- #


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    # ----------------------------------------------------------------- #
    # Origin allow-list — first line of defense against unauthorized
    # third-party sites embedding our live tick stream. Browsers always
    # set the ``Origin`` header on cross-origin WS handshakes and JS
    # cannot override it, so a strict allow-list here is sufficient to
    # block ``new WebSocket('wss://api.chartflow.online/ws')`` from
    # foreign pages. We additionally accept an optional shared secret
    # via ``?key=…`` for non-browser clients (curl, scripts).
    # We close with HTTP 403 BEFORE accepting so unauthorized callers
    # never get a connected socket.
    # ----------------------------------------------------------------- #
    origin = ws.headers.get("origin")
    if not _origin_allowed(origin):
        # Silently reject — no console noise for unauthorized origins.
        # Demoted to debug so operators can opt in via LOG_LEVEL=DEBUG
        # if they want to audit who's probing the endpoint.
        log.debug(
            "rejected /ws handshake from disallowed origin=%r", origin
        )
        await ws.close(code=4403, reason="origin not allowed")
        return
    if _ws_shared_secret is not None:
        provided = ws.query_params.get("key") or ws.headers.get("x-api-key")
        if not _shared_secret_ok(provided):
            log.debug("rejected /ws handshake — invalid shared secret")
            await ws.close(code=4401, reason="invalid api key")
            return

    await ws.accept()

    if session is None or not session.logged_in:
        await send_json(
            ws, {"type": "error", "message": "Backend is not logged in to Quotex."}
        )
        await ws.close()
        return

    # ----------------------------------------------------------------- #
    # Single-socket-per-user: if this connection carries an access token
    # (frontend appends it as ``?token=…``), evict any previous socket
    # for that token before registering the new one. This guarantees
    # that opening a second tab, switching browsers, or moving to a new
    # device for the same QXL account leaves exactly ONE live WebSocket
    # in ``connected_clients`` — the most recent one wins, mirroring the
    # frontend "Take over here" lock semantics.
    # ----------------------------------------------------------------- #
    token: str | None = None
    tab_id: str | None = None
    try:
        raw_token = ws.query_params.get("token")
        if raw_token:
            token = raw_token.strip() or None
        raw_tab = ws.query_params.get("tab")
        if raw_tab:
            tab_id = raw_tab.strip() or None
    except Exception:
        token = None
        tab_id = None

    if token:
        existing = active_token_ws.get(token)
        if existing is not None and existing is not ws:
            # Was the previous socket from the *same browser tab*? If so
            # this is just an in-tab navigation between signal pages
            # (e.g. /signal-5s → /signal-1m) — the previous page is
            # unmounting and the new page is mounting a fresh hook with
            # the same sessionStorage-scoped ``tab`` id. We must NOT
            # surface a "Another tab or device opened this account"
            # error in that case; that's reserved for true cross-tab /
            # cross-device takeovers.
            existing_meta = connected_clients_meta.get(existing) or {}
            existing_tab = existing_meta.get("tab_id")
            same_tab = bool(tab_id) and existing_tab == tab_id
            log.info(
                "evicting previous ws for token=%s… (%s)",
                token[:6],
                "same-tab navigation" if same_tab else "new connection takes over",
            )
            if not same_tab:
                with suppress(Exception):
                    await send_json(
                        existing,
                        {
                            "type": "session_replaced",
                            "message": (
                                "Another tab or device opened this account. "
                                "This connection has been closed."
                            ),
                        },
                    )
            with suppress(Exception):
                await existing.close(
                    code=4002 if same_tab else 4001,
                    reason="tab_navigation" if same_tab else "session_replaced",
                )
            # Clean up the evicted socket's bookkeeping right now so the
            # rest of this handler sees a clean slate. The evicted ws's
            # own finally-block will also run shortly and is idempotent.
            connected_clients.discard(existing)
        active_token_ws[token] = ws

    connected_clients.add(ws)
    # Per-ws session metadata. ``ws_id`` is the stable handle the
    # per-user JSON store uses to namespace this client's files; it
    # survives pair-changes within the same WS connection and is
    # garbage-collected on disconnect.
    ws_id = uuid.uuid4().hex
    connected_clients_meta[ws] = {
        "ws_id": ws_id,
        "active_sub": None,
        "token": token,
        "tab_id": tab_id,
    }
    owned_subs: set[tuple[str, int]] = set()
    log.info(
        "client connected ws_id=%s token=%s (%d total)",
        ws_id,
        (token[:6] + "…") if token else "anon",
        len(connected_clients),
    )

    # initial payload: account info + every market
    try:
        assets = await session.get_assets()
        # Scrub PII (broker login email, any cached password) from the
        # account snapshot before broadcasting it to the browser. The
        # frontend only reads cosmetic fields (avatar, balance, host,
        # nickname, country, currency) — it never uses ``email``, but
        # without this filter the raw ``account_info`` dict would leak
        # the broker login over the wire and show up in DevTools.
        safe_account = {
            k: v
            for k, v in (session.account_info or {}).items()
            if k not in {"email", "password", "token", "session"}
        }
        await send_json(
            ws,
            {
                "type": "ready",
                "account": safe_account,
            },
        )
        await send_json(ws, {"type": "assets", "assets": _client_assets(assets)})
    except Exception as exc:  # noqa: BLE001
        log.exception("failed to send initial assets: %s", exc)

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await send_json(ws, {"type": "error", "message": "invalid JSON"})
                continue

            action = msg.get("action")

            if action == "subscribe":
                asset = msg.get("asset")
                period = int(msg.get("period", 60))
                if not asset:
                    continue
                await _subscribe(ws, asset, period)
                owned_subs.add((asset, period))

            elif action == "unsubscribe":
                asset = msg.get("asset")
                period = int(msg.get("period", 60))
                if not asset:
                    continue
                await _unsubscribe(ws, asset, period)
                owned_subs.discard((asset, period))

            elif action == "refresh_assets":
                assets = await session.get_assets()
                await send_json(ws, {"type": "assets", "assets": _client_assets(assets)})

            elif action == "ping":
                await send_json(ws, {"type": "pong"})

            else:
                await send_json(
                    ws, {"type": "error", "message": f"unknown action: {action}"}
                )

    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        log.exception("ws error: %s", exc)
    finally:
        connected_clients.discard(ws)
        for asset, period in list(owned_subs):
            await _unsubscribe(ws, asset, period)
        # Drop the per-ws metadata and nuke any per-user JSON files
        # whose path prefix matches this ws_id. ``_unsubscribe`` above
        # already deletes the files for known active subscriptions, but
        # the prefix-glob below catches any orphans left by a buggy
        # client (e.g. a subscribe whose unsubscribe got lost) so we
        # never leak disk state across sessions.
        meta = connected_clients_meta.pop(ws, None)
        if meta and meta.get("ws_id"):
            with suppress(Exception):
                await user_session_store.cleanup_all_for_ws(
                    meta["ws_id"]
                )
        # Drop this ws from the per-token map only if it's still the
        # registered owner. A takeover by a newer tab will have already
        # replaced the entry with the new socket — we must NOT clobber
        # that here, otherwise the takeover'd session would be silently
        # un-tracked and the next reconnect couldn't evict it again.
        if meta:
            tok = meta.get("token")
            if tok and active_token_ws.get(tok) is ws:
                active_token_ws.pop(tok, None)
        log.info("client disconnected (%d total)", len(connected_clients))


@app.websocket("/public-otc/ws")
async def public_otc_endpoint(ws: WebSocket) -> None:
    """
    Public, always-running USD/BRL OTC stream. No auth, no handshake.

    On connect:
        1. We immediately send the cached snapshot of the rolling history
           buffer so the chart paints in full without any round-trip cost.
        2. From then on, every candle update is fanned out to this client
           along with all other home-page visitors.

    The upstream Quotex subscription is owned by `public_otc_runner()`, so
    a single shared stream powers every visitor — no extra request is
    issued when somebody opens or refreshes the home page.
    """
    # Same Origin allow-list applies here. The public-OTC stream is
    # still ours and shouldn't be hot-linked from other domains. The
    # shared secret is also enforced when ``WS_SHARED_SECRET`` is set
    # so non-browser clients (curl, scrapers) are blocked even though
    # this endpoint is reachable by unauthenticated home-page visitors.
    origin = ws.headers.get("origin")
    if not _origin_allowed(origin):
        # Silent reject — see /ws handler for rationale.
        log.debug(
            "rejected /public-otc/ws handshake from disallowed origin=%r",
            origin,
        )
        await ws.close(code=4403, reason="origin not allowed")
        return
    if _ws_shared_secret is not None:
        provided = ws.query_params.get("key") or ws.headers.get("x-api-key")
        if not _shared_secret_ok(provided):
            log.debug(
                "rejected /public-otc/ws handshake — invalid shared secret"
            )
            await ws.close(code=4401, reason="invalid api key")
            return

    await ws.accept()
    public_otc_clients.add(ws)
    log.info("public-otc client connected (%d total)", len(public_otc_clients))

    try:
        # Ready frame so the client can render its connection state.
        await send_json(
            ws,
            {
                "type": "ready",
                "asset": public_otc_state["asset"],
                "period": PUBLIC_OTC_PERIOD,
                "buffer_size": len(public_otc_state["candles"]),
            },
        )
        # Boot-time gate: only paint the chart once the running-at-boot
        # candle has finished. Until then send a ``loading`` frame so the
        # home page shows its connecting state and never renders a
        # half-formed candle. ``_public_otc_open_gate_when_running_candle_closes``
        # will broadcast a fresh snapshot to every connected client the
        # moment the gate flips open.
        if public_otc_state.get("gate_open", False):
            await send_json(
                ws,
                {
                    "type": "snapshot",
                    "asset": public_otc_state["asset"],
                    "candles": public_otc_state["candles"],
                },
            )
        else:
            await send_json(
                ws,
                {
                    "type": "loading",
                    "asset": public_otc_state["asset"],
                    "period": PUBLIC_OTC_PERIOD,
                    "warm_up_done": False,
                },
            )

        # Idle loop: we just hold the connection open and let
        # _public_otc_broadcast push updates. Drain any incoming pings
        # the client sends to keep proxies happy.
        while True:
            try:
                raw = await ws.receive_text()
            except WebSocketDisconnect:
                break
            with suppress(Exception):
                msg = json.loads(raw)
                if isinstance(msg, dict) and msg.get("action") == "ping":
                    await send_json(ws, {"type": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        log.exception("public-otc ws error: %s", exc)
    finally:
        public_otc_clients.discard(ws)
        log.info("public-otc client disconnected (%d total)", len(public_otc_clients))


# --------------------------------------------------------------------------- #
# Signal generation HTTP endpoint
# --------------------------------------------------------------------------- #


# --------------------------------------------------------------------------- #
# Signal generation — concurrency hardening
# --------------------------------------------------------------------------- #
#
# What used to happen
# -------------------
# Every click on "Generate Signal" hit ``session.get_history()`` (an
# upstream broker request) AND then ran ``strategies_analyze()``
# (CPU-bound) on the FastAPI event loop. With many users clicking
# simultaneously this caused:
#   * N parallel duplicate broker requests for the same (asset, period)
#     → upstream throttling → 502/409 cascading to every user
#   * the event loop blocking on CPU work → ticks lag for everyone
#
# What we do now
# --------------
# 1. **Shared in-memory buffer first** — we already maintain a live
#    ``candle_store[(asset, period)]`` that's continuously fed by the
#    one-session-per-pair streamer. Every signal request reads from
#    that buffer first; we only fall back to ``session.get_history()``
#    when no shared buffer exists yet (very first user on a brand-new
#    pair). That means N concurrent users on a warm pair = 0 broker
#    requests, regardless of N.
# 2. **Singleflight on the broker fallback** — if multiple users do
#    hit the cold path simultaneously, only ONE upstream fetch fires;
#    the rest await the same future.
# 3. **Short-TTL response cache** — identical (asset, period, count)
#    requests within ``SIGNAL_CACHE_TTL_S`` (default 1.5s) reuse the
#    same SignalResponse. Tens of clicks per second collapse to one
#    actual analysis pass.
# 4. **CPU offload** — ``strategies_analyze`` runs in the default
#    threadpool via ``asyncio.to_thread`` so heavy strategy math
#    doesn't stall the event loop and starve WebSocket ticks.
# 5. **Per-IP cap** — a tiny in-process token bucket prevents one
#    abusive client from monopolizing the path.
SIGNAL_CACHE_TTL_S = float(os.getenv("SIGNAL_CACHE_TTL_S", "1.5"))
SIGNAL_PER_IP_MIN_INTERVAL_S = float(
    os.getenv("SIGNAL_PER_IP_MIN_INTERVAL_S", "0.4")
)
_signal_singleflight: dict[tuple[str, int, int], asyncio.Future[Any]] = {}
_signal_cache: dict[tuple[str, int, int], tuple[float, "SignalResponse"]] = {}
_signal_last_call_per_ip: dict[str, float] = {}
_signal_cache_lock = asyncio.Lock()


def _candles_from_store(asset: str, period: int, count: int) -> list[dict] | None:
    """Pull the last ``count`` candles from the shared streamer buffer.

    Returns None when the buffer doesn't exist or is too thin to be
    useful — caller falls back to a real broker fetch.
    """
    buf = candle_store.get((asset, period))
    if not buf:
        return None
    if len(buf) < 25:
        return None
    # candle_store entries are append-only and chronologically ordered.
    return list(buf[-count:])


class SignalRequest(BaseModel):
    """Body for POST /signals/generate.

    `asset`  : the broker symbol (e.g. "EURUSD_otc")
    `period` : candle size in seconds (60 = 1m, 15 = 15s)
    `count`  : how many recent candles to analyze (default 100)
    """

    asset: str
    period: int = Field(default=60, ge=5, le=86400)
    count: int = Field(default=100, ge=20, le=300)


class SignalVote(BaseModel):
    name: str
    direction: str | None
    confidence: float
    note: str = ""


class SignalResponse(BaseModel):
    asset: str
    period: int
    direction: str | None
    confidence: float
    bullish: int
    bearish: int
    abstain: int
    votes: list[SignalVote]
    candle_count: int
    generated_at: float


@app.post("/signals/generate", response_model=SignalResponse)
async def generate_signal(req: SignalRequest, request: Request) -> SignalResponse:
    """Run every registered strategy on the most recent `count` candles
    of `asset` at `period` seconds, and return an aggregated CALL / PUT
    prediction for the *next* candle.

    The `chart-to-signal` page calls this with `period=60`; the
    `chart-15sec-signal` page calls it with `period=15`.

    Concurrency notes — see the section comment above for the full
    rationale. Highlights:
      * reads from the shared live ``candle_store`` first (no broker
        request when the pair is already warm)
      * single-flights cold-path broker fetches across concurrent
        callers
      * caches identical responses for ``SIGNAL_CACHE_TTL_S``
      * runs strategy analysis in a threadpool to keep the event loop
        responsive for WebSocket ticks
    """
    if not session or not session.logged_in:
        raise HTTPException(status_code=503, detail="Backend not logged in yet")

    # --- Per-IP rate limit ------------------------------------------------ #
    # Cheap in-process guard. Doesn't replace a real reverse-proxy rate
    # limiter for production, but stops a single tab/script from
    # spinning the endpoint hundreds of times per second.
    client_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )
    now_t = time.monotonic()
    last = _signal_last_call_per_ip.get(client_ip, 0.0)
    if now_t - last < SIGNAL_PER_IP_MIN_INTERVAL_S:
        raise HTTPException(
            status_code=429,
            detail="Too many signal requests — please slow down.",
        )
    _signal_last_call_per_ip[client_ip] = now_t
    # Opportunistic cleanup so the dict doesn't grow forever.
    if len(_signal_last_call_per_ip) > 4096:
        cutoff = now_t - 60.0
        for k in [k for k, v in _signal_last_call_per_ip.items() if v < cutoff]:
            _signal_last_call_per_ip.pop(k, None)

    cache_key = (req.asset, req.period, req.count)

    # --- Response cache (TTL) -------------------------------------------- #
    cached = _signal_cache.get(cache_key)
    if cached and (now_t - cached[0]) < SIGNAL_CACHE_TTL_S:
        return cached[1]

    # --- Singleflight: collapse concurrent identical requests ------------ #
    async with _signal_cache_lock:
        existing = _signal_singleflight.get(cache_key)
        if existing is not None and not existing.done():
            future = existing
        else:
            future = asyncio.get_running_loop().create_future()
            _signal_singleflight[cache_key] = future
            owner = True
            asyncio.create_task(
                _compute_and_publish_signal(req, cache_key, future)
            )
            return await future
        owner = False

    if not owner:
        # Wait for the in-flight computation; same response for all
        # concurrent callers.
        return await future


async def _compute_and_publish_signal(
    req: "SignalRequest",
    cache_key: tuple[str, int, int],
    future: "asyncio.Future[SignalResponse]",
) -> None:
    """Background worker that does the actual fetch + analysis and
    fulfils every concurrent caller's future via singleflight.

    Pulled out of the endpoint so the lock-protected fast paths above
    can hand off work cleanly without holding the lock during the slow
    operations.
    """
    try:
        # 1) Try the shared live buffer first — no broker call needed
        #    when the pair is already streaming.
        history = _candles_from_store(req.asset, req.period, req.count)

        # 2) Cold path: fetch from the broker, single-flighted across
        #    every concurrent caller of this same (asset, period, count).
        if history is None and collector is None:
            try:
                history = await session.get_history(
                    req.asset, req.period, count=req.count
                )
            except Exception as exc:  # noqa: BLE001
                log.warning(
                    "signals: get_history failed for %s/%s: %s",
                    req.asset, req.period, exc,
                )
                if not future.done():
                    future.set_exception(
                        HTTPException(
                            status_code=502,
                            detail=f"history fetch failed: {exc}",
                        )
                    )
                return

        if not history or len(history) < 25:
            if not future.done():
                future.set_exception(
                    HTTPException(
                        status_code=409,
                        detail=(
                            "Not enough candle history yet for a "
                            "confident signal. Wait a few seconds and "
                            "try again."
                        ),
                    )
                )
            return

        # 3) Offload CPU-bound strategy analysis to a worker thread so
        #    the event loop stays free for WebSocket fan-out.
        decision = await asyncio.to_thread(strategies_analyze, history)

        response = SignalResponse(
            asset=req.asset,
            period=req.period,
            direction=decision.direction,
            confidence=round(float(decision.confidence), 3),
            bullish=decision.bullish,
            bearish=decision.bearish,
            abstain=decision.abstain,
            votes=[
                SignalVote(
                    name=v.name,
                    direction=v.direction,
                    confidence=round(float(v.confidence), 3),
                    note=v.note,
                )
                for v in decision.votes
            ],
            candle_count=len(history),
            generated_at=time.time(),
        )

        # 4) Publish to the TTL cache so subsequent in-window callers
        #    skip recomputation entirely.
        _signal_cache[cache_key] = (time.monotonic(), response)
        if not future.done():
            future.set_result(response)
    except Exception as exc:  # noqa: BLE001
        if not future.done():
            future.set_exception(exc)
    finally:
        # Drop the singleflight slot once we're done so the next
        # caller after the cache window starts a fresh computation.
        existing = _signal_singleflight.get(cache_key)
        if existing is future:
            _signal_singleflight.pop(cache_key, None)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "logged_in": bool(session and session.logged_in),
        "clients": len(connected_clients),
        "public_otc_clients": len(public_otc_clients),
        "public_otc_asset": public_otc_state["asset"],
        "public_otc_buffer": len(public_otc_state["candles"]),
        "streams": [{"asset": k[0], "period": k[1]} for k in streamer_tasks.keys()],
        "active_markets": len(streamer_tasks),
        "max_active_markets": MAX_ACTIVE_MARKETS,
        "history_fetch_concurrency": HISTORY_FETCH_CONCURRENCY,
        "history_fetch_inter_delay": HISTORY_FETCH_INTER_DELAY,
        "candles_per_market": MAX_CANDLES,
        "candle_storage": {
            "dir": str(candle_store.data_dir),
            "markets_in_memory": len(candle_store.keys()),
            "files_on_disk": len(list(candle_store.data_dir.glob("*.json"))) if candle_store.data_dir.is_dir() else 0,
        },
        "accounts": {
            "count": len(quotex_accounts),
            "current_index": account_index + 1,
            "current_email": session.email if session else None,
            "rotate_every_s": ACCOUNT_ROTATE_S,
            "switch_delay_s": ACCOUNT_SWITCH_DELAY_S,
            **rotation_state,
        },
        "collection": {
            "align_s": COLLECTION_ALIGN_S,
            "start_at": _collection_start_at,
            "started": bool(_collection_start_at) and time.time() >= _collection_start_at,
        },
        "always_on": {
            "enabled": ALWAYS_ON_ENABLED,
            "mode": ALWAYS_ON_MARKETS,
            "periods": ALWAYS_ON_PERIODS,
            "markets": len(always_on_state["resolved_symbols"]),
            "streams": len(always_on_keys),
            "warm_streams": sum(
                1 for k in always_on_keys
                if _AlwaysOnSentinel.singleton() in released_subscribers.get(k, set())
            ),
            "unresolved": always_on_state["unresolved"],
            "last_refresh": always_on_state["last_refresh"],
        },
    }


@app.get("/markets/status")
async def markets_status() -> dict[str, Any]:
    """Per-stream health: candles buffered, warm flag, live-tick age."""
    sentinel = _AlwaysOnSentinel.singleton()
    rows = []
    for key in sorted(streamer_tasks.keys()):
        buf = candle_store.get(key) or []
        age = _asset_tick_age(key[0])
        rows.append(
            {
                "asset": key[0],
                "period": key[1],
                "always_on": key in always_on_keys,
                "warm": sentinel in released_subscribers.get(key, set())
                or bool(released_subscribers.get(key)),
                "candles": len(buf),
                "last_candle_time": buf[-1].get("time") if buf else None,
                "tick_age_s": None if age == float("inf") else round(age, 1),
                "viewers": sum(
                    1 for ws in subscriptions.get(key, set())
                    if not isinstance(ws, (_AlwaysOnSentinel, _PublicOtcSentinel))
                ),
            }
        )
    return {"count": len(rows), "streams": rows}


# --------------------------------------------------------------------------- #
# CLI bootstrap: log in BEFORE serving
# --------------------------------------------------------------------------- #


async def periodic_asset_refresh() -> None:
    """Every 30s push a fresh asset list (open/closed flags, payouts)."""
    assert session is not None
    while True:
        await asyncio.sleep(30)
        if not connected_clients:
            continue
        try:
            assets = await session.get_assets()
            await broadcast({"type": "assets", "assets": _client_assets(assets)})
        except Exception as exc:  # noqa: BLE001
            log.debug("periodic refresh failed: %s", exc)


# Interval between consecutive market-activity pings. The reference
# project (engine.py from qxlivechart) uses 180 s. Below ~120 s the
# broker classifies us as polling and starts throttling; above ~240 s
# the session goes cold on quiet OTC pairs and the next get_candles()
# returns empty (the original VPS bug).
MARKET_ACTIVITY_PING_INTERVAL_S = float(
    os.getenv("MARKET_ACTIVITY_PING_INTERVAL_S", "180")
)


async def market_activity_ping() -> None:
    """
    Keep pyquotex's broker session warm by periodically issuing a tiny
    get_candles() request against every currently-subscribed pair.

    Why this exists
    ---------------
    Quotex's WS server marks a session "idle" if no candle/history
    request flows for a few minutes, after which subsequent get_candles
    calls return empty / partial data until the next user interaction.
    On a local PC the user clicking around (asset change, timeframe
    swap, etc.) implicitly keeps the session warm. On a headless VPS
    that fires only one initial get_candles() per asset subscription,
    nothing renews the activity bookkeeping — so the 199-candle fetch
    eventually starts failing for everyone, and re-logging in is the
    only known recovery.

    Mirroring the reference repo's ``market_activity_ping`` (engine.py
    lines 261-279), we fire a small, low-cost get_candles call on every
    active (asset, period) every ~180 s. This consumes one request per
    pair per cycle, well below the broker's documented rate limit.
    """
    assert session is not None
    while True:
        await asyncio.sleep(MARKET_ACTIVITY_PING_INTERVAL_S)
        if not streamer_tasks:
            # No one is subscribed — nothing to keep warm.
            continue
        # One ping per ASSET (not per period) — the broker's activity
        # bookkeeping is per instrument, and with always-on markets this
        # halves the request count. Serialised through the global broker
        # semaphore so it never races a history / REST fetch on pyquotex's
        # shared candle buffer.
        seen_assets: set[str] = set()
        for (asset, period) in list(streamer_tasks.keys()):
            if asset in seen_assets:
                continue
            seen_assets.add(asset)
            try:
                # Tiny request: just 3 candles. The point isn't the data,
                # it's the broker-side activity timestamp update.
                async with _get_history_semaphore():
                    _ = await session.get_history(asset, period, count=3)
                log.debug(
                    "market ping ok for %s/%s",
                    asset,
                    period,
                )
            except Exception as exc:  # noqa: BLE001
                log.debug(
                    "market ping failed for %s/%s: %s",
                    asset,
                    period,
                    exc,
                )
            # Tiny stagger between pairs so we don't burst N requests
            # in a single tick (same reason HISTORY_FETCH_INTER_DELAY
            # exists for the user-facing history fetches).
            await asyncio.sleep(0.5)


async def reconnect_watchdog() -> None:
    """Same philosophy as the reference project's `price_sleep_watcher` +
    `realtime_heartbeat`: if we haven't seen a price tick in ~90 s while there
    are active streams, force a full re-login and resubscribe so the chart
    comes back to life automatically after network / session drops."""
    assert session is not None
    while True:
        await asyncio.sleep(20)
        if not streamer_tasks:
            # No one is subscribed, nothing to monitor.
            continue
        # Don't judge tick silence before collection has even started
        # (streamers are parked until the minute boundary) + a warm-up
        # margin for the first serialized history fetches.
        if time.time() < _collection_start_at + 90:
            continue
        age = time.time() - session.last_tick_time
        if age > 90:
            log.warning(
                "watchdog: no tick for %.0fs with %d active stream(s) — "
                "triggering full reconnect",
                age,
                len(streamer_tasks),
            )
            ok = await session.reconnect()
            if ok:
                # Restart any active subscriptions so candles keep flowing.
                for asset, period in list(streamer_tasks.keys()):
                    try:
                        await session.start_candles_stream(asset, period)
                    except Exception as exc:  # noqa: BLE001
                        log.debug("resubscribe %s/%s failed: %s", asset, period, exc)
                session.last_tick_time = time.time()


# --------------------------------------------------------------------------- #
# MULTI-ACCOUNT ROTATION — up to 10 Quotex accounts from .env
# --------------------------------------------------------------------------- #
#   QUOTEX_EMAIL_1 / QUOTEX_PASSWORD_1 ... QUOTEX_EMAIL_10 / QUOTEX_PASSWORD_10
#   (falls back to QUOTEX_EMAIL / QUOTEX_PASSWORD when none are numbered)
# Every ACCOUNT_ROTATE_S the next account logs in a NEW session while the
# current one keeps running, subscribes every market, waits
# ACCOUNT_SWITCH_DELAY_S and then takes over exactly on a minute boundary.
# The candle store is shared, so the new session continues the same candles.
MAX_QUOTEX_ACCOUNTS = 10
ACCOUNT_ROTATE_S = float(os.getenv("ACCOUNT_ROTATE_S", "10800"))
ACCOUNT_SWITCH_DELAY_S = float(os.getenv("ACCOUNT_SWITCH_DELAY_S", "120"))
ACCOUNT_LOGIN_TIMEOUT_S = float(os.getenv("ACCOUNT_LOGIN_TIMEOUT_S", "120"))
ACCOUNT_RETRY_S = 300
ACCOUNT_DEAD_GRACE_S = 60


def _load_accounts() -> list[tuple[str, str]]:
    accounts: list[tuple[str, str]] = []
    for i in range(1, MAX_QUOTEX_ACCOUNTS + 1):
        email = (os.getenv(f"QUOTEX_EMAIL_{i}") or "").strip()
        password = os.getenv(f"QUOTEX_PASSWORD_{i}") or ""
        if email and password:
            accounts.append((email, password))
    if not accounts and os.getenv("QUOTEX_EMAIL") and os.getenv("QUOTEX_PASSWORD"):
        accounts.append((os.getenv("QUOTEX_EMAIL", "").strip(), os.getenv("QUOTEX_PASSWORD", "")))
    return accounts


quotex_accounts: list[tuple[str, str]] = _load_accounts()
account_index = 0
rotation_state: dict[str, Any] = {
    "next_login_at": None,
    "switch_at": None,
    "switching_to": None,
    "last_switch_at": None,
    "last_error": None,
}


async def _login_account(i: int, host: str) -> QuotexSession | None:
    """Non-interactive login of account ``i`` (a PIN request counts as failure)."""
    email, password = quotex_accounts[i]
    s = QuotexSession(email=email, password=password, host=host)
    try:
        status, detail = await asyncio.wait_for(s.connect(), timeout=ACCOUNT_LOGIN_TIMEOUT_S)
    except asyncio.TimeoutError:
        status, detail = "error", "login timed out"
    if status == "ok" and s.client is not None:
        log.info("rotation: account #%d %s logged in (new session)", i + 1, email)
        return s
    log.warning("rotation: account #%d %s login failed: %s %s", i + 1, email, status, detail)
    rotation_state["last_error"] = f"#{i + 1} {email}: {status} {detail}"
    with suppress(Exception):
        await s.close()
    return None


async def _collector_on_switch(new_session: QuotexSession) -> None:
    global session
    session = new_session
    rotation_state["last_switch_at"] = time.time()


async def account_rotator() -> None:
    """Every ACCOUNT_ROTATE_S log the next account in and hand over at a minute boundary."""
    global account_index
    assert collector is not None
    login_started = time.time()
    next_login_at = login_started + ACCOUNT_ROTATE_S
    dead_since: float | None = None
    while True:
        rotation_state["next_login_at"] = next_login_at
        await asyncio.sleep(5)
        now = time.time()
        alive = session is not None and session.logged_in
        dead_since = None if alive else (dead_since or now)
        dead_too_long = dead_since is not None and now - dead_since > ACCOUNT_DEAD_GRACE_S
        if now < next_login_at and not dead_too_long:
            continue
        login_started = now
        host = session.host if session is not None else "market-qx.pro"
        new_sess, new_idx = None, account_index
        for step in range(1, len(quotex_accounts) + 1):
            i = (account_index + step) % len(quotex_accounts)
            log.info("rotation: logging in account #%d %s", i + 1, quotex_accounts[i][0])
            new_sess = await _login_account(i, host)
            if new_sess is not None:
                new_idx = i
                break
        if new_sess is None:
            log.warning("rotation: no account could log in — retrying in %ds", ACCOUNT_RETRY_S)
            next_login_at = time.time() + ACCOUNT_RETRY_S
            continue
        try:
            at = await collector.prepare_switch(new_sess, ACCOUNT_SWITCH_DELAY_S)
        except Exception as exc:  # noqa: BLE001
            log.warning("rotation: preparing new session failed: %s", exc)
            rotation_state["last_error"] = f"prepare: {exc}"
            with suppress(Exception):
                await new_sess.close()
            next_login_at = time.time() + ACCOUNT_RETRY_S
            continue
        rotation_state["switch_at"] = at
        rotation_state["switching_to"] = new_sess.email
        await collector.wait_switched()
        account_index = new_idx
        rotation_state["switching_to"] = None
        dead_since = None
        next_login_at = login_started + ACCOUNT_ROTATE_S


async def _bootstrap_login(s: QuotexSession, interactive: bool) -> bool:
    """Interactive first login (PIN prompt allowed). False if this account failed."""
    while True:
        status, detail = await s.connect()
        if status == "ok":
            print(f"[+] Logged in. Account: {s.account_info}")
            return True
        if status == "2fa_required":
            print(f"[!] 2FA required: {detail}")
            code = (os.getenv("QUOTEX_2FA_CODE") or "").strip()
            if code:
                print("[*] Using QUOTEX_2FA_CODE from environment.")
            elif interactive:
                code = input("Enter the code from your email: ").strip()
            else:
                print("[x] 2FA is required but stdin is not a TTY — skipping this account.", file=sys.stderr)
                return False
            ok, err = await s.submit_2fa(code)
            if not ok:
                print(f"[x] 2FA failed: {err}")
                return False
            continue
        print(f"[x] Login failed for {s.email}: {detail}")
        return False


async def login_all_accounts() -> None:
    """`python main.py --login-all`: log every .env account in once (enter PINs) to cache tokens."""
    host = (os.getenv("QUOTEX_HOST") or "market-qx.pro").strip() or "market-qx.pro"
    for i, (email, password) in enumerate(quotex_accounts):
        print(f"\n[*] Account #{i + 1}: {email}")
        s = QuotexSession(email=email, password=password, host=host)
        ok = await _bootstrap_login(s, sys.stdin.isatty())
        print("[+] OK — session token saved" if ok else "[x] FAILED")
        with suppress(Exception):
            await s.close()


CANDLE_SAVE_INTERVAL_S = float(os.getenv("CANDLE_SAVE_INTERVAL_S", "10"))


async def candle_saver() -> None:
    """Write every market whose candles changed to CANDLE_DATA_DIR."""
    while True:
        await asyncio.sleep(CANDLE_SAVE_INTERVAL_S)
        try:
            await asyncio.to_thread(candle_store.flush_all)
        except Exception as exc:  # noqa: BLE001
            log.warning("candle save failed: %s", exc)


async def bootstrap() -> None:
    """Authenticate the first working account, then let the HTTP server start."""
    global session, account_index

    print("=" * 60)
    print("  Quotex Live Chart Backend")
    print("  Make sure your VPN is ACTIVE before logging in.")
    print("=" * 60)

    # Non-interactive launch (systemd, Docker, nohup) must never block on input().
    interactive = sys.stdin.isatty()
    saved_email = None
    host = (os.getenv("QUOTEX_HOST") or "market-qx.pro").strip() or "market-qx.pro"

    if quotex_accounts:
        print(
            f"[*] {len(quotex_accounts)} Quotex account(s) in .env — new session every "
            f"{ACCOUNT_ROTATE_S / 3600:g}h, switch {ACCOUNT_SWITCH_DELAY_S:g}s after login"
        )
    else:
        # Saved credentials from a previous successful login (~/.pyquotex/credentials.json).
        saved_email, saved_password, saved_host = QuotexSession.load_saved_credentials()
        host = (os.getenv("QUOTEX_HOST") or saved_host or "market-qx.pro").strip() or "market-qx.pro"
        email, password = saved_email, saved_password
        if email and password:
            print(f"[*] Using saved login for {email}  (host: {host})")
        elif interactive:
            email = input("Quotex email: ").strip()
            password = getpass("Quotex password: ")
        else:
            print(
                "[x] No Quotex account found in environment and stdin is not a\n"
                "    TTY (running under systemd/Docker?). Add to python_backend/.env:\n"
                "        QUOTEX_EMAIL_1=you@example.com\n"
                "        QUOTEX_PASSWORD_1=yourpassword\n"
                "    and restart the service.",
                file=sys.stderr,
            )
            sys.exit(1)
        quotex_accounts.append((email, password))

    for i, (email, password) in enumerate(quotex_accounts):
        print(f"\n[*] Connecting to Quotex account #{i + 1} {email} ...")
        s = QuotexSession(email=email, password=password, host=host)
        if await _bootstrap_login(s, interactive):
            session = s
            account_index = i
            break
        with suppress(Exception):
            await s.close()
        if saved_email and email == saved_email:
            QuotexSession.clear_saved_credentials()
    else:
        print("[x] No Quotex account could log in.", file=sys.stderr)
        sys.exit(1)

    # From now on a PIN request (background rotation) fails instead of blocking.
    _pq_login.ALLOW_PIN_PROMPT = False

    # Every per-user JSON file from a previous process is by definition
    # stale (the WS sessions that owned them are gone). Wipe the
    # directory so we never serve a leftover file from yesterday's run.
    with suppress(Exception):
        user_session_store.purge_all_sync()

    # Minute-aligned collection start — every market begins collecting at
    # the next wall-clock minute boundary (not mid-candle).
    start_at = _schedule_collection_start()
    print(
        "[*] Market data collection starts at "
        f"{time.strftime('%H:%M:%S', time.localtime(start_at))} "
        f"(in {max(0.0, start_at - time.time()):.1f}s, aligned to {COLLECTION_ALIGN_S}s)"
    )

    # Candles saved on disk by the previous run come back before collection starts.
    loaded = candle_store.load_all()
    print(f"[*] Candle storage: {candle_store.data_dir}  ({loaded} saved markets loaded)")
    asyncio.create_task(candle_saver())

    asyncio.create_task(periodic_asset_refresh())
    if ALWAYS_ON_ENABLED:
        # crt-chk style: one collector subscribes every open market on the
        # single websocket and builds all candles from live ticks.
        global collector
        collector = LiveCollector(
            session,
            candle_store,
            ALWAYS_ON_PERIODS,
            COLLECTION_ALIGN_S,
            on_candle=_collector_on_candle,
            on_history=_collector_on_history,
            on_markets=_collector_on_markets,
            on_switch=_collector_on_switch,
            backfill=os.getenv("LIVE_BACKFILL", "1").strip().lower() in {"1", "true", "yes", "on"},
        )
        asyncio.create_task(collector.run())
        asyncio.create_task(account_rotator())
        return
    asyncio.create_task(reconnect_watchdog())
    # Keep pyquotex's broker session warm so the 199-candle fetch
    # never starts returning empty on a long-running VPS process.
    # See ``market_activity_ping()`` docstring for the full rationale.
    asyncio.create_task(market_activity_ping())
    # Always-running USD/BRL OTC pump for the home page.
    asyncio.create_task(public_otc_runner())
    # Boot-time gate: hold the home-page chart back until the candle
    # that was already running at backend start has closed, then refetch
    # a clean 199-candle history and broadcast it. This guarantees the
    # very first candle the website paints is a brand-new, fully-formed
    # bucket — never a partially-formed one we joined mid-flight.
    asyncio.create_task(_public_otc_open_gate_when_running_candle_closes())
    # ALWAYS-ON: subscribe every configured market x period and keep
    # collecting tick-by-tick data 24/7 so any chart opens instantly.
    asyncio.create_task(always_on_runner())


def run() -> None:
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    if "--login-all" in sys.argv:
        loop.run_until_complete(login_all_accounts())
        return

    try:
        loop.run_until_complete(bootstrap())
    except KeyboardInterrupt:
        print("\nAborted before login.")
        return

    # Shared signal engine (Chart-to-Signal / Future / Automatic + Telegram).
    loop.run_until_complete(signal_engine.start(sys.modules[__name__]))

    config = uvicorn.Config(app, host=host, port=port, log_level="info", loop="asyncio")
    server = uvicorn.Server(config)

    def _handle_sigint(*_: Any) -> None:
        server.should_exit = True

    with suppress(NotImplementedError):
        loop.add_signal_handler(signal.SIGINT, _handle_sigint)
        loop.add_signal_handler(signal.SIGTERM, _handle_sigint)

    print(f"\n[+] Server live: http://{host}:{port}")
    print(f"    Browser WebSocket: ws://{host}:{port}/ws")
    print(f"    Public OTC WebSocket: ws://{host}:{port}/public-otc/ws")
    print("    Open your Next.js site now.\n")

    try:
        loop.run_until_complete(server.serve())
    finally:
        with suppress(Exception):
            loop.run_until_complete(signal_engine.stop())
        with suppress(Exception):
            saved = candle_store.flush_all(everything=True)
            log.info("saved %d markets to %s", saved, candle_store.data_dir)
        # Cleanly tear down the upstream Quotex session so we release
        # the ws connection and let the broker's per-account
        # subscription bookkeeping reset before the next process
        # starts. Skipping this is what occasionally produced the
        # ``Token rejected`` response on the very first connect after
        # an abrupt SIGTERM.
        if session is not None:
            try:
                loop.run_until_complete(session.close())
            except Exception as exc:  # noqa: BLE001
                log.debug("graceful session close failed: %s", exc)


if __name__ == "__main__":
    run()
