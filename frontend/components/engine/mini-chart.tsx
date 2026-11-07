"use client"

import { useEffect, useRef, useState } from "react"
import { CandlestickSeries, ColorType, createChart, type UTCTimestamp } from "lightweight-charts"
import { Loader2 } from "lucide-react"

import { engine } from "@/lib/engine-client"

type C = { time: number; open: number; high: number; low: number; close: number }

/** Real M1 candles for one market in the website theme, refreshed every 15 s while visible. */
export function MiniChart({ asset }: { asset: string }) {
  const el = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<"loading" | "ok" | "error">("loading")

  useEffect(() => {
    if (!el.current) return
    const chart = createChart(el.current, {
      height: 240,
      layout: {
        background: { type: ColorType.Solid, color: "#0E0F11" },
        textColor: "#8A9099",
        fontFamily: "var(--font-cf-mono), ui-monospace, monospace",
        attributionLogo: false,
      },
      grid: { vertLines: { color: "#1E2126" }, horzLines: { color: "#1E2126" } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#24272D", rightOffset: 3 },
      rightPriceScale: { borderColor: "#24272D" },
      crosshair: { vertLine: { color: "#CDFF17", width: 1, style: 3, labelBackgroundColor: "#CDFF17" }, horzLine: { color: "#CDFF17", width: 1, style: 3, labelBackgroundColor: "#CDFF17" } },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    })
    let off = false
    const load = () =>
      engine<{ candles: C[] }>(`/candles?asset=${encodeURIComponent(asset)}&count=80`)
        .then((d) => {
          if (off) return
          series.setData(d.candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })))
          setState(d.candles.length ? "ok" : "error")
        })
        .catch(() => !off && setState("error"))
    load()
    const id = window.setInterval(load, 15_000)
    const ro = new ResizeObserver(() => el.current && chart.applyOptions({ width: el.current.clientWidth }))
    ro.observe(el.current)
    return () => {
      off = true
      window.clearInterval(id)
      ro.disconnect()
      chart.remove()
    }
  }, [asset])

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/[0.06] bg-[#0E0F11]" data-testid={`mini-chart-${asset}`}>
      <div ref={el} className="w-full" />
      <span className="cf-mono pointer-events-none absolute left-2 top-1.5 text-[9px] uppercase tracking-[0.2em] text-white/35">ChartFlow Ai · M1</span>
      {state !== "ok" && (
        <div className="absolute inset-0 grid place-items-center bg-[#0E0F11]/70 text-[12px] text-white/55">
          {state === "loading" ? <Loader2 className="size-4 animate-spin text-[#CDFF17]" /> : "No verified candle data for this market yet."}
        </div>
      )}
    </div>
  )
}
