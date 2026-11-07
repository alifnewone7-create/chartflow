"use client"

import { useEffect, useRef, useState } from "react"

import { resolveDefaultWsUrl, type Candle } from "@/hooks/use-quotex-ws"

export type PublicOtcStatus =
  | "connecting"
  | "loading"
  | "open"
  | "waiting-asset"
  | "closed"
  | "error"

type WsIncoming =
  | { type: "ready"; asset: string | null; period: number; buffer_size: number }
  | {
      type: "loading"
      asset: string | null
      period: number
      warm_up_done: boolean
    }
  | { type: "snapshot"; asset: string | null; candles: Candle[] }
  | { type: "candle"; candle: Candle; asset: string | null }
  | { type: "status"; status: string; asset: string | null }
  | { type: "pong" }

// Match the backend's CandleStore.MAX_CANDLES — the chart always shows
// exactly 500 candles (499 historical + 1 forming = 500
// displayed). When a new bucket arrives the oldest candle is dropped.
const HISTORY_CAP = 500
const RECONNECT_MS = 3000
const PING_MS = 20000

/**
 * Derive the public-OTC WebSocket URL from the user-configured backend URL.
 *
 * `/livechart` lets the user enter the backend URL (saved to localStorage),
 * which usually ends in `/ws`. We swap that for `/public-otc/ws` so the
 * marketing home page automatically reuses the same backend without any
 * extra configuration.
 */
function deriveOtcUrl(): string {
  const base = resolveDefaultWsUrl()
  let url: string
  if (base.endsWith("/ws")) url = base.slice(0, -3) + "/public-otc/ws"
  else if (base.endsWith("/")) url = base + "public-otc/ws"
  else url = base + "/public-otc/ws"

  // Append optional shared secret (matches the backend's
  // ``WS_SHARED_SECRET`` enforcement). Read at call-time so test
  // overrides via ``process.env`` work and the value is captured
  // fresh on every reconnect.
  const sharedSecret = process.env.NEXT_PUBLIC_WS_SHARED_SECRET
  if (sharedSecret) {
    try {
      const u = new URL(url)
      u.searchParams.set("key", sharedSecret)
      url = u.toString()
    } catch {
      url = url + (url.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(sharedSecret)
    }
  }
  return url
}

export function usePublicOtc() {
  const [status, setStatus] = useState<PublicOtcStatus>("connecting")
  const [assetSymbol, setAssetSymbol] = useState<string | null>(null)
  const [candles, setCandles] = useState<Candle[]>([])
  const candlesRef = useRef<Candle[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const closedByUs = useRef(false)

  useEffect(() => {
    closedByUs.current = false

    const connect = () => {
      const url = deriveOtcUrl()
      console.log("[public-otc] connecting to", url)
      setStatus("connecting")

      let ws: WebSocket
      try {
        ws = new WebSocket(url)
      } catch (err) {
        console.log("[public-otc] ws ctor failed", err)
        // Same rationale as `onerror` below — keep the user-facing state
        // as "connecting" while we retry.
        setStatus("connecting")
        scheduleReconnect()
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        console.log("[public-otc] open")
        // Status will be refined to "open" or "waiting-asset" once we receive
        // the `ready` frame from the backend.
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "ping" }))
          }
        }, PING_MS)
      }

      ws.onmessage = (evt) => {
        let msg: WsIncoming
        try {
          msg = JSON.parse(evt.data)
        } catch {
          return
        }
        if (msg.type === "loading") {
          // Backend is still warming up this market (no current-bucket
          // tick received yet). Show a loading state so we never
          // render a half-formed chart. The next `snapshot` frame
          // will arrive once warm-up completes.
          if (msg.asset) setAssetSymbol(msg.asset)
          // Only flip to "loading" if we don't already have data —
          // a reconnect on an established chart should keep showing
          // the existing 200 candles, not regress to a spinner.
          if (candlesRef.current.length === 0) setStatus("loading")
          console.log(
            "[public-otc] loading asset=",
            msg.asset,
            "warm_up_done=",
            msg.warm_up_done,
          )
        } else if (msg.type === "ready") {
          setAssetSymbol(msg.asset)
          setStatus(
            msg.asset
              ? candlesRef.current.length > 0
                ? "open"
                : "loading"
              : "waiting-asset",
          )
          console.log(
            "[public-otc] ready asset=",
            msg.asset,
            "buffered=",
            msg.buffer_size,
          )
        } else if (msg.type === "snapshot") {
          const sorted = [...msg.candles].sort((a, b) => a.time - b.time)
          const trimmed = sorted.slice(-HISTORY_CAP)

          // Anti-flicker guard: if we already have a forming candle for
          // a bucket newer than anything in this snapshot, KEEP it.
          // This protects against the periodic `get_history` refresh
          // dropping the in-flight forming bucket and briefly showing
          // 199 candles before the next live tick repopulates it
          // (the user-reported "199 -> 200 flash").
          const merged = trimmed
          const existing = candlesRef.current
          const lastNew = trimmed.length
            ? trimmed[trimmed.length - 1].time
            : -1
          const lastOld = existing.length
            ? existing[existing.length - 1].time
            : -1
          if (existing.length > 0 && lastOld > lastNew) {
            // Preserve every existing candle whose time is newer than
            // anything in the snapshot — that's the live forming
            // candle (and any yet-to-be-written closed bucket the
            // server hasn't included in this snapshot).
            for (const c of existing) {
              if (c.time > lastNew) merged.push(c)
            }
          }

          candlesRef.current = merged
          setCandles(merged)
          if (msg.asset) setAssetSymbol(msg.asset)
          if (merged.length > 0) setStatus("open")
          console.log(
            "[public-otc] snapshot candles=",
            trimmed.length,
            "merged=",
            merged.length,
          )
        } else if (msg.type === "candle") {
          const arr = candlesRef.current.slice()
          const last = arr[arr.length - 1]
          if (last && last.time === msg.candle.time) {
            // Same bucket — update the forming/last bar in place.
            arr[arr.length - 1] = msg.candle
          } else if (!last || msg.candle.time > last.time) {
            // New bucket — append.
            arr.push(msg.candle)
            if (arr.length > HISTORY_CAP) arr.splice(0, arr.length - HISTORY_CAP)
          } else {
            // Out-of-order: this is the backend's broker-authoritative
            // correction for a recently-closed bucket (or a delayed
            // gap-fill candle). The previous version of this hook
            // dropped these on the floor with `return`, which is why
            // earlier candles sometimes stayed visibly wrong / gappy
            // until the user refreshed the page (a refresh forced a
            // fresh `snapshot` that carried the corrected buffer).
            // Walk backwards and either patch in place or splice into
            // the right slot so corrections / fills land on the chart
            // immediately.
            const searchStart = Math.max(0, arr.length - 64)
            let merged = false
            for (let i = arr.length - 2; i >= searchStart; i--) {
              if (arr[i].time === msg.candle.time) {
                arr[i] = msg.candle
                merged = true
                break
              }
              if (arr[i].time < msg.candle.time) {
                arr.splice(i + 1, 0, msg.candle)
                if (arr.length > HISTORY_CAP) {
                  arr.splice(0, arr.length - HISTORY_CAP)
                }
                merged = true
                break
              }
            }
            if (!merged) return
          }
          candlesRef.current = arr
          setCandles(arr)
          if (msg.asset) setAssetSymbol(msg.asset)
          setStatus("open")
        } else if (msg.type === "status") {
          if (msg.asset) setAssetSymbol(msg.asset)
          if (msg.status === "resolved") setStatus("open")
        }
      }

      ws.onerror = (err) => {
        console.log("[public-otc] error", err)
        // Don't surface a hard "error" state. The auto-reconnect loop
        // below will retry, so we keep the UI in "connecting" — never
        // "Offline" / "Error" while the backend is unreachable.
        setStatus("connecting")
      }

      ws.onclose = () => {
        console.log("[public-otc] closed")
        if (pingTimer.current) {
          clearInterval(pingTimer.current)
          pingTimer.current = null
        }
        wsRef.current = null
        if (closedByUs.current) return
        // Stay in "connecting" while reconnect is pending so the chart
        // shows a "Connecting…" overlay instead of the previous
        // "Offline" / "Connection lost" state.
        setStatus("connecting")
        scheduleReconnect()
      }
    }

    const scheduleReconnect = () => {
      if (reconnectTimer.current) return
      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null
        if (!closedByUs.current) connect()
      }, RECONNECT_MS)
    }

    connect()

    return () => {
      closedByUs.current = true
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      if (pingTimer.current) {
        clearInterval(pingTimer.current)
        pingTimer.current = null
      }
      const ws = wsRef.current
      wsRef.current = null
      if (ws) {
        try {
          ws.close()
        } catch {
          /* noop */
        }
      }
    }
  }, [])

  return { status, assetSymbol, candles }
}
