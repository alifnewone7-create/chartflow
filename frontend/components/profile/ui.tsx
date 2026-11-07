"use client"

import type { ReactNode } from "react"

import { Emblem } from "@/components/home/primitives"
import {
  IconCrown,
  IconFacet,
  IconIdBadge,
  IconLaurel,
  IconSeed,
  type CfIcon,
} from "@/components/home/icons"
import type { Tier } from "@/lib/tiers"
import { cn } from "@/lib/utils"

export const PANEL = "cf-card relative overflow-hidden rounded-[20px] sm:rounded-[28px]"

export const TIER_ICON: Record<Tier, CfIcon> = {
  free: IconIdBadge,
  basic: IconSeed,
  smart: IconFacet,
  pro: IconCrown,
  dominator: IconLaurel,
  personal: IconLaurel,
}

export const HAZE = (
  <span
    aria-hidden
    className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full opacity-70 blur-3xl"
    style={{ background: "radial-gradient(circle, rgba(205,255,23,0.14), transparent 70%)" }}
  />
)

export function SectionHead({
  icon,
  eyebrow,
  lead,
  accent,
  hint,
  right,
}: {
  icon: CfIcon
  eyebrow: string
  lead: string
  accent: string
  hint?: string
  right?: ReactNode
}) {
  return (
    <div className="relative flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <Emblem icon={icon} size="md" />
        <div className="flex min-w-0 flex-col">
          <span className="cf-mono text-[9.5px] uppercase tracking-[0.28em] text-[#CDFF17]/80">{eyebrow}</span>
          <h2 className="cf-headline mt-1 text-[1.35rem] text-white sm:text-[1.6rem]">
            {lead} <span className="cf-text-volt">{accent}</span>
          </h2>
          {hint && <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50 sm:text-[13px]">{hint}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

export function Chip({ children, tone = "neutral", className, testId }: { children: ReactNode; tone?: "neutral" | "volt" | "ok" | "bad"; className?: string; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "cf-mono inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
        tone === "neutral" && "border-white/10 bg-white/[0.04] text-white/55",
        tone === "volt" && "border-[#CDFF17]/30 bg-[#CDFF17]/10 text-[#CDFF17]",
        tone === "ok" && "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
        tone === "bad" && "border-rose-400/40 bg-rose-400/10 text-rose-300",
        className,
      )}
    >
      {children}
    </span>
  )
}
