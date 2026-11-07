"use client"

import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"

export function SiteFooter() {
  const { t } = useLanguage()
  return (
    <footer className="relative border-t border-[#1B7892]/30 bg-gradient-to-b from-[#1B7892] to-[#03161B]">
      {/* Top accent line */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5BC0D8]/50 to-transparent"
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-10 sm:flex-row sm:justify-between sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/chartflow-logo.svg"
            alt="ChartFlow Ai"
            width={120}
            height={36}
            className="h-8 w-auto opacity-90 transition-opacity hover:opacity-100"
            unoptimized
          />
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#E8F4F7]/80">
          <Link href="/#pricing" className="transition-colors hover:text-[#5BC0D8]">
            {t("header.pricing")}
          </Link>
          <Link
            href="/login"
            className="transition-colors hover:text-[#5BC0D8]"
          >
            {t("header.activate")}
          </Link>
          <Link
            href="/privacy-policy"
            className="transition-colors hover:text-[#5BC0D8]"
          >
            {t("footer.privacy")}
          </Link>
          <a
            href="https://t.me/Mushfiq2615"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#5BC0D8]"
          >
            {t("footer.contact")}
          </a>
        </nav>

        <p className="text-center text-xs text-[#E8F4F7]/60 sm:text-right">
          &copy; {new Date().getFullYear()} ChartFlow Ai. {t("footer.rights")}
        </p>
      </div>
    </footer>
  )
}
