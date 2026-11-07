"use client"

/**
 * AdminDashboard
 * --------------
 * Responsive admin console with a sidebar navigation:
 *
 *   • Desktop (lg+): fixed sidebar on the left, scrollable main area
 *     fills the rest of the viewport. Navigation is always visible.
 *   • Mobile         : sidebar collapses behind a hamburger button in the
 *     top bar. Tapping the hamburger opens the sidebar in a slide-over
 *     sheet. Tapping any nav item or the backdrop closes it.
 *
 * Each section (Keys / Users / Purchases) renders its own focused page —
 * the dashboard chrome stays out of the way so the active panel can
 * own the screen on small devices.
 */

import { useEffect, useState } from "react"
import {
  ArrowUpCircle,
  Bot,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from "lucide-react"

import { BotSettingsPanel } from "@/components/admin/bot-settings-panel"
import { PurchasesPanel } from "@/components/admin/purchases-panel"
import { UpgradesPanel } from "@/components/admin/upgrades-panel"
import { UsersPanel } from "@/components/admin/users-panel"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Tab = "users" | "purchases" | "upgrades" | "bot"

const NAV: Array<{
  id: Tab
  label: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  description: string
}> = [
  {
    id: "users",
    label: "Users",
    icon: Users,
    description: "See every registered user and change their tier.",
  },
  {
    id: "purchases",
    label: "Purchases",
    icon: ShoppingBag,
    description: "Approve or reject incoming purchase submissions.",
  },
  {
    id: "upgrades",
    label: "Upgrades",
    icon: ArrowUpCircle,
    description: "Approve or reject account upgrade submissions.",
  },
  {
    id: "bot",
    label: "TG Bot Settings",
    icon: Bot,
    description: "Style the Telegram signal, result and report messages and set premium emoji IDs.",
  },
]

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("users")
  const [mobileOpen, setMobileOpen] = useState(false)
  // Sign-out confirmation modal. We never wire the sidebar button to
  // ``onLogout`` directly — clicking it just opens this prompt, and
  // the actual logout only fires once the admin clicks "Sign out" on
  // the modal. Closing via Cancel / backdrop / Esc is a no-op.
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  const active = NAV.find((n) => n.id === tab) ?? NAV[0]

  // ``Esc`` closes the confirm modal so the admin can dismiss without
  // mouse / touch.
  useEffect(() => {
    if (!confirmSignOut) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmSignOut(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [confirmSignOut])

  // Close the mobile sheet whenever we navigate.
  useEffect(() => {
    setMobileOpen(false)
  }, [tab])

  // Lock body scroll when the mobile sheet is open.
  useEffect(() => {
    if (typeof document === "undefined") return
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  return (
    <div className="flex min-h-screen w-full text-white">
      {/* ===================== DESKTOP SIDEBAR ===================== */}
      <aside
        aria-label="Admin navigation"
        className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#04161D] to-[#02101A] lg:flex"
      >
        <SidebarHeader />
        <SidebarNav tab={tab} onSelect={setTab} />
        <SidebarFooter onLogout={() => setConfirmSignOut(true)} />
      </aside>

      {/* ===================== MOBILE SHEET ===================== */}
      <MobileSheet open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <SidebarHeader />
        <SidebarNav tab={tab} onSelect={setTab} />
        <SidebarFooter onLogout={() => setConfirmSignOut(true)} />
      </MobileSheet>

      {/* ===================== MAIN AREA ===================== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* --------- Mobile top bar --------- */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#03101A]/85 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/85 transition hover:bg-white/10 hover:text-white"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
              Admin console
            </p>
            <h1 className="truncate font-serif text-lg font-semibold text-white">
              {active.label}
            </h1>
          </div>
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#5BC0D8]/25 via-[#1B7892]/25 to-[#03161B]/60 text-[#7DE3FF] ring-1 ring-inset ring-[#5BC0D8]/40">
            <active.icon className="size-4" aria-hidden />
          </span>
        </header>

        {/* --------- Desktop title strip --------- */}
        <header className="hidden border-b border-white/10 bg-[#03101A]/40 px-8 py-6 backdrop-blur lg:block">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#5BC0D8]/25 via-[#1B7892]/25 to-[#03161B]/60 text-[#7DE3FF] ring-1 ring-inset ring-[#5BC0D8]/40">
              <active.icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                {active.id === "purchases"
                  ? "Submissions"
                  : active.id === "upgrades"
                    ? "Upgrades"
                    : "Accounts"}
              </p>
              <h1 className="mt-0.5 truncate font-serif text-2xl font-semibold text-white">
                {active.label}
              </h1>
              <p className="mt-1 truncate text-sm text-white/60">
                {active.description}
              </p>
            </div>
          </div>
        </header>

        {/* --------- Active panel --------- */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          {tab === "users" ? (
            <UsersPanel />
          ) : tab === "purchases" ? (
            <PurchasesPanel />
          ) : tab === "bot" ? (
            <BotSettingsPanel />
          ) : (
            <UpgradesPanel />
          )}
        </main>
      </div>

      {/*
        ------- Sign-out confirmation modal -------
        Prevents accidental clicks on the sidebar "Sign out" button
        from blowing away the admin session. Backdrop / Esc / Cancel
        all dismiss without firing ``onLogout``.
      */}
      {confirmSignOut && (
        <SignOutConfirmModal
          onCancel={() => setConfirmSignOut(false)}
          onConfirm={() => {
            setConfirmSignOut(false)
            onLogout()
          }}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sidebar bits                                                              */
/* -------------------------------------------------------------------------- */

function SidebarHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
      <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#5BC0D8]/25 via-[#1B7892]/25 to-[#03161B]/60 text-[#7DE3FF] ring-1 ring-inset ring-[#5BC0D8]/40">
        <ShieldCheck className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
          Admin console
        </p>
        <h2 className="mt-0.5 truncate font-serif text-lg font-semibold text-white">
          QX Private Portal
        </h2>
      </div>
    </div>
  )
}

function SidebarNav({
  tab,
  onSelect,
}: {
  tab: Tab
  onSelect: (next: Tab) => void
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.id === tab
          const Icon = item.icon
          return (
            <li key={item.id}>
              <button
                type="button"
                data-testid={`admin-nav-${item.id}`}
                onClick={() => onSelect(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all",
                  active
                    ? "bg-[#5BC0D8] text-[#03161B] shadow-[0_4px_18px_-6px_rgba(91,192,216,0.55)]"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    active
                      ? "bg-[#03161B]/15 text-[#03161B]"
                      : "bg-white/[0.04] text-[#7DE3FF] ring-1 ring-inset ring-white/10 group-hover:bg-white/10",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-semibold leading-tight">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 truncate text-[11px] leading-tight",
                      active ? "text-[#03161B]/75" : "text-white/45",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function SidebarFooter({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="border-t border-white/10 px-4 py-4">
      <Button
        variant="outline"
        onClick={onLogout}
        className="w-full justify-center border-white/15 bg-white/[0.04] text-white/85 hover:bg-white/10 hover:text-white"
      >
        <LogOut className="mr-2 size-4" aria-hidden />
        Sign out
      </Button>
    </div>
  )
}

function MobileSheet({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/65 backdrop-blur-md transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        tabIndex={open ? 0 : -1}
      />

      {/* Sheet */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        className={cn(
          "absolute inset-y-0 left-0 flex w-[82%] max-w-[18rem] flex-col border-r border-white/10 bg-gradient-to-b from-[#04161D] to-[#02101A] shadow-[0_30px_80px_-10px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-lg text-white/65 transition hover:bg-white/5 hover:text-white"
        >
          <X className="size-4" aria-hidden />
        </button>
        {children}
      </aside>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sign-out confirm modal                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight confirm prompt rendered when the admin clicks "Sign
 * out" in the sidebar footer. Mirrors the design language of the
 * other admin modals (centered on desktop, bottom-sheet on mobile,
 * rose-tinted destructive CTA). Backdrop click / Cancel dismisses
 * without side effects; only the primary CTA invokes ``onConfirm``.
 */
function SignOutConfirmModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-t-2xl border border-white/10 bg-[#03161B] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.65)] sm:rounded-2xl sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-400/10 text-rose-200 ring-1 ring-inset ring-rose-400/30">
            <LogOut className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              id="signout-title"
              className="font-serif text-lg font-semibold text-white"
            >
              Sign out of admin?
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/65">
              You&apos;ll need to enter your password and secret key again to
              access the panel.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-11 border-white/15 bg-white/[0.04] text-white hover:bg-white/10 sm:h-10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            autoFocus
            onClick={onConfirm}
            className="h-11 bg-rose-500 font-semibold text-white hover:bg-rose-400 sm:h-10"
          >
            <LogOut className="mr-2 size-4" aria-hidden />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
