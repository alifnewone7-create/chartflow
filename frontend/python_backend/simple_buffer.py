"""
In-memory candle buffer, persisted to disk on the VPS.

Every (asset, period) keeps at most MAX_CANDLES candles (oldest dropped).
Each key is saved as ``<CANDLE_DATA_DIR>/<asset>_<period>.json`` whenever a
candle closes (flushed every few seconds by ``flush_all``) and loaded back on
startup, so a restart starts from the stored candles instead of empty.
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
from pathlib import Path
from typing import Any

log = logging.getLogger("simple-buffer")

MAX_CANDLES = 500
CANDLE_DATA_DIR = Path(
    os.getenv("CANDLE_DATA_DIR") or Path(__file__).resolve().parent / "data" / "candles"
)


class SimpleBuffer:
    """Thread-safe candle buffer with JSON-file persistence."""

    def __init__(self, data_dir: Path = CANDLE_DATA_DIR) -> None:
        self._buffers: dict[tuple[str, int], list[dict[str, Any]]] = {}
        self._lock = threading.RLock()
        self._dirty: set[tuple[str, int]] = set()
        self.data_dir = Path(data_dir)

    def get(self, key: tuple[str, int]) -> list[dict[str, Any]]:
        """Return a copy of the current buffer."""
        with self._lock:
            return list(self._buffers.get(key, []))

    def has(self, key: tuple[str, int]) -> bool:
        with self._lock:
            return bool(self._buffers.get(key))

    def keys(self) -> list[tuple[str, int]]:
        with self._lock:
            return list(self._buffers.keys())

    def set_history(
        self,
        key: tuple[str, int],
        candles: list[dict[str, Any]],
        period: int | None = None,  # kept for API compat, not used
    ) -> list[dict[str, Any]]:
        """Replace the buffer with the given candles (sorted, capped)."""
        with self._lock:
            cleaned = [
                c for c in candles if isinstance(c, dict) and "time" in c
            ]
            cleaned.sort(key=lambda c: int(c["time"]))
            cleaned = cleaned[-MAX_CANDLES:]
            self._buffers[key] = cleaned
            self._dirty.add(key)
            return list(cleaned)

    def push(
        self,
        key: tuple[str, int],
        candle: dict[str, Any],
        period: int,
        gap_filler: Any = None,  # kept for API compat, not used
    ) -> tuple[bool, list[dict[str, Any]]]:
        """
        Insert / update a single candle from the live stream.

          - same time as last candle: update in place
          - newer: append (trim to MAX_CANDLES) and mark for saving
          - older: ignore (stale tick)
        """
        if not isinstance(candle, dict) or "time" not in candle:
            return False, self.get(key)

        try:
            t = int(candle["time"])
        except (TypeError, ValueError):
            return False, self.get(key)

        with self._lock:
            arr = self._buffers.setdefault(key, [])

            if not arr:
                arr.append(candle)
                self._dirty.add(key)
                return True, list(arr)

            last_t = int(arr[-1].get("time", 0))

            if t == last_t:
                arr[-1] = candle
                return True, list(arr)
            elif t > last_t:
                arr.append(candle)
                if len(arr) > MAX_CANDLES:
                    del arr[: len(arr) - MAX_CANDLES]
                self._dirty.add(key)
                return True, list(arr)
            else:
                return False, list(arr)

    def clear(self, key: tuple[str, int]) -> None:
        """Clear the in-memory buffer for a key (the file is overwritten on next save)."""
        with self._lock:
            self._buffers.pop(key, None)
            self._dirty.discard(key)
            log.info("simple-buffer: cleared %s", key)

    # ------------------------------------------------------------ persistence
    def _path(self, key: tuple[str, int]) -> Path:
        safe = re.sub(r"[^A-Za-z0-9_.-]", "_", key[0])
        return self.data_dir / f"{safe}_{int(key[1])}.json"

    def _write(self, key: tuple[str, int], candles: list[dict[str, Any]]) -> None:
        path = self._path(key)
        tmp = path.with_suffix(".json.tmp")
        payload = {"asset": key[0], "period": key[1], "candles": candles}
        tmp.write_text(json.dumps(payload, separators=(",", ":")))
        os.replace(tmp, path)

    def flush(self, key: tuple[str, int]) -> None:
        with self._lock:
            candles = list(self._buffers.get(key, []))
            self._dirty.discard(key)
        try:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            self._write(key, candles)
        except Exception as exc:  # noqa: BLE001
            log.warning("simple-buffer: save %s failed: %s", key, exc)

    def flush_all(self, everything: bool = False) -> int:
        """Save every changed key (or all keys); returns how many files were written."""
        with self._lock:
            keys = list(self._buffers) if everything else list(self._dirty)
        for key in keys:
            self.flush(key)
        return len(keys)

    def load_all(self) -> int:
        """Load every saved market file into memory; returns how many keys were loaded."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        loaded = 0
        for path in self.data_dir.glob("*.json"):
            try:
                data = json.loads(path.read_text())
                key = (str(data["asset"]), int(data["period"]))
                candles = [c for c in data.get("candles") or [] if isinstance(c, dict) and "time" in c]
            except Exception as exc:  # noqa: BLE001
                log.warning("simple-buffer: could not load %s: %s", path, exc)
                continue
            candles.sort(key=lambda c: int(c["time"]))
            with self._lock:
                self._buffers[key] = candles[-MAX_CANDLES:]
            loaded += 1
        log.info("simple-buffer: loaded %d saved markets from %s", loaded, self.data_dir)
        return loaded
