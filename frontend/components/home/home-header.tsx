"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Check, Globe, Menu } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChartFlowLogo } from "@/components/brand/chartflow-logo"
import { useLanguage } from "@/components/language-provider"
import { LANGUAGES } from "@/lib/i18n/dictionary"
import { cn } from "@/lib/utils"
import { ADMIN_TELEGRAM_URL } from "@/components/home/primitives"
import { IconArrow } from "@/components/home/icons"
import { useFirebaseUser } from "@/hooks/use-firebase-user"

const MENU_CONTENT =
  "cf-home w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#1A1C20]/95 p-2 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl"
const MENU_ITEM =
  "cursor-pointer rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/80 focus:bg-[#CDFF17]/12 focus:text-[#CDFF17]"

export function HomeHeader() {
  const { t } = useLanguage()
  const [scrolled, setScrolled] = useState(false)
  const user = useFirebaseUser()
  const authHref = user ? "/profile" : "/login"
  const authLabel = t(user ? "header.account" : "header.activate")

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const links = [
    { href: "/#features", label: t("header.features") },
    { href: "/#pricing", label: t("header.pricing") },
    { href: "/#reviews", label: t("home.nav.reviews") },
    { href: "/#faq", label: t("home.nav.faq") },
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4" data-testid="home-header">
      <nav
        aria-label="Primary"
        className={cn(
          "mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 rounded-2xl border border-white/[0.08] pl-3.5 pr-2 backdrop-blur-xl transition-[background-color,box-shadow] duration-500 sm:h-16 sm:pl-5 sm:pr-3",
          scrolled
            ? "bg-[#141517]/90 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.95)]"
            : "bg-[#141517]/60 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.8)]",
        )}
      >
        <Link href="/" aria-label="ChartFlow Ai home" data-testid="home-logo" className="flex shrink-0 items-center">
          <ChartFlowLogo markClassName="size-8 sm:size-9" />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-4 py-2 text-[14px] font-semibold text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LanguageMenu className="hidden sm:inline-flex" />

          <Link
            href={authHref}
            data-testid="header-activate-btn"
            className="cf-btn-volt group hidden h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-bold sm:inline-flex"
          >
            <span>{authLabel}</span>
            <IconArrow className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("header.menu")}
              data-testid="home-menu-trigger"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/85 transition-all hover:border-[#CDFF17]/45 hover:text-[#CDFF17] data-[state=open]:border-[#CDFF17]/55 data-[state=open]:text-[#CDFF17] lg:hidden"
            >
              <Menu className="size-5" strokeWidth={2.2} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={12} className={MENU_CONTENT}>
              {links.map((l) => (
                <DropdownMenuItem key={l.href} asChild className={MENU_ITEM}>
                  <a href={l.href}>{l.label}</a>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild className={MENU_ITEM}>
                <Link href={authHref}>{authLabel}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={MENU_ITEM}>
                <a href={ADMIN_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                  {t("header.menu.contact")}
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2 bg-white/8" />
              <LanguageList />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  )
}

function LanguageMenu({ className }: { className?: string }) {
  const { language, t } = useLanguage()
  const current = LANGUAGES.find((l) => l.code === language)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("header.menu.language")}
        data-testid="home-language-trigger"
        className={cn(
          "h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[13px] font-semibold text-white/80 transition-all hover:border-[#CDFF17]/45 hover:text-[#CDFF17] data-[state=open]:border-[#CDFF17]/55",
          className,
        )}
      >
        <Globe className="size-4 text-[#CDFF17]" strokeWidth={1.8} />
        {current?.native}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className={MENU_CONTENT}>
        <LanguageList />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LanguageList() {
  const { language, setLanguage, t } = useLanguage()
  return (
    <>
      <DropdownMenuLabel className="flex items-center gap-2 px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#CDFF17]">
        <Globe className="size-3" strokeWidth={2.2} />
        {t("header.menu.language")}
      </DropdownMenuLabel>
      <div className="flex flex-col gap-1 px-1 pb-1">
        {LANGUAGES.map((lang) => {
          const active = language === lang.code
          return (
            <button
              key={lang.code}
              type="button"
              data-testid={`home-lang-${lang.code}`}
              onClick={() => setLanguage(lang.code)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-all",
                active ? "border-[#CDFF17]/40 bg-[#CDFF17]/10" : "border-transparent hover:border-white/10 hover:bg-white/[0.04]",
              )}
            >
              <img src={`https://flagcdn.com/w80/${lang.flag}.png`} alt="" width={26} height={26} className="size-[26px] rounded-full object-cover ring-1 ring-white/15" />
              <span className="flex flex-1 flex-col leading-tight">
                <span className={cn("text-[13px] font-semibold", active ? "text-[#CDFF17]" : "text-white/90")}>{lang.native}</span>
                <span className="cf-mono text-[10px] uppercase tracking-[0.16em] text-white/40">{lang.label}</span>
              </span>
              {active && (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#CDFF17] text-[#141517]">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
