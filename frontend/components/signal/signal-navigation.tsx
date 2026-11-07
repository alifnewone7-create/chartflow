"use client"

/**
 * Premium navigation shared by the 5 activated-only pages.
 *
 *  ┌────────────────────────────────────────────────────────────┐
 *  │ All viewports: a single rounded-rectangle "pill" bar at    │
 *  │   the top of the page. Sticky, glassy, tier-tinted.        │
 *  │                                                             │
 *  │   Desktop (≥ md): logo · 5 tab pills · holder chip · sign  │
 *  │     out — every section reachable in one tap.              │
 *  │                                                             │
 *  │   Mobile (< md):  logo · current page chip · hamburger.    │
 *  │     The hamburger opens a slide-in sidebar from the right  │
 *  │     containing the identity card, all 5 nav links and a    │
 *  │     sign-out button.                                       │
 *  └────────────────────────────────────────────────────────────┘
 *
 * The bottom tab bar from the previous design has been removed — all
 * mobile navigation now lives behind the hamburger menu so the page
 * itself stays uncluttered.
 */

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { LiveSignalIcon } from "@/components/icons/live-signal-icon"
import {
  AlignJustify,
  Bot,
  CalendarClock,
  CandlestickChart,
  ChevronRight,
  Crown,
  LogOut,
  Rocket,
  ShieldAlert,
  Sparkles,
  UserCircle2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react"

import { TIER_ACCENT, TIER_LABEL, type Tier } from "@/lib/tiers"
import { logoutUser } from "@/lib/user-auth"
import { cn } from "@/lib/utils"
import { DesktopSidebar } from "@/components/signal/desktop-sidebar"
import type { AccessSession } from "@/hooks/use-access-session"

const LOGO_URL =
  "/brand/chartflow-logo.svg"

const QX_SIDE_URL =
  "/brand/chartflow-mark.svg"

type Holder = { fullName?: string; username?: string } | null

export type NavKey =
  | "profile"
  | "chart-to-signal"
  | "future-signals"
  | "automatic-signal"
  | "chart-15sec-signal"
  | "chart-2candle"
  | "upgrade-your-plan"

type NavItem = {
  key: NavKey
  label: string
  short: string
  hint: string
  icon: LucideIcon
  pathPrefix: string
  buildHref: (token: string) => string
}

export const NAV: NavItem[] = [
  {
    key: "profile",
    label: "Profile",
    short: "Profile",
    hint: "Account & usage",
    icon: UserCircle2,
    pathPrefix: "/profile",
    buildHref: (t) => `/profile`,
  },
  {
    key: "chart-to-signal",
    label: "1m Signal",
    short: "1m",
    hint: "Live next-candle",
    icon: LiveSignalIcon as unknown as LucideIcon,
    pathPrefix: "/chart-to-signal",
    buildHref: (t) => `/chart-to-signal`,
  },
  {
    key: "future-signals",
    label: "Future",
    short: "Future",
    hint: "Plan M1 signals ahead",
    icon: CalendarClock,
    pathPrefix: "/future-signals",
    buildHref: () => `/future-signals`,
  },
  {
    key: "automatic-signal",
    label: "Auto Signal",
    short: "Auto",
    hint: "24/7 Telegram signals",
    icon: Bot,
    pathPrefix: "/automatic-signal",
    buildHref: () => `/automatic-signal`,
  },
  {
    key: "chart-2candle",
    label: "2 Candle",
    short: "2 Candle",
    hint: "See 2 candles ahead",
    icon: CandlestickChart,
    pathPrefix: "/chart-2candle",
    buildHref: (t) => `/chart-2candle`,
  },
  {
    key: "upgrade-your-plan",
    label: "Upgrade Your Plan",
    short: "Upgrade",
    hint: "Upgrade your plan",
    icon: Rocket,
    pathPrefix: "/upgrade-your-plan",
    buildHref: (t) => `/upgrade-your-plan`,
  },
]

export function useActiveKey(): NavKey | null {
  const pathname = usePathname() ?? ""
  for (const item of NAV) {
    if (pathname.startsWith(item.pathPrefix)) return item.key
  }
  return null
}

/* -------------------------------------------------------------------------- */
/*  TopNav — Redesigned premium navigation bar                                 */
/* -------------------------------------------------------------------------- */

export function TopNav({ session }: { session: AccessSession }) {
  const router = useRouter()
  const active = useActiveKey()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // Confirm-before-logout modal. Triggered by both the desktop "Log Out"
  // button and the mobile sidebar's "Log Out" button so the warning is
  // identical across viewports.
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const isOk = session.state === "ok"
  const token = isOk ? session.token : ""
  const tier: Tier = isOk ? session.tier : "free"
  const holder: Holder = isOk ? session.holder : null
  const accent = TIER_ACCENT[tier]

  // Track scroll for enhanced shadow
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close sidebar on Esc + lock body scroll while open.
  useEffect(() => {
    if (!sidebarOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false)
    }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [sidebarOpen])

  function requestSignOut() {
    // Open the confirmation modal. Also close the mobile sidebar (if
    // open) so the dialog isn't visually trapped behind the slide-in
    // panel on small screens.
    setSidebarOpen(false)
    setLogoutConfirmOpen(true)
  }

  function handleSignOut() {
    logoutUser()
    setLogoutConfirmOpen(false)
    setSidebarOpen(false)
    router.replace("/")
  }

  return (
    <>
      <DesktopSidebar
        items={NAV.filter((item) =>
          item.key === "upgrade-your-plan" ? tier !== "dominator" && tier !== "personal" : true,
        ).map((item) => ({ key: item.key, label: item.label, hint: item.hint, icon: item.icon, href: item.buildHref(token) }))}
        activeKey={isOk ? active : null}
        showAccount={isOk}
        onSignOut={requestSignOut}
      />

      {/* Mobile sidebar */}
      {isOk && (
        <MobileSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          token={token}
          tier={tier}
          holder={holder}
          activeKey={active}
          onSignOut={requestSignOut}
        />
      )}

      {/* Logout confirmation — shared by desktop and mobile */}
      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={handleSignOut}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Mobile sidebar — Redesigned premium slide-in panel                         */
/* -------------------------------------------------------------------------- */

function MobileSidebar({
  open,
  onClose,
  token,
  tier,
  holder,
  activeKey,
  onSignOut,
}: {
  open: boolean
  onClose: () => void
  token: string
  tier: Tier
  holder: Holder
  activeKey: NavKey | null
  onSignOut: () => void
}) {
  const accent = TIER_ACCENT[tier]

  return (
    <div className="md:hidden" aria-hidden={!open}>
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        className={cn(
          "fixed inset-0 z-40 cursor-default transition-all duration-300",
          open ? "bg-[#111214]/80 opacity-100 backdrop-blur-md" : "pointer-events-none opacity-0"
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[90%] max-w-[340px] flex-col overflow-y-auto border-l border-[#4B5A12]/30 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{
          background: "linear-gradient(180deg, #111214 0%, #131416 50%, #1C1D20 100%)",
          boxShadow: open ? "-30px 0 80px -20px rgba(0,0,0,0.95)" : "none",
        }}
      >
        {/* Decorative gradient orb */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full opacity-30 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${accent.from} 0%, transparent 70%)`,
          }}
        />

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#4B5A12]/20 bg-[#111214]/95 px-4 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Active Session
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-[#4B5A12]/30 bg-[#1C1D20]/60 text-[#CDFF17] transition-all duration-300 hover:border-[#B8E62A]/50 hover:bg-[#4B5A12]/30"
            aria-label="Close menu"
          >
            <X className="size-5" strokeWidth={2} aria-hidden />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="px-4 py-5">
          {(holder?.fullName || holder?.username) && (
            <div
              className="group relative overflow-hidden rounded-2xl p-4"
              style={{
                background: `linear-gradient(145deg, ${accent.from}12, ${accent.to}08)`,
                border: `1px solid ${accent.from}25`,
              }}
            >
              {/* Animated shine effect */}
              <span
                aria-hidden
                className="pointer-events-none absolute -left-full top-0 h-full w-1/2 skew-x-[-25deg] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-700 group-hover:left-[150%]"
              />

              <div className="relative flex items-center gap-3.5">
                <span
                  aria-hidden
                  className="relative size-14 shrink-0 overflow-hidden rounded-xl shadow-lg"
                  style={{
                    border: `2px solid ${accent.from}40`,
                    boxShadow: `0 8px 25px -8px ${accent.from}40`,
                  }}
                >
                  <Image
                    src={QX_SIDE_URL}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold tracking-wide text-[#F3F5EF]">
                    {holder?.fullName || "Trader"}
                  </p>
                  {holder?.username && (
                    <p className="mt-0.5 truncate font-mono text-[12px] text-[#B8E62A]">
                      {holder.username}
                    </p>
                  )}
                </div>
              </div>

              {/* Tier Badge */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[#111214]/50 px-3 py-2.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#F3F5EF]/50">
                  Membership Tier
                </span>
                <span
                  className="badge-shine relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${accent.from} 0%, ${accent.to} 100%)`,
                    color: accent.fg,
                    boxShadow: `0 4px 15px -4px ${accent.from}50`,
                  }}
                >
                  <Crown className="size-3" strokeWidth={2.5} />
                  {TIER_LABEL[tier]}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-4 pb-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#4B5A12]/40 to-transparent" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B8E62A]/70">
              Navigation
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#4B5A12]/40 to-transparent" />
          </div>

          <nav aria-label="Signal sections" className="flex flex-col gap-2">
            {NAV.filter((item) =>
              item.key === "upgrade-your-plan"
                ? tier !== "dominator" && tier !== "personal"
                : true,
            ).map((item) => {
              const isActive = activeKey === item.key
              const Icon = item.icon
              return (
                <Link
                  key={item.key}
                  href={item.buildHref(token)}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 transition-all duration-300",
                    isActive
                      ? "bg-[#4B5A12]/20"
                      : "hover:bg-[#4B5A12]/10"
                  )}
                  style={
                    isActive
                      ? {
                          border: `1px solid ${accent.from}30`,
                          boxShadow: `inset 0 0 20px -10px ${accent.from}30`,
                        }
                      : { border: "1px solid transparent" }
                  }
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full"
                      style={{
                        background: `linear-gradient(180deg, ${accent.from}, ${accent.to})`,
                        boxShadow: `0 0 12px ${accent.from}60`,
                      }}
                    />
                  )}

                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-lg transition-all duration-300",
                      isActive
                        ? "bg-[#CDFF17]/15 text-[#CDFF17]"
                        : "bg-[#4B5A12]/15 text-[#B8E62A] group-hover:bg-[#4B5A12]/25 group-hover:text-[#CDFF17]"
                    )}
                    style={
                      isActive
                        ? {
                            boxShadow: `0 0 15px -5px ${accent.from}50`,
                          }
                        : undefined
                    }
                    aria-hidden
                  >
                    <Icon className="size-5" strokeWidth={2} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-[13px] font-semibold tracking-wide transition-colors duration-300",
                        isActive ? "text-[#CDFF17]" : "text-[#F3F5EF]/85 group-hover:text-[#F3F5EF]"
                      )}
                    >
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#F3F5EF]/45">{item.hint}</p>
                  </div>

                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 transition-all duration-300",
                      isActive
                        ? "text-[#CDFF17]"
                        : "text-[#F3F5EF]/30 group-hover:translate-x-0.5 group-hover:text-[#B8E62A]"
                    )}
                    strokeWidth={2}
                    aria-hidden
                  />
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer with Sign Out */}
        <div className="sticky bottom-0 border-t border-[#4B5A12]/20 bg-[#111214]/95 px-4 py-4 backdrop-blur-xl">
          <button
            type="button"
            onClick={onSignOut}
            className="group flex w-full items-center justify-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3.5 text-[12px] font-semibold text-rose-300 transition-all duration-300 hover:border-rose-500/40 hover:bg-rose-500/20 hover:text-rose-200 hover:shadow-[0_0_20px_-5px_rgba(244,63,94,0.4)]"
            aria-label="Log out"
          >
            <LogOut
              className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5"
              strokeWidth={2}
              aria-hidden
            />
            Log Out
          </button>
        </div>
      </aside>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Logout confirmation dialog — portal so it covers the whole viewport       */
/* -------------------------------------------------------------------------- */

function LogoutConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  // Esc-to-cancel + body-scroll lock while open. Mirrors the pattern
  // used by the ghost-candle editor so behaviour stays consistent
  // across modals in the app.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onCancel])

  if (!open) return null
  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-confirm-title"
      onClick={onCancel}
    >
      <div
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-rose-500/30 bg-[#111214]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
        style={{ backdropFilter: "blur(20px) saturate(1.6)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-rose-500/20 bg-rose-500/5 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-300">
              <ShieldAlert className="size-4" strokeWidth={2.2} aria-hidden />
            </span>
            <h3
              id="logout-confirm-title"
              className="text-[15px] font-semibold tracking-wide text-[#F3F5EF] sm:text-[16px]"
            >
              Are you sure you want to log out?
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex size-8 items-center justify-center rounded-lg text-[#F3F5EF]/70 transition hover:bg-white/10 hover:text-[#F3F5EF]"
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={2.2} aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-pretty text-[13px] leading-relaxed text-[#F3F5EF]/80 sm:text-[13.5px]">
            You can log back in any time with your email and password.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-rose-500/15 bg-[#1C1D20]/60 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-4 font-sans text-[12px] font-medium text-[#F3F5EF]/85 transition hover:bg-white/[0.07]"
          >
            No
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 px-5 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_28px_-10px_rgba(244,63,94,0.65)] transition hover:scale-[1.02]"
          >
            <LogOut className="size-3.5" strokeWidth={2.4} aria-hidden />
            Yes
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
