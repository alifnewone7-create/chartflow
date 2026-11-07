"use client"

import { Emblem } from "@/components/home/primitives"
import { IconLayers, IconVerified } from "@/components/home/icons"
import { Chip, HAZE, PANEL, SectionHead, TIER_ICON } from "@/components/profile/ui"
import { DAILY_LIMITS, TIER_LABEL, candle2LimitLabel, limitLabel, type Tier } from "@/lib/tiers"
import { cn } from "@/lib/utils"

const PLANS: Tier[] = ["basic", "smart", "pro", "dominator"]
const COLS = ["Live / day", "Future", "Auto", "2 Candle"]

const cells = (t: Tier) => [limitLabel(DAILY_LIMITS[t]["chart-to-signal"]), "No limit", "No limit", candle2LimitLabel(t).replace("Unlimited", "No limit")]

function PlanRow({ t, active }: { t: Tier; active: boolean }) {
  return (
    <div
      data-testid={`plan-row-${t}`}
      className={cn(
        "grid grid-cols-4 gap-2 rounded-2xl border p-3.5 transition-colors duration-300 sm:grid-cols-[1.4fr_repeat(4,1fr)] sm:items-center sm:px-4",
        active ? "border-[#CDFF17]/40 bg-[#CDFF17]/[0.07]" : "border-white/[0.06] bg-[#0E0F11]/55 hover:border-white/15",
      )}
    >
      <div className="col-span-4 mb-1.5 flex items-center gap-3 sm:col-span-1 sm:mb-0">
        <Emblem icon={TIER_ICON[t]} size="sm" tone={t === "dominator" ? "gold" : "emerald"} />
        <span className="text-[14px] font-bold text-white">{TIER_LABEL[t]}</span>
        {active && (
          <span className="cf-mono inline-flex items-center gap-1 rounded-md bg-[#CDFF17] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#141517]" data-testid="plan-current-badge">
            <IconVerified className="size-3" /> Current
          </span>
        )}
      </div>
      {cells(t).map((v, i) => (
        <div key={COLS[i]} className="min-w-0 sm:text-right">
          <p className="cf-mono text-[8.5px] uppercase tracking-[0.14em] text-white/35 sm:hidden">{COLS[i]}</p>
          <p className={cn("cf-mono truncate text-[12.5px] font-bold sm:text-[13px]", active ? "text-[#CDFF17]" : "text-white/75")}>{v}</p>
        </div>
      ))}
    </div>
  )
}

export function PlanTable({ activeTier }: { activeTier: Tier }) {
  return (
    <section className={cn(PANEL, "p-4 sm:p-7")} data-testid="profile-comparison-table">
      {HAZE}
      <SectionHead
        icon={IconLayers}
        eyebrow="All plans"
        lead="Plan"
        accent="comparison"
        hint="Daily allowance for every plan."
        right={<Chip tone="volt" className="hidden sm:inline-flex">4 tiers</Chip>}
      />
      <div className="relative mt-6 flex flex-col gap-2">
        <div className="cf-mono hidden grid-cols-[1.4fr_repeat(4,1fr)] px-4 text-[9.5px] uppercase tracking-[0.2em] text-white/40 sm:grid">
          <span>Plan</span>
          {COLS.map((c) => <span key={c} className="text-right">{c}</span>)}
        </div>
        {PLANS.map((t) => <PlanRow key={t} t={t} active={t === activeTier} />)}
      </div>
    </section>
  )
}
