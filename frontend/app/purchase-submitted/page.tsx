import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  MessageCircle,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { SiteFooter } from "@/components/site-footer"

const LOGO_URL =
  "/brand/chartflow-logo.svg"

export const metadata = {
  title: "Purchase Submitted — ChartFlow Ai",
  description:
    "Your purchase details are being verified by our admin. Activation is automatic once approved.",
}

/**
 * Confirmation page shown after a successful purchase submission on any of
 * the three tier pages (Standard / Premium / Extreme). It explains the manual
 * admin verification step, reassures the user that activation is automatic
 * once their payment is matched, and provides clear next-step CTAs
 * (Telegram admin + back to home).
 */
export default function PurchaseSubmittedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#04090C] text-white">
      {/* ---- Top bar ---- */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#04090C]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
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
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-300 sm:inline-flex">
            <ShieldCheck className="size-3.5" aria-hidden />
            Secure Checkout
          </div>
        </div>
      </header>

      {/* ---- Hero / status card ---- */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-14 sm:px-8 sm:py-20">
        <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] sm:p-10">
          {/* Soft accent glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 size-[420px] -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: "rgba(91,192,216,0.12)" }}
          />

          <div className="relative flex flex-col items-center gap-5">
            <span className="inline-flex size-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <BadgeCheck className="size-8" aria-hidden />
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
              <Clock className="size-3" aria-hidden />
              Pending Admin Review
            </span>

            <h1 className="text-balance font-serif text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
              Purchase Submitted Successfully
            </h1>

            <p className="max-w-xl text-pretty text-sm leading-relaxed text-white/70 sm:text-base">
              Your purchase details have been sent to our admin for
              verification. Once your payment is matched on-chain and
              confirmed correct, your account will be{" "}
              <span className="font-semibold text-white">
                activated automatically
              </span>
              . When you return to the website, you&apos;ll see the{" "}
              <span className="font-semibold text-emerald-300">
                purchase successful
              </span>{" "}
              confirmation right away — no extra steps needed.
            </p>

            {/* Step list */}
            <ol className="mt-2 grid w-full gap-3 text-left sm:grid-cols-3">
              {[
                {
                  n: "1",
                  title: "Submitted",
                  body: "Your details and payment proof are now with the admin.",
                },
                {
                  n: "2",
                  title: "Verified",
                  body: "Admin checks the on-chain transfer and approves.",
                },
                {
                  n: "3",
                  title: "Activated",
                  body: "Your account turns active automatically — no action needed.",
                },
              ].map((s) => (
                <li
                  key={s.n}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white">
                      {s.n}
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                      {s.title}
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-white/60">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>

            {/* CTAs */}
            <div className="mt-4 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                asChild
                className="h-11 bg-[#229ED9] text-white shadow-[0_8px_24px_-8px_rgba(34,158,217,0.6)] hover:bg-[#1d8bc1]"
              >
                <a
                  href="https://t.me/Mushfiq2615"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 size-4" aria-hidden />
                  Contact Admin
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/">
                  <ArrowLeft className="mr-2 size-4" aria-hidden />
                  Back to Home
                </Link>
              </Button>
            </div>

            <p className="mt-2 text-[11px] text-white/45">
              Verification usually takes a few minutes. You can safely close
              this page.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
