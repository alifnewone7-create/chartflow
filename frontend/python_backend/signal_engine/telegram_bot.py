"""Telegram: one main bot for everyone — deep-link auth, delivery, channel checks.

The bot token only lives in the backend env (TELEGRAM_BOT_TOKEN).
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import secrets
import time
from typing import Any

import requests

import html

from . import bot_style, rtdb
from .timeutil import hhmm, mono, pretty_asset

log = logging.getLogger("signal-engine.telegram")

TOKEN_TTL_S = 600
SEP = "━━━━━━━━━━━━━━━━━━━━"
SEP_R = "━━━━━━━━━━━━━━━━━━━━━"


class TelegramError(Exception):
    pass


class Telegram:
    def __init__(self) -> None:
        self.token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
        self.username: str | None = None
        self.bot_id: int | None = None
        self._stop = asyncio.Event()

    @property
    def enabled(self) -> bool:
        return bool(self.token)

    # ------------------------------------------------------------ raw api
    def _call_sync(self, method: str, data: dict[str, Any] | None = None, files: Any = None, timeout: float = 30) -> Any:
        url = f"https://api.telegram.org/bot{self.token}/{method}"
        r = requests.post(url, data=data or {}, files=files, timeout=timeout)
        try:
            body = r.json()
        except ValueError as exc:
            raise TelegramError(f"{method}: HTTP {r.status_code}") from exc
        if not body.get("ok"):
            raise TelegramError(body.get("description") or f"{method} failed")
        return body["result"]

    async def call(self, method: str, data: dict[str, Any] | None = None, files: Any = None, timeout: float = 30, retries: int = 2) -> Any:
        if not self.enabled:
            raise TelegramError("Telegram bot is not configured on the server")
        last: Exception | None = None
        for attempt in range(retries + 1):
            try:
                return await asyncio.to_thread(self._call_sync, method, data, files, timeout)
            except TelegramError as exc:
                msg = str(exc).lower()
                if "too many requests" in msg and attempt < retries:
                    await asyncio.sleep(3 * (attempt + 1))
                    last = exc
                    continue
                raise
            except requests.RequestException as exc:
                last = exc
                await asyncio.sleep(1.5 * (attempt + 1))
        raise TelegramError(f"{method}: network error {last}")

    async def start(self) -> None:
        if not self.enabled:
            log.warning("TELEGRAM_BOT_TOKEN not set — Telegram features disabled")
            return
        me = await self.call("getMe")
        self.username, self.bot_id = me.get("username"), me.get("id")
        await self.call("deleteWebhook", {"drop_pending_updates": "false"})
        log.info("telegram bot @%s ready", self.username)

    def stop(self) -> None:
        self._stop.set()

    # ------------------------------------------------------------ linking
    @staticmethod
    def _hash(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    async def create_link_token(self, uid: str) -> dict[str, Any]:
        if not self.username:
            raise TelegramError("Telegram bot is not configured on the server")
        token = secrets.token_urlsafe(24)
        exp = int(time.time()) + TOKEN_TTL_S
        await rtdb.set_(f"telegram/tokens/{self._hash(token)}", {"uid": uid, "expires_at": exp, "used": False})
        return {"url": f"https://t.me/{self.username}?start={token}", "expires_at": exp}

    async def poll(self) -> None:
        """Long-poll updates (only /start <token> and /status are handled)."""
        if not self.enabled:
            return
        offset = int(await rtdb.get("telegram/state/offset") or 0)
        while not self._stop.is_set():
            try:
                updates = await self.call("getUpdates", {"offset": offset, "timeout": 25, "allowed_updates": '["message"]'}, timeout=35, retries=0)
            except Exception as exc:  # noqa: BLE001
                log.info("getUpdates failed: %s", exc)
                await asyncio.sleep(5)
                continue
            for upd in updates:
                offset = max(offset, int(upd["update_id"]) + 1)
                try:
                    await self._handle(upd.get("message") or {})
                except Exception as exc:  # noqa: BLE001
                    log.warning("telegram update failed: %s", exc)
            if updates:
                await rtdb.set_("telegram/state/offset", offset)

    async def _reply(self, chat_id: int, text: str, parse_mode: str | None = None) -> None:
        data: dict[str, Any] = {"chat_id": chat_id, "text": text}
        if parse_mode:
            data["parse_mode"] = parse_mode
        try:
            await self.call("sendMessage", data)
        except Exception as exc:  # noqa: BLE001
            log.info("reply failed: %s", exc)

    async def _handle(self, msg: dict[str, Any]) -> None:
        text = str(msg.get("text") or "").strip()
        chat = msg.get("chat") or {}
        sender = msg.get("from") or {}
        if chat.get("type") != "private" or not text.startswith("/start"):
            return
        parts = text.split(maxsplit=1)
        if len(parts) < 2:
            await self._status(chat["id"], int(sender.get("id") or chat["id"]))
            return
        await self.link(parts[1].strip(), sender, chat["id"])

    async def _status(self, chat_id: int, tg_id: int) -> None:
        uid = await rtdb.get(f"telegram/by_tg/{tg_id}")
        link = await rtdb.get(f"telegram/links/{uid}") if uid else None
        if not uid or not isinstance(link, dict):
            await self._reply(chat_id, "Status : Not Connected\n\nOpen the connection link from the ChartFlow Ai Automatic Signal page to link your account.")
            return
        user = await rtdb.get(f"users/{uid}") or {}
        email = str(user.get("email") or "") if isinstance(user, dict) else ""
        shown = f"<tg-spoiler>{html.escape(email, quote=False)}</tg-spoiler>" if email else "-"
        await self._reply(chat_id, f"Status : Connected\n\nYour Email : {shown}", parse_mode="HTML")

    async def link(self, token: str, sender: dict[str, Any], chat_id: int) -> None:
        h = self._hash(token)
        claimed: dict[str, Any] = {}

        def fn(cur: Any) -> Any:
            claimed.clear()
            if not isinstance(cur, dict) or cur.get("used") or int(cur.get("expires_at", 0)) < time.time():
                return cur
            claimed.update(cur)
            return {**cur, "used": True, "used_at": int(time.time())}

        await rtdb.transaction(f"telegram/tokens/{h}", fn)
        if not claimed:
            await self._reply(chat_id, "❌ This connection link is invalid, expired or already used. Create a new one on the website.")
            return
        uid = claimed["uid"]
        tg_id = int(sender["id"])
        owner = {"v": None}

        def own(cur: Any) -> Any:
            if cur and cur != uid:
                owner["v"] = cur
                return cur
            return uid

        await rtdb.transaction(f"telegram/by_tg/{tg_id}", own)
        if owner["v"]:
            await self._reply(chat_id, "❌ This Telegram account is already connected to another ChartFlow Ai user.")
            return
        old = await rtdb.get(f"telegram/links/{uid}")
        updates: dict[str, Any] = {
            f"links/{uid}": {
                "telegram_id": tg_id,
                "chat_id": chat_id,
                "username": sender.get("username") or None,
                "first_name": sender.get("first_name") or None,
                "connected_at": int(time.time() * 1000),
                "status": "connected",
            }
        }
        if isinstance(old, dict) and old.get("telegram_id") and int(old["telegram_id"]) != tg_id:
            updates[f"by_tg/{int(old['telegram_id'])}"] = None
        await rtdb.update("telegram", updates)
        await self._reply(chat_id, "✅ Your Telegram account is now connected to ChartFlow Ai. Automatic signals will arrive here.")

    async def unlink(self, uid: str) -> None:
        link = await rtdb.get(f"telegram/links/{uid}")
        updates: dict[str, Any] = {f"links/{uid}": None}
        if isinstance(link, dict) and link.get("telegram_id"):
            updates[f"by_tg/{int(link['telegram_id'])}"] = None
        await rtdb.update("telegram", updates)

    async def verify_channel(self, chat_id: str) -> dict[str, Any]:
        """Check the bot can see the channel and is allowed to post there."""
        try:
            chat = await self.call("getChat", {"chat_id": chat_id})
        except TelegramError as exc:
            raise TelegramError(f"Bot cannot access this channel: {exc}. Add the bot to the channel first.") from exc
        member = await self.call("getChatMember", {"chat_id": chat_id, "user_id": self.bot_id})
        status = member.get("status")
        ctype = chat.get("type")
        if ctype == "channel":
            ok = status == "creator" or (status == "administrator" and member.get("can_post_messages"))
        else:
            ok = status in ("creator", "administrator", "member") and member.get("can_send_messages", True) is not False
        if not ok:
            raise TelegramError("The bot is in the chat but has no permission to post. Make it an admin with 'Post messages'.")
        return {"chat_id": str(chat.get("id")), "title": chat.get("title") or chat.get("username") or str(chat_id), "type": ctype}

    # ------------------------------------------------------------ delivery
    async def _send(self, method: str, data: dict[str, Any], key: str, premium: bool, files: Any = None, timeout: float = 30) -> Any:
        """Personal chats get premium (custom) emojis; on any rejection fall back to the plain text."""
        if premium:
            converted = bot_style.premium_html(data[key], await bot_style.emoji_map())
            if converted:
                try:
                    return await self.call(method, {**data, key: converted, "parse_mode": "HTML"}, files=files, timeout=timeout)
                except TelegramError as exc:
                    log.info("premium emoji send failed, using normal emojis: %s", exc)
        return await self.call(method, data, files=files, timeout=timeout)

    async def send_photo(self, chat_id: str | int, png: bytes, caption: str, premium: bool = False) -> int:
        res = await self._send("sendPhoto", {"chat_id": chat_id, "caption": caption}, "caption", premium, files={"photo": ("signal.png", png, "image/png")}, timeout=60)
        return int(res["message_id"])

    async def send_text(self, chat_id: str | int, text: str, reply_to: int | None = None, premium: bool = False) -> int:
        data: dict[str, Any] = {"chat_id": chat_id, "text": text}
        if reply_to:
            data["reply_to_message_id"] = reply_to
            data["allow_sending_without_reply"] = "true"
        return int((await self._send("sendMessage", data, "text", premium))["message_id"])

    async def send_test(self, user_id: int) -> dict[str, Any]:
        """Admin preview: sample signal, result and partial report with the current styles + premium emojis."""
        from . import reports

        bot_style._CACHE["at"] = 0.0
        entry = (int(time.time()) // 60 + 1) * 60
        sig = {"asset": "USDINR_otc", "asset_name": "USD/INR (OTC)", "direction": "PUT", "entry_at": entry, "payout": 91, "mtg_steps": 1, "status": "WIN"}
        samples = [{**sig, "asset": a, "direction": d, "status": st, "entry_at": entry + i * 480} for i, (a, d, st) in enumerate([("USDINR_otc", "PUT", "WIN"), ("EURUSD_otc", "CALL", "MTG WIN"), ("USDBRL_otc", "PUT", "LOSS")])]
        texts = [await signal_caption(sig), await result_caption(sig), reports.build(samples, time.time(), await bot_style.template("partial"))["text"]]
        try:
            for t in texts:
                await self.send_text(user_id, t, premium=True)
        except TelegramError as exc:
            msg = str(exc).lower()
            bot = f"@{self.username}" if self.username else "the bot"
            if "initiate conversation" in msg or "chat not found" in msg or "user not found" in msg:
                raise TelegramError(f"This user has not started the bot yet. Ask them to open {bot} and press /start, then try again.") from exc
            if "blocked" in msg:
                raise TelegramError(f"This user has blocked {bot}. They need to unblock it and press /start.") from exc
            if "deactivated" in msg:
                raise TelegramError("This Telegram account is deleted or deactivated.") from exc
            raise
        return {"ok": True, "sent": len(texts), "premium_emojis": len(await bot_style.emoji_map())}

    async def edit_caption(self, chat_id: str | int, message_id: int, caption: str) -> None:
        await self.call("editMessageCaption", {"chat_id": chat_id, "message_id": message_id, "caption": caption})


# ---------------------------------------------------------------- captions
def _dir(direction: str) -> str:
    return "🟢 " + mono("CALL") if direction == "CALL" else "🟥 " + mono("PUT")


async def signal_caption(sig: dict[str, Any]) -> str:
    mtg = int(sig.get("mtg_steps", 1))
    return bot_style.render(await bot_style.template("signal"), {
        "asset": mono(pretty_asset(sig["asset"], sig.get("asset_name"))),
        "direction": _dir(sig["direction"]),
        "entry_time": mono(hhmm(int(sig["entry_at"]))),
        "payout": mono(str(sig.get("payout") or "-") + "%"),
        "mtg": mono(f"{mtg} - Step") if mtg else mono("No MTG"),
    })


RESULT_LABEL = {"WIN": "✅ " + mono("WIN"), "MTG WIN": "✅ " + mono("MTG WIN"), "LOSS": "❌ " + mono("LOSS")}


async def result_caption(sig: dict[str, Any]) -> str:
    return bot_style.render(await bot_style.template("result"), {
        "asset": mono(pretty_asset(sig["asset"], sig.get("asset_name"))),
        "direction": _dir(sig["direction"]),
        "entry_time": mono(hhmm(int(sig["entry_at"]))),
        "result": RESULT_LABEL[sig["status"]],
    })
