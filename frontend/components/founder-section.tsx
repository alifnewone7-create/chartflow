"use client"

import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, MessageCircle, Quote } from "lucide-react"

import { useLanguage } from "@/components/language-provider"

/* =========================================================================
   FOUNDER SECTION
   Sits between PricingSection and FaqSection.
   - Two-column layout on lg+, stacked on mobile / tablet.
   - Image gets a teal-ringed frame with a soft halo so the bold red/orange
     mascot complements the site's onyx/teal palette instead of clashing.
   ========================================================================= */

const FOUNDER_IMAGE = "/founder-mushfiq.png"

export function FounderSection() {
  const { t } = useLanguage()

  return (
    <section
      id="founder"
      aria-labelledby="founder-title"
      className="relative overflow-hidden pt-20 pb-16 sm:pt-24 sm:pb-20 lg:pt-32 lg:pb-20"
    >
      {/* Background — soft teal washes that match the rest of the site */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 20% 30%, rgba(27,120,146,0.22), transparent), radial-gradient(ellipse 60% 40% at 85% 70%, rgba(91,192,216,0.16), transparent)",
        }}
      />

      {/* Subtle teal grid overlay to echo the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(91,192,216,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(91,192,216,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 lg:max-w-none lg:px-12 xl:px-16 2xl:px-24">
        {/* Section header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#1B7892]/50 bg-[#1B7892]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#5BC0D8] backdrop-blur-sm">
            <BadgeCheck className="size-3.5" aria-hidden strokeWidth={2.5} />
            {t("founder.badge")}
          </span>

          <h2
            id="founder-title"
            className="font-display max-w-3xl text-balance text-3xl leading-[1.2] tracking-wide sm:text-4xl lg:text-5xl"
          >
            <span className="text-[#E8F4F7]">{t("founder.title.1")}</span>{" "}
            <span className="font-serif italic font-medium bg-gradient-to-r from-[#5BC0D8] via-[#1B7892] to-[#5BC0D8] bg-clip-text text-transparent">
              {t("founder.title.2")}
            </span>
          </h2>

          <p className="max-w-2xl text-pretty font-serif text-lg italic text-[#E8F4F7]/70 sm:text-xl">
            {t("founder.subtitle")}
          </p>
        </div>

        {/* Founder card */}
        <div className="mt-14 sm:mt-16 lg:mt-20">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[340px_minmax(0,_1fr)] lg:gap-16 xl:grid-cols-[380px_minmax(0,_1fr)]">
            {/* LEFT — portrait frame (sticky on desktop for a polished, editorial feel) */}
            <div className="lg:sticky lg:top-28">
              <FounderPortrait alt={t("founder.imageAlt")} name={t("founder.name")} />
            </div>

            {/*
              RIGHT — editorial profile column.
              The column itself spans the full available width so the
              dedication & connect cards stretch edge-to-edge on desktop
              like they do on mobile. Only the bio paragraphs are capped
              to a comfortable reading measure further down.
            */}
            <div className="flex flex-col gap-8">
              {/* Identity block */}
              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#5BC0D8]/30 bg-[#5BC0D8]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5BC0D8]">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#5BC0D8] opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-[#5BC0D8]" />
                  </span>
                  {t("founder.role")}
                </div>

                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h3 className="font-display text-3xl tracking-wide text-[#E8F4F7] sm:text-4xl lg:text-[40px]">
                    {t("founder.name")}
                  </h3>
                  <span className="font-mono text-sm text-[#5BC0D8]/85">
                    {t("founder.handle")}
                  </span>
                </div>
              </div>

              {/* Bio paragraphs — comfortable reading measure (cap stays
                  here so only the prose is constrained, not the cards) */}
              <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-[#E8F4F7]/80 sm:text-base lg:max-w-3xl lg:text-[16.5px] lg:leading-[1.75]">
                <p className="text-pretty">{t("founder.bio.1")}</p>
                <p className="text-pretty">{t("founder.bio.2")}</p>
              </div>

              {/* Dedication callout */}
              <div className="relative overflow-hidden rounded-2xl border border-[#1B7892]/35 bg-[#03161B]/60 p-5 backdrop-blur-sm sm:p-6 lg:p-7">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5BC0D8]/55 to-transparent"
                />
                <div className="flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1B7892]/25 text-[#5BC0D8] ring-1 ring-inset ring-[#5BC0D8]/30 lg:size-11">
                    <Quote className="size-4 lg:size-[18px]" aria-hidden strokeWidth={2.5} />
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h4 className="font-display text-base tracking-wide text-[#E8F4F7] sm:text-lg">
                      {t("founder.dedication.title")}
                    </h4>
                    <p
                      className="text-pretty font-serif text-[15px] italic leading-relaxed text-[#E8F4F7]/75 sm:text-[15.5px]"
                      // dedication body contains an HTML-encoded apostrophe
                      dangerouslySetInnerHTML={{ __html: t("founder.dedication.body") }}
                    />
                  </div>
                </div>
              </div>

              {/*
                Connect row — a deliberate footer panel that pairs a label
                with the community CTA on desktop, so the button never floats
                alone. On mobile it stacks; on sm+ it becomes a clean row
                with the label on the left and the button on the right.
              */}
              <div className="relative mt-1 flex flex-col gap-4 rounded-2xl border border-[#1B7892]/30 bg-[#03161B]/40 p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[#5BC0D8]/80">
                    Connect
                  </span>
                  <span className="font-display text-lg tracking-wide text-[#E8F4F7] sm:text-xl">
                    Join 50,000+ traders
                  </span>
                  <span className="text-[13.5px] text-[#E8F4F7]/65">
                    Live signals, market reads & strategy drops on Telegram.
                  </span>
                </div>

                <Link
                  href="https://t.me/Mushfiq_2615"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-12 w-full shrink-0 items-center justify-center gap-2.5 rounded-xl border border-[#1B7892]/55 bg-[#03161B]/70 px-6 font-medium text-[#E8F4F7] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#5BC0D8]/70 hover:bg-[#0A2530]/85 hover:shadow-[0_10px_28px_-10px_rgba(91,192,216,0.55)] active:translate-y-0 sm:w-auto"
                >
                  {/*
                    Animated icon — wrapper hosts a continuously pinging
                    halo behind the message-circle, plus a wiggle on the
                    icon itself, both gated by motion-safe.
                  */}
                  <span className="relative flex size-4 items-center justify-center">
                    <span
                      aria-hidden
                      className="absolute inline-flex size-full animate-ping rounded-full bg-[#5BC0D8]/55"
                    />
                    <MessageCircle
                      className="relative size-4 shrink-0 text-[#5BC0D8] transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110 motion-safe:animate-[wiggle_2.4s_ease-in-out_infinite]"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  </span>
                  <span className="text-[14.5px] transition-colors group-hover:text-[#5BC0D8] sm:text-[15px]">
                    {t("founder.cta.telegram")}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Portrait frame — teal ring + soft halo + signature plaque                 */
/* -------------------------------------------------------------------------- */
function FounderPortrait({ alt, name }: { alt: string; name: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[280px] sm:max-w-xs lg:mx-0 lg:max-w-none">
      {/* Soft outer halo — picks up the image's warm tones at low opacity */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[32px] blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(91,192,216,0.30), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 rounded-[40px] opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 80%, rgba(255,86,52,0.18), transparent 70%)",
        }}
      />

      {/* Frame */}
      <div className="relative overflow-hidden rounded-[28px] border border-[#1B7892]/45 bg-[#03161B]/60 p-2 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm sm:p-2.5">
        {/* Inner gradient ring */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[28px]"
          style={{
            background:
              "linear-gradient(135deg, rgba(91,192,216,0.18) 0%, transparent 35%, transparent 65%, rgba(91,192,216,0.18) 100%)",
          }}
        />

        {/* Top corner accents */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-4 top-4 size-5 rounded-tl-md border-l border-t border-[#5BC0D8]/60"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-4 top-4 size-5 rounded-tr-md border-r border-t border-[#5BC0D8]/60"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-4 left-4 size-5 rounded-bl-md border-b border-l border-[#5BC0D8]/60"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-4 right-4 size-5 rounded-br-md border-b border-r border-[#5BC0D8]/60"
        />

        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-[22px]">
          <Image
            src={FOUNDER_IMAGE}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 480px, (min-width: 640px) 480px, 100vw"
            priority={false}
            className="object-cover"
          />
          {/* Subtle teal vignette on top */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 60%, rgba(3,22,27,0.45) 100%)",
            }}
          />
        </div>

        {/* Signature plaque pinned at bottom-left of the image */}
        <div className="pointer-events-none absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-6 sm:right-6">
          <div className="inline-flex items-center gap-2.5 rounded-xl border border-[#5BC0D8]/35 bg-[#03161B]/85 px-3 py-2 backdrop-blur-md sm:gap-3 sm:px-3.5 sm:py-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#5BC0D8]/15 text-[#5BC0D8] ring-1 ring-inset ring-[#5BC0D8]/35 sm:size-8">
              <BadgeCheck className="size-4" aria-hidden strokeWidth={2.5} />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-[13px] tracking-wide text-[#E8F4F7] sm:text-sm">
                {name}
              </span>
              <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-[#5BC0D8]/85 sm:text-[11px]">
                Verified Founder
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

