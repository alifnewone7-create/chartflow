"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, WifiOff } from "lucide-react"

import { TradingChart } from "@/components/trading-chart"
import { Spinner } from "@/components/ui/spinner"
import { usePublicOtc } from "@/hooks/use-public-otc"

/**
 * LockedOtcChart — the marketing landing page's USD/BRL (OTC), 1-minute
 * candlestick chart.
 *
 * Architecture:
 *  - Connects to `/api/public-otc` (Server-Sent Events).
 *  - That route is backed by a single Node-side singleton (`lib/public-otc-hub`)
 *    which keeps ONE upstream WebSocket open to the Quotex backend, no matter
 *    how many home-page visitors are watching. New visitors immediately
 *    receive a snapshot of the cached candle history, so the chart never
 *    starts empty.
 *  - The chart is interactive (scroll/pan/zoom enabled) but its leftmost
 *    edge is pinned to the first available candle, so users can scroll back
 *    through whatever history we have but never into empty space. It also
 *    boots pre-zoomed — tighter on mobile (`barSpacing≈14`) and slightly
 *    zoomed on desktop (`barSpacing≈9`) — so the candles read clearly
 *    without the user having to pinch in.
 */

export function LockedOtcChart() {
  const { status, assetSymbol, candles } = usePublicOtc()

  // Mobile detection drives the initial zoom level. We default to the
  // desktop value so SSR/hydration is stable, then refine once we're in
  // the browser. The chart only consumes this on its first render anyway,
  // so a one-frame swap is fine.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(max-width: 768px)")
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const latest = candles.length > 0 ? candles[candles.length - 1] : null

  const overlay = useMemo(() => {
    if (status === "error" || status === "closed") {
      return {
        kind: "warn" as const,
        title: "Live feed unavailable",
        body:
          "The Quotex backend is not reachable right now. The stream will resume automatically once it's back online.",
      }
    }
    if (status === "waiting-asset" && candles.length === 0) {
      return {
        kind: "warn" as const,
        title: "USD/BRL OTC closed",
        body: "This market is currently not listed by the broker. Check back during OTC trading hours.",
      }
    }
    if (status === "connecting" && candles.length === 0) {
      return {
        kind: "info" as const,
        title: "Connecting to live feed",
        body: "Establishing a secure link to the Quotex stream…",
      }
    }
    if (status === "open" && candles.length === 0) {
      return {
        kind: "info" as const,
        title: "Loading USD/BRL OTC",
        body: "Fetching the latest 1-minute candles…",
      }
    }
    if (status === "loading") {
      // Boot-time running-candle gate: the backend has connected but is
      // holding the chart back until the candle that was already in flight
      // when it started has finished. The next 1-minute bucket boundary
      // will flip the gate open and a fresh 199-candle snapshot will paint.
      return {
        kind: "info" as const,
        title: "Waiting for next candle",
        body:
          "A new 1-minute candle is about to start. The chart will paint as soon as the running candle closes.",
      }
    }
    return null
  }, [status, candles.length])

  // Surface the resolved symbol in dev only — useful when debugging.
  if (typeof window !== "undefined" && assetSymbol) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    assetSymbol
  }

  return (
    <div className="relative h-full w-full">
      <TradingChart
        history={candles}
        latest={latest}
        theme="dark"
        hideGrid
        hideScales
        // Interactive: users can pan/zoom freely, but only as far back as
        // we actually have candles for.
        restrictLeftEdge
        // Pre-zoomed at boot: tight candles on mobile, slight zoom on PC.
        defaultBarSpacing={isMobile ? 14 : 9}
      />

      {/* ChartFlow Ai logo watermark overlaid on top of the chart */}
      <div
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        aria-hidden
      >
        <img
          src="/brand/chartflow-logo.svg"
          alt=""
          className="h-auto w-[60%] max-w-[420px] select-none opacity-[0.2]"
          draggable={false}
        />
      </div>

      {overlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="flex max-w-sm flex-col items-center gap-2 rounded-lg border border-white/10 bg-slate-900/80 px-5 py-4 text-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              {overlay.kind === "info" ? (
                <Spinner className="size-4 text-emerald-400" />
              ) : status === "error" || status === "closed" ? (
                <WifiOff className="size-4 text-amber-400" aria-hidden />
              ) : (
                <AlertTriangle className="size-4 text-amber-400" aria-hidden />
              )}
              {overlay.title}
            </div>
            <p className="text-pretty text-xs leading-relaxed text-white/70">
              {overlay.body}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
