"use client"

import { useRouter } from "next/navigation"
import { IconExit } from "@/components/home/icons"
import type { Tier } from "@/lib/tiers"
import { logoutUser } from "@/lib/user-auth"
import { SignalShell, type SignalShellChildArgs } from "@/components/signal/signal-shell"
import { IdentityCard } from "@/components/profile/identity-card"
import { DailyLimits } from "@/components/profile/daily-limits"
import { PlanTable } from "@/components/profile/plan-table"

type Holder = SignalShellChildArgs["holder"]

export function ProfileClient() {
  return (
    <SignalShell pageEyebrow="Profile · Account" pageTitle="Your ChartFlow Ai account">
      {({ tier, holder, accessToken }) => <Dashboard tier={tier} holder={holder} uid={accessToken} />}
    </SignalShell>
  )
}

function Dashboard({ tier, holder, uid }: { tier: Tier; holder: Holder; uid: string }) {
  return (
    <div className="cf-theme mx-auto flex w-full max-w-5xl flex-col gap-4 pb-4 pt-4 sm:gap-6 sm:pt-8" data-testid="profile-page">
      <IdentityCard tier={tier} holder={holder} />
      <DailyLimits uid={uid} tier={tier} />
      <PlanTable activeTier={tier} />
      <MobileLogOut />
    </div>
  )
}

function MobileLogOut() {
  const router = useRouter()
  return (
    <button
      type="button"
      data-testid="profile-logout-button"
      onClick={() => {
        logoutUser()
        router.replace("/")
      }}
      className="cf-btn-dark flex h-13 w-full items-center justify-center gap-2.5 rounded-xl text-[13px] font-semibold uppercase tracking-[0.14em] text-rose-300 md:hidden"
    >
      <IconExit className="size-5" />
      Log Out
    </button>
  )
}
