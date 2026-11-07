import { ArrowDown, ArrowUp, CheckCircle2, Clock3, type LucideIcon, XCircle } from "lucide-react"

import { marketLabel, type SignalStatus } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

export const CARD = "cf-card rounded-[18px] sm:rounded-[24px]"
export const LIME_BTN =
  "cf-btn-volt inline-flex items-center justify-center gap-2 rounded-xl px-4 text-[13.5px] font-bold disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:filter-none"
export const GHOST_BTN =
  "cf-btn-dark inline-flex items-center justify-center gap-2 rounded-xl px-3 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
export const INPUT =
  "cf-input h-11 w-full rounded-xl px-3.5 text-[13.5px] text-white outline-none placeholder:text-white/35 [&>option]:bg-[#17191D]"

const STYLES: Record<SignalStatus, string> = {
  PENDING: "border-amber-300/40 bg-amber-300/10 text-amber-200",
  WIN: "border-emerald-400/45 bg-emerald-400/10 text-emerald-300",
  "MTG WIN": "border-cyan-300/45 bg-cyan-300/10 text-cyan-200",
  LOSS: "border-rose-400/45 bg-rose-400/10 text-rose-300",
}

export function ResultBadge({ status, testId }: { status: SignalStatus; testId?: string }) {
  const Icon = status === "PENDING" ? Clock3 : status === "LOSS" ? XCircle : CheckCircle2
  return (
    <span
      data-testid={testId}
      className={cn("cf-mono inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]", STYLES[status])}
    >
      <Icon className={cn("size-3", status === "PENDING" && "animate-pulse")} strokeWidth={2.4} />
      {status}
    </span>
  )
}

export function DirectionChip({ direction }: { direction: "CALL" | "PUT" }) {
  const up = direction === "CALL"
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <span
      className={cn(
        "cf-mono inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold",
        up ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300" : "border-rose-400/35 bg-rose-400/10 text-rose-300",
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.6} />
      {up ? "UP" : "DOWN"}
    </span>
  )
}

/** "USD/BRL (OTC)" with the OTC tag in volt lime — same treatment as the home hero. */
export function MarketName({ symbol, className }: { symbol: string; className?: string }) {
  const m = marketLabel(symbol)
  return (
    <span className={className}>
      {m.base} {m.otc && <span className="text-[#CDFF17]">(OTC)</span>}
    </span>
  )
}

export const marketText = (symbol: string) => {
  const m = marketLabel(symbol)
  return m.otc ? `${m.base} (OTC)` : m.base
}

export function StatTile({ label, value, cls, testId }: { label: string; value: string | number; cls?: string; testId?: string }) {
  return (
    <span className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 px-1.5 py-2 text-center leading-none sm:w-[92px] sm:px-2">
      <span className="cf-mono w-full truncate text-[7.5px] uppercase tracking-[0.12em] text-white/45 sm:text-[9px] sm:tracking-[0.16em]">{label}</span>
      <span data-testid={testId} className={cn("cf-display text-[15px] tabular-nums text-white sm:text-[18px]", cls)}>{value}</span>
    </span>
  )
}

export function SectionHead({ Icon, eyebrow, lead, accent, hint, right }: { Icon: LucideIcon | React.ComponentType<{ className?: string; strokeWidth?: number }>; eyebrow?: string; lead: string; accent: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="relative flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="cf-orb inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="size-[18px]" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          {eyebrow && <span className="cf-mono text-[9.5px] uppercase tracking-[0.28em] text-[#CDFF17]/80">{eyebrow}</span>}
          <h2 className="cf-display text-[20px] text-white sm:text-[24px]">
            {lead} <span className="text-[#CDFF17]">{accent}</span>
          </h2>
          {hint && <p className="mt-1 text-[12.5px] leading-relaxed text-white/50 sm:text-[13px]">{hint}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

export const GLOW = (
  <span aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, rgba(205,255,23,0.16), transparent 70%)" }} />
)
