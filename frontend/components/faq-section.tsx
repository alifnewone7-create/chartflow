"use client"

import { useMemo } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { HelpCircle, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"

const ADMIN_TELEGRAM_URL = "https://t.me/Mushfiq2615"

function buildFaqs(t: (k: string) => string) {
  return Array.from({ length: 7 }, (_, i) => ({
    q: t(`faq.${i + 1}.q`),
    a: t(`faq.${i + 1}.a`),
  }))
}

export function FaqSection() {
  const { t } = useLanguage()
  const faqs = useMemo(() => buildFaqs(t), [t])

  return (
    <section className="relative overflow-hidden py-20 sm:py-24 lg:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 35% at 50% 100%, rgba(27,120,146,0.25), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#1B7892]/40 bg-[#03161B]/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#5BC0D8] backdrop-blur-sm">
            <HelpCircle className="size-3" />
            {t("faq.badge")}
          </span>
          <h2 className="font-display max-w-3xl text-balance text-3xl leading-[1.2] tracking-wide sm:text-4xl lg:text-5xl">
            <span className="text-[#E8F4F7]">{t("faq.title.1")}</span>{" "}
            <span className="font-serif italic font-medium bg-gradient-to-r from-[#1B7892] via-[#5BC0D8] to-[#1B7892] bg-clip-text text-transparent">
              {t("faq.title.2")}
            </span>
          </h2>
          <p className="max-w-2xl text-pretty font-serif text-lg italic text-[#E8F4F7]/70 sm:text-xl">
            {t("faq.subtitle")}
          </p>
        </div>

        {/* accordion */}
        <div className="mt-12 rounded-2xl border border-[#1B7892]/25 bg-[#03161B]/70 p-2 shadow-lg shadow-black/30 backdrop-blur-sm sm:p-3">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, idx) => (
              <AccordionItem
                key={idx}
                value={`item-${idx}`}
                className="border-b border-[#1B7892]/15 last:border-b-0"
              >
                <AccordionTrigger className="px-3 py-4 text-left text-[15px] font-medium text-[#E8F4F7] hover:text-[#5BC0D8] hover:no-underline sm:px-4 sm:text-base [&[data-state=open]]:text-[#5BC0D8] [&>svg]:text-[#5BC0D8]">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-4 text-[13.5px] leading-relaxed text-[#E8F4F7]/70 sm:px-4 sm:text-sm">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* still have questions cta */}
        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4 rounded-2xl border border-[#1B7892]/25 bg-gradient-to-br from-[#03161B]/85 to-[#082935]/60 px-6 py-7 text-center backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:text-left">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#1B7892]/40 bg-[#1B7892]/15 text-[#5BC0D8]">
              <MessageCircle className="size-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-[#E8F4F7]">
                {t("faq.cta.title")}
              </p>
              <p className="mt-1 text-sm text-[#E8F4F7]/65">
                {t("faq.cta.subtitle")}
              </p>
            </div>
          </div>

          <Button
            asChild
            className="h-11 shrink-0 gap-2 rounded-xl bg-[#1B7892] px-6 text-sm font-semibold text-white shadow-md shadow-[#1B7892]/30 transition-all hover:bg-[#2A9DBA] hover:shadow-[#5BC0D8]/40"
          >
            <Link href={ADMIN_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
              {t("faq.cta.button")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
