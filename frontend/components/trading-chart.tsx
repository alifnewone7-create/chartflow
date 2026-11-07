"use client"

import { useEffect, useMemo, useRef } from "react"
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
} from "lightweight-charts"

export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export type ChartTheme = "dark" | "light"

type Props = {
  history: Candle[]
  latest?: Candle | null
  /**
   * When true the chart is fully read-only: no scroll, no zoom, no crosshair,
   * no pointer interactions. Used on the marketing home page where we just
   * want a running ticker, not a tradable chart.
   */
  locked?: boolean
  /**
   * Visual theme. Defaults to "dark" to keep the existing /livechart look.
   * The marketing home uses "light" so the chart matches the white surface.
   */
  theme?: ChartTheme
  /**
   * When true, hides both vertical and horizontal grid lines. Used on the
   * home page for a cleaner look with a background watermark.
   */
  hideGrid?: boolean
  /**
   * When true, hides the right price scale and bottom time scale. Used on the
   * home page for a minimal, watermark-focused chart.
   */
  hideScales?: boolean
  /**
   * When true, the user can't pan further left than the leftmost candle —
   * lightweight-charts simply refuses to scroll past the first bar. Used by
   * the home-page chart so users can scroll into the back-history but never
   * into "empty future" space on the left.
   */
  restrictLeftEdge?: boolean
  /**
   * Initial pixel width of each bar. Higher = more zoomed in. When provided
   * we skip the default `fitContent()` zoom-to-fit on history load and keep
   * this fixed bar spacing, anchoring the view at real-time. Used by the
   * home-page chart to render a tight, "candles-up-close" look on mobile
   * and a slightly less aggressive zoom on desktop.
   */
  defaultBarSpacing?: number
}

/**
 * Infer the candle period (in seconds) from the data itself by taking
 * the smallest positive gap between consecutive timestamps. We use min
 * (not median) because the broker's *natural* bucket size is, by
 * definition, the smallest gap we ever observe — any larger diff is
 * a missed bucket we want to fill, and any smaller diff is just a
 * duplicate that already got deduped above.
 *
 * Falls back to 60s (most common timeframe) if we can't determine it
 * from a single candle, which is harmless because gap-fill is a no-op
 * on a single-candle series.
 */
function inferPeriodSeconds(sorted: Candle[]): number {
  let minDiff = Infinity
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i].time - sorted[i - 1].time
    if (d > 0 && d < minDiff) minDiff = d
  }
  return Number.isFinite(minDiff) ? minDiff : 60
}

// Hard cap on synthetic fills between any two real candles. Prevents a
// pathological history return (e.g. last candle is days old) from
// generating tens of thousands of synthetic bars that would freeze the
// browser. 600 buckets is enough for ~10h of 1m candles or ~2.5h of 15s.
const MAX_GAP_FILL = 600

/**
 * Backfill missing buckets between adjacent candles with synthetic
 * "carry-forward" doji candles (O = H = L = C = previous close).
 *
 * Why this exists
 * ---------------
 * pyquotex / Quotex occasionally return sparse history for illiquid OTC
 * markets — a quiet minute simply has no candle in the response. The
 * backend's bucket state machine can also skip intermediate buckets if
 * no ticks land in them. Lightweight-charts renders these missing
 * timestamps as visible empty gaps in the time axis ("chart e gap
 * dekhacche"), which looks broken to traders.
 *
 * Filling with a flat carry-forward candle is the standard convention
 * for binary-options / forex charts: it preserves price continuity
 * (the close stays put, so EMAs / RSI keep computing correctly) and
 * renders as a single horizontal tick at the previous close instead
 * of an empty slot.
 */
function fillCandleGaps(
  sorted: Candle[],
  period: number,
): Candle[] {
  if (sorted.length < 2 || period <= 0) return sorted
  const out: Candle[] = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const gapBuckets = Math.floor((curr.time - prev.time) / period) - 1
    if (gapBuckets >= 1) {
      const fillCount = Math.min(gapBuckets, MAX_GAP_FILL)
      const close = prev.close
      for (let k = 1; k <= fillCount; k++) {
        const t = prev.time + period * k
        if (t >= curr.time) break
        out.push({
          time: t,
          open: close,
          high: close,
          low: close,
          close,
          volume: 0,
        })
      }
    }
    out.push(curr)
  }
  return out
}

/**
 * Anchor a flat ("line") forming candle's open to the previous bar's
 * close so it renders with a visible body from tick #1.
 *
 * Why this exists
 * ---------------
 * On a freshly-opened 1-minute bucket the very first tick produces a
 * candle with ``open == high == low == close == first_tick_price``.
 * lightweight-charts renders any bar where ``high == low`` as a single
 * horizontal pixel — the visual "line / gap" the user sees on the
 * live USD/BRL OTC homepage chart. Within 1–3 s a second tick lands,
 * the highs and lows diverge, and the bar gains a real body
 * (the "ata thik hoye jay" self-heal the user described).
 *
 * Every retail trading platform (MT4, TradingView, Quotex's own
 * official chart) hides this transient by using the convention
 * ``open := previous close``. Adopting the same rule here gives an
 * instant body from the first tick without altering any persisted /
 * stored / signal-engine data — we only patch the OHLC dict at the
 * moment we hand it to the chart series.
 *
 * Rules:
 *   * Only fires when the bar is perfectly flat (``H == L == O == C``).
 *   * Requires a previous close that actually differs from the current
 *     close — otherwise there's nothing to inflate (e.g. a synthetic
 *     gap-fill carry-forward, which legitimately has zero movement;
 *     those stay flat on purpose).
 *   * High = max(prev_close, close), Low = min(prev_close, close) so
 *     the inflated bar always satisfies ``low ≤ open, close ≤ high``.
 *   * Pass-through the moment any real divergence appears
 *     (``H > L``) — at that point the bar already has a body and
 *     patching would discard real wick data.
 */
function inflateFirstTickFlat(
  bar: { open: number; high: number; low: number; close: number },
  prevClose: number | undefined,
): { open: number; high: number; low: number; close: number } {
  if (prevClose === undefined || !Number.isFinite(prevClose) || prevClose <= 0) {
    return bar
  }
  // Already has a body (or any wick) — leave it alone.
  if (bar.high > bar.low) return bar
  // Genuinely zero-movement bar (e.g. synthetic gap-fill carry-forward,
  // or a real doji whose close happened to equal the previous close).
  // Inflating would manufacture a fake body, so leave it flat.
  if (prevClose === bar.close) return bar
  return {
    open: prevClose,
    high: Math.max(prevClose, bar.close),
    low: Math.min(prevClose, bar.close),
    close: bar.close,
  }
}

function toSeriesData(candles: Candle[]): CandlestickData<UTCTimestamp>[] {
  // Dedup by time and sort ascending.
  const map = new Map<number, Candle>()
  for (const c of candles) {
    if (!c || !c.time) continue
    map.set(c.time, c)
  }
  const sorted = Array.from(map.values()).sort((a, b) => a.time - b.time)

  // Backfill missing buckets so lightweight-charts doesn't render gaps
  // in the time axis. The period is inferred from the data itself, so
  // this works for every timeframe (15s, 60s, 5m, …) without callers
  // needing to pass it in.
  const period = inferPeriodSeconds(sorted)
  const filled = fillCandleGaps(sorted, period)

  return filled.map((c, i) => {
    // Why every bar gets inflated, not just the rightmost
    // ----------------------------------------------------
    // Originally we only inflated the live forming candle, leaving
    // interior closed bars exactly as the buffer reported them. That
    // works fine on 15s charts because a 15-second bucket almost
    // always sees multiple ticks, so closed bars naturally have a
    // body (H > L). On 1m, illiquid OTC pairs frequently see a
    // single tick land in an entire bucket; the broker's refetch
    // then returns that bar with O == H == L == C, and our
    // live-buffer fallback can't help because the live version is
    // also a single-tick flat. lightweight-charts renders any bar
    // where H == L as a single horizontal pixel — the visible
    // "recent kichu candle dash hoye jay" symptom on 1m.
    //
    // Every retail platform (MT4, TradingView, Quotex's own chart)
    // handles this with the convention `open := previous close`,
    // turning a single-tick flat into a small body that represents
    // the actual price movement from the previous close. Synthetic
    // gap-fill carry-forward bars (O == H == L == C == prev.close)
    // are immune because `inflateFirstTickFlat` no-ops whenever
    // prev.close already equals the bar's close, so legitimate
    // doji / zero-movement bars stay flat.
    if (i > 0) {
      const patched = inflateFirstTickFlat(c, filled[i - 1].close)
      return {
        time: c.time as UTCTimestamp,
        open: patched.open,
        high: patched.high,
        low: patched.low,
        close: patched.close,
      }
    }
    return {
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }
  })
}

export function TradingChart({
  history,
  latest,
  locked = false,
  theme = "dark",
  hideGrid = false,
  hideScales = false,
  restrictLeftEdge = false,
  defaultBarSpacing,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)

  // Initialize chart once.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // lightweight-charts only supports hex / rgb / rgba color strings.
    // Don't pass computed values from CSS custom properties — modern browsers
    // return them in oklch() / lab() form, which the parser rejects.
    const palette =
      theme === "light"
        ? {
            BG: "#ffffff",
            FG: "#0f172a",
            MUTED: "#64748b",
            BORDER: "#e2e8f0",
          }
        : {
            BG: "#0a0a0a",
            FG: "#e5e7eb",
            MUTED: "#94a3b8",
            BORDER: "#1f2937",
          }

    // Explicit initial size — autoSize can race against the first paint and
    // leave the chart with a 0x0 canvas that never renders anything.
    const initialWidth = container.clientWidth || 800
    const initialHeight = container.clientHeight || 500

    // Max zoom-in: about 14 candles across the chart, never wider than 50px per candle.
    const maxBarSpacingFor = (w: number) => Math.max(16, Math.min(w * 0.07, 50))
    // Max zoom-out: about 140 candles across the chart, never narrower than 5.2px on wide screens.
    const minBarSpacingFor = (w: number) => Math.max(1.6, Math.min(w * 0.0072, 5.2))

    const chart = createChart(container, {
      width: initialWidth,
      height: initialHeight,
      layout: {
        background: { color: palette.BG },
        textColor: palette.FG,
        fontFamily:
          "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
        // Hide the "TradingView" branding watermark that lightweight-charts
        // v4.2+ adds by default at the bottom-right. Their license explicitly
        // allows this for non-commercial / self-hosted use.
        attributionLogo: false,
      },
      grid: hideGrid
        ? { vertLines: { visible: false }, horzLines: { visible: false } }
        : { vertLines: { color: palette.BORDER }, horzLines: { color: palette.BORDER } },
      rightPriceScale: hideScales
        ? { visible: false }
        : { borderColor: palette.BORDER, autoScale: true },
      timeScale: hideScales
        ? {
            visible: false,
            rightOffset: 8,
            maxBarSpacing: maxBarSpacingFor(initialWidth),
            minBarSpacing: minBarSpacingFor(initialWidth),
            // Cap the leftmost edge to the first candle so the user can't
            // pan into empty space when scrolling back through history.
            ...(restrictLeftEdge ? { fixLeftEdge: true } : {}),
            // Honor an explicit initial bar spacing so the chart can render
            // pre-zoomed (mobile candles-up-close, slight desktop zoom)
            // instead of being fitted to the full viewport.
            ...(defaultBarSpacing ? { barSpacing: defaultBarSpacing } : {}),
          }
        : {
            borderColor: palette.BORDER,
            timeVisible: true,
            secondsVisible: true,
            rightOffset: 5,
            maxBarSpacing: maxBarSpacingFor(initialWidth),
            minBarSpacing: minBarSpacingFor(initialWidth),
            ...(restrictLeftEdge ? { fixLeftEdge: true } : {}),
            ...(defaultBarSpacing ? { barSpacing: defaultBarSpacing } : {}),
          },
      crosshair: locked
        ? { mode: 0 }
        : {
            vertLine: { color: palette.MUTED, width: 1, style: 3 },
            horzLine: { color: palette.MUTED, width: 1, style: 3 },
          },
      handleScroll: locked
        ? false
        : { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: locked
        ? false
        : { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      kineticScroll: locked ? { touch: false, mouse: false } : undefined,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    })

    chartRef.current = chart
    seriesRef.current = series

    console.log("chart created:", initialWidth, "x", initialHeight, "locked=", locked)

    // The latest candle can't be dragged past the middle of the chart (max 50% empty space on the right).
    const timeScale = chart.timeScale()
    timeScale.subscribeVisibleLogicalRangeChange((range) => {
      if (!range) return
      const half = (range.to - range.from) / 2
      if (timeScale.scrollPosition() > half) timeScale.scrollToPosition(half, false)
    })

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          chart.resize(width, height)
          chart.timeScale().applyOptions({
            maxBarSpacing: maxBarSpacingFor(width),
            minBarSpacing: minBarSpacingFor(width),
          })
        }
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
    // We intentionally only initialize once — `locked` and `theme` are
    // expected to be static for the lifetime of the chart instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Memo key that changes whenever the chart needs a full redraw — this
  // covers four distinct cases:
  //
  //   1. Length change         → new bucket appended / reset / asset switch
  //   2. First-bar time shift  → buffer slid forward (cap reached)
  //   3. Last-bar time shift   → forming bucket rolled over
  //   4. Closed-bar interior   → broker-authoritative correction or
  //                              delayed gap-fill landed on a previously
  //                              closed bucket (e.g. history[-2..-5]).
  //
  // Case 4 is the fix for "earlier candles sometimes wrong / show gaps
  // until refresh": before this, the shape only encoded length + edge
  // times, so an interior OHLC patch on a closed bar never invalidated
  // the memo and `series.setData()` never re-ran �� the corrected candle
  // stayed invisible until the user reloaded.
  //
  // We deliberately exclude history[-1] (the forming bar) from the
  // interior hash. Per-tick OHLC churn on the forming bar would
  // otherwise force a full setData on every tick, defeating the cheap
  // `series.update()` path in the `latest` effect below and causing
  // visible flicker.
  const historyShape = useMemo(() => {
    const len = history.length
    if (len === 0) return "empty"
    const first = history[0].time
    const last = history[len - 1].time
    // Hash the OHLC of the most recent CLOSED bars (everything except
    // the forming bar). 8 bars is enough — the backend's authoritative
    // refetch fires within ~500 ms of bucket close and gap-fill
    // corrections arrive within a couple of buckets, so older entries
    // are already stable.
    let closedHash = ""
    const tailStart = Math.max(0, len - 9)
    for (let i = tailStart; i < len - 1; i++) {
      const c = history[i]
      closedHash += `|${c.time}:${c.open}:${c.high}:${c.low}:${c.close}`
    }
    return `${len}:${first}:${last}${closedHash}`
  }, [history])

  useEffect(() => {
    const series = seriesRef.current
    const chart = chartRef.current
    if (!series || !chart) return
    const data = toSeriesData(history)
    console.log(
      "chart setData:",
      data.length,
      "points",
      data[0]?.time,
      "->",
      data[data.length - 1]?.time,
    )
    if (data.length === 0) {
      series.setData([])
      return
    }
    series.setData(data)
    if (defaultBarSpacing) {
      // Caller asked for a fixed zoom — keep the bar spacing they chose
      // and just anchor the view at real-time so the latest candle stays
      // pinned to the right. We deliberately skip fitContent() because
      // it would override `barSpacing` and zoom back out to fit every bar.
      chart.timeScale().scrollToRealTime()
      requestAnimationFrame(() => {
        chart.timeScale().scrollToRealTime()
      })
    } else {
      chart.timeScale().fitContent()
      // Re-fit on next frame too, in case the container just finished resizing.
      requestAnimationFrame(() => {
        chart.timeScale().fitContent()
      })
    }
    // We intentionally depend on the shape key, NOT the history array itself,
    // so same-bucket updates to history[-1] don't re-trigger setData (which
    // would flicker on every tick).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyShape])

  // Apply live updates.
  useEffect(() => {
    const series = seriesRef.current
    if (!series || !latest || !latest.time) return
    // Look up the previous bar's close so we can inflate a transient
    // first-tick flat into a bar with a visible body (see
    // `inflateFirstTickFlat` for full rationale). When the live tick
    // belongs to the SAME bucket as `history[-1]` (in-place forming
    // update) the previous bar is `history[-2]`; otherwise the live
    // tick is starting a fresh bucket and the previous bar is
    // `history[-1]`.
    let prevClose: number | undefined
    const histLen = history.length
    if (histLen > 0) {
      const lastHist = history[histLen - 1]
      if (lastHist.time === latest.time) {
        prevClose = histLen >= 2 ? history[histLen - 2].close : undefined
      } else {
        prevClose = lastHist.close
      }
    }
    const patched = inflateFirstTickFlat(
      {
        open: latest.open,
        high: latest.high,
        low: latest.low,
        close: latest.close,
      },
      prevClose,
    )
    try {
      series.update({
        time: latest.time as UTCTimestamp,
        open: patched.open,
        high: patched.high,
        low: patched.low,
        close: patched.close,
      })
    } catch (err) {
      console.log("chart.update failed:", err, latest)
    }
  }, [latest, history])

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="absolute inset-0"
        // Belt-and-suspenders: even with handleScroll/handleScale off, this
        // also blocks any residual pointer/wheel interactions on the canvas
        // when fully locked. When the chart is interactive we hint to the
        // browser that horizontal touch drags belong to us (pan-x) so the
        // page doesn't accidentally consume them as a scroll gesture.
        style={
          locked
            ? { pointerEvents: "none", touchAction: "none" }
            : { touchAction: "pan-x" }
        }
      />
    </div>
  )
}
