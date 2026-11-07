"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

type Testimonial = {
  name: string
  country: string
  flag: string
  initials: string
  rating: number
  quote: string
  result: string
  plan: "Standard" | "Premium" | "Extreme"
}

function buildTestimonials(t: (k: string) => string): Testimonial[] {
  return [
    {
      name: t("tm.1.name"),
      country: t("tm.country.dhaka"),
      flag: "bd",
      initials: "RH",
      rating: 5,
      quote: t("tm.1.quote"),
      result: t("tm.1.result"),
      plan: "Premium",
    },
    {
      name: t("tm.2.name"),
      country: t("tm.country.chittagong"),
      flag: "bd",
      initials: "KA",
      rating: 5,
      quote: t("tm.2.quote"),
      result: t("tm.2.result"),
      plan: "Premium",
    },
    {
      name: t("tm.3.name"),
      country: t("tm.country.khulna"),
      flag: "bd",
      initials: "AS",
      rating: 5,
      quote: t("tm.3.quote"),
      result: t("tm.3.result"),
      plan: "Standard",
    },
    {
      name: t("tm.4.name"),
      country: t("tm.country.rajshahi"),
      flag: "bd",
      initials: "SM",
      rating: 5,
      quote: t("tm.4.quote"),
      result: t("tm.4.result"),
      plan: "Extreme",
    },
    {
      name: t("tm.5.name"),
      country: t("tm.country.sylhet"),
      flag: "bd",
      initials: "TR",
      rating: 5,
      quote: t("tm.5.quote"),
      result: t("tm.5.result"),
      plan: "Standard",
    },
    {
      name: t("tm.6.name"),
      country: t("tm.country.barisal"),
      flag: "bd",
      initials: "IH",
      rating: 5,
      quote: t("tm.6.quote"),
      result: t("tm.6.result"),
      plan: "Premium",
    },
  ]
}

export function Testimonials() {
  const { t } = useLanguage()
  const testimonials = useMemo(() => buildTestimonials(t), [t])

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    skipSnaps: false,
  })

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi])

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    setScrollSnaps(emblaApi.scrollSnapList())
    emblaApi.on("select", onSelect)
    onSelect()

    // autoplay every 5s
    const autoplay = setInterval(() => emblaApi.scrollNext(), 5500)
    return () => {
      clearInterval(autoplay)
      emblaApi.off("select", onSelect)
    }
  }, [emblaApi])

  return (
    <section className="relative overflow-hidden py-20 sm:py-24 lg:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(27,120,146,0.28), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#1B7892]/40 bg-[#03161B]/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#5BC0D8] backdrop-blur-sm">
            {t("testimonials.badge")}
          </span>
          <h2 className="font-display max-w-3xl text-balance text-3xl leading-[1.2] tracking-wide sm:text-4xl lg:text-5xl">
            <span className="text-[#E8F4F7]">{t("testimonials.title.1")}</span>{" "}
            <span className="font-serif italic font-medium bg-gradient-to-r from-[#1B7892] via-[#5BC0D8] to-[#1B7892] bg-clip-text text-transparent">
              {t("testimonials.title.2")}
            </span>
          </h2>
          <p className="max-w-2xl text-pretty font-serif text-lg italic text-[#E8F4F7]/70 sm:text-xl">
            {t("testimonials.subtitle")}
          </p>
        </div>

        {/* carousel */}
        <div className="relative mt-12">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {testimonials.map((tm) => (
                <div
                  key={tm.name}
                  className="min-w-0 shrink-0 grow-0 basis-full px-2 sm:basis-1/2 lg:basis-1/3"
                >
                  <TestimonialCard tm={tm} />
                </div>
              ))}
            </div>
          </div>

          {/* controls */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={scrollPrev}
              aria-label={t("testimonials.prev")}
              className="inline-flex size-10 items-center justify-center rounded-full border border-[#1B7892]/40 bg-[#03161B]/70 text-[#E8F4F7]/80 transition-all hover:border-[#5BC0D8]/60 hover:bg-[#1B7892]/20 hover:text-[#5BC0D8]"
            >
              <ChevronLeft className="size-4" />
            </button>

            <div className="flex items-center gap-2">
              {scrollSnaps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollTo(idx)}
                  aria-label={`${t("testimonials.slide")} ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === selectedIndex
                      ? "w-6 bg-[#5BC0D8]"
                      : "w-1.5 bg-[#E8F4F7]/25 hover:bg-[#E8F4F7]/50"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={scrollNext}
              aria-label={t("testimonials.next")}
              className="inline-flex size-10 items-center justify-center rounded-full border border-[#1B7892]/40 bg-[#03161B]/70 text-[#E8F4F7]/80 transition-all hover:border-[#5BC0D8]/60 hover:bg-[#1B7892]/20 hover:text-[#5BC0D8]"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function TestimonialCard({ tm }: { tm: Testimonial }) {
  return (
    <div className="group relative flex h-full flex-col gap-5 overflow-hidden rounded-2xl border border-[#1B7892]/25 bg-gradient-to-b from-[#03161B]/85 to-[#082935]/55 p-6 shadow-lg shadow-black/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#5BC0D8]/45">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(91,192,216,0.18), transparent 70%)",
        }}
      />

      <div className="relative flex items-center justify-between gap-3">
        {/* avatar + name */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-[#1B7892] to-[#5BC0D8] text-sm font-semibold text-[#03161B] shadow-md ring-2 ring-[#03161B]">
              {tm.initials}
            </div>
            <img
              src={`https://flagcdn.com/w20/${tm.flag}.png`}
              alt=""
              width={16}
              height={16}
              className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full object-cover ring-2 ring-[#03161B]"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-[#E8F4F7]">{tm.name}</span>
            <span className="mt-0.5 text-[11px] text-[#E8F4F7]/55">{tm.country}</span>
          </div>
        </div>

        <span className="rounded-md border border-[#1B7892]/35 bg-[#1B7892]/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#5BC0D8]">
          {tm.plan}
        </span>
      </div>

      {/* stars */}
      <div className="relative flex items-center gap-0.5">
        {Array.from({ length: tm.rating }).map((_, i) => (
          <Star key={i} className="size-3.5 fill-[#FEBC2E] text-[#FEBC2E]" />
        ))}
      </div>

      {/* quote */}
      <div className="relative flex-1">
        <Quote
          aria-hidden
          className="absolute -left-1 -top-1 size-6 text-[#1B7892]/30"
        />
        <p className="relative pl-5 text-[13.5px] leading-relaxed text-[#E8F4F7]/80">
          {tm.quote}
        </p>
      </div>

      {/* result chip */}
      <div className="relative mt-auto inline-flex w-fit items-center gap-1.5 rounded-md border border-[#28C840]/40 bg-[#28C840]/8 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#28C840]">
        {tm.result}
      </div>
    </div>
  )
}
