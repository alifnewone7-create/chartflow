"use client"

/**
 * Upgrade hub — `/upgrade-your-plan`.
 *
 * Rendered inside the shared SignalShell (sidebar / top nav / bottom nav)
 * and reuses the home-page PricingCard so the cards look exactly like the
 * marketing pricing section. Only the footer adapts to the buyer's tier:
 *   below current → "Purchased" · current → "Your current account" ·
 *   above current → "Upgrade Your Plan" CTA.
 */

import Link from "next/link"
import { useMemo, type ReactNode } from "react"

import { useLanguage } from "@/components/language-provider"
import { SignalShell } from "@/components/signal/signal-shell"
import { ADMIN_TELEGRAM_URL, Eyebrow, SectionTitle } from "@/components/home/primitives"
import { IconArrow, IconRocket, IconVerified } from "@/components/home/icons"
import { buildTiers, PricingCard, type PricingTier } from "@/components/home/pricing"
import { TIERS, type Tier } from "@/lib/tiers"
import { cn } from "@/lib/utils"

const TIER_RANK: Record<Tier, number> = TIERS.reduce(
  (acc, t, i) => {
    acc[t] = i
    return acc
  },
  {} as Record<Tier, number>,
)

type CardState = "current" | "owned-below" | "upgradeable"

function relativeState(slug: Tier, current: Tier): CardState {
  if (slug === current) return "current"
  return TIER_RANK[slug] < TIER_RANK[current] ? "owned-below" : "upgradeable"
}

export function UpgradeYourPlanClient() {
  return <SignalShell>{({ tier }) => <UpgradeHub currentTier={tier} />}</SignalShell>
}

function UpgradeHub({ currentTier }: { currentTier: Tier }) {
  const { t } = useLanguage()
  const tiers = useMemo(() => buildTiers(t), [t])

  return (
    <div className="cf-theme relative mx-auto flex w-full max-w-7xl flex-col pb-6 pt-2 sm:pt-6" data-testid="upgrade-plan-page">
      <div className="flex flex-col items-center gap-5 text-center">
        <Eyebrow icon={IconRocket}>Account upgrade</Eyebrow>
        <SectionTitle as="h1" lead="Upgrade" accent="Your Plan" tone="volt" />
        <p className="max-w-2xl text-pretty text-[14px] leading-relaxed text-white/55 sm:text-[16px]">
          Move up a tier and we&apos;ll automatically swap your account once admin approves your payment — no manual steps from you.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 pt-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
        {tiers.map((tier) => {
          const state = relativeState(tier.key as Tier, currentTier)
          return (
            <PricingCard
              key={tier.key}
              tier={tier}
              current={state === "current"}
              badge={state === "current" ? <CurrentBadge /> : undefined}
              footer={<UpgradeFooter tier={tier} state={state} />}
            />
          )
        })}
      </div>
    </div>
  )
}

function CurrentBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-400 px-4 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-[#141517] shadow-[0_8px_24px_-6px_rgba(52,211,153,0.7)]" data-testid="upgrade-current-badge">
      <IconVerified className="size-3.5" />
      Current plan
    </span>
  )
}

function StatePill({ children, tone, testId }: { children: ReactNode; tone: "ok" | "neutral"; testId: string }) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "cf-mono inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-[11.5px] font-bold uppercase tracking-[0.16em]",
        tone === "ok" ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.04] text-white/55",
      )}
    >
      <IconVerified className="size-4" />
      {children}
    </span>
  )
}

function UpgradeFooter({ tier, state }: { tier: PricingTier; state: CardState }) {
  if (state === "current") return <StatePill tone="ok" testId={`upgrade-state-${tier.key}`}>Your current account</StatePill>
  if (state === "owned-below") return <StatePill tone="neutral" testId={`upgrade-state-${tier.key}`}>Purchased</StatePill>

  const ctaClass = tier.popular ? "cf-btn-volt" : tier.premium ? "cf-btn-white" : "cf-btn-dark"
  const className = cn("group/cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold", ctaClass)
  const inner = (
    <>
      <span>Upgrade Your Plan</span>
      <IconArrow className="size-4 transition-transform group-hover/cta:translate-x-1" />
    </>
  )
  if (tier.isBasic) {
    return (
      <a href={ADMIN_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={className} data-testid={`upgrade-cta-${tier.key}`}>
        {inner}
      </a>
    )
  }
  return (
    <Link href={`/upgrade-to-${tier.key}`} className={className} data-testid={`upgrade-cta-${tier.key}`}>
      {inner}
    </Link>
  )
}
