"use client"

import Link from "next/link"
import { Check } from "lucide-react"

import { ChartFlowLogo } from "@/components/brand/chartflow-logo"
import { useLanguage } from "@/components/language-provider"
import { ADMIN_TELEGRAM_URL, GhostButton, PrimaryButton } from "@/components/home/primitives"
import { IconPlane } from "@/components/home/icons"
import { useFirebaseUser } from "@/hooks/use-firebase-user"

function FooterAuthLink({ className }: { className: string }) {
  const { t } = useLanguage()
  const user = useFirebaseUser()
  return (
    <Link href={user ? "/profile" : "/login"} className={className} data-testid="footer-auth-link">
      {t(user ? "header.account" : "header.activate")}
    </Link>
  )
}

export function HomeFinalCta() {
  const { t } = useLanguage()
  const bullets = [t("feature.1.title"), t("feature.2.title"), t("feature.4.title")]
  return (
    <section className="relative overflow-hidden py-24 sm:py-28 lg:py-36" data-testid="home-final-cta">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="cf-haze absolute inset-0" />
        <div className="absolute left-1/2 bottom-0 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(205,255,23,0.16),transparent_65%)] blur-3xl" />
      </div>
      <div className="mx-auto flex max-w-3xl flex-col items-center px-5 text-center sm:px-8">
        <span className="cf-pill">{t("home.cta.eyebrow")}</span>
        <h2 className="cf-headline mt-7 text-balance text-[2.2rem] text-white sm:text-[3rem] lg:text-[3.6rem]">
          {t("home.cta.title.1")}
          <br />
          <span className="cf-text-steel">{t("home.cta.title.2")}</span>
        </h2>
        <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/60 sm:text-[17px]">{t("home.cta.subtitle")}</p>

        <ul className="mt-8 flex flex-col items-start gap-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-3 text-[15px] font-medium text-white/85">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#CDFF17]/15 text-[#CDFF17]">
                <Check className="size-3" strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <PrimaryButton href="/login" className="w-full sm:min-w-[260px]" testId="final-cta-activate-btn">
            {t("hero.cta.activate")}
          </PrimaryButton>
          <GhostButton href={ADMIN_TELEGRAM_URL} external icon={IconPlane} className="w-full sm:w-auto" testId="final-cta-contact-btn">
            {t("header.menu.contact")}
          </GhostButton>
        </div>
      </div>
    </section>
  )
}

export function HomeFooter() {
  const { t } = useLanguage()
  const explore = [
    { href: "#features", label: t("header.features") },
    { href: "#pricing", label: t("header.pricing") },
    { href: "#reviews", label: t("home.nav.reviews") },
    { href: "#faq", label: t("home.nav.faq") },
  ]
  const link = "text-[14px] font-medium text-white/60 transition-colors hover:text-[#CDFF17]"

  return (
    <footer className="relative border-t border-white/[0.06] bg-[#0E0F11]" data-testid="home-footer">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-5 py-14 sm:px-8 md:grid-cols-12 lg:py-16">
        <div className="col-span-2 md:col-span-6 lg:col-span-6">
          <Link href="/" aria-label="ChartFlow Ai home">
            <ChartFlowLogo />
          </Link>
          <p className="mt-5 max-w-sm text-[13px] leading-relaxed text-white/50">{t("home.footer.tagline")}</p>
          <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-white/35">{t("home.footer.disclaimer")}</p>
        </div>
        <div className="md:col-span-3 lg:col-span-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#CDFF17]">{t("home.footer.explore")}</h3>
          <ul className="mt-5 flex flex-col gap-3">
            {explore.map((l) => (
              <li key={l.href}>
                <a href={l.href} className={link}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3 lg:col-span-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#CDFF17]">{t("home.footer.support")}</h3>
          <ul className="mt-5 flex flex-col gap-3">
            <li>
              <FooterAuthLink className={link} />
            </li>
            <li>
              <a href={ADMIN_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={link}>
                {t("footer.contact")}
              </a>
            </li>
            <li>
              <Link href="/privacy-policy" className={link}>
                {t("footer.privacy")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.05]">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <p className="cf-mono text-[11px] uppercase tracking-[0.2em] text-white/35">
            &copy; {new Date().getFullYear()} ChartFlow Ai · {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  )
}
