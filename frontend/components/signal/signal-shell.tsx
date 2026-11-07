"use client"

/**
 * Shared shell for every activated-only page (profile + 4 signal rooms).
 *
 * Responsibilities
 * ----------------
 * 1. Validate the URL access token via `useAccessSession`. The hook
 *    enforces format + browser-binding + Firebase truth gates; this
 *    shell only renders a friendly screen for each non-OK state.
 * 2. Render the unified TopNav (rounded-rectangle pill bar) which
 *    holds the logo, section tabs, identity chip and sign-out / mobile
 *    hamburger. The bottom tab bar from the previous design is gone —
 *    every section is now reachable from the TopNav or the sidebar
 *    that opens behind the mobile hamburger.
 * 3. Provide an aurora background that matches the marketing site so
 *    the activated experience feels like a continuation of the brand.
 *
 * Children receive `{ accessToken, qxlKey, tier, holder }` so they
 * never need to re-validate or re-fetch.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Lock,
  ShieldAlert,
  ShieldX,
} from "lucide-react"

import { TopNav } from "@/components/signal/signal-navigation"
import { BottomNav } from "@/components/signal/bottom-nav"
import { BrandLoader } from "@/components/brand-loader"
import type { Tier } from "@/lib/tiers"
import { cn } from "@/lib/utils"
import { useAccessSession, useSignedOutRedirect, type AccessSession } from "@/hooks/use-access-session"

type Holder = { fullName?: string; username?: string } | null

export type SignalShellChildArgs = {
  /** Firebase uid — per-user scope for usage, history and the chart socket. */
  accessToken: string
  qxlKey: string
  tier: Tier
  holder: Holder
}

export function SignalShell({
  pageTitle,
  pageEyebrow,
  children,
}: {
  pageTitle?: string
  pageEyebrow?: string
  children: (args: SignalShellChildArgs) => React.ReactNode
}) {
  const session = useAccessSession()

  useSignedOutRedirect(session)

  return (
    <div className="relative min-h-svh w-full overflow-x-hidden bg-[#141517] text-[#F3F5EF] md:pl-[var(--cf-sb-w)] md:transition-[padding] md:duration-300">
      <SignalBackground />

      <main className="relative z-10 mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-4 px-2.5 pb-[calc(env(safe-area-inset-bottom)+5rem+var(--cf-browser-bar,0px))] pt-2.5 sm:gap-6 sm:px-6 sm:pt-4 md:pb-12 lg:px-8">
        <TopNav session={session} />

        <PageTitle
          pageEyebrow={pageEyebrow}
          pageTitle={pageTitle}
          session={session}
        />

        <div className="relative flex-1">
          <GatedContent session={session}>
            {(args) => children(args)}
          </GatedContent>
        </div>
      </main>
      {session.state === "ok" && <BottomNav />}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page title — eyebrow + headline                                           */
/* -------------------------------------------------------------------------- */

function PageTitle({
  pageEyebrow,
  pageTitle,
  session,
}: {
  pageEyebrow?: string
  pageTitle?: string
  session: AccessSession
}) {
  // On the profile page we hide the eyebrow + title entirely on every
  // breakpoint — the identity hero card sits directly under the top nav.
  const pathname = usePathname() ?? ""
  const isProfile = pathname.startsWith("/profile")

  if (isProfile || !pageTitle) {
    return null
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#B8E62A]/85 sm:text-[10.5px] sm:tracking-[0.32em]">
        {pageEyebrow}
      </span>
      <h1 className="font-display text-balance text-[20px] leading-[1.15] tracking-wide text-[#F3F5EF] sm:text-[26px] lg:text-[34px]">
        <span className="font-normal">{pageTitle.split(" ")[0]}</span>{" "}
        <span className="italic font-light text-[#CDFF17]/90">{pageTitle.split(" ").slice(1).join(" ")}</span>
      </h1>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Gate                                                                      */
/* -------------------------------------------------------------------------- */

function GatedContent({
  session,
  children,
}: {
  session: AccessSession
  children: (args: SignalShellChildArgs) => React.ReactNode
}) {
  const pathname = usePathname() ?? ""
  const ungated = pathname.startsWith("/profile") || pathname.startsWith("/upgrade-your-plan")
  if (session.state === "loading") {
    return <BrandLoader variant="overlay" />
  }

  if (session.state === "invalid") {
    const signedOut = session.reason === "signed-out"
    return (
      <CenterPanel
        icon={
          signedOut ? (
            <ShieldX className="size-6 text-rose-400" aria-hidden />
          ) : (
            <ShieldAlert className="size-6 text-amber-400" aria-hidden />
          )
        }
        title={signedOut ? "Please log in" : "Connection issue"}
        body={
          signedOut
            ? "Log in to your ChartFlow Ai account to open this page."
            : "We hit a snag loading your account. Check your internet connection and try again."
        }
        tone={signedOut ? "danger" : "warn"}
        cta={{ href: "/login", label: "Go to login" }}
      />
    )
  }

  if (session.tier === "free" && !ungated) {
    return (
      <CenterPanel
        icon={<Lock className="size-6 text-[#CDFF17]" aria-hidden />}
        title="Locked on the Free plan"
        body="Your account is on the Free plan, so charts and signals are locked. Get a plan and the admin will unlock it for you."
        tone="info"
        cta={{ href: "/upgrade-your-plan", label: "Get a plan" }}
        testId="free-tier-lock"
      />
    )
  }

  // session.state === "ok"
  return (
    <>
      {children({
        accessToken: session.token,
        qxlKey: session.qxlKey,
        tier: session.tier,
        holder: session.holder,
      })}
    </>
  )
}

function CenterPanel({
  icon,
  title,
  body,
  tone,
  cta,
  testId,
}: {
  icon: React.ReactNode
  title: string
  body: string
  tone: "info" | "warn" | "danger"
  cta?: { href: string; label: string }
  testId?: string
}) {
  const ringByTone: Record<typeof tone, string> = {
    info: "border-[#B8E62A]/40",
    warn: "border-amber-400/40",
    danger: "border-rose-400/40",
  }
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div
        data-testid={testId}
        className={cn(
          "relative max-w-md rounded-2xl border bg-[#17181B]/80 p-7 text-center backdrop-blur-md sm:p-8",
          ringByTone[tone],
        )}
      >
        <div className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-full bg-[#141517]/85 ring-1 ring-inset ring-[#4B5A12]/45">
          {icon}
        </div>
        <h2 className="font-display text-[22px] leading-tight tracking-wide text-[#F3F5EF] sm:text-[24px]">
          {title}
        </h2>
        <p className="mt-2 text-pretty text-[13.5px] font-light leading-relaxed text-[#F3F5EF]/72">
          {body}
        </p>
        {cta && (
          <Link
            href={cta.href}
            data-testid={testId ? `${testId}-cta` : undefined}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-[#B8E62A]/55 bg-[#17181B]/70 px-5 text-[13px] font-medium text-[#F3F5EF] transition-colors hover:bg-[#222427]/85 hover:text-[#CDFF17]"
          >
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Background                                                                */
/* -------------------------------------------------------------------------- */

function SignalBackground() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(205,255,23,0.10), transparent 60%), radial-gradient(ellipse 60% 50% at 90% 90%, rgba(205,255,23,0.05), transparent 65%), linear-gradient(180deg, #141517 0%, #141517 60%, #0C0D0E 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.35) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, #000 35%, transparent 80%)",
        }}
      />
    </>
  )
}
