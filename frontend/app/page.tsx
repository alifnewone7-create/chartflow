"use client"

/* =========================================================================
   HOME PAGE — ChartFlow Ai
   "Volt" theme — charcoal base with electric-lime accents.
   All home styles are scoped under `.cf-home` (see globals.css) so other
   pages keep their current look.
   ========================================================================= */

import { useLanguage } from "@/components/language-provider"
import { HomeHeader } from "@/components/home/home-header"
import { HomeHero } from "@/components/home/hero"
import { HomeTicker } from "@/components/home/ticker"
import { HomeFeatures } from "@/components/home/features"
import { HomeSteps } from "@/components/home/steps"
import { HomePricing } from "@/components/home/pricing"
import { HomeTestimonials } from "@/components/home/testimonials"
import { HomeFounder } from "@/components/home/founder"
import { HomeFaq } from "@/components/home/faq"
import { HomeFinalCta, HomeFooter } from "@/components/home/final-cta-footer"

export default function HomePage() {
  const { language } = useLanguage()
  return (
    <div className="cf-home cf-grain relative flex min-h-screen flex-col overflow-x-clip antialiased" data-lang={language} data-testid="home-page">
      <HomeHeader />
      <main className="flex flex-col">
        <HomeHero />
        <HomeTicker />
        <HomeFeatures />
        <HomeSteps />
        <HomePricing />
        <HomeTestimonials />
        <HomeFounder />
        <HomeFaq />
        <HomeFinalCta />
      </main>
      <HomeFooter />
    </div>
  )
}
