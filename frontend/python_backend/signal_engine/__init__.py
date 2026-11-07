"""Signal engine wiring: one Engine instance started from main.py."""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from typing import Any

from . import api, rtdb
from .evaluation import EvaluationWorker
from .features import AutoSessions, ChartToSignal, FutureSignals
from .market_data import MarketData
from .telegram_bot import Telegram

log = logging.getLogger("signal-engine")

router = api.router


class Engine:
    def __init__(self, ctx: Any) -> None:
        self.market = MarketData(ctx)
        self.worker = EvaluationWorker(self.market)
        self.telegram = Telegram()
        self.c2s = ChartToSignal(self.market, self.worker)
        self.future = FutureSignals(self.market, self.worker)
        self.auto = AutoSessions(self.market, self.worker, self.telegram)
        self.tasks: list[asyncio.Task] = []


_engine: Engine | None = None


async def start(ctx: Any) -> Engine | None:
    """Initialise Firebase, recover pending work and launch the background workers."""
    global _engine
    if _engine is not None:
        return _engine
    try:
        if not rtdb.init():
            return None
    except Exception as exc:  # noqa: BLE001
        log.error("signal engine: firebase init failed: %s", exc)
        return None
    eng = Engine(ctx)
    await eng.worker.load()
    await eng.auto.load()
    try:
        await eng.telegram.start()
    except Exception as exc:  # noqa: BLE001
        log.error("telegram start failed: %s", exc)
    eng.tasks = [
        asyncio.create_task(eng.worker.run(), name="eval-worker"),
        asyncio.create_task(eng.auto.run(), name="auto-sessions"),
        asyncio.create_task(eng.telegram.poll(), name="telegram-poll"),
    ]
    api.bind(eng)
    _engine = eng
    log.info("signal engine started")
    return eng


async def stop() -> None:
    if _engine is None:
        return
    _engine.worker.stop()
    _engine.auto.stop()
    _engine.telegram.stop()
    for t in _engine.tasks:
        t.cancel()
        with suppress(asyncio.CancelledError, Exception):
            await t
