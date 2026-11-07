"use client"

import { useEffect, useState } from "react"
import { History, Radio, Settings } from "lucide-react"

import { useRtdbList } from "@/hooks/use-rtdb-list"
import { engine } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

import { AutoConfig, useAutoSettings } from "@/components/engine/auto-config"
import { AutoHistory } from "@/components/engine/auto-history"
import { SessionPanel, type AutoSession } from "@/components/engine/auto-monitor"
import { AutoSettingsPanel } from "@/components/engine/auto-settings"
import { useMarkets } from "@/components/engine/market-picker"
import { PremiumGate } from "@/components/engine/premium-gate"
import { useTelegramLink } from "@/components/engine/telegram-card"
import { CARD } from "@/components/engine/ui-bits"
import { SectionTabs } from "@/components/signal/section-tabs"
import { SignalShell } from "@/components/signal/signal-shell"

export type AutoTab = "auto" | "history" | "settings"

export const AUTO_TABS = [
  { key: "auto" as const, label: "Automatic Signal", Icon: Radio },
  { key: "history" as const, label: "History", Icon: History },
  { key: "settings" as const, label: "Settings", Icon: Settings, iconOnly: true },
]

export function AutomaticSignalClient() {
  return (
    <SignalShell>
      {({ accessToken, tier }) => (
        <PremiumGate tier={tier} feature="Automatic Signal">
          <AutoContent uid={accessToken} />
        </PremiumGate>
      )}
    </SignalShell>
  )
}

function AutoContent({ uid }: { uid: string }) {
  const [tab, setTab] = useState<AutoTab>("auto")
  const [tgEnabled, setTgEnabled] = useState(true)
  const { value: link } = useTelegramLink(uid)
  const settings = useAutoSettings(uid)
  const { markets } = useMarkets()
  const { items: sessions, loading } = useRtdbList<AutoSession>(`auto/sessions/${uid}`, 60)
  const active = sessions.find((s) => s.status !== "closed")

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab")
    if (t === "history" || t === "settings") setTab(t)
    engine<{ telegram_enabled: boolean }>("/me").then((d) => setTgEnabled(d.telegram_enabled)).catch(() => {})
  }, [])

  return (
    <div className="cf-theme flex flex-col gap-4 sm:gap-6" data-testid="auto-page">
      <SectionTabs tabs={AUTO_TABS} value={tab} onChange={setTab} testId="auto-tab" />

      {tab === "auto" && (
        <div className="flex flex-col gap-4 sm:gap-6" data-testid="auto-section">
          {active ? (
            <SessionPanel uid={uid} session={active} markets={markets} showChart={settings.show_chart} />
          ) : (
            <AutoConfig uid={uid} tgConnected={!!link} tgEnabled={tgEnabled} onOpenSettings={() => setTab("settings")} />
          )}
          {!active && !loading && sessions.length > 0 && (
            <p className={cn(CARD, "px-4 py-3 text-[12.5px] text-white/55")} data-testid="auto-no-session">
              No session is running. Your previous sessions are saved under <button type="button" onClick={() => setTab("history")} className="font-semibold text-[#CDFF17] underline-offset-2 hover:underline">History</button>.
            </p>
          )}
        </div>
      )}

      {tab === "history" && (
        <div data-testid="auto-history-section">
          <AutoHistory sessions={sessions} loading={loading} />
        </div>
      )}

      {tab === "settings" && (
        <div data-testid="auto-settings-section">
          <AutoSettingsPanel uid={uid} tgEnabled={tgEnabled} />
        </div>
      )}
    </div>
  )
}
