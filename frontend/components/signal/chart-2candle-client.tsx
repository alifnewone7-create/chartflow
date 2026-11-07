"use client"

import { CandlestickChart } from "lucide-react"

import { See2CandleCard } from "@/components/signal/see-2candle-card"
import { MarketChartCard } from "@/components/signal/market-chart-card"
import { useDelayedCandles } from "@/hooks/use-delayed-candles"
import { SignalShell } from "@/components/signal/signal-shell"
import { useMarketChart } from "@/hooks/use-market-chart"
import { use2CandleUsage, formatTime } from "@/hooks/use-2candle-usage"
import { candle2LimitLabel, TIER_LABEL, type Tier } from "@/lib/tiers"
import { Emblem } from "@/components/home/primitives"
import { IconAlert, IconTimer } from "@/components/home/icons"
import { cn } from "@/lib/utils"

const PERIOD_SECONDS = 60

export function Chart2CandleClient() {
  return (
    <SignalShell>
      {({ accessToken, tier, qxlKey }) => (
        <Chart2CandleContent
          accessToken={accessToken}
          tier={tier}
          qxlKey={qxlKey}
        />
      )}
    </SignalShell>
  )
}

function Chart2CandleContent({
  accessToken,
  tier,
}: {
  accessToken: string
  tier: Tier
  qxlKey: string
}) {
  const chart = useMarketChart({ period: PERIOD_SECONDS, accessToken })

  // Usage is keyed by the per-user uid so shared QXL keys get separate timers.
  const hasMarketSelected = Boolean(chart.asset)
  const usage = use2CandleUsage(accessToken, tier, hasMarketSelected)

  const showQuota = !usage.isUnlimited

  // Personal: the main chart runs two candles behind live; the card shows live.
  const isPersonal = tier === "personal"
  const delayed = useDelayedCandles({
    asset: isPersonal ? chart.currentAsset?.symbol ?? chart.asset ?? null : null,
    period: chart.period,
    history: chart.history,
    latest: chart.latest,
  })

  return (
    <div className="cf-theme relative" data-testid="chart-2candle-page">
      <div className="grid gap-5 lg:grid-cols-2">
        <MarketChartCard
          status={chart.status}
          assets={chart.assets}
          asset={chart.asset}
          onSelectAsset={chart.setAsset}
          history={isPersonal ? delayed.history : chart.history}
          latest={isPersonal ? delayed.latest : chart.latest}
          currentAsset={chart.currentAsset}
          period={chart.period}
          error={chart.error}
          errorKind={chart.errorKind}
          onReclaim={chart.reclaim}
          phase={chart.phase}
          secondsLeft={chart.secondsLeft}
          marketIcon={CandlestickChart}
          lock={chart.lock}
        />

        <div className="flex h-full flex-col gap-3 sm:gap-4">
          <See2CandleCard
            tier={tier}
            history={chart.history}
            latest={chart.latest}
            asset={chart.currentAsset?.symbol ?? chart.asset ?? null}
          />
        </div>
      </div>

      {showQuota && (
        <div className="mt-5">
          <QuotaCard
            usedSeconds={usage.usedSeconds}
            limitSeconds={usage.limitSeconds}
            remainingSeconds={usage.remainingSeconds}
            isActive={hasMarketSelected}
            tier={tier}
          />
        </div>
      )}

      {usage.isExhausted && (
        <LimitExhaustedOverlay
          tier={tier}
          resetCountdown={usage.resetCountdown}
        />
      )}
    </div>
  )
}

/* ══════════════════════════ QUOTA CARD ══════════════════════════════════ */

function QuotaCard({
  usedSeconds,
  limitSeconds,
  remainingSeconds,
  isActive,
  tier,
}: {
  usedSeconds: number
  limitSeconds: number
  remainingSeconds: number
  isActive: boolean
  tier: Tier
}) {
  const pct = limitSeconds > 0 ? Math.min(100, (usedSeconds / limitSeconds) * 100) : 0
  const isLow = remainingSeconds <= Math.max(60, limitSeconds * 0.1)

  return (
    <div className="cf-card relative flex flex-col gap-3.5 overflow-hidden rounded-[18px] p-4 sm:rounded-[24px] sm:p-5" data-testid="c2c-quota-card">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(205,255,23,0.16), transparent 70%)" }}
      />

      <div className="relative flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <Emblem icon={IconTimer} size="sm" className={cn(isActive && "motion-safe:animate-pulse")} />
          <span className="flex flex-col leading-tight">
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.24em] text-[#CDFF17]/80">Today · Quota</span>
            <span className="text-[14.5px] font-bold text-white">2 Candle access time</span>
          </span>
        </span>

        <span className={cn("cf-display text-[22px] leading-none tabular-nums sm:text-[26px]", isLow ? "text-amber-300" : "text-white")} data-testid="c2c-quota-remaining">
          {formatTime(remainingSeconds, true)}
        </span>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${pct}%`,
            background: isLow ? "linear-gradient(90deg, #F59E0B 0%, #FCD34D 100%)" : "linear-gradient(90deg, #A9D40E 0%, #CDFF17 100%)",
            boxShadow: isLow ? "0 0 12px -2px rgba(245,158,11,0.6)" : "0 0 12px -2px rgba(205,255,23,0.6)",
          }}
        />
      </div>

      <div className="relative flex items-center justify-between gap-2 text-[10px] font-medium text-white/55">
        <span
          className={cn(
            "cf-mono inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.16em]",
            isActive ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.04] text-white/50",
          )}
        >
          <span className={cn("size-1.5 rounded-full", isActive ? "cf-pulse bg-emerald-400" : "bg-white/30")} />
          {isActive ? "Active" : "Paused"}
        </span>
        <span className="cf-mono tabular-nums uppercase tracking-[0.12em]">
          <span className="text-white/35">Limit</span>{" "}
          <span className="font-bold text-[#CDFF17]">{candle2LimitLabel(tier)}</span>
        </span>
      </div>
    </div>
  )
}

/* ══════════════════════════ LIMIT EXHAUSTED OVERLAY ════════════════════ */

function LimitExhaustedOverlay({
  tier,
  resetCountdown,
}: {
  tier: Tier
  resetCountdown: { hours: number; minutes: number; seconds: number }
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E0F11]/92 backdrop-blur-md" data-testid="c2c-limit-overlay">
      <div className="mx-4 w-full max-w-md">
        <div className="cf-card-strong relative overflow-hidden rounded-[24px] p-6 sm:p-8">
          <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,#CDFF17_50%,transparent)] opacity-70" />

          <div className="mb-5 flex justify-center">
            <Emblem icon={IconAlert} size="lg" />
          </div>

          <h2 className="cf-headline mb-2 text-center text-[1.5rem] text-white sm:text-[1.8rem]">
            Daily <span className="cf-text-volt">limit reached</span>
          </h2>

          <p className="mb-6 text-center text-[13px] leading-relaxed text-white/60 sm:text-[14px]">
            Your <span className="font-semibold text-white">{TIER_LABEL[tier]}</span> plan daily limit for{" "}
            <span className="font-semibold text-[#CDFF17]">2 Candle Ahead</span> has been used. It resets at{" "}
            <span className="font-semibold text-emerald-300">6:00 AM BD (UTC+6)</span>.
          </p>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0E0F11]/60 p-4">
            <div className="mb-3 flex items-center justify-center gap-2">
              <IconTimer className="size-4 text-[#CDFF17]" />
              <span className="cf-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">Reset in</span>
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <TimeUnit value={resetCountdown.hours} label="Hours" />
              <span className="cf-display text-[24px] text-white/25 sm:text-[28px]">:</span>
              <TimeUnit value={resetCountdown.minutes} label="Minutes" />
              <span className="cf-display text-[24px] text-white/25 sm:text-[28px]">:</span>
              <TimeUnit value={resetCountdown.seconds} label="Seconds" />
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-white/40">
            Come back after 6:00 AM Bangladesh time to use this feature again.
          </p>
        </div>
      </div>
    </div>
  )
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="cf-input grid size-14 place-items-center rounded-xl sm:size-16">
        <span className="cf-display text-[24px] tabular-nums text-white sm:text-[28px]">{String(value).padStart(2, "0")}</span>
      </div>
      <span className="cf-mono text-[8px] font-bold uppercase tracking-[0.2em] text-white/40">{label}</span>
    </div>
  )
}
