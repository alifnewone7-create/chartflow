"""
Tick-by-tick replay data for the delayed "Two candles ahead" card (personal tier).

Every live candle update the collector broadcasts is recorded here with the
server time it happened. The website fetches the last few minutes once
(``GET /replay/{asset}?period=60``) and then keeps recording the live
stream itself, so it can replay the chart exactly as it looked
``2 × period`` seconds ago, update by update.
"""

from __future__ import annotations

import time
from collections import deque
from typing import Any

from fastapi import APIRouter

# The forming bucket at (now - 2 periods) can have started up to 3 periods ago.
KEEP_PERIODS = 3
KEEP_EXTRA_S = 5

Key = tuple[str, int]


class ReplayRecorder:
    def __init__(self) -> None:
        self._snaps: dict[Key, deque[tuple[float, dict[str, Any]]]] = {}

    def record(self, key: Key, candle: dict[str, Any]) -> None:
        now = time.time()
        q = self._snaps.setdefault(key, deque())
        q.append((now, dict(candle)))
        horizon = now - KEEP_PERIODS * key[1] - KEEP_EXTRA_S
        while q and q[0][0] < horizon:
            q.popleft()

    def snapshots(self, asset: str, period: int) -> list[tuple[float, dict[str, Any]]]:
        q = self._snaps.get((asset, period))
        if q is None:
            wanted = asset.lower()
            q = next((v for (a, p), v in self._snaps.items() if p == period and a.lower() == wanted), None)
        return list(q or ())


recorder = ReplayRecorder()
router = APIRouter()


@router.get("/replay/{asset}")
async def replay(asset: str, period: int = 60) -> dict[str, Any]:
    snaps = recorder.snapshots(asset, period)
    return {
        "asset": asset,
        "period": period,
        "server_time": time.time(),
        "snapshots": [{"t": round(t, 3), "candle": c} for t, c in snaps],
    }
