"use client"

import type { ReactNode } from "react"

import { useLanguage } from "@/components/language-provider"
import { HomeHeader } from "@/components/home/home-header"
import { HomeFooter } from "@/components/home/final-cta-footer"
import { AuthCard, type AuthMode } from "@/components/auth/auth-card"

export function AuthPage({ mode, children }: { mode: AuthMode | "reset"; children?: ReactNode }) {
  const { language } = useLanguage()
  return (
    <div className="cf-home cf-grain relative flex min-h-screen flex-col overflow-x-clip antialiased" data-lang={language} data-testid={`${mode}-page`}>
      <HomeHeader />
      <main className="relative isolate flex flex-1 overflow-hidden items-center justify-center px-5 pb-20 pt-32 sm:px-8 sm:pt-36">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="cf-haze absolute inset-0" />
          <div className="cf-grid absolute inset-0" />
          <div className="cf-aurora absolute left-1/2 top-[-10%] h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(205,255,23,0.10),transparent_62%)] blur-3xl" />
        </div>
        {children ?? <AuthCard mode={mode as AuthMode} />}
      </main>
      <HomeFooter />
    </div>
  )
}
