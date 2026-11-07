"use client"

import { CalendarClock, Clock, Crown, Send, Target, type LucideIcon } from "lucide-react"

import { useLanguage } from "@/components/language-provider"
import { LiveSignalIcon } from "@/components/icons/live-signal-icon"
import { cn } from "@/lib/utils"
import { Eyebrow, SectionTitle } from "@/components/home/primitives"

type Visual = "live" | "future" | "telegram" | "pairs" | "vip" | "meter"
const ITEMS: { n: string; icon: LucideIcon; visual: Visual }[] = [
  { n: "1", icon: LiveSignalIcon as unknown as LucideIcon, visual: "live" },
  { n: "2", icon: CalendarClock, visual: "future" },
  { n: "3", icon: Send, visual: "telegram" },
  { n: "4", icon: Clock, visual: "pairs" },
  { n: "5", icon: Crown, visual: "vip" },
  { n: "6", icon: Target, visual: "meter" },
]

const VISUALS: Record<Visual, () => React.JSX.Element> = {
  live: LiveVisual,
  future: FutureVisual,
  telegram: TelegramVisual,
  pairs: PairsVisual,
  vip: VipVisual,
  meter: MeterVisual,
}

export function HomeFeatures() {
  const { t } = useLanguage()
  return (
    <section id="features" className="relative scroll-mt-24 overflow-hidden py-24 sm:py-28 lg:py-32" data-testid="home-features">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(205,255,23,0.07),transparent_65%)] blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(205,255,23,0.05),transparent_65%)] blur-3xl" />
      </div>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <Eyebrow>{t("feature.badge")}</Eyebrow>
          <SectionTitle lead={t("why.title.1")} accent={t("why.title.2")} tone="volt" className="max-w-3xl" />
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-white/55 sm:text-[17px]">{t("why.subtitle")}</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-5">
          {ITEMS.map((it) => <FeatureCard key={it.n} n={it.n} icon={it.icon} visual={it.visual} />)}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ n, icon: Icon, visual }: { n: string; icon: LucideIcon; visual: Visual }) {
  const { t } = useLanguage()
  const V = VISUALS[visual]
  return (
    <article
      data-testid={`feature-card-${n}`}
      className="cf-card group relative flex flex-col overflow-hidden rounded-[22px] p-5 transition-[transform,border-color] duration-500 hover:-translate-y-1 hover:border-[#CDFF17]/35 sm:p-6 lg:p-7"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CDFF17]/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <span className="cf-orb relative inline-flex size-11 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-[19px]" strokeWidth={2.2} />
      </span>
      <h3 className="mt-5 text-lg font-bold leading-snug text-white sm:text-xl">{t(`why.${n}.title`)}</h3>
      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-white/55">{t(`why.${n}.desc`)}</p>
      <div className="mt-5">
        <V />
      </div>
    </article>
  )
}

function WinBadge() {
  const { t } = useLanguage()
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#CDFF17] px-2 py-0.5 text-[10.5px] font-bold uppercase text-[#141517]">
      {t("why.result.win")} ✓
    </span>
  )
}

const ROW = "flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0E0F11]/80 px-3 py-2.5"

function LiveVisual() {
  return (
    <div className={ROW} data-testid="feature-live-visual">
      <span className="cf-pulse size-2 shrink-0 rounded-full bg-[#CDFF17] shadow-[0_0_8px_#CDFF17]" />
      <span className="text-[12px] font-bold text-white">USD/BRL<span className="ml-1 text-[#CDFF17]">OTC</span></span>
      <span className="text-[12px] font-semibold text-[#CDFF17]">CALL ↑</span>
      <span className="ml-auto"><WinBadge /></span>
    </div>
  )
}

function FutureVisual() {
  const rows = [
    { time: "14:05", pair: "GBP/JPY", dir: "CALL ↑" },
    { time: "14:12", pair: "AUD/CAD", dir: "PUT ↓" },
  ]
  return (
    <div className="flex flex-col gap-2" data-testid="feature-future-visual">
      {rows.map((r) => (
        <div key={r.time} className={cn(ROW, "py-2 text-[12px]")}>
          <span className="text-white/45">{r.time}</span>
          <span className="font-bold text-white/85">{r.pair}</span>
          <span className="font-semibold text-[#CDFF17]">{r.dir}</span>
          <span className="ml-auto"><WinBadge /></span>
        </div>
      ))}
    </div>
  )
}

function TelegramVisual() {
  return (
    <div className={ROW} data-testid="feature-telegram-visual">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#229ED9] text-white">
        <Send className="size-4" strokeWidth={2.4} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[12.5px] font-bold text-white">ChartFlow Ai Bot</span>
        <span className="flex gap-1.5 truncate text-[11px] text-white/45"><span>EUR/USD</span><span>OTC</span><span>·</span><span>PUT ↓</span><span>·</span><span>1M</span></span>
      </div>
      <WinBadge />
    </div>
  )
}

function PairsVisual() {
  const { t } = useLanguage()
  const pairs = ["EUR/USD", "GBP/JPY", "USD/BRL", "AUD/CAD", t("why.4.all")]
  return (
    <div className="flex flex-wrap gap-2" data-testid="feature-pairs-visual">
      {pairs.map((p, i) => (
        <span key={p} className={cn("rounded-lg border px-2.5 py-1 text-[11px] font-semibold", i === pairs.length - 1 ? "border-[#CDFF17]/40 bg-[#CDFF17]/10 text-[#CDFF17]" : "border-white/10 bg-white/[0.03] text-white/65")}>
          {p}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#CDFF17]/40 bg-[#CDFF17]/10 px-2.5 py-1 text-[11px] font-bold text-[#CDFF17]">
        <span className="cf-pulse size-1.5 rounded-full bg-[#CDFF17] shadow-[0_0_8px_#CDFF17]" /> 24/7
      </span>
    </div>
  )
}

function VipVisual() {
  const { t } = useLanguage()
  return (
    <div className={ROW} data-testid="feature-vip-visual">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#CDFF17] text-[#141517]">
        <Crown className="size-4" strokeWidth={2.4} />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-[12.5px] font-bold text-white">{t("why.5.admin")}</span>
        <span className="text-[11px] text-white/45">{t("why.5.status")}</span>
      </div>
      <span className="ml-auto size-2 rounded-full bg-[#CDFF17] shadow-[0_0_8px_#CDFF17]" />
    </div>
  )
}

function MeterVisual() {
  const { t } = useLanguage()
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0E0F11]/80 px-3.5 py-3" data-testid="feature-meter-visual">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-white/55">{t("why.6.meter")}</span>
        <span className="text-xl font-bold leading-none text-[#CDFF17]">94%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-[#9BCB0A] to-[#CDFF17] shadow-[0_0_14px_rgba(205,255,23,0.6)]" />
      </div>
    </div>
  )
}
