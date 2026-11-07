"use client"

import { Power } from "lucide-react"
import { LockedOtcChart } from "@/components/locked-otc-chart"
import { ChartFlowMark } from "@/components/brand/chartflow-logo"
import { useLanguage } from "@/components/language-provider"
import { GhostButton, PrimaryButton } from "@/components/home/primitives"

export function HomeHero() {
  const { t } = useLanguage()

  return (
    <section className="relative isolate overflow-hidden pt-[104px] sm:pt-28 lg:pt-32" data-testid="home-hero">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="cf-haze absolute inset-0" />
        <div className="cf-grid absolute inset-0" />
        <div className="cf-aurora absolute left-1/2 top-[-20%] h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(205,255,23,0.10),transparent_62%)] blur-3xl" />
      </div>

      {/* Live chart terminal */}
      <div className="cf-rise cf-d2 relative mx-auto max-w-7xl px-5 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-40 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(205,255,23,0.22), transparent 70%)" }}
        />
        <h1
          data-testid="hero-chart-headline"
          className="cf-display relative mx-auto mb-7 max-w-4xl text-center text-[32px] font-bold leading-[1.15] tracking-[-0.02em] text-white sm:mb-10 sm:text-5xl lg:text-6xl"
        >
          {t("home.hero.headline.pre")}
          <span className="relative mt-1 inline-block whitespace-nowrap rounded-xl bg-[#CDFF17]/12 px-2.5 pb-1 text-[#CDFF17] [text-shadow:0_0_24px_rgba(205,255,23,0.45)] ring-1 ring-[#CDFF17]/30 sm:px-4">
            {t("home.hero.headline.hl")}
          </span>
          {t("home.hero.headline.post")}
        </h1>
        <div className="cf-card-strong relative overflow-hidden rounded-[18px] sm:rounded-[28px]" data-testid="hero-chart-card">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex shrink-0 items-center">
                <img src="https://flagcdn.com/w80/us.png" alt="United States flag" width={32} height={32} className="size-8 rounded-full object-cover ring-2 ring-[#141517]" />
                <img src="https://flagcdn.com/w80/br.png" alt="Brazil flag" width={32} height={32} className="-ml-2.5 size-8 rounded-full object-cover ring-2 ring-[#141517]" />
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="cf-display text-sm text-white sm:text-[15px]">
                  {t("hero.chart.pair")} <span className="text-[#CDFF17]">{t("hero.chart.otc")}</span>
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="cf-mono hidden rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/60 sm:inline-flex">1M</span>
              <span className="cf-mono inline-flex items-center gap-1.5 rounded-lg border border-[#CDFF17]/35 bg-[#CDFF17]/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#CDFF17]">
                <span className="cf-pulse size-1.5 rounded-full bg-[#CDFF17] shadow-[0_0_8px_#CDFF17]" />
                {t("hero.chart.live")}
              </span>
            </div>
          </div>

          <div className="h-[200px] w-full bg-[#0E0F11] sm:h-[360px] lg:h-[460px]">
            <LockedOtcChart />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3 sm:px-6">
            <span className="cf-mono min-w-0 truncate text-[10.5px] uppercase tracking-[0.14em] text-white/40">{t("home.chart.footer")}</span>
            <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-white/55">
              <ChartFlowMark className="size-4" />
              ChartFlow Ai
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl justify-center px-5 pb-20 sm:mt-10 sm:px-8 lg:pb-28">
        <div className="cf-rise cf-d4 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <PrimaryButton href="/login" testId="hero-activate-btn" icon={Power} arrow={false} className="w-full sm:min-w-[260px]">
            {t("hero.cta.activeChartflow")}
          </PrimaryButton>
          <GhostButton href="#features" testId="hero-features-btn" className="w-full sm:w-auto" arrow>
            {t("hero.cta.features")}
          </GhostButton>
        </div>
      </div>
    </section>
  )
}
