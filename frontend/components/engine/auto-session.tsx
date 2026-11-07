"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"

import { useRtdbValue } from "@/hooks/use-rtdb-list"
import { cn } from "@/lib/utils"

import { useAutoSettings } from "@/components/engine/auto-config"
import { type AutoSession, SessionPanel } from "@/components/engine/auto-monitor"
import { AUTO_TABS } from "@/components/engine/automatic-signal-client"
import { useMarkets } from "@/components/engine/market-picker"
import { PremiumGate } from "@/components/engine/premium-gate"
import { ReportCard } from "@/components/engine/report-card"
import { CARD } from "@/components/engine/ui-bits"
import { SectionTabs } from "@/components/signal/section-tabs"
import { SignalShell } from "@/components/signal/signal-shell"

const TABS = [{ key: "back" as const, label: "Back", Icon: ArrowLeft }, AUTO_TABS[1]]

export function AutoSessionPageClient() {
  return (
    <SignalShell>
      {({ accessToken, tier }) => (
        <PremiumGate tier={tier} feature="Automatic Signal">
          <SessionDetail uid={accessToken} />
        </PremiumGate>
      )}
    </SignalShell>
  )
}

function SessionDetail({ uid }: { uid: string }) {
  const { id } = useParams<{ id: string }>()
  const sid = decodeURIComponent(id)
  const router = useRouter()
  const { value: s, loading } = useRtdbValue<AutoSession>(`auto/sessions/${uid}/${sid}`)
  const settings = useAutoSettings(uid)
  const { markets } = useMarkets()

  return (
    <div className="cf-theme flex flex-col gap-4 sm:gap-6" data-testid="auto-session-page">
      <SectionTabs tabs={TABS} value="history" onChange={() => router.push("/automatic-signal?tab=history")} testId="auto-session-tab" />
      {loading ? (
        <div className={cn(CARD, "flex items-center justify-center gap-2 py-16 text-[13px] text-white/60")}><Loader2 className="size-4 animate-spin text-[#CDFF17]" /> Loading session…</div>
      ) : !s ? (
        <p className={cn(CARD, "py-16 text-center text-[13px] text-white/55")} data-testid="auto-session-missing">This session could not be found.</p>
      ) : (
        <>
          <SessionPanel uid={uid} session={{ ...s, session_id: sid }} markets={markets} showChart={settings.show_chart} title={s.status === "closed" ? "Closed" : "Running"} />
          {s.status === "closed" && <ReportCard sid={sid} pending={s.stats?.pending ?? 0} />}
        </>
      )}
    </div>
  )
}
