"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronRight, History, Inbox, Layers, Loader2, Radio } from "lucide-react"

import { dhakaDay, fmtDate, fmtHM } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

import { type AutoSession, EMPTY_STATS, StatusPill } from "@/components/engine/auto-monitor"
import { HistoryDatePicker, dayLabel, todayDay } from "@/components/engine/history-date-picker"
import { CARD, GHOST_BTN, StatTile } from "@/components/engine/ui-bits"
import { MarketFlagFor } from "@/components/signal/market-flag"

const PAGE = 12
const STATUSES = ["ALL", "running", "paused", "closed"] as const

export function AutoHistory({ sessions, loading }: { sessions: AutoSession[]; loading: boolean }) {
  const [day, setDay] = useState(todayDay)
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL")
  const [page, setPage] = useState(0)

  const filtered = useMemo(
    () => sessions.filter((s) => (!day || dhakaDay(s.created_at) === day) && (status === "ALL" || s.status === status)).sort((a, b) => b.created_at - a.created_at),
    [sessions, day, status],
  )
  const agg = useMemo(() => {
    const t = filtered.reduce((a, s) => ({ total: a.total + (s.stats?.total ?? 0), win: a.win + (s.stats?.win ?? 0), mtg: a.mtg + (s.stats?.mtg_win ?? 0), loss: a.loss + (s.stats?.loss ?? 0) }), { total: 0, win: 0, mtg: 0, loss: 0 })
    const done = t.win + t.mtg + t.loss
    return { ...t, rate: done ? Math.round(((t.win + t.mtg) / done) * 100) : null }
  }, [filtered])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE)

  return (
    <section data-testid="auto-history" className={cn(CARD, "relative overflow-hidden p-4 sm:p-6")}>
      <span aria-hidden className="pointer-events-none absolute -left-20 -top-24 size-56 rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, rgba(205,255,23,0.14), transparent 70%)" }} />
      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="cf-orb inline-flex size-10 items-center justify-center rounded-full"><History className="size-[18px]" strokeWidth={2.2} /></span>
          <div className="flex flex-col leading-tight">
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.28em] text-[#CDFF17]/80">Batches · one per session</span>
            <h2 className="cf-display text-[20px] text-white sm:text-[24px]">Session <span className="text-[#CDFF17]">History</span></h2>
          </div>
        </div>
        <div className="grid w-full grid-cols-5 gap-1.5 sm:w-auto sm:gap-2" data-testid="auto-history-stats">
          <StatTile label="Sessions" value={filtered.length} testId="auto-history-count" />
          <StatTile label="Signals" value={agg.total} testId="auto-history-signals" />
          <StatTile label="Win rate" value={agg.rate === null ? "—" : `${agg.rate}%`} cls={agg.rate !== null && agg.rate >= 50 ? "text-[#CDFF17]" : undefined} testId="auto-history-winrate" />
          <StatTile label="Win + MTG" value={agg.win + agg.mtg} cls="text-emerald-300" testId="auto-history-win" />
          <StatTile label="Loss" value={agg.loss} cls="text-rose-300" testId="auto-history-loss" />
        </div>
      </div>

      <div className="relative mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <HistoryDatePicker value={day} onChange={(d) => (setDay(d), setPage(0))} testId="auto-history" />
        <div role="tablist" className="grid grid-cols-4 gap-1.5" data-testid="auto-history-status">
          {STATUSES.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={status === s} data-testid={`auto-history-status-${s}`} onClick={() => (setStatus(s), setPage(0))} className={cn("h-11 rounded-xl border px-3 text-[12px] font-semibold capitalize transition-colors", status === s ? "border-[#CDFF17]/40 bg-[#CDFF17]/12 text-[#CDFF17]" : "border-white/[0.07] bg-white/[0.03] text-white/60 hover:text-white")}>
              {s === "ALL" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-white/60" data-testid="auto-history-loading"><Loader2 className="size-4 animate-spin text-[#CDFF17]" /> Loading sessions…</div>
      ) : !rows.length ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center" data-testid="auto-history-empty">
          <span className="cf-orb inline-flex size-12 items-center justify-center rounded-full"><Inbox className="size-5" /></span>
          <p className="max-w-xs text-[13px] leading-relaxed text-white/55">{sessions.length ? `No sessions found for ${dayLabel(day)}.` : "No sessions yet. Every session you start becomes a batch here with all of its signals."}</p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" data-testid="auto-history-batches">
          {rows.map((s) => <SessionBatchCard key={s.session_id} s={s} />)}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button data-testid="auto-history-prev" className={cn(GHOST_BTN, "h-9")} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span className="cf-mono text-[11px] text-white/55">{page + 1} / {pages}</span>
        <button data-testid="auto-history-next" className={cn(GHOST_BTN, "h-9")} disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </section>
  )
}

export function SessionBatchCard({ s }: { s: AutoSession }) {
  const st = s.stats ?? EMPTY_STATS
  const markets = (s.mode === "manual" ? s.markets : s.active_markets) ?? []
  return (
    <Link
      href={`/automatic-signal/session/${encodeURIComponent(s.session_id)}`}
      data-testid={`auto-history-batch-${s.session_id}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-[18px] border border-white/[0.07] bg-[#0E0F11]/60 p-4 transition-colors duration-200 hover:border-[#CDFF17]/40 hover:bg-[#CDFF17]/[0.04]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="cf-orb inline-flex size-10 shrink-0 items-center justify-center rounded-xl">{s.status === "closed" ? <Layers className="size-[18px]" strokeWidth={2.2} /> : <Radio className="size-[18px]" strokeWidth={2.2} />}</span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="cf-display text-[16px] text-white">
              {st.total} Auto <span className="text-[#CDFF17]">signal{st.total === 1 ? "" : "s"}</span>
            </span>
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">
              {fmtDate(s.created_at)} · {fmtHM(s.created_at / 1000)}{s.closed_at ? ` → ${fmtHM(s.closed_at / 1000)}` : ""}
            </span>
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-[#CDFF17] transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <StatusPill status={s.status} />
          {markets.slice(0, 3).map((a) => <MarketFlagFor key={a} market={a} alt={a} size="sm" />)}
          {markets.length > 3 && <span className="cf-mono text-[11px] text-white/50">+{markets.length - 3}</span>}
        </span>
        <span className="cf-mono flex shrink-0 gap-2.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
          <span className="text-emerald-300">{st.win} W</span>
          {st.mtg_win > 0 && <span className="text-sky-300">{st.mtg_win} MTG</span>}
          <span className="text-rose-300">{st.loss} L</span>
          {st.pending > 0 && <span className="text-amber-200">{st.pending} P</span>}
        </span>
      </div>
    </Link>
  )
}
