"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { Emblem } from "@/components/home/primitives"
import {
  IconBot,
  IconCandlesAhead,
  IconFutureClock,
  IconGauge,
  IconInfinity,
  IconLock,
  IconPulse,
  IconRefresh,
  type CfIcon,
} from "@/components/home/icons"
import { Chip, HAZE, PANEL, SectionHead } from "@/components/profile/ui"
import { quotaDayStart, useDailyUsage } from "@/hooks/use-daily-usage"
import { CANDLE2_TIME_LIMITS, DAILY_LIMITS, type Tier } from "@/lib/tiers"
import { cn } from "@/lib/utils"

type Quota = { id: string; label: string; href: string; icon: CfIcon; used: number; limit: number; unit: "signals" | "time" }

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}
const fmtVal = (q: Quota, v: number) => (q.unit === "time" ? fmtTime(v) : String(v))

function useResetIn() {
  const [left, setLeft] = useState("")
  useEffect(() => {
    const tick = () => {
      const ms = quotaDayStart() + 86_400_000 - Date.now()
      setLeft(`${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`)
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])
  return left
}

function QuotaCard({ q }: { q: Quota }) {
  const locked = q.limit <= 0
  const unlimited = !Number.isFinite(q.limit)
  const pct = locked ? 0 : unlimited ? 100 : Math.min(100, (q.used / q.limit) * 100)
  const left = unlimited || locked ? 0 : Math.max(0, q.limit - q.used)
  const done = !unlimited && !locked && left === 0
  return (
    <Link
      href={q.href}
      data-testid={`profile-quota-${q.id}`}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0E0F11]/60 p-4 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-[#CDFF17]/35 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <Emblem icon={q.icon} size="sm" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[14.5px] font-bold text-white">{q.label}</span>
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">{q.unit === "time" ? "Daily access time" : "Signals today"}</span>
          </span>
        </span>
        {locked ? (
          <Chip><IconLock className="size-3" /> Locked</Chip>
        ) : unlimited ? (
          <Chip tone="volt"><IconInfinity className="size-3.5" /> No limit</Chip>
        ) : (
          <Chip tone={done ? "bad" : "ok"}>{done ? "Used up" : "Active"}</Chip>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="cf-display text-[28px] leading-none text-white sm:text-[32px]" data-testid={`profile-quota-${q.id}-used`}>
          {fmtVal(q, q.used)}
          {!unlimited && !locked && <span className="text-[15px] text-white/35"> / {fmtVal(q, q.limit)}</span>}
        </p>
        {!unlimited && !locked && (
          <p className="cf-mono text-right text-[10.5px] uppercase tracking-[0.12em] text-white/50" data-testid={`profile-quota-${q.id}-left`}>
            <span className={cn("text-[13px] font-bold", done ? "text-rose-300" : "text-[#CDFF17]")}>{fmtVal(q, left)}</span> left
          </p>
        )}
      </div>
      <div className={cn("h-1.5 overflow-hidden rounded-full", unlimited ? "bg-[repeating-linear-gradient(90deg,rgba(205,255,23,0.35)_0_6px,transparent_6px_10px)]" : "bg-white/[0.06]")}>
        {!unlimited && (
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${pct}%`, background: done ? "#FB7185" : "linear-gradient(90deg,#A9D40E,#CDFF17)", boxShadow: done ? "none" : "0 0 12px -2px rgba(205,255,23,0.6)" }}
          />
        )}
      </div>
    </Link>
  )
}

export function DailyLimits({ uid, tier }: { uid: string; tier: Tier }) {
  const u = useDailyUsage(uid)
  const resetIn = useResetIn()
  const premium = tier !== "free"
  const quotas: Quota[] = [
    { id: "live", label: "Live Signal", href: "/chart-to-signal", icon: IconPulse, used: u.live, limit: DAILY_LIMITS[tier]["chart-to-signal"], unit: "signals" },
    { id: "future", label: "Future Signal", href: "/future-signals", icon: IconFutureClock, used: u.future, limit: premium ? Infinity : 0, unit: "signals" },
    { id: "auto", label: "Automatic Signal", href: "/automatic-signal", icon: IconBot, used: u.auto, limit: premium ? Infinity : 0, unit: "signals" },
    { id: "candle2", label: "Chart 2-Candle", href: "/chart-2candle", icon: IconCandlesAhead, used: u.candle2Seconds, limit: CANDLE2_TIME_LIMITS[tier], unit: "time" },
  ]
  return (
    <section className={cn(PANEL, "p-4 sm:p-7")} data-testid="profile-daily-limits">
      {HAZE}
      <SectionHead
        icon={IconGauge}
        eyebrow="Today · Quota"
        lead="Daily"
        accent="limit"
        hint="How much of each feature you have used today and what is left."
        right={
          <Chip className="px-2.5 py-1.5 text-[10.5px] tracking-[0.12em] text-white/60" testId="profile-quota-reset">
            <IconRefresh className="size-3.5" /> Resets in <span className="font-bold text-white">{resetIn}</span> · 6:00 AM BD
          </Chip>
        }
      />
      <div className={cn("relative mt-6 grid gap-3 sm:grid-cols-2", u.loading && "animate-pulse")}>
        {quotas.map((q) => <QuotaCard key={q.id} q={q} />)}
      </div>
    </section>
  )
}
