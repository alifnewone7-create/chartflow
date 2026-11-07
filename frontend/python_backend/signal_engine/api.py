"""HTTP API for the three signal features (Firebase ID token auth on every route)."""

from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from . import rtdb
from .features import MAX_FUTURE, FeatureError

router = APIRouter(prefix="/engine", tags=["signal-engine"])
_engine: Any = None
_last_call: dict[tuple[str, str], float] = {}

RATE = {"c2s": 2.0, "future": 15.0, "tg-link": 5.0, "channel": 5.0, "session": 2.0, "report": 3.0, "bot-test": 3.0}


def bind(engine: Any) -> None:
    global _engine
    _engine = engine


class User(BaseModel):
    uid: str
    tier: str
    premium: bool


async def current_user(request: Request) -> User:
    if _engine is None or not rtdb.ready():
        raise HTTPException(503, "Signal engine is not running on the server.")
    token = request.headers.get("authorization", "")
    token = token[7:] if token.lower().startswith("bearer ") else ""
    decoded = await rtdb.verify_token(token) if token else None
    if not decoded or not decoded.get("uid"):
        raise HTTPException(401, "Sign in again to continue.")
    tier = await rtdb.user_tier(decoded["uid"])
    return User(uid=decoded["uid"], tier=tier, premium=rtdb.is_premium(tier))


async def premium_user(user: User = Depends(current_user)) -> User:
    if not user.premium:
        raise HTTPException(403, "This feature is available on paid plans. Upgrade your plan to unlock it.")
    return user


def limit(user: User, bucket: str) -> None:
    now_t = time.monotonic()
    key = (user.uid, bucket)
    if now_t - _last_call.get(key, 0.0) < RATE[bucket]:
        raise HTTPException(429, "Too many requests — please wait a moment.")
    _last_call[key] = now_t
    if len(_last_call) > 20000:
        _last_call.clear()


async def run(coro: Any) -> Any:
    try:
        return await coro
    except FeatureError as exc:
        raise HTTPException(exc.status, exc.detail) from exc


# ------------------------------------------------------------------ shared
@router.get("/me")
async def me(user: User = Depends(current_user)) -> dict[str, Any]:
    tg = _engine.telegram
    return {"uid": user.uid, "tier": user.tier, "premium": user.premium, "telegram_enabled": tg.enabled, "telegram_bot": tg.username}


@router.get("/markets")
async def markets(user: User = Depends(current_user)) -> dict[str, Any]:
    return {"markets": await _engine.market.active_markets(), "server_time": time.time()}


@router.get("/candles")
async def candles(asset: str, count: int = 60, user: User = Depends(premium_user)) -> dict[str, Any]:
    return {"asset": asset, "candles": _engine.market.closed_candles(asset, max(10, min(200, count)))}


# ------------------------------------------------------------------ chart-to-signal
class C2SBody(BaseModel):
    asset: str = Field(min_length=2, max_length=40)


@router.post("/c2s/signals")
async def c2s_generate(body: C2SBody, user: User = Depends(current_user)) -> dict[str, Any]:
    limit(user, "c2s")
    return await run(_engine.c2s.generate(user.uid, user.tier, body.asset))


# ------------------------------------------------------------------ future signals
class FutureBody(BaseModel):
    markets: list[str] = Field(min_length=1, max_length=60)
    quantity: int = Field(ge=1, le=MAX_FUTURE)


@router.post("/future/signals")
async def future_generate(body: FutureBody, user: User = Depends(premium_user)) -> dict[str, Any]:
    limit(user, "future")
    return await run(_engine.future.generate(user.uid, body.markets, body.quantity))


# ------------------------------------------------------------------ telegram
@router.post("/telegram/link")
async def tg_link(user: User = Depends(premium_user)) -> dict[str, Any]:
    limit(user, "tg-link")
    try:
        return await _engine.telegram.create_link_token(user.uid)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(503, str(exc)) from exc


@router.delete("/telegram/link")
async def tg_unlink(user: User = Depends(current_user)) -> dict[str, Any]:
    await _engine.telegram.unlink(user.uid)
    return {"ok": True}


# ------------------------------------------------------------------ automatic signal
@router.get("/auto/settings")
async def auto_settings(user: User = Depends(premium_user)) -> dict[str, Any]:
    return await _engine.auto.settings(user.uid)


@router.put("/auto/settings")
async def auto_settings_save(body: dict[str, Any], user: User = Depends(premium_user)) -> dict[str, Any]:
    try:
        return await run(_engine.auto.save_settings(user.uid, body))
    except (TypeError, ValueError) as exc:
        raise HTTPException(400, "Invalid settings value.") from exc


class ChannelBody(BaseModel):
    chat_id: str = Field(min_length=2, max_length=64)


@router.post("/auto/channel/verify")
async def auto_channel(body: ChannelBody, user: User = Depends(premium_user)) -> dict[str, Any]:
    limit(user, "channel")
    return await run(_engine.auto.verify_channel(user.uid, body.chat_id))


class StartBody(BaseModel):
    mode: str
    markets: list[str] = Field(default_factory=list, max_length=60)


@router.post("/auto/sessions")
async def auto_start(body: StartBody, user: User = Depends(premium_user)) -> dict[str, Any]:
    limit(user, "session")
    return await run(_engine.auto.start_session(user.uid, body.model_dump()))


@router.post("/auto/sessions/{sid}/{action}")
async def auto_control(sid: str, action: str, user: User = Depends(current_user)) -> dict[str, Any]:
    if action not in ("pause", "resume", "close"):
        raise HTTPException(404, "Unknown action")
    if action == "resume" and not user.premium:
        raise HTTPException(403, "Your subscription is not active. Upgrade to resume this session.")
    limit(user, "session")
    return await run(_engine.auto.control(user.uid, sid, action))


@router.get("/auto/sessions/{sid}/report")
async def auto_report(sid: str, user: User = Depends(current_user)) -> dict[str, Any]:
    return await run(_engine.auto.report(user.uid, sid))


class ReportBody(BaseModel):
    resend: bool = False


@router.post("/auto/sessions/{sid}/report/send")
async def auto_report_send(sid: str, body: ReportBody, user: User = Depends(current_user)) -> dict[str, Any]:
    limit(user, "report")
    return await run(_engine.auto.send_report(user.uid, sid, body.resend))


# ------------------------------------------------------------------ admin
async def admin_user(request: Request) -> User:
    if _engine is None or not rtdb.ready():
        raise HTTPException(503, "Signal engine is not running on the server.")
    token = request.headers.get("authorization", "")
    token = token[7:] if token.lower().startswith("bearer ") else ""
    decoded = await rtdb.verify_token(token) if token else None
    if not decoded or decoded.get("admin") is not True:
        raise HTTPException(403, "Admin sign-in required.")
    return User(uid=str(decoded.get("uid") or "admin"), tier="admin", premium=True)


class BotTestBody(BaseModel):
    user_id: str = Field(min_length=3, max_length=20, pattern=r"^[1-9]\d+$")


@router.post("/admin/bot-test")
async def bot_test(body: BotTestBody, user: User = Depends(admin_user)) -> dict[str, Any]:
    limit(user, "bot-test")
    from .telegram_bot import TelegramError

    try:
        return await _engine.telegram.send_test(int(body.user_id))
    except TelegramError as exc:
        raise HTTPException(400, str(exc)) from exc
