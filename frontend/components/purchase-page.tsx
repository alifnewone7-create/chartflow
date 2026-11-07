import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  Clock,
  CircleDollarSign,
  Download,
  Lock,
  ShieldCheck,
  Wallet,
} from "lucide-react"

import { CopyAddress } from "@/components/copy-address"
import { PurchaseForm } from "@/components/purchase-form"
import { SiteFooter } from "@/components/site-footer"

const BNB_QR_URL = "/images/bnb-bep20-qr.png"

const BSC_ADDRESS = "0x3eD69e509f70123c22fD00448AF50AAE1654Bf98"

const LOGO_URL =
  "/brand/chartflow-logo.svg"

export type Theme = {
  /** Background gradient at top of the page. */
  heroBg: string
  /** Text color for the hero heading. */
  heroText: string
  /** Soft contrast text color used on the hero. */
  heroTextMuted: string
  /** Color for the price number. */
  priceText: string
  /** Color for the tier chip / accent badge on the hero. */
  chip: string
  /** Submit button class applied to the form CTA. */
  buttonClass: string
  /** Subtle accent ring color on cards. */
  cardRing: string
  /** Hex accent (used for inline glow / icons). */
  accent?: string
}

type Props = {
  tierName: string
  price: string
  description: string
  theme: Theme
  /** Bullet list of perks shown in the order summary. */
  features?: string[]
}

/** Strip non-numeric characters from price like "$149" -> "149". */
function priceToAmount(price: string) {
  const match = price.match(/[\d.]+/)
  return match ? match[0] : price
}

export function PurchasePage({
  tierName,
  price,
  description,
  theme,
}: Props) {
  const accent = theme.accent ?? "#5BC0D8"
  const amountUsdt = priceToAmount(price)

  return (
    <div className="flex min-h-screen flex-col bg-[#04090C] text-white">
      {/* ============================================================
          TOP BAR — minimal branded strip with prominent back button.
         ============================================================ */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#04090C]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          {/* Back button — chevron-only icon button on mobile,
              labelled pill on >= sm. */}
          <Link
            href="/#pricing"
            aria-label="Back to pricing"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 backdrop-blur transition-all hover:border-[#5BC0D8]/40 hover:bg-[#5BC0D8]/10 hover:text-[#5BC0D8] sm:px-4 sm:py-2.5"
          >
            <ChevronLeft
              className="size-4 transition-transform group-hover:-translate-x-0.5 sm:size-[18px]"
              aria-hidden
            />
            <span className="hidden sm:inline">Back to pricing</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <Link
            href="/"
            aria-label="ChartFlow Ai home"
            className="flex items-center"
          >
            <Image
              src={LOGO_URL}
              alt="ChartFlow Ai"
              width={140}
              height={56}
              priority
              className="h-7 w-auto opacity-90 sm:h-8"
              unoptimized
            />
          </Link>

          {/* Right-side trust pill — hidden on mobile to save space. */}
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-300 sm:inline-flex">
            <ShieldCheck className="size-3.5" aria-hidden />
            Secure Checkout
          </div>
          <div className="size-9 sm:hidden" aria-hidden />
        </div>
      </header>

      {/* ============================================================
          HERO — tier identity + price.
         ============================================================ */}
      <section className={`relative isolate overflow-hidden ${theme.heroBg}`}>
        {/* Grid pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent 75%)",
          }}
        />
        {/* Soft accent glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 size-[480px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `${accent}22` }}
        />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 py-14 text-center sm:px-8 sm:py-20">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${theme.chip}`}
          >
            <BadgeCheck className="size-3" aria-hidden />
            {tierName} Plan
          </span>

          <h1
            className={`text-balance font-serif text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl ${theme.heroText}`}
          >
            Purchase {tierName} Account
          </h1>

          <p
            className={`max-w-2xl text-pretty text-sm leading-relaxed sm:text-base ${theme.heroTextMuted}`}
          >
            {description}
          </p>

          {/* Price — clean sans-serif, slimmer weight for a modern look. */}
          <div className="mt-2 flex items-end gap-2">
            <span
              className={`font-sans text-5xl font-semibold leading-none tracking-tight sm:text-6xl ${theme.priceText}`}
            >
              {price}
            </span>
            <span className={`pb-1.5 text-sm font-medium ${theme.heroTextMuted}`}>
              USDT
            </span>
          </div>

          <div
            className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3 text-xs ${theme.heroTextMuted}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-3.5" aria-hidden />
              On-chain verified
            </span>
            <span className="hidden text-white/20 sm:inline">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden />
              Activated within minutes
            </span>
            <span className="hidden text-white/20 sm:inline">·</span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="size-3.5" aria-hidden />
              One-time payment
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================
          MAIN — payment & form.
         ============================================================ */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-8">
          {/* ---------------- LEFT: Payment column ---------------- */}
          <div className="flex flex-col gap-6">
            {/* Payment instructions card */}
            <section
              className={`overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 ${theme.cardRing} sm:p-6`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    Step 1
                  </p>
                  <h3 className="mt-0.5 text-lg font-semibold text-white sm:text-xl">
                    Send {price} USDT
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  <CircleDollarSign className="size-3" aria-hidden />
                  BEP20 only
                </span>
              </div>

              {/* Network warning */}
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-left">
                <div
                  className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-[#04090C]"
                  aria-hidden
                >
                  !
                </div>
                <p className="text-xs leading-relaxed text-amber-100/85">
                  This address only supports{" "}
                  <strong className="text-amber-200">USDT on BNB Smart Chain (BEP20)</strong>.
                  Sending other assets or networks will result in permanent loss.
                </p>
              </div>

              {/* QR + address layout */}
              <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start lg:grid-cols-1 lg:items-stretch">
                <div className="flex flex-col items-center gap-3 lg:items-stretch">
                  <div className="flex size-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white p-2 sm:size-48 lg:size-56 lg:self-center">
                    <div className="relative size-full">
                      <Image
                        src={BNB_QR_URL}
                        alt="USDT BEP20 deposit QR code"
                        fill
                        sizes="224px"
                        className="object-contain"
                        priority
                      />
                    </div>
                  </div>
                  <a
                    href={BNB_QR_URL}
                    download
                    className="inline-flex w-44 sm:w-48 lg:w-full lg:max-w-[14rem] self-center items-center justify-center gap-2 rounded-md bg-[#5BC0D8] px-3 py-2 text-xs font-semibold text-[#0B1220] shadow-[0_4px_14px_-4px_rgba(91,192,216,0.55)] transition hover:bg-[#7AD3E6]"
                  >
                    <Download className="size-4" aria-hidden />
                    Save QR Image
                  </a>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                      Wallet address
                    </p>
                    <CopyAddress value={BSC_ADDRESS} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-white/50">
                        Network
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-white">
                        BNB Smart Chain
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-white/50">
                        Amount
                      </p>
                      <p className="mt-0.5 font-mono text-xs font-semibold text-white">
                        {amountUsdt} USDT
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0"
                  style={{ color: accent }}
                  aria-hidden
                />
                <p className="leading-relaxed">
                  After payment, your account is verified by our admin over
                  Telegram and activated within minutes.
                </p>
              </div>
            </section>
          </div>

          {/* ---------------- RIGHT: Form column ---------------- */}
          <section
            className={`relative h-fit rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] ${theme.cardRing} sm:p-7 lg:sticky lg:top-24`}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Step 2
                </p>
                <h3 className="mt-0.5 text-lg font-semibold text-white sm:text-xl">
                  Submit Your Details
                </h3>
              </div>
              <span
                className="inline-flex size-9 items-center justify-center rounded-full"
                style={{
                  background: `${accent}18`,
                  border: `1px solid ${accent}40`,
                }}
              >
                <Wallet className="size-4" style={{ color: accent }} aria-hidden />
              </span>
            </div>

            <PurchaseForm
              tierName={tierName}
              buttonClass={theme.buttonClass}
              fixedAmount={amountUsdt}
            />
          </section>
        </div>

        {/* Bottom back link — secondary, easy to spot on long mobile pages */}
        <div className="mt-10 flex justify-center">
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/75 transition hover:border-[#5BC0D8]/40 hover:bg-[#5BC0D8]/10 hover:text-[#5BC0D8]"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to pricing
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
