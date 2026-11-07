"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { LogOut, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Item = { key: string; label: string; hint: string; icon: LucideIcon; href: string }

const STORAGE_KEY = "cf_sidebar"

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => setCollapsed(document.documentElement.dataset.sidebar === "collapsed"), [])
  const toggle = () => {
    const next = !collapsed
    document.documentElement.dataset.sidebar = next ? "collapsed" : "expanded"
    localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "expanded")
    setCollapsed(next)
  }
  return { collapsed, toggle }
}

export function DesktopSidebar({
  items,
  activeKey,
  showAccount,
  onSignOut,
}: {
  items: Item[]
  activeKey: string | null
  showAccount: boolean
  onSignOut: () => void
}) {
  const { collapsed, toggle } = useCollapsed()
  const upgrade = items.find((i) => i.key === "upgrade-your-plan")
  const main = items.filter((i) => i.key !== "upgrade-your-plan")

  return (
    <aside data-testid="desktop-sidebar" className="cf-sb fixed inset-y-0 left-0 z-30 hidden p-3 md:block">
      <div className="cf-sb-panel relative flex h-full flex-col rounded-[22px]">
        <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,#CDFF17_50%,transparent)] opacity-60" />

        <SidebarHeader />

        <nav aria-label="Signal sections" className="cf-sb-scroll relative flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
          <SectionLabel>Workspace</SectionLabel>
          {main.map((item) => (
            <SidebarLink key={item.key} item={item} active={activeKey === item.key} />
          ))}
          {upgrade && (
            <>
              <SectionLabel>Plan</SectionLabel>
              <SidebarLink item={upgrade} active={activeKey === upgrade.key} highlight />
            </>
          )}
        </nav>

        {showAccount && <AccountBlock onSignOut={onSignOut} collapsed={collapsed} onToggle={toggle} />}
      </div>
    </aside>
  )
}

function SidebarHeader() {
  return (
    <div className="cf-sb-head relative flex h-[72px] shrink-0 items-center px-4">
      <Link href="/" aria-label="ChartFlow Ai home" data-testid="sidebar-logo" className="flex min-w-0 items-center">
        <Image src="/brand/chartflow-mark.svg" alt="" width={36} height={36} unoptimized className="cf-sb-mark size-9 shrink-0" />
        <Image src="/brand/chartflow-logo.svg" alt="ChartFlow Ai" width={140} height={40} priority unoptimized className="cf-sb-label h-7 w-auto" />
      </Link>
    </div>
  )
}

function SidebarToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose
  return (
    <button
      type="button"
      onClick={onToggle}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      data-testid="sidebar-toggle-button"
      className="group/t relative flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[#CDFF17]/35 bg-[#16170F] text-[#CDFF17] transition-[border-color,transform] duration-300 hover:border-[#CDFF17]/70 active:scale-95"
    >
      <Icon className="relative size-[18px] transition-transform duration-300 group-hover/t:scale-110" strokeWidth={2.2} aria-hidden />
    </button>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="cf-mono cf-sb-section px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
      <span className="cf-sb-label">{children}</span>
    </p>
  )
}

function SidebarLink({ item, active, highlight }: { item: Item; active: boolean; highlight?: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={active ? "page" : undefined}
      data-testid={`sidebar-link-${item.key}`}
      className={cn(
        "cf-sb-link group relative flex items-center gap-3 rounded-xl p-1.5 transition-[background-color,color] duration-300",
        active ? "text-white" : "text-white/60 hover:bg-white/[0.04] hover:text-white",
      )}
    >
      {active && <span aria-hidden className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#CDFF17]" />}
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[10px] transition-[background-color,color] duration-300",
          active
            ? "bg-[#CDFF17] text-[#141517]"
            : highlight
              ? "border border-[#CDFF17]/25 bg-[#CDFF17]/[0.06] text-[#CDFF17]"
              : "border border-white/[0.06] bg-white/[0.025] group-hover:border-[#CDFF17]/30 group-hover:text-[#CDFF17]",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={2} aria-hidden />
      </span>
      <span className="cf-sb-label min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold">{item.label}</span>
        <span className={cn("block truncate text-[11px]", active ? "text-[#CDFF17]/70" : "text-white/35")}>{item.hint}</span>
      </span>
    </Link>
  )
}

function AccountBlock({
  onSignOut,
  collapsed,
  onToggle,
}: {
  onSignOut: () => void
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <div className="relative shrink-0 border-t border-white/[0.06] p-3">
      <div className="cf-sb-account flex items-center p-1.5">
        <SidebarToggle collapsed={collapsed} onToggle={onToggle} />
      </div>
      <button
        type="button"
        onClick={onSignOut}
        title="Log Out"
        data-testid="sidebar-logout-button"
        className="cf-sb-link group mt-2 flex w-full items-center gap-3 rounded-xl p-1.5 text-[13px] font-semibold text-white/55 transition-colors duration-300 hover:bg-rose-500/10 hover:text-rose-300"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.06] bg-white/[0.025] transition-colors duration-300 group-hover:border-rose-500/40">
          <LogOut className="size-[18px]" strokeWidth={2.2} aria-hidden />
        </span>
        <span className="cf-sb-label">Log Out</span>
      </button>
    </div>
  )
}
