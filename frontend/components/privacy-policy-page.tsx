"use client"

import { useLanguage } from "@/components/language-provider"
import { HomeHeader } from "@/components/home/home-header"
import { HomeFooter } from "@/components/home/final-cta-footer"
import { PrivacyPolicyContent } from "@/components/privacy-policy-content"

export function PrivacyPolicyPage() {
  const { language } = useLanguage()
  return (
    <div className="cf-home cf-grain relative flex min-h-screen flex-col overflow-x-clip antialiased" data-lang={language} data-testid="privacy-page">
      <HomeHeader />
      <main className="flex flex-1 flex-col">
        <PrivacyPolicyContent />
      </main>
      <HomeFooter />
    </div>
  )
}
