"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, CalendarClock, ChevronRight, History, Layers, Loader2 } from "lucide-react"

import { useRtdbList } from "@/hooks/use-rtdb-list"
import { fmtDate, fmtTime, type EngineSignal } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

import { PremiumGate } from "@/components/engine/premium-gate"
import { SignalDetail } from "@/components/engine/signal-history"
import { CARD, DirectionChip, MarketName, ResultBadge } from "@/components/engine/ui-bits"
import { MarketFlagFor } from "@/components/signal/market-flag"
import { SectionTabs } from "@/components/signal/section-tabs"
import { SignalShell } from "@/components/signal/signal-shell"

export type Batch = { id: string; signals: EngineSignal[] }

export const batchId = (s: EngineSignal) => s.batch_id ?? s.key

/** Groups signals by batch, newest batch first, signals in entry order. */
export function groupBatches(items: EngineSignal[]): Batch[] {
  const map = new Map<string, EngineSignal[]>()
  for (const s of items) map.set(batchId(s), [...(map.get(batchId(s)) ?? []), s])
  return [...map.entries()]
    .map(([id, signals]) => ({ id, signals: signals.sort((a, b) => a.entry_at - b.entry_at) }))
    .sort((a, b) => Math.max(...b.signals.map((s) => s.generated_at)) - Math.max(...a.signals.map((s) => s.generated_at)))
}

function batchStats(signals: EngineSignal[]) {
  const win = signals.filter((s) => s.status === "WIN").length
  const mtg = signals.filter((s) => s.status === "MTG WIN").length
  const loss = signals.filter((s) => s.status === "LOSS").length
  return { win, mtg, loss, pending: signals.length - win - mtg - loss }
}

export const FUTURE_TABS = [
  { key: "future" as const, label: "Future Signal", Icon: CalendarClock },
  { key: "history" as const, label: "Signal History", Icon: History },
]

const BATCH_TABS = [{ key: "back" as const, label: "Back", Icon: ArrowLeft }, FUTURE_TABS[1]]

export function BatchCard({ batch, testId }: { batch: Batch; testId: string }) {
  const { signals } = batch
  const first = signals[0]
  const last = signals[signals.length - 1]
  const markets = [...new Set(signals.map((s) => s.asset))]
  const st = batchStats(signals)
  return (
    <Link
      href={`/future-signals/batch/${encodeURIComponent(batch.id)}`}
      data-testid={testId}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-[18px] border border-white/[0.07] bg-[#0E0F11]/60 p-4 transition-colors duration-200 hover:border-[#CDFF17]/40 hover:bg-[#CDFF17]/[0.04]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="cf-orb inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Layers className="size-[18px]" strokeWidth={2.2} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="cf-display text-[16px] text-white">
              {signals.length} Future <span className="text-[#CDFF17]">signal{signals.length === 1 ? "" : "s"}</span>
            </span>
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">
              {fmtDate(first.entry_at * 1000)} · {fmtTime(first.entry_at)} → {fmtTime(last.expiry_at)}
            </span>
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-[#CDFF17] transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          {markets.slice(0, 4).map((a) => (
            <MarketFlagFor key={a} market={a} alt={a} size="sm" />
          ))}
          {markets.length > 4 && <span className="cf-mono text-[11px] text-white/50">+{markets.length - 4}</span>}
        </span>
        <span className="cf-mono flex shrink-0 gap-2.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
          <span className="text-emerald-300">{st.win} W</span>
          {st.mtg > 0 && <span className="text-sky-300">{st.mtg} MTG</span>}
          <span className="text-rose-300">{st.loss} L</span>
          {st.pending > 0 && <span className="text-amber-200">{st.pending} P</span>}
        </span>
      </div>
    </Link>
  )
}

export function FutureSignalCard({ s, onOpen }: { s: EngineSignal; onOpen?: () => void }) {
  return (
    <button type="button" onClick={onOpen} data-testid={`future-signal-${s.key}`} className="cf-card-strong rounded-[18px] p-3.5 text-left transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <MarketFlagFor market={s.asset} alt={s.asset} size="sm" />
          <MarketName symbol={s.asset} className="cf-display truncate text-[14.5px] text-white" />
        </span>
        <ResultBadge status={s.status} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <DirectionChip direction={s.direction} />
        <span className="cf-mono text-[12.5px] font-bold tabular-nums text-white">
          {fmtTime(s.entry_at)} <span className="text-white/35">→</span> {fmtTime(s.expiry_at)}
        </span>
      </div>
      <div className="cf-mono mt-2.5 flex justify-between text-[10px] uppercase tracking-[0.14em] text-white/45">
        <span>Payout <span className="text-[#CDFF17]">{s.payout ?? "—"}%</span></span>
        <span>Confidence <span className="text-white">{Math.round(s.confidence * 100)}%</span></span>
      </div>
    </button>
  )
}

export function FutureBatchPageClient() {
  return (
    <SignalShell>
      {({ accessToken, tier }) => (
        <PremiumGate tier={tier} feature="Future Signals">
          <BatchDetail uid={accessToken} />
        </PremiumGate>
      )}
    </SignalShell>
  )
}

function BatchDetail({ uid }: { uid: string }) {
  const { id } = useParams<{ id: string }>()
  const bid = decodeURIComponent(id)
  const { items, loading } = useRtdbList<EngineSignal>(`signals/future/${uid}`, 500)
  const [open, setOpen] = useState<EngineSignal | null>(null)
  const signals = items.filter((s) => batchId(s) === bid).sort((a, b) => a.entry_at - b.entry_at)
  const st = batchStats(signals)
  const router = useRouter()

  return (
    <div className="cf-theme flex flex-col gap-4 sm:gap-6" data-testid="future-batch-page">
      <SectionTabs tabs={BATCH_TABS} value="history" onChange={() => router.push("/future-signals?tab=history")} testId="future-batch-tab" />

      <section className={cn(CARD, "relative overflow-hidden p-4 sm:p-6")}>
        <span aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, rgba(205,255,23,0.16), transparent 70%)" }} />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="cf-orb inline-flex size-11 items-center justify-center rounded-full">
              <CalendarClock className="size-5" strokeWidth={2.2} aria-hidden />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="cf-mono text-[9.5px] uppercase tracking-[0.28em] text-[#CDFF17]/80">
                {signals[0] ? fmtDate(signals[0].entry_at * 1000) : "Signal batch"}
              </span>
              <h1 className="cf-display text-[22px] text-white sm:text-[28px]">
                Future <span className="text-[#CDFF17]">signals</span>
              </h1>
            </div>
          </div>
          <div className="grid w-full grid-cols-5 gap-1.5 sm:w-auto sm:gap-2" data-testid="future-batch-stats">
            {[["Signals", signals.length, "text-white"], ["Win", st.win, "text-emerald-300"], ["MTG Win", st.mtg, "text-sky-300"], ["Loss", st.loss, "text-rose-300"], ["Pending", st.pending, "text-amber-200"]].map(([k, v, c]) => (
              <span key={k as string} className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 px-1.5 py-2 text-center leading-none sm:w-[92px] sm:px-2">
                <span className="cf-mono w-full truncate text-[7.5px] uppercase tracking-[0.12em] text-white/45 sm:text-[9px] sm:tracking-[0.16em]">{k}</span>
                <span className={cn("cf-display text-[15px] tabular-nums sm:text-[18px]", c as string)}>{v}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="relative mt-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-white/60"><Loader2 className="size-4 animate-spin text-[#CDFF17]" /> Loading signals…</div>
          ) : !signals.length ? (
            <p className="py-12 text-center text-[13px] text-white/55" data-testid="future-batch-empty">This signal batch could not be found.</p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" data-testid="future-batch-list">
              {signals.map((s) => <FutureSignalCard key={s.key} s={s} onOpen={() => setOpen(s)} />)}
            </div>
          )}
        </div>
      </section>
      <SignalDetail signal={open} onClose={() => setOpen(null)} />
    </div>
  )
}
