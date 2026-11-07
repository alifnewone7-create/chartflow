"use client"

import { useEffect, useRef, useState } from "react"

import type { Candle } from "@/hooks/use-quotex-ws"
import { resolveHttpBase } from "@/lib/signals-client"

type Snap = { t: number; candle: Candle }

type DelayedView = { history: Candle[]; latest: Candle | null; ready: boolean }

const EMPTY: DelayedView = { history: [], latest: null, ready: false }
const FRAME_MS = 100

/**
 * Replays the live chart ``delayCandles × period`` seconds late, update by
 * update. The backend's ``/replay`` endpoint seeds the last few minutes of
 * live updates; after that every live ``latest`` is recorded locally.
 */
export function useDelayedCandles({
  asset,
  period,
  history,
  latest,
  delayCandles = 2,
}: {
  asset: string | null
  period: number
  history: Candle[]
  latest: Candle | null
  delayCandles?: number
}): DelayedView {
  const snapsRef = useRef<Snap[]>([])
  const historyRef = useRef(history)
  historyRef.current = history
  const [view, setView] = useState<DelayedView>(EMPTY)
  const delay = delayCandles * period

  // Seed from the backend (server timestamps → this browser's clock).
  useEffect(() => {
    snapsRef.current = []
    setView(EMPTY)
    if (!asset) return
    let cancelled = false
    fetch(`${resolveHttpBase()}/replay/${encodeURIComponent(asset)}?period=${period}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { server_time: number; snapshots: Snap[] } | null) => {
        if (cancelled || !data) return
        const offset = data.server_time - Date.now() / 1000
        const seed = data.snapshots.map((s) => ({ t: s.t - offset, candle: s.candle }))
        const lastSeedT = seed.length ? seed[seed.length - 1].t : -Infinity
        snapsRef.current = [...seed, ...snapsRef.current.filter((s) => s.t > lastSeedT)]
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [asset, period])

  // Record every live update with the moment it arrived.
  useEffect(() => {
    if (asset && latest) snapsRef.current.push({ t: Date.now() / 1000, candle: latest })
  }, [asset, latest])

  // Play back: show the state the live chart had `delay` seconds ago.
  useEffect(() => {
    if (!asset) return
    const id = setInterval(() => {
      const target = Date.now() / 1000 - delay
      const snaps = snapsRef.current
      let idx = -1
      for (let i = snaps.length - 1; i >= 0; i--) {
        if (snaps[i].t <= target) {
          idx = i
          break
        }
      }
      if (idx < 0) return
      // Keep only what can still be replayed (the forming bucket onward).
      if (idx > 0) {
        const bucket = snaps[idx].candle.time
        let cut = idx
        while (cut > 0 && snaps[cut - 1].candle.time === bucket) cut--
        if (cut > 0) {
          snaps.splice(0, cut)
          idx -= cut
        }
      }
      const forming = snaps[idx].candle
      setView((prev) => {
        const all = historyRef.current
        let end = all.length
        while (end > 0 && all[end - 1].time >= forming.time) end--
        const sameClosed =
          prev.history.length === end &&
          prev.history[end - 1]?.time === all[end - 1]?.time &&
          prev.history[end - 1]?.close === all[end - 1]?.close
        if (prev.latest === forming && sameClosed) return prev
        return {
          history: sameClosed ? prev.history : all.slice(0, end),
          latest: forming,
          ready: true,
        }
      })
    }, FRAME_MS)
    return () => clearInterval(id)
  }, [asset, delay])

  return view
}
