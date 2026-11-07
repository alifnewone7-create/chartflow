"use client"

import { useMemo } from "react"
import { ChevronDown } from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useLanguage } from "@/components/language-provider"
import { ADMIN_TELEGRAM_URL, Emblem, Eyebrow, GhostButton, SectionTitle } from "@/components/home/primitives"
import { IconConcierge, IconPlane } from "@/components/home/icons"

export function HomeFaq() {
  const { t } = useLanguage()
  const faqs = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ q: t(`faq.${i + 1}.q`), a: t(`faq.${i + 1}.a`) })), [t])

  return (
    <section id="faq" className="cf-faq relative scroll-mt-24 py-24 sm:py-28 lg:py-32" data-testid="home-faq">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16">
        <div className="flex flex-col items-start lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
          <Eyebrow>{t("faq.badge")}</Eyebrow>
          <SectionTitle lead={t("faq.title.1")} accent={t("faq.title.2")} className="mt-6" />
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-white/55 sm:text-[17px]">{t("faq.subtitle")}</p>

          <div className="cf-card mt-9 w-full rounded-[22px] p-6">
            <div className="flex items-start gap-4">
              <Emblem icon={IconConcierge} size="md" />
              <div>
                <p className="text-base font-bold text-white">{t("faq.cta.title")}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/55">{t("faq.cta.subtitle")}</p>
              </div>
            </div>
            <GhostButton href={ADMIN_TELEGRAM_URL} external icon={IconPlane} className="mt-5 h-12 w-full" testId="faq-contact-btn">
              {t("faq.cta.button")}
            </GhostButton>
          </div>
        </div>

        <div className="lg:col-span-7">
          <Accordion type="single" collapsible defaultValue="item-0" className="flex w-full flex-col gap-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                data-testid={`faq-item-${i + 1}`}
                className="cf-card overflow-hidden rounded-2xl border-b-0 px-5 transition-colors data-[state=open]:border-[#CDFF17]/30 sm:px-6"
              >
                <AccordionTrigger className="group items-center gap-4 py-5 text-left text-[15px] font-bold text-white hover:no-underline sm:text-base">
                  <span className="transition-colors group-hover:text-[#CDFF17] group-data-[state=open]:text-[#CDFF17]">{f.q}</span>
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[#CDFF17] transition-all duration-300 group-data-[state=open]:rotate-180 group-data-[state=open]:border-[#CDFF17]/50 group-data-[state=open]:bg-[#CDFF17]/12"
                  >
                    <ChevronDown className="size-4" strokeWidth={2.4} />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 pr-2 text-[14px] leading-relaxed text-white/62 sm:text-[15px]">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
