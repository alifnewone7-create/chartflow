"use client"

/**
 * "See 2 Candle Ahead" — tier-gated companion card on /chart-2candle.
 *
 * Per product spec, the right-hand companion to the live chart is no
 * longer a tutorial video — it now renders four distinct experiences,
 * one per purchased tier:
 *
 *   - basic      → Upgrade gate.  "Your tier isn't eligible."
 *   - smart      → Glitch / device-not-supported teaser pointing at
 *                  the $75 plan.
 *   - pro        → Live shadow projection of the next two candles,
 *                  computed from the most recent chart buckets.
 *   - dominator  → Simple direction call (UP / DOWN) for the next two
 *                  candles, also derived from live data.
 *   - personal   → The LIVE chart. The page's main chart shows the same
 *                  market two candles late (see ``useDelayedCandles``), so
 *                  this card is two candles ahead of it.
 *
 * The card is intentionally self-contained: it consumes only the
 * candle history/latest pair already produced by `useMarketChart` on
 * the parent page. No additional WebSocket traffic, no extra state.
 */

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

import { Emblem } from "@/components/home/primitives"
import {
  IconAlert,
  IconArrow,
  IconCandlesAhead,
  IconCrown,
  IconEye,
  IconLock,
  IconWaves,
} from "@/components/home/icons"
import { TradingChart } from "@/components/trading-chart"
import type { Candle } from "@/hooks/use-quotex-ws"
import { TIER_ACCENT, type Tier } from "@/lib/tiers"

/* -------------------------------------------------------------------------- */
/*  Card shell                                                                */
/* -------------------------------------------------------------------------- */

function CardShell({
  title,
  italic,
  accent,
  children,
  onEyeDoubleClick,
  eyeActive,
  eyeAriaLabel,
}: {
  title: string
  italic: string
  accent: { from: string; to: string }
  children: React.ReactNode
  /**
   * When provided, the eye icon becomes an interactive button that
   * fires this handler on double-click / double-tap. Used by the
   * personal tier to toggle "video mode" on the projection card.
   */
  onEyeDoubleClick?: () => void
  /** Visual hint that the eye toggle is currently active. */
  eyeActive?: boolean
  /** Accessible label for the eye toggle (only used when interactive). */
  eyeAriaLabel?: string
}) {
  const eyeBaseClass =
    "cf-orb inline-flex size-8 items-center justify-center rounded-full sm:size-10"
  const eyeStyle = {
    color: eyeActive ? "#C4B5FD" : "#CDFF17",
  } as React.CSSProperties
  void accent

  const eyeIcon = (
    <IconEye className="size-4 sm:size-5" aria-hidden />
  )

  return (
    <section className="cf-card-strong relative flex h-full flex-1 flex-col overflow-hidden rounded-[18px] sm:rounded-[28px]" data-testid="see-2candle-card">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-3 py-3 sm:px-6 sm:py-3.5">
        {onEyeDoubleClick ? (
          <button
            type="button"
            onDoubleClick={onEyeDoubleClick}
            className={`${eyeBaseClass} cursor-pointer transition hover:brightness-125 ${
              eyeActive ? "ring-2 ring-[#C4B5FD]/60" : ""
            }`}
            style={eyeStyle}
            aria-label={eyeAriaLabel ?? "Double-click to toggle"}
            aria-pressed={!!eyeActive}
            title="Double-click to toggle"
          >
            {eyeIcon}
          </button>
        ) : (
          <span className={eyeBaseClass} style={eyeStyle}>
            {eyeIcon}
          </span>
        )}
        <h2 className="cf-display text-[15px] text-white sm:text-[18px]">
          {title} <span className="text-[#CDFF17]">{italic}</span>
        </h2>
      </div>

      <div className="relative flex-1 min-h-[280px] bg-[#0E0F11] lg:min-h-[460px]">{children}</div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Public component                                                          */
/* -------------------------------------------------------------------------- */

export function See2CandleCard({
  tier,
  history,
  latest,
  asset,
}: {
  tier: Tier
  history: Candle[]
  latest: Candle | null
  /** Currently-selected market symbol, or null when no market is open. */
  asset: string | null
  /** URL access token, used to deep-link into the upgrade hub. */
}) {
  const accent = TIER_ACCENT[tier]

  // Whether or not we have a market selected. The Basic gate is hidden
  // until the user picks a market — instead we show an "open a market
  // to continue" placeholder so the right-hand panel doesn't shout
  // upgrade copy at someone who hasn't started using the chart yet.
  const marketSelected = !!asset && asset.length > 0

  if (tier === "basic") {
    return (
      <CardShell
        title="Two candles"
        italic="ahead view"
        accent={accent}
      >
        {marketSelected ? <BasicUpgrade /> : <SelectMarketHint />}
      </CardShell>
    )
  }

  if (tier === "smart") {
    return (
      <CardShell
        title="Two candles"
        italic="ahead view"
        accent={accent}
      >
        {marketSelected ? <SmartGlitch /> : <SelectMarketHint />}
      </CardShell>
    )
  }

  if (tier === "pro") {
    return (
      <CardShell
        title="Two candles"
        italic="ahead view"
        accent={accent}
      >
        {marketSelected ? (
          <ProShadow history={history} latest={latest} />
        ) : (
          <SelectMarketHint />
        )}
      </CardShell>
    )
  }

  if (tier === "personal") {
    return (
      <PersonalCard
        accent={accent}
        marketSelected={marketSelected}
        history={history}
        latest={latest}
      />
    )
  }

  // dominator
  return (
    <CardShell
      title="Two candles"
      italic="ahead view"
      accent={accent}
    >
      {marketSelected ? (
        <DominatorDirection history={history} latest={latest} tier={tier} />
      ) : (
        <SelectMarketHint />
      )}
    </CardShell>
  )
}

/* -------------------------------------------------------------------------- */
/*  Variant: BASIC — upgrade gate                                             */
/* -------------------------------------------------------------------------- */

function BasicUpgrade() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0E0F11]/88 p-5 text-center sm:gap-5 sm:p-7" data-testid="c2c-basic-gate">
      <Emblem icon={IconLock} size="lg" />

      <div className="flex max-w-md flex-col gap-2">
        <h3 className="cf-display text-[20px] leading-tight text-white sm:text-[26px]">
          Upgrade <span className="text-[#CDFF17]">account tier</span>
        </h3>
        <p className="text-pretty text-[13px] leading-relaxed text-white/70 sm:text-[14px]">
          You&apos;re not eligible to view two candles ahead on the{" "}
          <span className="font-semibold text-white">Basic</span>{" "}
          plan. Move up a tier to unlock the projection engine.
        </p>
      </div>

      <Link
        href={`/upgrade-your-plan`}
        aria-label="Upgrade your plan"
        className="cf-btn-volt group/cta inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-[14px] font-bold"
      >
        <IconCrown className="size-[18px]" aria-hidden />
        Upgrade Your Plan
        <IconArrow className="size-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden />
      </Link>

      <p className="text-[11px] leading-relaxed text-white/45 sm:text-[12px]">
        Automatic account swap once admin approves your upgrade.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Variant: SELECT-MARKET hint — shown to every tier when no market is open   */
/* -------------------------------------------------------------------------- */

function SelectMarketHint() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0E0F11]/88 p-5 text-center sm:gap-4 sm:p-7" data-testid="c2c-select-market-hint">
      <Emblem icon={IconCandlesAhead} size="lg" />
      <div className="flex max-w-sm flex-col gap-1.5">
        <h3 className="cf-display text-[18px] leading-tight text-white sm:text-[22px]">
          Pick a <span className="text-[#CDFF17]">market</span> to continue
        </h3>
        <p className="text-pretty text-[12.5px] leading-relaxed text-white/65 sm:text-[13.5px]">
          Open any pair from the chart on the left and the two-candle view will
          come alive here.
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Variant: SMART — glitch / not supported                                   */
/* -------------------------------------------------------------------------- */

function SmartGlitch() {
  // Static reference positions for the animated candle backdrop so each
  // candle has its own unique pulse/jitter cadence without re-flowing on
  // parent re-render.
  const bars = [22, 35, 48, 28, 42, 55, 38, 50, 33, 46, 30, 44, 36, 41]

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0E0F11]/92">
      {/* Animated candlestick backdrop */}
      <svg
        viewBox="0 0 280 140"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full opacity-[0.32]"
        aria-hidden
      >
        <defs>
          <linearGradient id="bgGreen" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="bgRed" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {bars.map((h, i) => {
          const up = i % 2 === 0
          const x = 4 + i * 19
          return (
            <g
              key={i}
              className="bg-candle"
              style={{
                animationDelay: `${(i % 6) * 0.18}s`,
                transformOrigin: `${x + 4.5}px 70px`,
              }}
            >
              <line
                x1={x + 4.5}
                x2={x + 4.5}
                y1={70 - h / 2 - 6}
                y2={70 + h / 2 + 6}
                stroke={up ? "#10b981" : "#ef4444"}
                strokeWidth={1}
                strokeOpacity={0.55}
              />
              <rect
                x={x}
                y={70 - h / 2}
                width={9}
                height={h}
                rx={1.5}
                fill={up ? "url(#bgGreen)" : "url(#bgRed)"}
              />
            </g>
          )
        })}
      </svg>

      {/* Vertical scanline */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/3 h-px animate-[scan_3.2s_linear_infinite] bg-gradient-to-r from-transparent via-rose-400/70 to-transparent"
      />
      {/* Soft horizontal glitch slice */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[58%] h-3 animate-[slice_2.4s_steps(8,end)_infinite] bg-[#CDFF17]/[0.05] mix-blend-screen"
      />
      {/* RGB chroma overlay */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-[chroma_4.5s_ease-in-out_infinite] bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.05),transparent_60%)]"
      />

      <style jsx>{`
        @keyframes scan {
          0%   { transform: translateY(-30px); opacity: 0.2; }
          50%  { transform: translateY(46px);  opacity: 0.85; }
          100% { transform: translateY(-30px); opacity: 0.2; }
        }
        @keyframes slice {
          0%, 92%, 100% { transform: translateX(0); opacity: 0; }
          30%           { transform: translateX(-4px); opacity: 0.9; }
          45%           { transform: translateX(6px);  opacity: 0.6; }
          60%           { transform: translateX(-2px); opacity: 0.8; }
        }
        @keyframes chroma {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes candleFloat {
          0%, 100% { transform: scaleY(1)    translateY(0); opacity: 0.8; }
          50%      { transform: scaleY(1.08) translateY(-1px); opacity: 1; }
        }
        .bg-candle {
          animation: candleFloat 2.6s ease-in-out infinite;
        }
        @keyframes glitch {
          0%, 100% { transform: translate(0, 0); clip-path: inset(0 0 0 0); }
          15%      { transform: translate(-1.6px, 0.5px); clip-path: inset(8% 0 35% 0); }
          30%      { transform: translate(1.4px, -0.6px); clip-path: inset(45% 0 12% 0); }
          45%      { transform: translate(-1px, 1px);     clip-path: inset(20% 0 60% 0); }
          60%      { transform: translate(1.2px, 0.4px);  clip-path: inset(0 0 0 0); }
          75%      { transform: translate(-0.6px, -1.2px); clip-path: inset(70% 0 5% 0); }
        }
        .glitch-text {
          position: relative;
          animation: glitch 1.4s steps(3, end) infinite;
        }
        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .glitch-text::before {
          color: #ef4444;
          transform: translate(1.4px, 0);
          mix-blend-mode: screen;
          opacity: 0.75;
          animation: glitch 1.4s steps(3, end) infinite reverse;
        }
        .glitch-text::after {
          color: #CDFF17;
          transform: translate(-1.4px, 0);
          mix-blend-mode: screen;
          opacity: 0.75;
          animation: glitch 1.6s steps(3, end) infinite;
        }
        @keyframes errPulse {
          0%, 100% { opacity: 1;   box-shadow: 0 0 0 0 rgba(239,68,68,0.45); }
          50%      { opacity: 0.7; box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
        .err-pill {
          animation: errPulse 1.6s ease-out infinite;
        }
        @keyframes upgradeShine {
          0%   { transform: translateX(-140%) skewX(-12deg); }
          60%  { transform: translateX(160%)  skewX(-12deg); }
          100% { transform: translateX(160%)  skewX(-12deg); }
        }
        .upgrade-shine::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%);
          animation: upgradeShine 2.6s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2.5 px-3 py-4 text-center sm:gap-4 sm:px-7 sm:py-7">
        <span className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/10 text-rose-300 shadow-[0_0_30px_-10px_rgba(239,68,68,0.65)] sm:size-12 sm:rounded-2xl">
          <IconAlert className="size-4 sm:size-5" aria-hidden />
        </span>

        <div className="relative w-full max-w-[20rem] sm:max-w-none">
          <h3
            data-text="Standard account API not supported on your device"
            className="glitch-text text-balance cf-display text-[13px] font-normal leading-snug tracking-normal text-white sm:text-[19px] sm:tracking-wide"
          >
            <span className="font-normal">Standard account API</span>{" "}
            <span className="italic text-rose-300/95">not supported</span>{" "}
            <span className="font-normal">on your device</span>
          </h3>
        </div>

        <p className="max-w-[22rem] text-pretty text-[11.5px] leading-relaxed text-white/75 sm:max-w-md sm:text-[13.5px]">
          To see <span className="italic text-[#CDFF17]">2 candles ahead</span>,
          upgrade your plan to{" "}
          <span className="font-semibold text-[#CDFF17]">Premium</span> or{" "}
          <span className="font-semibold text-amber-300">Extreme</span>. We
          run a best-in-class API on those tiers — it supports{" "}
          <span className="italic">every device</span> and renders the next
          two-candle projection cleanly.
        </p>

        <span
          className="err-pill inline-flex items-center gap-1.5 rounded-full border border-rose-400/45 bg-rose-500/15 px-2 py-0.5 cf-mono text-[9px] uppercase tracking-[0.16em] text-rose-300 sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.2em]"
          aria-live="polite"
        >
          <span className="size-1.5 rounded-full bg-rose-400" aria-hidden />
          ERR · GLITCH_API_DEVICE
        </span>

        <Link
          href={`/upgrade-your-plan`}
          aria-label="Upgrade your plan"
          className="cf-btn-volt group/cta inline-flex h-11 w-full max-w-[16rem] items-center justify-center gap-2 rounded-xl px-4 text-[12.5px] font-bold sm:h-12 sm:w-auto sm:max-w-none sm:px-7 sm:text-[14px]"
        >
          <IconCrown className="size-4" aria-hidden />
          Upgrade Your Plan
          <IconArrow className="size-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden />
        </Link>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Variant: PRO — live shadow projection                                     */
/* -------------------------------------------------------------------------- */

/**
 * Build a tiny SVG mini-chart of the last ~12 closed candles plus two
 * "ghost" projection candles whose direction extrapolates the
 * short-term momentum of the recent history.
 *
 * This is intentionally NOT a backtested predictor — the disclaimer in
 * the card makes it clear the shadow is a Quotex-data-driven heuristic,
 * not a guarantee. It's primarily a visual aid.
 */
function ProShadow({
  history,
  latest,
}: {
  history: Candle[]
  latest: Candle | null
}) {
  const series = useMemo(() => {
    const merged: Candle[] = latest
      ? [...history.filter((c) => c.time !== latest.time), latest]
      : history
    return merged.slice(-14)
  }, [history, latest])

  const projection = useMemo(() => {
    if (series.length < 4) return null
    const tail = series.slice(-6)
    const first = tail[0].close
    const last = tail[tail.length - 1].close
    const drift = (last - first) / Math.max(1, tail.length - 1)
    const c1Open = last
    const c1Close = c1Open + drift * 0.9
    const c2Open = c1Close
    const c2Close = c2Open + drift * 0.7
    return { c1Open, c1Close, c2Open, c2Close }
  }, [series])

  if (series.length === 0) {
    return <PendingState message="Subscribe to a market to project the next two candles." />
  }

  // Coordinate space
  const W = 320
  const H = 180
  const total = series.length + 2 // history + 2 ghost candles
  const slotW = W / total
  const candleW = Math.min(slotW * 0.62, 14)

  const allValues = series.flatMap((c) => [c.high, c.low])
  if (projection) {
    allValues.push(
      projection.c1Open,
      projection.c1Close,
      projection.c2Open,
      projection.c2Close,
    )
  }
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const range = Math.max(1e-9, max - min)
  const pad = range * 0.08
  const yMin = min - pad
  const yMax = max + pad
  const yRange = yMax - yMin

  const yOf = (v: number) => H - ((v - yMin) / yRange) * H

  return (
    <div className="absolute inset-0 flex flex-col gap-2 p-3 sm:gap-3 sm:p-4">
      <div className="relative flex-1 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0E0F11]/80">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={0}
              x2={W}
              y1={H * t}
              y2={H * t}
              stroke="#ffffff"
              strokeOpacity="0.18"
              strokeDasharray="2 4"
            />
          ))}

          {/* Real candles */}
          {series.map((c, i) => {
            const x = i * slotW + slotW / 2
            const up = c.close >= c.open
            const color = up ? "#10b981" : "#ef4444"
            const top = yOf(Math.max(c.open, c.close))
            const bot = yOf(Math.min(c.open, c.close))
            return (
              <g key={`${c.time}-${i}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={yOf(c.high)}
                  y2={yOf(c.low)}
                  stroke={color}
                  strokeWidth={1}
                  strokeOpacity={0.85}
                />
                <rect
                  x={x - candleW / 2}
                  y={top}
                  width={candleW}
                  height={Math.max(1, bot - top)}
                  fill={color}
                  opacity={0.85}
                  rx={1}
                />
              </g>
            )
          })}

          {/* Divider between real and projected */}
          <line
            x1={series.length * slotW}
            x2={series.length * slotW}
            y1={4}
            y2={H - 4}
            stroke="#CDFF17"
            strokeOpacity="0.55"
            strokeDasharray="3 3"
          />

          {/* Ghost candles */}
          {projection &&
            [
              { idx: series.length, o: projection.c1Open, c: projection.c1Close },
              { idx: series.length + 1, o: projection.c2Open, c: projection.c2Close },
            ].map(({ idx, o, c }, k) => {
              const x = idx * slotW + slotW / 2
              const up = c >= o
              const color = up ? "#CDFF17" : "#F87171"
              const top = yOf(Math.max(o, c))
              const bot = yOf(Math.min(o, c))
              return (
                <g key={`ghost-${k}`} opacity={0.7}>
                  <rect
                    x={x - candleW / 2}
                    y={top}
                    width={candleW}
                    height={Math.max(2, bot - top)}
                    fill={color}
                    fillOpacity={0.18}
                    stroke={color}
                    strokeDasharray="3 2"
                    strokeWidth={1.2}
                    rx={1}
                  />
                  <text
                    x={x}
                    y={H - 4}
                    textAnchor="middle"
                    fontSize={8}
                    fill={color}
                    fillOpacity={0.85}
                    fontFamily="ui-monospace, monospace"
                  >
                    +{k + 1}
                  </text>
                </g>
              )
            })}
        </svg>

        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-1/3"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(205, 255, 23, 0.07))",
          }}
        />
      </div>

      <p className="text-pretty text-[10.5px] leading-relaxed text-white/55 sm:text-[11.5px]">
        Shadow candles extrapolate from the live Quotex feed. This is{" "}
        <span className="font-semibold text-white/80">
          not 100% correct
        </span>{" "}
        — it&apos;s a momentum-based projection of the next two buckets.
      </p>
    </div>
  )
}

function DirectionPill({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "flat") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 cf-mono text-[9.5px] uppercase tracking-[0.22em] text-white/70 sm:text-[10.5px]">
        Sideways
      </span>
    )
  }
  const up = direction === "up"
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 cf-mono text-[9.5px] uppercase tracking-[0.22em] sm:text-[10.5px]"
      style={{
        background: up ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
        color: up ? "#10b981" : "#ef4444",
        border: `1px solid ${up ? "rgba(16,185,129,0.45)" : "rgba(239,68,68,0.45)"}`,
      }}
    >
      {up ? (
        <ArrowUp className="size-3" strokeWidth={2.4} aria-hidden />
      ) : (
        <ArrowDown className="size-3" strokeWidth={2.4} aria-hidden />
      )}
      Trending {up ? "UP" : "DOWN"}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Variant: DOMINATOR / PERSONAL — simple direction                          */
/* -------------------------------------------------------------------------- */

function DominatorDirection({
  history,
  latest,
  tier,
}: {
  history: Candle[]
  latest: Candle | null
  tier: Tier
}) {
  const series = useMemo(() => {
    const merged: Candle[] = latest
      ? [...history.filter((c) => c.time !== latest.time), latest]
      : history
    return merged.slice(-10)
  }, [history, latest])

  const verdict = useMemo(() => {
    if (series.length < 3) return null
    const tail = series.slice(-5)
    const first = tail[0].close
    const last = tail[tail.length - 1].close
    const drift = last - first
    const avgRange =
      tail.reduce((sum, c) => sum + (c.high - c.low), 0) / tail.length || 1
    const conviction = Math.min(1, Math.abs(drift) / (avgRange * 1.5))
    return {
      direction: drift > 0 ? ("up" as const) : drift < 0 ? ("down" as const) : ("flat" as const),
      conviction: Math.max(0.18, conviction),
    }
  }, [series])

  if (!verdict) {
    return <PendingState message="Subscribe to a market to compute the next two-candle direction." />
  }

  if (verdict.direction === "flat") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Emblem icon={IconWaves} size="md" />
        <h3 className="cf-display text-[18px] text-white sm:text-[20px]">
          Sideways <span className="text-[#CDFF17]">market</span>
        </h3>
        <p className="max-w-xs text-pretty text-[12.5px] leading-relaxed text-white/65">
          The next two candles look indecisive. Wait for momentum to build
          before placing a position.
        </p>
      </div>
    )
  }

  const up = verdict.direction === "up"
  const accent = up
    ? { from: "#CDFF17", to: "#A9D40E", glow: "rgba(205,255,23,0.55)", text: "#141517" }
    : { from: "#ef4444", to: "#991B1B", glow: "rgba(239,68,68,0.55)", text: "#1A0408" }

  const pct = Math.round(verdict.conviction * 100)

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Premium ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(60% 55% at 50% 38%, ${accent.glow} 0%, rgba(14,15,17,0) 70%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-screen"
        style={{
          backgroundImage:
            "linear-gradient(0deg, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <style jsx>{`
        @keyframes domHaloPulse {
          0%, 100% { transform: scale(1);   opacity: 0.55; }
          50%      { transform: scale(1.08); opacity: 0.9; }
        }
        @keyframes domRingSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes domShine {
          0%   { transform: translateX(-160%) skewX(-18deg); }
          100% { transform: translateX(160%)  skewX(-18deg); }
        }
        .dom-halo  { animation: domHaloPulse 3.2s ease-in-out infinite; }
        .dom-ring  { animation: domRingSpin 14s linear infinite; }
        .dom-shine::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%);
          animation: domShine 3.6s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 p-5 text-center sm:gap-6 sm:p-7">
        {/* Eyebrow tag */}
        <div className="cf-pill">
          <IconCrown className="size-3.5 text-[#CDFF17]" aria-hidden />
          Extreme Forecast
        </div>

        {/* Hero direction emblem */}
        <div className="relative flex items-center justify-center">
          {/* Pulsing halo */}
          <span
            aria-hidden
            className="dom-halo absolute inset-0 -m-6 rounded-full blur-2xl sm:-m-8"
            style={{ background: `radial-gradient(circle, ${accent.glow}, transparent 70%)` }}
          />
          {/* Rotating conic ring */}
          <span
            aria-hidden
            className="dom-ring absolute inset-0 -m-1.5 rounded-full opacity-70"
            style={{
              background: `conic-gradient(from 0deg, ${accent.from}, transparent 30%, ${accent.to}, transparent 70%, ${accent.from})`,
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
              mask:
                "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
            }}
          />
          {/* Core medallion */}
          <span
            className="dom-shine relative inline-flex size-20 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/10 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.25)] sm:size-24"
            style={{
              background: `radial-gradient(120% 120% at 30% 20%, ${accent.from} 0%, ${accent.to} 70%, #0a0a0a 100%)`,
              color: accent.text,
            }}
          >
            {up ? (
              <ArrowUp className="relative z-10 size-9 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] sm:size-11" strokeWidth={2.6} aria-hidden />
            ) : (
              <ArrowDown className="relative z-10 size-9 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] sm:size-11" strokeWidth={2.6} aria-hidden />
            )}
          </span>
        </div>

        {/* Headline */}
        <div className="flex flex-col items-center gap-2">
          <span className="cf-mono text-[9.5px] uppercase tracking-[0.32em] text-[#CDFF17]/80 sm:text-[10.5px]">
            Next 2 candles
          </span>
          <h3 className="cf-display text-[34px] leading-none tracking-wide text-white sm:text-[44px]">
            <span
              className="italic font-semibold"
              style={{
                background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                textShadow: `0 0 24px ${accent.glow}`,
              }}
            >
              {up ? "UP" : "DOWN"}
            </span>
          </h3>
          {/* Decorative divider */}
          <div className="mt-1 flex items-center gap-2">
            <span
              className="h-px w-10 sm:w-14"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent.from}, transparent)`,
              }}
            />
            <span
              className="size-1.5 rotate-45 rounded-[1px]"
              style={{ background: accent.from, boxShadow: `0 0 10px ${accent.glow}` }}
            />
            <span
              className="h-px w-10 sm:w-14"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent.from}, transparent)`,
              }}
            />
          </div>
        </div>

        {/* Conviction bar */}
        <div className="w-full max-w-[18rem]">
          <div className="mb-1.5 flex items-center justify-between cf-mono text-[9.5px] uppercase tracking-[0.28em] text-white/55 sm:text-[10.5px]">
            <span>Momentum</span>
            <span style={{ color: accent.from }}>{pct}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-inset ring-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${accent.from}, ${accent.to})`,
                boxShadow: `0 0 14px ${accent.glow}`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Shared pending state                                                      */
/* -------------------------------------------------------------------------- */

function PendingState({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <Emblem icon={IconEye} size="md" />
      <p className="max-w-xs text-pretty text-[12.5px] leading-relaxed text-white/65 sm:text-[13.5px]">
        {message}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Personal — wrapper that double-clicks the eye to toggle video mode        */
/* -------------------------------------------------------------------------- */

function PersonalCard({
  accent,
  marketSelected,
  history,
  latest,
}: {
  accent: { from: string; to: string }
  marketSelected: boolean
  history: Candle[]
  latest: Candle | null
}) {
  // Default behaviour matches Premium shadow projection. Double-click on the
  // eye icon flips into video mode, double-click again returns to normal.
  // We intentionally do not persist this — the user said "default a ata
  // thakbe na, jokhon ante chaibe tokhon ante parbe".
  const [videoMode, setVideoMode] = useState(false)

  return (
    <CardShell
      title="Two candles"
      italic="ahead view"
      accent={accent}
      onEyeDoubleClick={() => setVideoMode((v) => !v)}
      eyeActive={videoMode}
      eyeAriaLabel={
        videoMode
          ? "Double-click to return to shadow candles"
          : "Double-click to switch to video mode"
      }
    >
      {marketSelected ? (
        videoMode ? (
          <PersonalVideoMode />
        ) : (
          <PersonalLiveChart history={history} latest={latest} />
        )
      ) : (
        <SelectMarketHint />
      )}
    </CardShell>
  )
}

/* -------------------------------------------------------------------------- */
/*  Personal — the live chart (main page chart runs two candles behind)       */
/* -------------------------------------------------------------------------- */

const WATERMARK_SRC =
  "/brand/chartflow-logo.svg"

function PersonalLiveChart({ history, latest }: { history: Candle[]; latest: Candle | null }) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)")
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return (
    <div className="absolute inset-0" data-testid="personal-live-chart">
      <TradingChart
        history={history}
        latest={latest}
        theme="dark"
        hideGrid
        hideScales
        restrictLeftEdge
        defaultBarSpacing={isMobile ? 14 : 9}
      />
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden>
        <img
          src={WATERMARK_SRC}
          alt=""
          className="h-auto w-[55%] max-w-[440px] select-none opacity-[0.12]"
          draggable={false}
        />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Personal — video mode (upload + play inside the card)                     */
/* -------------------------------------------------------------------------- */

function PersonalVideoMode() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  // Free the object URL when the component unmounts or when a new
  // file replaces the current one.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  const onPick = () => inputRef.current?.click()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setVideoUrl(url)
    // Reset the input so the same file can be re-picked later.
    e.target.value = ""
  }

  return (
    <div className="absolute inset-0 overflow-hidden rounded-b-xl sm:rounded-b-2xl">
      {videoUrl ? (
        <video
          key={videoUrl}
          src={videoUrl}
          controls
          playsInline
          className="absolute inset-0 h-full w-full bg-black object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0E0F11]/85 p-6 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-[#C4B5FD]/40 bg-[#1A0A33]/70 text-[#C4B5FD]">
            <IconEye className="size-5" aria-hidden />
          </span>
          <p className="max-w-xs text-pretty text-[12.5px] leading-relaxed text-white/70 sm:text-[13.5px]">
            Upload a video to play it right here in place of the shadow
            candles.
          </p>
          <button
            type="button"
            onClick={onPick}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-[#C4B5FD] to-[#6D28D9] px-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0E0420] shadow-[0_10px_28px_-10px_rgba(196,181,253,0.65)] transition hover:scale-[1.02]"
          >
            Upload video
          </button>
        </div>
      )}

      {/* Hidden file input — kept mounted so the picker is always available. */}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  )
}
