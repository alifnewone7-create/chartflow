"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"
import { Eyebrow, SectionTitle } from "@/components/home/primitives"
import { IconQuote, IconStar } from "@/components/home/icons"

type Tm = { name: string; city: string; flag: string; initials: string; quote: string; result: string; plan: string }

function build(t: (k: string) => string): Tm[] {
  const rows: [string, string, string, string][] = [
    ["1", "dhaka", "RH", "Premium"],
    ["2", "chittagong", "KA", "Premium"],
    ["3", "khulna", "AS", "Standard"],
    ["4", "rajshahi", "SM", "Extreme"],
    ["5", "sylhet", "TR", "Standard"],
    ["6", "barisal", "IH", "Premium"],
  ]
  return rows.map(([n, city, initials, plan]) => ({
    name: t(`tm.${n}.name`),
    city: t(`tm.country.${city}`),
    flag: "bd",
    initials,
    quote: t(`tm.${n}.quote`),
    result: t(`tm.${n}.result`),
    plan,
  }))
}

export function HomeTestimonials() {
  const { t } = useLanguage()
  const items = useMemo(() => build(t), [t])
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" })
  const [selected, setSelected] = useState(0)
  const [snaps, setSnaps] = useState<number[]>([])

  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const startAuto = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => emblaApi?.scrollNext(), 6000)
  }, [emblaApi])

  const prev = useCallback(() => { emblaApi?.scrollPrev(); startAuto() }, [emblaApi, startAuto])
  const next = useCallback(() => { emblaApi?.scrollNext(); startAuto() }, [emblaApi, startAuto])
  const go = useCallback((i: number) => { emblaApi?.scrollTo(i); startAuto() }, [emblaApi, startAuto])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap())
    const onReInit = () => setSnaps(emblaApi.scrollSnapList())
    onReInit()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onReInit)
    onSelect()
    startAuto()
    return () => {
      if (timer.current) clearInterval(timer.current)
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onReInit)
    }
  }, [emblaApi, startAuto])

  const ctrl =
    "inline-flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/75 transition-all hover:border-[#CDFF17]/50 hover:bg-[#CDFF17]/10 hover:text-[#CDFF17]"

  return (
    <section id="reviews" className="relative scroll-mt-24 py-24 sm:py-28 lg:py-32" data-testid="home-testimonials">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <Eyebrow>{t("testimonials.badge")}</Eyebrow>
          <SectionTitle lead={t("testimonials.title.1")} accent={t("testimonials.title.2")} className="max-w-3xl" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 text-[#CDFF17]">
              {Array.from({ length: 5 }).map((_, i) => (
                <IconStar key={i} className="size-4 drop-shadow-[0_0_6px_rgba(205,255,23,0.6)]" />
              ))}
            </div>
            <span className="cf-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">4.9 {t("home.reviews.rating")}</span>
          </div>
          <p className="max-w-xl text-pretty text-base leading-relaxed text-white/55 sm:text-[17px]">{t("testimonials.subtitle")}</p>
        </div>

        <div className="cf-card mt-12 rounded-[26px] p-4 sm:p-6 lg:mt-14 lg:p-8">
          <div className="flex items-center justify-between gap-4 px-1 pb-5">
            <span className="cf-mono text-[10.5px] font-bold uppercase tracking-[0.24em] text-white/45">{t("home.reviews.proof")}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={prev} aria-label={t("testimonials.prev")} className={ctrl} data-testid="reviews-prev">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" onClick={next} aria-label={t("testimonials.next")} className={ctrl} data-testid="reviews-next">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="overflow-hidden" ref={emblaRef} onMouseEnter={() => timer.current && clearInterval(timer.current)} onMouseLeave={startAuto}>
            <div className="-ml-4 flex">
              {items.map((tm) => (
                <div key={tm.name} className="min-w-0 shrink-0 grow-0 basis-full pl-4 sm:basis-1/2 lg:basis-1/3">
                  <Card tm={tm} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            {snaps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                data-testid={`reviews-dot-${i + 1}`}
                aria-label={`${t("testimonials.slide")} ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === selected ? "w-8 bg-[#CDFF17] shadow-[0_0_10px_rgba(205,255,23,0.6)]" : "w-1.5 bg-white/20 hover:bg-white/40",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Card({ tm }: { tm: Tm }) {
  return (
    <figure className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#121316] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[#CDFF17]/30">
      <div className="relative flex items-center justify-between">
        <IconQuote className="h-6 w-8 text-[#CDFF17]/80" />
        <div className="flex items-center gap-0.5 text-[#CDFF17]">
          {Array.from({ length: 5 }).map((_, i) => (
            <IconStar key={i} className="size-3.5" />
          ))}
        </div>
      </div>

      <blockquote className="relative mt-5 flex-1 text-[15px] leading-relaxed text-white/80">{tm.quote}</blockquote>

      <span className="cf-mono relative mt-6 inline-flex w-fit items-center gap-2 rounded-md bg-[#CDFF17] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#141517]">
        {tm.result}
      </span>

      <div className="relative mt-6 h-px bg-white/[0.07]" />

      <figcaption className="relative mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="cf-orb flex size-11 items-center justify-center rounded-full text-[13px] font-bold">{tm.initials}</div>
            <img src={`https://flagcdn.com/w20/${tm.flag}.png`} alt="" width={16} height={16} className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full object-cover ring-2 ring-[#121316]" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-white">{tm.name}</span>
            <span className="mt-0.5 text-[11.5px] text-white/45">{tm.city}</span>
          </div>
        </div>
        <span className="rounded-md border border-[#CDFF17]/35 bg-[#CDFF17]/[0.08] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#CDFF17]">{tm.plan}</span>
      </figcaption>
    </figure>
  )
}
