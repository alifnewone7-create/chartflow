"""Simulates a live account switch on LiveCollector with fake pyquotex clients."""
import asyncio
import time

import live_collector as lc
from simple_buffer import SimpleBuffer


class FakeApi:
    def __init__(self):
        self.realtime_price = {"EURUSD_otc": []}


class FakeClient:
    def __init__(self):
        self.api = FakeApi()

    async def get_instruments(self):
        row = [None] * 20
        row[1], row[2], row[3], row[5], row[14], row[11] = "EURUSD_otc", "EUR/USD", "currency", 85, True, 85
        return [row]

    def start_candles_stream(self, code, period):
        return None

    def stop_candles_stream(self, code):
        return None


class FakeSession:
    def __init__(self, email):
        self.email = email
        self.client = FakeClient()
        self.logged_in = True
        self.closed = False

    async def close(self):
        self.closed = True

    async def reconnect(self):
        return True


async def main():
    lc.SWITCH_ALIGN_S = 5
    lc.OLD_SESSION_CLOSE_DELAY_S = 0.5
    old, new = FakeSession("old@x"), FakeSession("new@x")
    store = SimpleBuffer()
    switched = []

    async def noop(*_a):
        return None

    async def on_switch(s):
        switched.append(s.email)

    c = lc.LiveCollector(old, store, [1], 0, noop, noop, noop, backfill=False, on_switch=on_switch)
    task = asyncio.create_task(c.run())

    async def feeder():
        while True:
            ts = time.time()
            old.client.api.realtime_price["EURUSD_otc"].append({"time": ts, "price": 1.0})
            new.client.api.realtime_price["EURUSD_otc"].append({"time": ts, "price": 2.0})
            await asyncio.sleep(0.05)

    feed = asyncio.create_task(feeder())
    await asyncio.sleep(1.5)
    at = await c.prepare_switch(new, 1.0)
    await asyncio.wait_for(c.wait_switched(), timeout=15)
    await asyncio.sleep(2)
    feed.cancel()
    task.cancel()

    candles = store.get(("EURUSD_otc", 1))
    before = [x for x in candles if x["time"] < at]
    after = [x for x in candles if x["time"] >= at]
    assert at % 5 == 0, at
    assert c.session is new, "session not swapped"
    assert switched == ["new@x"], switched
    assert old.closed, "old session not closed"
    assert before and all(x["high"] == 1.0 and x["low"] == 1.0 for x in before), before[-3:]
    assert after and all(x["high"] == 2.0 and x["low"] == 2.0 for x in after), after[:3]
    times = [x["time"] for x in candles]
    assert times == sorted(times) and len(set(times)) == len(times)
    assert all(b - a == 1 for a, b in zip(times, times[1:])), "gap in candles"
    print(f"OK switch_at={at} before={len(before)} after={len(after)} total={len(candles)}")

    # 500-candle cap
    buf = SimpleBuffer()
    for t in range(700):
        buf.push(("X", 60), {"time": t * 60, "open": 1, "high": 1, "low": 1, "close": 1}, 60)
    got = buf.get(("X", 60))
    assert len(got) == 500 and got[0]["time"] == 200 * 60
    print("OK 500 cap")

    # disk persistence: save -> new process loads the same 500 candles
    import tempfile
    from pathlib import Path
    d = Path(tempfile.mkdtemp())
    a = SimpleBuffer(d)
    for t in range(700):
        a.push(("EURUSD_otc", 60), {"time": t * 60, "open": 1, "high": 1, "low": 1, "close": 1}, 60)
    assert a.flush_all() == 1 and (d / "EURUSD_otc_60.json").exists()
    b = SimpleBuffer(d)
    assert b.load_all() == 1
    got = b.get(("EURUSD_otc", 60))
    assert len(got) == 500 and got[0]["time"] == 200 * 60 and got[-1]["time"] == 699 * 60
    assert a.flush_all() == 0, "nothing changed, nothing to write"
    print("OK disk save/load")

    # saved candles fill what broker history misses; broker wins on overlap; stale gap ignored
    saved = [{"time": t * 60, "close": 0} for t in range(100, 300)]
    book = {t * 60: {"time": t * 60, "close": 9} for t in range(250, 400)}
    out = lc.LiveCollector._merge_saved(saved, book, 60, 400 * 60)
    assert out[0]["time"] == 100 * 60 and len(out) == 300
    assert all(c["close"] == 9 for c in out if c["time"] >= 250 * 60)
    far = {t * 60: {"time": t * 60, "close": 9} for t in range(500, 600)}
    out = lc.LiveCollector._merge_saved(saved, far, 60, 600 * 60)
    assert len(out) == 100, "non-contiguous saved candles must be dropped"
    print("OK saved merge")


asyncio.run(main())
