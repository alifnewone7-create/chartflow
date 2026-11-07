"use client"

import { CalendarDays, Database, Eye, FileWarning, GitBranch, Lock, MessageCircle, ScrollText, ShieldCheck, UserCog, type LucideIcon } from "lucide-react"

import { useLanguage } from "@/components/language-provider"
import { ADMIN_TELEGRAM_URL, Eyebrow, PrimaryButton } from "@/components/home/primitives"

const SECTIONS: { icon: LucideIcon; key: string }[] = [
  { icon: Database, key: "1" },
  { icon: Eye, key: "2" },
  { icon: Lock, key: "3" },
  { icon: GitBranch, key: "4" },
  { icon: UserCog, key: "5" },
  { icon: FileWarning, key: "6" },
  { icon: ScrollText, key: "7" },
]

function Orb({ icon: Icon, big }: { icon: LucideIcon; big?: boolean }) {
  return (
    <span className={`cf-orb relative inline-flex shrink-0 items-center justify-center rounded-full ${big ? "size-12 sm:size-14" : "size-11"}`}>
      <Icon className={big ? "size-[22px]" : "size-[18px]"} strokeWidth={2} />
    </span>
  )
}

function PrivacyHero() {
  const { t } = useLanguage()
  return (
    <section className="relative isolate overflow-hidden pb-12 pt-[104px] sm:pb-16 sm:pt-28 lg:pt-32" data-testid="privacy-hero">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="cf-haze absolute inset-0" />
        <div className="cf-grid absolute inset-0" />
        <div className="cf-aurora absolute left-1/2 top-[-20%] h-[620px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(205,255,23,0.10),transparent_62%)] blur-3xl" />
      </div>
      <div className="cf-rise cf-d1 mx-auto flex max-w-3xl flex-col items-center gap-6 px-5 text-center sm:px-8">
        <Eyebrow>{t("privacy.badge")}</Eyebrow>
        <h1 className="cf-display text-balance text-[32px] font-bold leading-[1.15] tracking-[-0.02em] text-white sm:text-5xl lg:text-6xl" data-testid="privacy-title">
          {t("privacy.title.1")}{" "}
          <span className="inline-block whitespace-nowrap rounded-xl bg-[#CDFF17]/12 px-2.5 pb-1 text-[#CDFF17] ring-1 ring-[#CDFF17]/30 [text-shadow:0_0_24px_rgba(205,255,23,0.45)] sm:px-4">
            {t("privacy.title.2")}
          </span>
        </h1>
        <p className="max-w-2xl text-pretty text-[15px] leading-relaxed text-white/60 sm:text-base">{t("privacy.subtitle")}</p>
        <span className="cf-mono inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/55" data-testid="privacy-last-updated">
          <CalendarDays className="size-3.5 text-[#CDFF17]" strokeWidth={2.2} />
          <span className="font-bold text-[#CDFF17]">{t("privacy.lastUpdated")}</span>
          {t("privacy.lastUpdated.value")}
        </span>
      </div>
    </section>
  )
}

function LegalCard() {
  const { t } = useLanguage()
  return (
    <article className="cf-card-strong relative overflow-hidden rounded-[22px] p-6 sm:rounded-[28px] sm:p-8 lg:p-10" data-testid="privacy-legal-card">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#CDFF17] to-transparent" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <Orb icon={ShieldCheck} big />
        <div className="flex flex-col gap-3">
          <h2 className="cf-display text-xl font-bold text-white sm:text-2xl">{t("privacy.legal.title")}</h2>
          <p className="text-pretty text-[14.5px] leading-[1.8] text-white/65 sm:text-[15px]">{t("privacy.legal.body")}</p>
        </div>
      </div>
    </article>
  )
}

function SectionCard({ icon, k, idx }: { icon: LucideIcon; k: string; idx: number }) {
  const { t } = useLanguage()
  return (
    <article
      data-testid={`privacy-section-${k}`}
      className="cf-card group relative overflow-hidden rounded-2xl p-5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-[#CDFF17]/30 sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="flex items-center gap-3 sm:flex-col sm:items-start">
          <Orb icon={icon} />
          <span className="cf-mono text-[12px] font-bold tracking-[0.18em] text-[#CDFF17]/70">{String(idx + 1).padStart(2, "0")}</span>
        </div>
        <div className="flex flex-col gap-2.5">
          <h3 className="cf-display text-lg font-bold text-white sm:text-xl">{t(`privacy.section.${k}.title`)}</h3>
          <p className="text-pretty text-[14.5px] leading-[1.8] text-white/60 [font-variant-ligatures:none] [font-feature-settings:'calt'_0] sm:text-[15px]">{t(`privacy.section.${k}.body`)}</p>
        </div>
      </div>
    </article>
  )
}

function ContactCard() {
  const { t } = useLanguage()
  return (
    <div className="cf-card-strong flex flex-col items-start justify-between gap-5 rounded-[22px] p-6 sm:flex-row sm:items-center sm:p-8" data-testid="privacy-contact-card">
      <div className="flex flex-col gap-1.5">
        <h3 className="cf-display text-lg font-bold text-white sm:text-xl">{t("privacy.contact.title")}</h3>
        <p className="text-[14px] text-white/60 sm:text-[15px]">{t("privacy.contact.body")}</p>
      </div>
      <PrimaryButton href={ADMIN_TELEGRAM_URL} external icon={MessageCircle} arrow={false} testId="privacy-contact-btn" className="w-full sm:w-auto">
        {t("privacy.contact.cta")}
      </PrimaryButton>
    </div>
  )
}

export function PrivacyPolicyContent() {
  return (
    <>
      <PrivacyHero />
      <section className="relative pb-24 sm:pb-28 lg:pb-32">
        <div className="cf-rise cf-d2 mx-auto flex max-w-4xl flex-col gap-4 px-5 sm:gap-5 sm:px-8">
          <LegalCard />
          <div className="mt-6 flex flex-col gap-4 sm:mt-8 sm:gap-5">
            {SECTIONS.map((s, i) => <SectionCard key={s.key} icon={s.icon} k={s.key} idx={i} />)}
          </div>
          <div className="mt-6 sm:mt-8"><ContactCard /></div>
        </div>
      </section>
    </>
  )
}
