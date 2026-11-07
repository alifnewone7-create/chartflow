"use client"

import Image from "next/image"
import { BadgeCheck } from "lucide-react"

import { useLanguage } from "@/components/language-provider"
import { Emblem, Eyebrow, SectionTitle } from "@/components/home/primitives"
import { IconPlane, IconQuote } from "@/components/home/icons"

const FOUNDER_IMAGE = "/founder-mushfiq.png"
const FOUNDER_TELEGRAM = "https://t.me/Mushfiq_2615"

export function HomeFounder() {
  const { t } = useLanguage()

  return (
    <section id="founder" className="relative scroll-mt-24 overflow-hidden py-24 sm:py-28 lg:py-32" data-testid="home-founder">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-1/4 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(205,255,23,0.08),transparent_65%)] blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16">
        <div className="mx-auto w-full max-w-[380px] lg:col-span-5 lg:max-w-none">
          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute -inset-8 rounded-[44px] opacity-70 blur-3xl" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(205,255,23,0.18), transparent 70%)" }} />
            <div className="cf-card-strong relative rounded-[28px] p-2.5">
              <div className="relative aspect-square w-full overflow-hidden rounded-[20px]">
                <Image src={FOUNDER_IMAGE} alt={t("founder.imageAlt")} fill sizes="(min-width: 1024px) 480px, 90vw" className="object-cover" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0E0F11]/90 via-transparent to-transparent" />
              </div>
              <div className="absolute inset-x-6 bottom-6 z-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#141517]/85 px-4 py-3 backdrop-blur-md">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#CDFF17]/15 text-[#CDFF17] ring-1 ring-inset ring-[#CDFF17]/35">
                  <BadgeCheck className="size-[18px]" strokeWidth={2} />
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="cf-display text-base text-white">{t("founder.name")}</span>
                  <span className="cf-mono text-[10px] uppercase tracking-[0.2em] text-[#CDFF17]/90">{t("home.founder.verified")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start lg:col-span-7">
          <Eyebrow>{t("founder.badge")}</Eyebrow>
          <SectionTitle lead={t("founder.title.1")} accent={t("founder.title.2")} tone="volt" className="mt-6" />
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-white/55 sm:text-[17px]">{t("founder.subtitle")}</p>

          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#CDFF17]/30 bg-[#CDFF17]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#CDFF17]">
              <span className="size-1.5 rounded-full bg-[#CDFF17]" />
              {t("founder.role")}
            </span>
            <span className="cf-mono text-sm text-[#CDFF17]">{t("founder.handle")}</span>
          </div>

          <div className="mt-6 flex max-w-3xl flex-col gap-4 text-[15px] leading-[1.8] text-white/70 sm:text-base">
            <p className="text-pretty">{t("founder.bio.1")}</p>
            <p className="text-pretty">{t("founder.bio.2")}</p>
          </div>

          <div className="cf-card relative mt-8 w-full overflow-hidden rounded-[22px] p-6">
            <div className="flex items-start gap-4">
              <IconQuote className="mt-1 h-5 w-7 shrink-0 text-[#CDFF17]/80" />
              <div className="flex flex-col gap-1.5">
                <h4 className="cf-display text-lg text-white">{t("founder.dedication.title")}</h4>
                <p className="text-pretty text-[14.5px] leading-relaxed text-white/62" dangerouslySetInnerHTML={{ __html: t("founder.dedication.body") }} />
              </div>
            </div>
          </div>

          <div className="cf-card mt-4 flex w-full flex-col gap-5 rounded-[22px] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Emblem icon={IconPlane} size="md" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.24em] text-[#CDFF17]">{t("home.founder.connect")}</span>
                <span className="text-base font-bold text-white sm:text-lg">{t("home.founder.community")}</span>
                <span className="text-[13px] text-white/55">{t("home.founder.communityDesc")}</span>
              </div>
            </div>
            <a
              href={FOUNDER_TELEGRAM}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="founder-telegram-btn"
              className="cf-btn-volt inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-[14px] font-bold"
            >
              <IconPlane className="size-4" />
              {t("founder.cta.telegram")}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
