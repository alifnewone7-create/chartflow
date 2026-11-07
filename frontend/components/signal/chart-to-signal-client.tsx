"use client"

import { useEffect, useState } from "react"
import { History } from "lucide-react"

import { LiveSignalIcon } from "@/components/icons/live-signal-icon"
import { SignalHistory } from "@/components/engine/signal-history"
import { GenerateSignalPanel } from "@/components/signal/generate-signal-panel"
import { MarketChartCard } from "@/components/signal/market-chart-card"
import { SectionTabs } from "@/components/signal/section-tabs"
import { SignalShell } from "@/components/signal/signal-shell"
import { useMarketChart } from "@/hooks/use-market-chart"
import type { Tier } from "@/lib/tiers"
import { cn } from "@/lib/utils"

const PERIOD_SECONDS = 60
const MIN_REMAINING_SECONDS = 30

type Tab = "live" | "history"

const TABS = [
  { key: "live" as const, label: "Live Signal", Icon: LiveSignalIcon as never },
  { key: "history" as const, label: "Signal History", Icon: History },
]

export function ChartToSignalClient() {
  return (
    <SignalShell>
      {({ accessToken, qxlKey, tier }) => (
        <ChartToSignalContent accessToken={accessToken} qxlKey={qxlKey} tier={tier} />
      )}
    </SignalShell>
  )
}

/** The chart hook mounts inside the gated tree so unauthorised visitors never open a socket. */
export function ChartToSignalContent({
  accessToken,
  qxlKey,
  tier,
}: {
  accessToken: string
  qxlKey: string
  tier: Tier
}) {
  const chart = useMarketChart({ period: PERIOD_SECONDS, accessToken })
  const [tab, setTab] = useState<Tab>("live")
  useEffect(() => {
    const open = () => setTab("history")
    window.addEventListener("c2s:open-history", open)
    return () => window.removeEventListener("c2s:open-history", open)
  }, [])

  const historyPath = `signals/c2s/${accessToken}`
  return (
    <div className="cf-theme flex flex-col gap-4 sm:gap-6" data-testid="c2s-page">
      <SectionTabs tabs={TABS} value={tab} onChange={setTab} testId="c2s-tab" />

      {/* kept mounted so the live chart socket survives tab switches */}
      <div className={cn("flex flex-col gap-4 sm:gap-6", tab !== "live" && "hidden")} data-testid="c2s-live-section">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <MarketChartCard
            status={chart.status}
            assets={chart.assets}
            asset={chart.asset}
            onSelectAsset={chart.setAsset}
            history={chart.history}
            latest={chart.latest}
            currentAsset={chart.currentAsset}
            period={chart.period}
            error={chart.error}
            errorKind={chart.errorKind}
            onReclaim={chart.reclaim}
            phase={chart.phase}
            secondsLeft={chart.secondsLeft}
            marketIcon={LiveSignalIcon as never}
            lock={chart.lock}
          />

          <GenerateSignalPanel
            qxlKey={qxlKey}
            accessToken={accessToken}
            tier={tier}
            system="chart-to-signal"
            period={PERIOD_SECONDS}
            minRemaining={MIN_REMAINING_SECONDS}
            asset={chart.asset}
            latest={chart.latest}
          />
        </div>
      </div>

      {tab === "history" && (
        <div data-testid="c2s-history-section">
          <SignalHistory id="c2s-history" path={historyPath} title="Signal History" testId="c2s-history" />
        </div>
      )}
    </div>
  )
}
