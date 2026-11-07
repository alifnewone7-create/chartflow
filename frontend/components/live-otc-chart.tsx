"use client"

import { useMemo } from "react"
import { AlertTriangle, WifiOff } from "lucide-react"

import { TradingChart } from "@/components/trading-chart"
import { Spinner } from "@/components/ui/spinner"
import { usePublicOtc } from "@/hooks/use-public-otc"

/**
 * LiveOtcChart — the same USD/BRL (OTC) 1-minute candlestick chart shown on
 * the marketing landing page, but **unlocked** so users on the signal-room
 * pages can zoom, pan, and interact with the chart.
 *
 * Data path is identical to `LockedOtcChart`:
 *   Python backend (pyquotex)  →  /public-otc/ws (FastAPI)
 *   →  `usePublicOtc()`  →  this component  →  `<TradingChart />`
 *
 * The ChartFlow Ai logo watermark is preserved exactly as on the home page —
 * the only difference vs `LockedOtcChart` is that pointer events, scrolling,
 * zooming and the crosshair are enabled.
 */
export function LiveOtcChart() {
  const { status, assetSymbol, candles } = usePublicOtc()

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
        body: "Establishing a secure link to the Quotex stream\u2026",
      }
    }
    if (status === "open" && candles.length === 0) {
      return {
        kind: "info" as const,
        title: "Loading USD/BRL OTC",
        body: "Fetching the latest 1-minute candles\u2026",
      }
    }
    if (status === "loading") {
      // Boot-time running-candle gate: backend connected but holding the
      // chart back until the in-flight candle closes. The next bucket
      // boundary flips the gate open with a fresh 199-candle snapshot.
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
      {/*
        Same `<TradingChart />` props as the home-page chart EXCEPT we drop
        the `locked` flag so the user can scroll/zoom/pan and see the
        crosshair. Theme and chrome stay identical so the chart looks
        visually consistent across the marketing page and the signal rooms.
      */}
      <TradingChart
        history={candles}
        latest={latest}
        theme="dark"
        hideGrid
        hideScales
      />

      {/* ChartFlow Ai logo watermark overlaid on top of the chart — identical
          to the home page. `pointer-events-none` keeps the chart fully
          interactive underneath. */}
      <div
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        aria-hidden
      >
        <img
          src="/brand/chartflow-logo.svg"
          alt=""
          className="h-auto w-[60%] max-w-[420px] select-none opacity-[0.14]"
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
