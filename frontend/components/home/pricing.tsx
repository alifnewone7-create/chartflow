"use client"

import Link from "next/link"
import { useMemo, type ReactNode } from "react"
import { ChevronRight, Info } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"
import {
  ADMIN_TELEGRAM_URL,
  Emblem,
  Eyebrow,
  QUOTEX_SIGNUP_URL,
  SectionTitle,
} from "@/components/home/primitives"
import {
  IconArrow,
  IconCrown,
  IconFacet,
  IconLaurel,
  IconPlane,
  IconSeed,
  type CfIcon,
} from "@/components/home/icons"

/* ----------------------------- data (unchanged logic) ----------------------------- */
type Meta = { label: string; variant: "limited" | "daily" | "time" }
type Feature = { label: string; sub?: string; included?: boolean; highlight?: boolean; meta?: Meta }
type DetailItem = { title: string; body: string; included?: boolean }
type Tier = {
  key: string
  name: string
  price: string
  suffix: string
  description: string
  features: Feature[]
  details: DetailItem[]
  icon: CfIcon
  tone: "emerald" | "gold"
  popular?: boolean
  premium?: boolean
  href: string
  cta: string
  isBasic?: boolean
}

export type PricingTier = Tier

export function buildTiers(t: (k: string) => string): Tier[] {
  const metaLimited: Meta = { label: t("pricing.meta.limited"), variant: "limited" }
  void metaLimited
  const metaDaily: Meta = { label: t("pricing.meta.daily"), variant: "daily" }
  const metaUnlocked: Meta = { label: t("pricing.meta.unlocked"), variant: "daily" }
  const metaBasicTime: Meta = { label: t("pricing.meta.basicLimit"), variant: "time" }
  const metaSmartTime: Meta = { label: t("pricing.meta.smartLimit"), variant: "time" }
  const metaProTime: Meta = { label: t("pricing.meta.proLimit"), variant: "time" }
  const metaDomTime: Meta = { label: t("pricing.meta.domLimit"), variant: "time" }

  const buildFeatures = (
    prefix: string,
    count: number,
    metas: Record<number, Meta>,
    excluded: number[] = [],
    highlightIdx?: number,
    skip: number[] = [],
  ) => {
    const items = Array.from({ length: count }, (_, i) => {
      const idx = i + 1
      if (skip.includes(idx)) return null
      const item: Feature = { label: t(`${prefix}.f${idx}.label`), sub: t(`${prefix}.f${idx}.sub`) }
      if (metas[idx]) item.meta = metas[idx]
      if (excluded.includes(idx)) item.included = false
      if (highlightIdx === idx) item.highlight = true
      return item
    }).filter((it): it is Feature => it !== null)
    if (highlightIdx) {
      const i = items.findIndex((it) => it.highlight)
      if (i > 0) {
        const [hi] = items.splice(i, 1)
        items.unshift(hi)
      }
    }
    return items
  }

  const buildDetails = (prefix: string, count: number, excluded: number[] = [], skip: number[] = []) =>
    Array.from({ length: count }, (_, i) => {
      const idx = i + 1
      if (skip.includes(idx)) return null
      const item: DetailItem = { title: t(`${prefix}.d${idx}.title`), body: t(`${prefix}.d${idx}.body`) }
      if (excluded.includes(idx)) item.included = false
      return item
    }).filter((it): it is DetailItem => it !== null)

  return [
    {
      key: "basic",
      name: t("tier.basic.name"),
      price: "$15",
      suffix: t("pricing.suffix.deposit"),
      description: t("tier.basic.desc"),
      features: buildFeatures("tier.basic", 6, { 2: metaDaily, 6: metaBasicTime }, [], 6, [3, 4]),
      details: buildDetails("tier.basic", 6, [], [3, 4]),
      icon: IconSeed,
      tone: "emerald",
      href: QUOTEX_SIGNUP_URL,
      cta: t("pricing.cta.basic"),
      isBasic: true,
    },
    {
      key: "smart",
      name: t("tier.smart.name"),
      price: "$50",
      suffix: t("pricing.suffix.purchase"),
      description: t("tier.smart.desc"),
      features: buildFeatures("tier.smart", 6, { 1: metaUnlocked, 2: metaDaily, 5: metaSmartTime }, [], 5, [3, 4]),
      details: buildDetails("tier.smart", 6, [], [3, 4]),
      icon: IconFacet,
      tone: "emerald",
      href: "/purchase-smart-account",
      cta: t("pricing.cta.purchase"),
    },
    {
      key: "pro",
      name: t("tier.pro.name"),
      price: "$75",
      suffix: t("pricing.suffix.purchase"),
      description: t("tier.pro.desc"),
      features: buildFeatures("tier.pro", 9, { 1: metaUnlocked, 2: metaDaily, 4: metaProTime }, [], 4, [3]),
      details: buildDetails("tier.pro", 9, [], [3]),
      icon: IconCrown,
      tone: "emerald",
      popular: true,
      href: "/purchase-pro-account",
      cta: t("pricing.cta.purchase"),
    },
    {
      key: "dominator",
      name: t("tier.dom.name"),
      price: "$149",
      suffix: t("pricing.suffix.purchase"),
      description: t("tier.dom.desc"),
      features: buildFeatures("tier.dom", 11, { 1: metaUnlocked, 2: metaDaily, 4: metaDomTime }, [], 4, [3]),
      details: buildDetails("tier.dom", 11, [], [3]),
      icon: IconLaurel,
      tone: "gold",
      premium: true,
      href: "/purchase-dominator-account",
      cta: t("pricing.cta.purchase"),
    },
  ]
}

/* ----------------------------------- section ----------------------------------- */
export function HomePricing() {
  const { t } = useLanguage()
  const tiers = useMemo(() => buildTiers(t), [t])

  return (
    <section id="pricing" className="relative scroll-mt-24 overflow-hidden py-24 sm:py-28 lg:py-36" data-testid="home-pricing">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="cf-haze absolute inset-0" />
        <div className="cf-grid absolute inset-0 opacity-60" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <Eyebrow>{t("pricing.badge")}</Eyebrow>
          <SectionTitle lead={t("pricing.title.1")} accent={t("pricing.title.2")} />
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-white/55 sm:text-[17px]">{t("pricing.subtitle")}</p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 pt-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          {tiers.map((tier) => (
            <PricingCard key={tier.key} tier={tier} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------- marks ----------------------------------- */
function CheckMark({ gold }: { gold?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-[2px] inline-flex size-[18px] shrink-0 items-center justify-center rounded-full",
        gold ? "bg-[#CDFF17] text-[#141517]" : "bg-[#CDFF17]/15 text-[#CDFF17]",
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[11px]">
        <path d="M5.5 12.5l4 4 9-9" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function CrossMark() {
  return (
    <span aria-hidden className="mt-[2px] inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-rose-500/12 text-rose-400">
      <svg viewBox="0 0 24 24" fill="none" className="size-[9px]">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" />
      </svg>
    </span>
  )
}

/* ----------------------------------- card ----------------------------------- */
export function PricingCard({
  tier,
  badge,
  footer,
  current,
}: {
  tier: Tier
  /** Overrides the floating "popular" badge (pass null to hide). */
  badge?: ReactNode
  /** Replaces the default CTA block under the details button. */
  footer?: ReactNode
  /** Highlights the card as the buyer's current plan. */
  current?: boolean
}) {
  const { t } = useLanguage()
  const popular = !!tier.popular
  const premium = !!tier.premium

  const ctaClass = popular ? "cf-btn-volt" : premium ? "cf-btn-white" : "cf-btn-dark"

  const ctaInner = (
    <>
      <span>{tier.cta}</span>
      <IconArrow className="size-4 transition-transform group-hover/cta:translate-x-1" />
    </>
  )
  const ctaBase = "group/cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold"

  const floating =
    badge !== undefined ? (
      badge
    ) : popular ? (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#CDFF17] px-4 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-[#141517] shadow-[0_8px_24px_-6px_rgba(205,255,23,0.7)]">
        <IconCrown className="size-3.5" />
        {t("pricing.popular")}
      </span>
    ) : null

  return (
    <div className="relative flex h-full flex-col" data-testid={`pricing-card-${tier.key}`}>
      {floating && (
        <div className="pointer-events-none absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">{floating}</div>
      )}

      <div
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-[24px] transition-all duration-500 hover:-translate-y-1",
          current ? "cf-card-strong ring-1 ring-emerald-400/40" : popular ? "cf-card-strong" : "cf-card hover:border-[#CDFF17]/25",
        )}
      >
        <div className="relative flex items-center justify-between gap-3 px-6 pt-8">
          <div className="flex items-center gap-3">
            <Emblem icon={tier.icon} size="md" tone={tier.tone} />
            <span className={cn("text-[12px] font-extrabold uppercase tracking-[0.24em]", premium ? "text-white" : "text-white/80")}>{tier.name}</span>
          </div>
        </div>

        <div className="relative px-6 pt-7">
          <span className={cn("cf-display block text-[3rem] leading-none", popular ? "cf-text-volt" : "text-white")}>{tier.price}</span>
          <span className="cf-mono mt-2.5 block text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/40">{tier.suffix}</span>
          <p className="mt-4 text-[13.5px] leading-relaxed text-white/55">{tier.description}</p>
        </div>

        <div className="relative mx-6 mt-6 h-px bg-white/[0.08]" />

        <ul className="relative flex flex-col gap-3.5 px-6 py-6">
          {tier.features.map((f) => {
            const included = f.included !== false
            const hl = included && !!f.highlight
            return (
              <li key={f.label} className="flex items-start gap-3">
                {included ? <CheckMark gold={hl} /> : <CrossMark />}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-[13.5px] font-medium leading-snug",
                      included ? (hl ? "font-bold text-white" : "text-white/90") : "text-white/35 line-through decoration-rose-400/40",
                    )}
                  >
                    {f.label}
                  </span>
                  {(f.sub || f.meta) && (
                    <span className={cn("text-[11.5px] leading-tight", included ? "text-white/42" : "text-white/25")}>
                      {f.sub}
                      {f.sub && f.meta ? <span className="text-white/25"> · </span> : null}
                      {f.meta ? (
                        <span
                          className={cn(
                            "whitespace-nowrap font-semibold uppercase tracking-wider",
                            f.meta.variant === "time"
                              ? "ml-1 rounded-md bg-[#CDFF17]/12 px-1.5 py-px text-[#CDFF17] ring-1 ring-inset ring-[#CDFF17]/35"
                              : "text-[#CDFF17]",
                          )}
                        >
                          {f.meta.label}
                        </span>
                      ) : null}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="relative mt-auto flex flex-col gap-2.5 px-6 pb-7">
          <TierDetailsDialog tier={tier} footer={footer} />
          {footer !== undefined ? (
            footer
          ) : tier.isBasic ? (
            <>
              <a href={tier.href} target="_blank" rel="noopener noreferrer" className={cn(ctaBase, ctaClass)} data-testid={`pricing-cta-${tier.key}`}>
                {ctaInner}
              </a>
              <a
                href={ADMIN_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-semibold text-white/65 transition-colors hover:text-[#CDFF17]"
              >
                <IconPlane className="size-4 text-[#CDFF17]" />
                {t("header.menu.contact")}
              </a>
            </>
          ) : (
            <>
              <Link href={tier.href} className={cn(ctaBase, ctaClass)} data-testid={`pricing-cta-${tier.key}`}>
                {ctaInner}
              </Link>
              <span aria-hidden className="hidden h-11 sm:block" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------- dialog ----------------------------------- */
function TierDetailsDialog({ tier, footer }: { tier: Tier; footer?: ReactNode }) {
  const { t } = useLanguage()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          data-testid={`pricing-details-${tier.key}`}
          className="group/details flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-white/12 px-3.5 py-2.5 text-[12.5px] font-medium text-white/60 transition-all hover:border-[#CDFF17]/45 hover:bg-[#CDFF17]/[0.06] hover:text-[#CDFF17]"
        >
          <span className="inline-flex items-center gap-2">
            <Info className="size-3.5" aria-hidden />
            {t("pricing.viewDetails")}
          </span>
          <ChevronRight className="size-3.5 transition-transform group-hover/details:translate-x-0.5" aria-hidden />
        </button>
      </DialogTrigger>

      <DialogContent className="cf-home cf-card max-h-[88vh] max-w-lg gap-0 overflow-hidden rounded-[24px] p-0 text-white sm:max-w-2xl">
        <DialogHeader className="space-y-3 border-b border-white/[0.06] p-6 pb-5 text-left">
          <div className="flex items-center gap-3">
            <Emblem icon={tier.icon} size="md" tone={tier.tone} />
            <div className="flex flex-col leading-tight">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.24em] text-[#CDFF17]">
                {tier.name} {t("pricing.dialog.plan")}
              </span>
              <DialogTitle className="cf-display mt-1 text-2xl text-white">
                {t("pricing.dialog.titlePrefix")} {tier.name}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-[13.5px] leading-relaxed text-white/60">
            {tier.description} {t("pricing.dialog.subtitle")}
          </DialogDescription>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="cf-display text-[2rem] text-white">{tier.price}</span>
            <span className="cf-mono text-[10.5px] uppercase tracking-[0.16em] text-white/45">{tier.suffix}</span>
          </div>
        </DialogHeader>

        <div className="max-h-[52vh] overflow-y-auto px-6 py-5">
          <ol className="flex flex-col gap-3">
            {tier.details.map((item, idx) => {
              const included = item.included !== false
              return (
                <li key={item.title} className={cn("rounded-2xl border p-4", included ? "border-white/[0.07] bg-white/[0.02]" : "border-rose-500/20 bg-rose-500/5")}>
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "cf-mono inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                        included ? "bg-[#CDFF17]/15 text-[#CDFF17] ring-1 ring-inset ring-[#CDFF17]/30" : "bg-rose-500/15 text-rose-300",
                      )}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h4 className={cn("text-sm font-semibold", included ? "text-white" : "text-white/55")}>{item.title}</h4>
                        {!included && (
                          <span className="rounded-full bg-rose-500/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-rose-300">
                            {t("pricing.notIncluded")}
                          </span>
                        )}
                      </div>
                      <p className={cn("text-[13px] leading-relaxed", included ? "text-white/60" : "text-white/40")}>{item.body}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="border-t border-white/[0.06] p-4 sm:p-5">
          {footer !== undefined ? (
            footer
          ) : tier.isBasic ? (
            <a href={tier.href} target="_blank" rel="noopener noreferrer" className="cf-btn-volt inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold">
              {tier.cta}
              <IconArrow className="size-4" />
            </a>
          ) : (
            <Link href={tier.href} className="cf-btn-volt inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold">
              {tier.cta}
              <IconArrow className="size-4" />
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
