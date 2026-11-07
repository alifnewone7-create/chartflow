"use client"

import { PieChart } from "lucide-react"

import { TIER_ACCENT, type Tier } from "@/lib/tiers"

/**
 * Slim daily-usage bar for signal pages. Shows a numeric "used / limit"
 * counter and a thin progress track tinted with the tier's accent colour.
 * Designed to slot into the right-hand action panel above the Generate
 * button without competing with it for attention.
 */
export function UsageBar({
  count,
  limit,
  tier,
  loading,
  label,
}: {
  count: number
  limit: number
  tier: Tier
  loading: boolean
  label: string
}) {
  const pct = limit > 0 ? Math.min(100, (count / limit) * 100) : 0
  const accent = TIER_ACCENT[tier]
  const remaining = Math.max(0, limit - count)
  const exhausted = remaining === 0

  return (
    <div className="relative flex flex-col gap-2.5 overflow-hidden rounded-xl border border-[#3A3E46]/40 bg-gradient-to-br from-[#16181C]/90 to-[#17191D]/95 p-4 backdrop-blur-md sm:rounded-2xl sm:p-5">
      {/* Subtle gradient accent */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl"
        style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
      />
      
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F3F5EF]/75 sm:text-[12px]">
          <span
            className="grid size-7 place-items-center rounded-lg sm:size-8 sm:rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${accent.from}20, ${accent.to}10)`,
              border: `1px solid ${accent.from}35`,
            }}
          >
            <PieChart className="size-3.5 sm:size-4" style={{ color: accent.from }} aria-hidden strokeWidth={2.2} />
          </span>
          {label}
        </span>
        <span
          className={`font-mono text-[13px] tabular-nums sm:text-[14px] ${
            exhausted ? "text-rose-300" : "text-[#F3F5EF]"
          }`}
        >
          {loading ? (
            <span className="text-[#F3F5EF]/40">...</span>
          ) : (
            <>
              <strong className="font-bold">{count}</strong>
              <span className="px-0.5 text-[#F3F5EF]/35">/</span>
              <span className="text-[#F3F5EF]/60">{limit}</span>
            </>
          )}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-[#16181C] ring-1 ring-inset ring-[#3A3E46]/30">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accent.from} 0%, ${accent.to} 100%)`,
            boxShadow: `0 0 12px -2px ${accent.ring}`,
          }}
        />
      </div>

      {exhausted && (
        <p className="text-[11px] font-medium text-[#F3F5EF]/50 sm:text-[12px]">
          Daily quota reached — resets at 6:00 AM BD (UTC+6).
        </p>
      )}
    </div>
  )
}
