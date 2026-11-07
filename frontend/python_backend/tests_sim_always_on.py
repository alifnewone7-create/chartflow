"""
Offline simulation for the LIVE COLLECTOR (no Quotex login needed).

Run:  python tests_sim_always_on.py
Stubs QuotexSession + the pyquotex client, boots the real main.py wiring and
checks:
  1. nothing is listed / joinable before the aligned boundary
  2. at the boundary EVERY open Quotex market is listed (closed ones are not)
  3. a user joins instantly (no wait phase) and gets live candle frames
  4. history backfill runs strictly one-at-a-time and is pushed to viewers
  5. live candles only start at the boundary; the home-page OTC chart is fed
"""
from __future__ import annotations

import asyncio
import json
import os
import random
import sys
import time
import types

os.environ.setdefault("ALWAYS_ON_PERIODS", "60,15")

OPEN = ["EURUSD_otc", "GBPUSD_otc", "USDBRL_otc", "BTCUSD_otc", "EURUSD", "XYZABC_otc"]
CLOSED = ["GBPJPY"]
stats = {"inflight": 0, "max_inflight": 0, "get_candles": 0, "history_load": 0, "v2": 0}


def _row(code, is_open):
    r = [0] * 20
    r[1], r[2], r[5], r[14], r[11] = code, code.replace("_otc", " (OTC)"), 85, is_open, 85
    return r


class FakeApi:
    def __init__(self):
        self.realtime_price: dict = {}
        self.historical_candles = None
        self.candle_v2_data: dict = {}
        self.current_asset = None
        self.prices: dict = {}

    def get_candles(self, asset, index, end, offset, period):
        """history/load: broker replies asynchronously with list-format rows."""
        stats["history_load"] += 1
        stats["inflight"] += 1
        stats["max_inflight"] = max(stats["max_inflight"], stats["inflight"])

        async def reply():
            await asyncio.sleep(0.05)
            p = self.prices.get(asset, 1.0)
            last = (int(end) // period) * period
            rows = [[last - i * period, p, p, p * 1.001, p * 0.999] for i in range(offset // period)][::-1]
            self.historical_candles = {"asset": asset, "index": index, "data": rows}
            stats["inflight"] -= 1

        asyncio.get_running_loop().create_task(reply())


class FakeClient:
    def __init__(self):
        self.api = FakeApi()
        self.prices = self.api.prices
        self._ticker = asyncio.create_task(self._tick_loop())

    async def get_instruments(self):
        return [_row(c, True) for c in OPEN] + [_row(c, False) for c in CLOSED]

    def start_candles_stream(self, code, period=0):
        """Like Quotex: subscribe replies with ~500 candles via history/list/v2."""
        api = self.api
        api.current_asset = code
        api.realtime_price[code] = []
        if not period:
            return
        stats["v2"] += 1
        stats["inflight"] += 1
        stats["max_inflight"] = max(stats["max_inflight"], stats["inflight"])

        async def reply():
            await asyncio.sleep(0.05)
            stats["inflight"] -= 1
            if api.current_asset != code:  # pyquotex fork drops it
                return
            p = self.prices.get(code, 1.0)
            last = (int(time.time()) // period) * period
            api.candle_v2_data[code] = {"asset": code, "candles": [
                {"time": last - i * period, "open": p, "close": p, "high": p * 1.001, "low": p * 0.999, "ticks": 5}
                for i in range(500)][::-1]}

        asyncio.get_running_loop().create_task(reply())

    async def get_candles(self, code, end, offset, period, timeout=30):
        stats["get_candles"] += 1
        stats["inflight"] += 1
        stats["max_inflight"] = max(stats["max_inflight"], stats["inflight"])
        try:
            await asyncio.sleep(0.05)
            now = int(end)
            last = (now // period) * period
            p = self.prices.get(code, 1.0)
            return [{"time": last - i * period, "open": p, "high": p * 1.001, "low": p * 0.999, "close": p}
                    for i in range(offset // period)][::-1]
        finally:
            stats["inflight"] -= 1

    async def _tick_loop(self):
        while True:
            for code in list(self.api.realtime_price):
                p = self.prices.setdefault(code, 1.0 + random.random()) * (1 + random.uniform(-1e-4, 1e-4))
                self.prices[code] = p
                self.api.realtime_price[code].append({"time": time.time(), "price": p})
            await asyncio.sleep(0.1)


class FakeSession:
    def __init__(self, *a, **k):
        self.client = FakeClient()
        self.account_info = {"balance": 10000}
        self._last_tick: dict = {}

    async def get_assets(self):
        return []

    async def reconnect(self):
        return True


fake_mod = types.ModuleType("quotex_session")
fake_mod.QuotexSession = FakeSession
sys.modules["quotex_session"] = fake_mod

import main  # noqa: E402


class FakeWS:
    def __init__(self):
        self.frames: list[dict] = []

    async def send_text(self, data):
        self.frames.append(json.loads(data))

    async def close(self, *a, **k):
        pass


def _new_ws(name):
    ws = FakeWS()
    main.connected_clients_meta[ws] = {"ws_id": name, "active_sub": None}
    return ws


async def run():
    main.session = FakeSession()
    main.COLLECTION_ALIGN_S = 10
    main.PUBLIC_OTC_PERIOD = 10  # test-only: periods must divide the 10s boundary
    main.collector = main.LiveCollector(
        main.session, main.candle_store, [10, 5], 10,
        on_candle=main._collector_on_candle,
        on_history=main._collector_on_history,
        on_markets=main._collector_on_markets,
    )
    task = asyncio.create_task(main.collector.run())
    await asyncio.sleep(0.5)
    start_at = main.collector.started_at
    assert start_at and int(start_at) % 10 == 0, "boundary not aligned"

    early = _new_ws("early")
    await main._subscribe(early, "EURUSD_otc", 60)
    assert any(f.get("code") == "market_not_live" for f in early.frames), "early subscribe must be refused"
    assert main._client_assets([]) == [], "markets listed before boundary"
    print(f"[OK] nothing listed / joinable before boundary ({start_at - time.time():.1f}s left)")
    await asyncio.sleep(0.3)  # initial subscribe burst replies settle
    stats["max_inflight"] = 0

    while time.time() < start_at + 0.5:
        await asyncio.sleep(0.1)
    listed = {a["symbol"] for a in main._client_assets([])}
    assert listed == set(OPEN), f"live list mismatch {listed}"
    print(f"[OK] at boundary all {len(listed)} open markets listed (closed excluded)")

    ws = _new_ws("u1")
    t0 = time.time()
    await main._subscribe(ws, "XYZABC_otc", 5)
    dt = (time.time() - t0) * 1000
    phases = [f.get("phase") for f in ws.frames if f.get("type") == "phase"]
    assert phases == ["running_candle_closed"], f"user must not wait: {phases}"
    await asyncio.sleep(1.0)
    live = [f for f in ws.frames if f.get("type") == "candle"]
    assert live, "no live candle frames"
    assert all(f["candle"]["time"] >= int(start_at) for f in live), "pre-boundary live candle"
    print(f"[OK] instant join in {dt:.1f} ms, {len(live)} live candle frames")

    deadline = time.time() + 30
    while time.time() < deadline and not (main.collector._backfill_task and main.collector._backfill_task.done()):
        await asyncio.sleep(0.2)
    hist = [f for f in ws.frames if f.get("type") == "history"]
    assert hist, "history backfill not pushed"
    older = [c for c in hist[-1]["candles"] if c["time"] < int(start_at)]
    newer = [c for c in hist[-1]["candles"] if c["time"] >= int(start_at)]
    assert len(older) == 199, f"expected exactly 199 historical candles, got {len(older)}"
    assert newer, "tick-built candles after the historical ones are missing"
    assert stats["max_inflight"] == 1, f"concurrent history fetches: {stats['max_inflight']}"
    assert stats["history_load"] == 0, "history/load fallback should not be needed"
    print(f"[OK] backfill via history/list/v2: {stats['v2']} subscribes, max concurrent = "
          f"{stats['max_inflight']}, chart = {len(older)} historical + {len(newer)} tick-built candles")

    assert main.public_otc_state.get("asset") == "USDBRL_otc" and main.public_otc_state.get("gate_open")
    assert main.candle_store.get(("USDBRL_otc", 10)), "home-page chart not fed"
    print("[OK] home-page USD/BRL OTC chart fed from the collector")

    await main._unsubscribe(ws, "XYZABC_otc", 5)
    await asyncio.sleep(0.5)
    before = len(main.candle_store.get(("XYZABC_otc", 5)))
    assert before >= 199, "collection stopped after user left"
    print("[OK] collection keeps running after user left")

    task.cancel()
    print("\nALL CHECKS PASSED")


if __name__ == "__main__":
    asyncio.run(run())
