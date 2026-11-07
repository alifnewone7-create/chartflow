import Link from "next/link"

import { Emblem, Eyebrow } from "@/components/home/primitives"
import { IconArrow, IconMailSeal, IconMembership, IconRocket, IconVerified, type CfIcon } from "@/components/home/icons"
import { HAZE, PANEL } from "@/components/profile/ui"
import { TIER_LABEL, type Tier } from "@/lib/tiers"
import { cn } from "@/lib/utils"

type Holder = { fullName?: string; username?: string } | null

function Avatar({ name }: { name: string }) {
  return (
    <span className="relative shrink-0" data-testid="profile-avatar">
      <span aria-hidden className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(205,255,23,0.3),transparent_70%)] blur-xl" />
      <span className="cf-orb cf-display relative inline-flex size-[72px] items-center justify-center rounded-full text-[30px] sm:size-24 sm:text-[38px]">
        {name.slice(0, 1).toUpperCase()}
      </span>
    </span>
  )
}

function InfoTile({ icon, label, value, testId }: { icon: CfIcon; label: string; value: string; testId: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-[#0E0F11]/60 px-4 py-3.5">
      <Emblem icon={icon} size="sm" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="cf-mono text-[9.5px] uppercase tracking-[0.2em] text-white/40">{label}</span>
        <span className="truncate text-[14px] font-semibold text-white" data-testid={testId}>{value}</span>
      </span>
    </div>
  )
}

export function IdentityCard({ tier, holder }: { tier: Tier; holder: Holder }) {
  const name = (holder?.fullName || "Trader").trim()
  const top = tier === "dominator" || tier === "personal"
  return (
    <section className={cn(PANEL, "cf-card-strong p-5 sm:p-8")} data-testid="profile-identity-card">
      {HAZE}
      <div aria-hidden className="cf-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Avatar name={name} />
          <Eyebrow icon={IconVerified}>Verified member</Eyebrow>
          <h1 className="cf-headline break-words text-[1.9rem] text-white sm:text-[2.4rem]" data-testid="profile-user-name">{name}</h1>
          {!top && (
            <Link
              href="/upgrade-your-plan"
              data-testid="profile-upgrade-link"
              className="cf-btn-volt group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-[14px] font-bold sm:w-auto"
            >
              <IconRocket className="size-[18px]" /> Upgrade plan
              <IconArrow className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          )}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <InfoTile icon={IconMailSeal} label="Email" value={holder?.username || "—"} testId="profile-email" />
          <InfoTile icon={IconMembership} label="Membership" value={tier === "free" ? "No active plan" : `${TIER_LABEL[tier]} · Active`} testId="profile-membership" />
        </div>
      </div>
    </section>
  )
}
