"use client"

import Link from "next/link"
import { Crown, Lock } from "lucide-react"

import type { Tier } from "@/lib/tiers"
import { cn } from "@/lib/utils"

import { CARD, LIME_BTN } from "@/components/engine/ui-bits"

/** Premium-only wrapper. The backend re-checks the plan on every request — this is UX only. */
export function PremiumGate({ tier, feature, children }: { tier: Tier; feature: string; children: React.ReactNode }) {
  if (tier !== "free") return <>{children}</>
  return (
    <div data-testid="premium-gate" className={cn(CARD, "mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-12 text-center")}>
      <span className="grid size-14 place-items-center rounded-2xl border border-[#CDFF17]/40 bg-[#CDFF17]/10">
        <Lock className="size-6 text-[#CDFF17]" />
      </span>
      <h2 className="text-lg font-semibold text-[#F3F5EF]">{feature} is a premium feature</h2>
      <p className="max-w-sm text-[13px] leading-relaxed text-[#E8F4F7]/65">
        Upgrade to any paid plan to unlock {feature}. Your existing history stays safe and visible after upgrading.
      </p>
      <Link href="/upgrade-your-plan" data-testid="premium-gate-upgrade-link" className={cn(LIME_BTN, "h-11 px-6")}>
        <Crown className="size-4" /> Upgrade your plan
      </Link>
    </div>
  )
}
