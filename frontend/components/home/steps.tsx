"use client"

import { useLanguage } from "@/components/language-provider"
import { Emblem, Eyebrow, SectionTitle } from "@/components/home/primitives"
import { IconGemKey, IconLayers, IconUnlockChart } from "@/components/home/icons"

export function HomeSteps() {
  const { t } = useLanguage()
  const steps = [
    { icon: IconLayers, title: t("home.steps.1.title"), desc: t("home.steps.1.desc") },
    { icon: IconGemKey, title: t("home.steps.2.title"), desc: t("home.steps.2.desc") },
    { icon: IconUnlockChart, title: t("home.steps.3.title"), desc: t("home.steps.3.desc") },
  ]

  return (
    <section className="relative py-20 sm:py-24 lg:py-28" data-testid="home-steps">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <Eyebrow>{t("home.steps.badge")}</Eyebrow>
          <SectionTitle lead={t("home.steps.title.1")} accent={t("home.steps.title.2")} />
          <p className="max-w-xl text-pretty text-base leading-relaxed text-white/55 sm:text-[17px]">{t("home.steps.subtitle")}</p>
        </div>

        <div className="relative mt-14 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 lg:mt-16">
          <div aria-hidden className="pointer-events-none absolute left-[16%] right-[16%] top-[3.75rem] hidden border-t border-dashed border-[#CDFF17]/25 md:block" />
          {steps.map((s, i) => (
            <div
              key={s.title}
              data-testid={`step-card-${i + 1}`}
              className="cf-card group relative flex flex-col items-center overflow-hidden rounded-[22px] px-6 pb-9 pt-8 text-center transition-all duration-500 hover:-translate-y-1 hover:border-[#CDFF17]/30"
            >
              <span aria-hidden className="cf-headline pointer-events-none absolute -right-2 -top-4 text-[7rem] leading-none text-white/[0.035]">
                0{i + 1}
              </span>
              <Emblem icon={s.icon} size="lg" />
              <span className="cf-mono mt-6 text-[11px] font-bold tracking-[0.28em] text-[#CDFF17]">STEP 0{i + 1}</span>
              <h3 className="mt-2 text-xl font-bold text-white">{s.title}</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
