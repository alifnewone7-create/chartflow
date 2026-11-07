"use client"

/**
 * Chart card for the signal rooms — same silhouette as the home-page hero
 * terminal (flag pair + market name, 1M + LIVE pills, "1-minute candles"
 * footer with the ChartFlow Ai mark). The chart itself stays interactive.
 */

import { useEffect, useState } from "react"
import { AlertTriangle, BarChart3, Clock, Lock, WifiOff, type LucideIcon } from "lucide-react"

import { AssetSelector } from "@/components/asset-selector"
import { ChartFlowMark } from "@/components/brand/chartflow-logo"
import { TradingChart } from "@/components/trading-chart"
import { Spinner } from "@/components/ui/spinner"
import type { Asset, Candle, ConnectionStatus } from "@/hooks/use-quotex-ws"
import type { MarketChartPhase } from "@/hooks/use-market-chart"
import { cn } from "@/lib/utils"

type Props = {
  status: ConnectionStatus
  assets: Asset[]
  asset: string | null
  onSelectAsset: (symbol: string) => void
  history: Candle[]
  latest: Candle | null
  currentAsset: Asset | null
  period: number
  error?: string | null
  errorKind?: null | "replaced"
  onReclaim?: () => void
  phase?: MarketChartPhase
  secondsLeft?: number | null
  marketIcon?: LucideIcon
  lock?: {
    status: "idle" | "owner" | "blocked"
    otherPair: string | null
    takeOver: () => void
  } | null
}

export function MarketChartCard({
  status,
  assets,
  asset,
  onSelectAsset,
  history,
  latest,
  currentAsset,
  period,
  error,
  errorKind = null,
  onReclaim,
  phase = "idle",
  secondsLeft = null,
  marketIcon = BarChart3,
  lock = null,
}: Props) {
  const hasData = history.length > 0 || !!latest
  const noMarketSelected = asset === null || phase === "idle"

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(max-width: 768px)")
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  const isLocked = lock?.status === "blocked"

  const overlay =
    phase === "waiting" || noMarketSelected ? null : !hasData ? buildOverlay(status) : null
  const showWaitOverlay = phase === "waiting" && !noMarketSelected
  const MarketIcon = marketIcon

  return (
    <section
      className="cf-card-strong relative overflow-hidden rounded-[18px] sm:rounded-[28px]"
      data-testid="c2s-chart-card"
    >
      {/* Header — market picker trigger · 1M · LIVE */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-3 sm:px-6 sm:py-3.5">
        <AssetSelector
          assets={assets}
          current={asset}
          onSelect={onSelectAsset}
          loading={assets.length === 0}
          icon={marketIcon}
          disabled={isLocked}
        />
        <div className="flex shrink-0 items-center gap-2">
          {currentAsset?.payout != null && (
            <span className="cf-mono hidden rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/60 md:inline-flex">
              Payout <span className="ml-1 text-[#CDFF17]">{currentAsset.payout}%</span>
            </span>
          )}
          <StatusPill status={status} idle={noMarketSelected} />
        </div>
      </div>

      {/* Chart frame */}
      <div className="relative h-[260px] w-full bg-[#0E0F11] sm:h-[400px] lg:h-[500px]">
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
            src="/brand/chartflow-logo.svg"
            alt=""
            className="h-auto w-[55%] max-w-[440px] select-none opacity-[0.12]"
            draggable={false}
          />
        </div>

        {overlay && (
          <Overlay z="z-20" dim="bg-[#0E0F11]/60">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              {overlay.kind === "info" ? (
                <Spinner className="size-4 text-[#CDFF17]" />
              ) : (
                <WifiOff className="size-4 text-amber-400" aria-hidden />
              )}
              {overlay.title}
            </div>
            <p className="max-w-xs text-pretty text-xs leading-relaxed text-white/60">{overlay.body}</p>
          </Overlay>
        )}

        {showWaitOverlay && (
          <Overlay z="z-30" dim="bg-[#0E0F11]/85">
            <span className="cf-orb inline-flex size-12 items-center justify-center rounded-full sm:size-14">
              <Clock className="size-5 motion-safe:animate-pulse sm:size-6" aria-hidden />
            </span>
            <div className="cf-display text-[16px] text-white sm:text-[19px]">
              Waiting for <span className="text-[#CDFF17]">closing candle</span>
            </div>
            <p className="text-pretty text-[11.5px] leading-relaxed text-white/55 sm:text-xs">
              Chart syncs after the running candle closes.
            </p>
            {typeof secondsLeft === "number" && secondsLeft > 0 && (
              <div className="cf-mono mt-1 flex items-baseline gap-2 text-[10.5px] uppercase tracking-[0.18em] text-white/50">
                Closes in
                <span className="cf-display text-xl text-[#CDFF17] sm:text-2xl">{secondsLeft}s</span>
              </div>
            )}
          </Overlay>
        )}

        {noMarketSelected && !isLocked && (
          <Overlay z="z-30" dim="bg-[#0E0F11]/88" testId="c2s-select-market-overlay">
            <span className="cf-orb inline-flex size-14 items-center justify-center rounded-full sm:size-16">
              <MarketIcon className="size-6 sm:size-7" aria-hidden />
            </span>
            <div className="cf-display text-[20px] text-white sm:text-[26px]">
              Select a <span className="text-[#CDFF17]">Market</span>
            </div>
            <p className="max-w-[260px] text-pretty text-[12px] leading-relaxed text-white/55 sm:max-w-xs sm:text-[13px]">
              Tap the market button above to open the full market list and start the live chart.
            </p>
          </Overlay>
        )}

        {isLocked && (
          <Overlay z="z-40" dim="bg-[#0E0F11]/90" interactive>
            <LockBody
              title={
                <>
                  Active session in <span className="text-amber-300">another tab</span>
                </>
              }
              body={
                lock?.otherPair
                  ? `Your account is already streaming ${lock.otherPair} in another tab. Close it, or take over here to switch the live feed to this tab.`
                  : "Your account is already streaming a market in another tab. Close it, or take over here to switch the live feed to this tab."
              }
              onAction={() => lock?.takeOver()}
            />
          </Overlay>
        )}

        {errorKind === "replaced" && (
          <Overlay z="z-50" dim="bg-[#0E0F11]/92" interactive>
            <LockBody
              title={
                <>
                  Account opened in <span className="text-amber-300">another session</span>
                </>
              }
              body={`${error ?? "Another tab or device opened this account."} Take over here to switch the live feed back to this tab.`}
              onAction={() => onReclaim?.()}
              disabled={!onReclaim}
            />
          </Overlay>
        )}
      </div>

      {/* Footer — timeframe copy + brand mark (mirrors the home terminal) */}
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3 sm:px-6">
        <span className="cf-mono min-w-0 truncate text-[10.5px] uppercase tracking-[0.14em] text-white/40">
          {footerLabel(period)}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-white/55">
          <ChartFlowMark className="size-4" />
          ChartFlow Ai
        </span>
      </div>

      {error && errorKind !== "replaced" && (
        <div className="flex items-center gap-2 border-t border-amber-400/20 bg-amber-400/10 px-4 py-2 text-[12px] text-amber-200">
          <AlertTriangle className="size-3.5" aria-hidden />
          <span className="cf-mono">{error}</span>
        </div>
      )}
    </section>
  )
}

function Overlay({
  z,
  dim,
  interactive = false,
  testId,
  children,
}: {
  z: string
  dim: string
  interactive?: boolean
  testId?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-5 text-center backdrop-blur-md sm:gap-3",
        z,
        dim,
        !interactive && "pointer-events-none",
      )}
    >
      {children}
    </div>
  )
}

function LockBody({
  title,
  body,
  onAction,
  disabled,
}: {
  title: React.ReactNode
  body: string
  onAction: () => void
  disabled?: boolean
}) {
  return (
    <>
      <span className="inline-flex size-12 items-center justify-center rounded-full border border-amber-400/35 bg-amber-400/15 text-amber-300">
        <Lock className="size-5" aria-hidden strokeWidth={2.2} />
      </span>
      <div className="cf-display text-[17px] text-white sm:text-[20px]">{title}</div>
      <p className="max-w-sm text-pretty text-[12px] leading-relaxed text-white/60 sm:text-[13px]">{body}</p>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="cf-btn-dark mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-[13px] font-semibold text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Lock className="size-3.5" aria-hidden strokeWidth={2.4} />
        Take over here
      </button>
    </>
  )
}

function footerLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}-second candles`
  const m = seconds / 60
  return m === 1 ? "1-minute candles" : `${m}-minute candles`
}

function StatusPill({ status, idle }: { status: ConnectionStatus; idle?: boolean }) {
  const map: Record<ConnectionStatus | "idle", { label: string; cls: string; dot: string }> = {
    idle: { label: "Standby", cls: "border-white/10 bg-white/[0.04] text-white/55", dot: "bg-white/50" },
    open: { label: "Live", cls: "border-[#CDFF17]/35 bg-[#CDFF17]/10 text-[#CDFF17]", dot: "bg-[#CDFF17] shadow-[0_0_8px_#CDFF17] cf-pulse" },
    connecting: { label: "Connecting", cls: "border-white/10 bg-white/[0.04] text-white/60", dot: "bg-white/60 motion-safe:animate-pulse" },
    closed: { label: "Offline", cls: "border-amber-400/35 bg-amber-400/10 text-amber-300", dot: "bg-amber-400" },
    error: { label: "Error", cls: "border-rose-400/35 bg-rose-400/10 text-rose-300", dot: "bg-rose-400" },
  }
  const { label, cls, dot } = map[idle ? "idle" : status]
  return (
    <span
      data-testid="c2s-status-pill"
      className={cn("cf-mono inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em]", cls)}
    >
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  )
}

function buildOverlay(status: ConnectionStatus): { kind: "info" | "warn"; title: string; body: string } | null {
  if (status === "error" || status === "closed") {
    return {
      kind: "warn",
      title: "Live feed unavailable",
      body: "The Quotex backend isn't reachable right now. We'll resume automatically once the stream is back online.",
    }
  }
  if (status === "connecting") {
    return { kind: "info", title: "Connecting to live feed", body: "Establishing a secure link to the Quotex stream…" }
  }
  if (status === "open") {
    return { kind: "info", title: "Loading candles", body: "Fetching the latest candle history…" }
  }
  return null
}
