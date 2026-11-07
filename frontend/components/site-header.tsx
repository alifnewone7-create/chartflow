"use client"

import Image from "next/image"
import Link from "next/link"
import { Check, Globe, Menu } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/components/language-provider"
import { LANGUAGES } from "@/lib/i18n/dictionary"
import { cn } from "@/lib/utils"

const LOGO_URL =
  "/brand/chartflow-logo.svg"

const ADMIN_TELEGRAM_URL = "https://t.me/Mushfiq2615"

type Props = {
  onDark?: boolean
}

/**
 * SiteHeader — floating rounded-rectangle navigation bar with a premium
 * three-line hamburger menu that hosts in-app navigation + the language
 * switcher.
 */
export function SiteHeader({ onDark = false }: Props) {
  // Outer positioning shell ---------------------------------------------------
  const wrapperClass = onDark
    ? "absolute inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6 sm:pt-6"
    : "sticky top-4 z-30 px-4 sm:px-6"

  // The actual rounded rectangle bar -----------------------------------------
  const barClass = onDark
    ? "mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#070D10]/80 px-4 py-2.5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-[#5BC0D8]/10 backdrop-blur-2xl sm:px-5"
    : "mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border border-[#0A1A22]/10 bg-white/80 px-4 py-2.5 shadow-[0_20px_60px_-15px_rgba(8,30,40,0.18)] ring-1 ring-[#1B7892]/10 backdrop-blur-2xl sm:px-5"

  return (
    <div className={wrapperClass}>
      <nav className={barClass} aria-label="Primary">
        <Link href="/" aria-label="ChartFlow Ai home" className="flex items-center">
          <Image
            src={LOGO_URL}
            alt="ChartFlow Ai"
            width={140}
            height={56}
            priority
            className="h-7 w-auto sm:h-8"
            unoptimized
          />
        </Link>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Premium hamburger menu — hosts Features, Activate, language, etc. */}
          <HamburgerMenu onDark={onDark} />
        </div>
      </nav>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Hamburger menu — premium three-line trigger with language switcher inside */
/* -------------------------------------------------------------------------- */
function HamburgerMenu({ onDark }: { onDark: boolean }) {
  const { language, setLanguage, t } = useLanguage()

  // Trigger button — premium pill that animates on open
  const triggerClass = onDark
    ? "group relative ml-0.5 inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/12 bg-[#03161B]/55 text-white/85 ring-1 ring-[#5BC0D8]/12 transition-all hover:border-[#5BC0D8]/45 hover:bg-[#1B7892]/22 hover:text-[#5BC0D8] hover:shadow-[0_0_18px_-4px_rgba(91,192,216,0.55)] data-[state=open]:border-[#5BC0D8]/55 data-[state=open]:bg-[#1B7892]/25 data-[state=open]:text-[#5BC0D8] data-[state=open]:shadow-[0_0_22px_-4px_rgba(91,192,216,0.65)] sm:size-9.5"
    : "group relative ml-0.5 inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#0A1A22]/12 bg-white/70 text-[#0A1A22]/70 ring-1 ring-[#1B7892]/12 transition-all hover:border-[#1B7892]/35 hover:bg-[#1B7892]/10 hover:text-[#1B7892] hover:shadow-[0_0_18px_-6px_rgba(27,120,146,0.45)] data-[state=open]:border-[#1B7892]/45 data-[state=open]:bg-[#1B7892]/12 data-[state=open]:text-[#1B7892] sm:size-9.5"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass} aria-label={t("header.menu")}>
        {/* Subtle inner top highlight for "premium" feel */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-1/2 transition-opacity",
            onDark
              ? "bg-gradient-to-b from-white/10 to-transparent"
              : "bg-gradient-to-b from-white/40 to-transparent",
          )}
        />
        <Menu className="relative size-4 transition-transform duration-200 group-hover:scale-110 group-data-[state=open]:rotate-90" strokeWidth={2.25} />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-64 overflow-hidden border-[#1B7892]/30 bg-gradient-to-br from-[#03161B] via-[#082935] to-[#03161B] p-2 text-[#E8F4F7] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)]"
      >
        {/* Top accent line */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5BC0D8]/60 to-transparent"
        />
        {/* Soft corner glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #1B7892 0%, transparent 70%)" }}
        />

        {/* Nav links — mobile-friendly mirror of the bar links */}
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-[#E8F4F7]/85 focus:bg-[#1B7892]/20 focus:text-[#5BC0D8]">
          <Link href="/#pricing">{t("header.features")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-[#E8F4F7]/85 focus:bg-[#1B7892]/20 focus:text-[#5BC0D8]">
          <Link href="/#pricing">{t("header.pricing")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-[#E8F4F7]/85 focus:bg-[#1B7892]/20 focus:text-[#5BC0D8]">
          <Link href="/login">{t("header.activate")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-[#E8F4F7]/85 focus:bg-[#1B7892]/20 focus:text-[#5BC0D8]">
          <Link href={ADMIN_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
            {t("header.menu.contact")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 bg-[#1B7892]/20" />

        {/* Language section */}
        <DropdownMenuLabel className="flex items-center gap-2 px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#5BC0D8]/75">
          <Globe className="size-3" strokeWidth={2.5} />
          {t("header.menu.language")}
        </DropdownMenuLabel>

        <div className="flex flex-col gap-1 px-1 pb-1">
          {LANGUAGES.map((lang) => {
            const active = language === lang.code
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all",
                  active
                    ? "border-[#5BC0D8]/55 bg-[#1B7892]/22 shadow-[inset_0_0_0_1px_rgba(91,192,216,0.18)]"
                    : "border-transparent bg-transparent hover:border-[#1B7892]/35 hover:bg-[#1B7892]/12",
                )}
              >
                <span
                  className={cn(
                    "relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 transition-all",
                    active ? "ring-[#5BC0D8]/60" : "ring-[#1B7892]/30",
                  )}
                >
                  <img
                    src={`https://flagcdn.com/w80/${lang.flag}.png`}
                    alt=""
                    width={28}
                    height={28}
                    className="size-full object-cover"
                  />
                </span>
                <span className="flex flex-1 flex-col leading-tight">
                  <span className={cn("text-[13px] font-semibold", active ? "text-[#5BC0D8]" : "text-[#E8F4F7]/90")}>
                    {lang.native}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#E8F4F7]/45">
                    {lang.label}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-full transition-all",
                    active
                      ? "bg-[#5BC0D8] text-[#03161B] shadow-md shadow-[#5BC0D8]/40"
                      : "bg-transparent text-transparent",
                  )}
                >
                  <Check className="size-3" strokeWidth={3.25} />
                </span>
              </button>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
