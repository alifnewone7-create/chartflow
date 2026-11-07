"use client"

import { useState } from "react"
import { Activity, BarChart3, EyeOff, Loader2, Pause, Play, Square } from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useRtdbList } from "@/hooks/use-rtdb-list"
import { engine, fmtDate, fmtHM, fmtTime, type EngineSignal, type Market } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

import { MiniChart } from "@/components/engine/mini-chart"
import { SignalDetail } from "@/components/engine/signal-history"
import { CARD, DirectionChip, GHOST_BTN, GLOW, MarketName, ResultBadge, StatTile } from "@/components/engine/ui-bits"
import { MarketFlagFor } from "@/components/signal/market-flag"

export type AutoSession = {
  session_id: string
  status: "running" | "paused" | "closed"
  pause_reason?: string | null
  mode: "manual" | "payout"
  markets?: string[]
  active_markets?: string[]
  min_payout: number
  min_confidence: number
  mtg_steps: number
  destination: string
  created_at: number
  closed_at?: number
  last_signal_at?: number
  stats?: { total: number; pending: number; win: number; mtg_win: number; loss: number; accuracy: number | null }
}

export const EMPTY_STATS = { total: 0, pending: 0, win: 0, mtg_win: 0, loss: 0, accuracy: null as number | null }

export function StatusPill({ status, testId }: { status: AutoSession["status"]; testId?: string }) {
  const style = { running: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300", paused: "border-amber-300/40 bg-amber-300/10 text-amber-200", closed: "border-white/10 bg-white/5 text-white/55" }[status]
  return (
    <span data-testid={testId} className={cn("cf-mono inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", style)}>
      <span className={cn("size-1.5 rounded-full bg-current", status === "running" && "cf-pulse")} /> {status}
    </span>
  )
}

export function SessionRules({ s }: { s: AutoSession }) {
  const chips = [s.mode === "payout" ? `Auto · payout ≥ ${s.min_payout}%` : `Manual · ${s.markets?.length ?? 0} markets`, `Confidence ≥ ${s.min_confidence}%`, s.mtg_steps ? `MTG ${s.mtg_steps} step` : "No MTG", "M1"]
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="auto-session-rules">
      {chips.map((c) => (
        <span key={c} className="cf-mono rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10.5px] text-white/70">{c}</span>
      ))}
    </div>
  )
}

export function SessionStats({ s, testId = "auto-stat" }: { s: AutoSession; testId?: string }) {
  const st = s.stats ?? EMPTY_STATS
  const tiles: [string, string | number, string][] = [
    ["Total", st.total, "text-white"],
    ["Pending", st.pending, "text-amber-200"],
    ["Win", st.win, "text-emerald-300"],
    ["MTG Win", st.mtg_win, "text-sky-300"],
    ["Loss", st.loss, "text-rose-300"],
    ["Accuracy", st.accuracy === null ? "—" : `${st.accuracy}%`, "text-[#CDFF17]"],
  ]
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2">
      {tiles.map(([k, v, c]) => <StatTile key={k} label={k} value={v} cls={c} testId={`${testId}-${k.toLowerCase().replace(" ", "-")}`} />)}
    </div>
  )
}

export function SessionPanel({ uid, session: s, markets, showChart, title }: { uid: string; session: AutoSession; markets: Market[]; showChart: boolean; title?: string }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)

  async function control(action: "pause" | "resume" | "close") {
    setBusy(action)
    try {
      await engine(`/auto/sessions/${s.session_id}/${action}`, { method: "POST" })
      toast.success(action === "close" ? "Session closed — pending signals will still be evaluated" : `Session ${action}d`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const symbols = (s.mode === "manual" ? s.markets : s.active_markets) ?? []

  return (
    <section className={cn(CARD, "relative flex flex-col gap-4 overflow-hidden p-4 sm:p-6")} data-testid="auto-session-panel">
      {GLOW}
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="cf-orb inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Activity className="size-[18px]" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-1 leading-tight">
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.28em] text-[#CDFF17]/80" data-testid="auto-session-id">{s.session_id}</span>
            <h2 className="cf-display flex flex-wrap items-center gap-2 text-[20px] text-white sm:text-[24px]">
              {title ?? "Running"} <span className="text-[#CDFF17]">session</span> <StatusPill status={s.status} testId="auto-session-status" />
            </h2>
            <p className="text-[12px] text-white/50">
              Started {fmtDate(s.created_at)} · {fmtHM(s.created_at / 1000)}
              {s.closed_at ? ` · Closed ${fmtHM(s.closed_at / 1000)}` : ""}
              {s.last_signal_at ? ` · Last signal ${fmtHM(s.last_signal_at / 1000)}` : ""}
            </p>
            {s.pause_reason === "subscription_inactive" && <p className="text-[12px] text-amber-200">Paused: your subscription is no longer active.</p>}
          </div>
        </div>
        {s.status !== "closed" && (
          <div className="flex gap-2">
            {s.status === "running" ? (
              <button data-testid="auto-session-pause-button" onClick={() => control("pause")} disabled={!!busy} className={cn(GHOST_BTN, "h-10")}>{busy === "pause" ? <Loader2 className="size-3.5 animate-spin" /> : <Pause className="size-3.5" />} Pause</button>
            ) : (
              <button data-testid="auto-session-resume-button" onClick={() => control("resume")} disabled={!!busy} className={cn(GHOST_BTN, "h-10")}>{busy === "resume" ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Resume</button>
            )}
            <button data-testid="auto-session-close-button" onClick={() => setConfirmClose(true)} disabled={!!busy} className={cn(GHOST_BTN, "h-10 border-rose-400/40 text-rose-200")}><Square className="size-3.5" /> Close</button>
          </div>
        )}
      </div>

      <SessionRules s={s} />
      <SessionStats s={s} />
      {s.status !== "closed" && <SessionMarkets symbols={symbols} markets={markets} showChart={showChart} />}
      <SessionSignals uid={uid} sid={s.session_id} />

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent className="cf-card-strong border-0 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Close this session?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">No new signals will be generated. Signals already sent stay PENDING until their real result is verified. The session moves to History.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="auto-close-cancel" className={GHOST_BTN}>Keep running</AlertDialogCancel>
            <AlertDialogAction data-testid="auto-close-confirm" onClick={() => control("close")} className="cf-btn-volt rounded-xl font-bold">Close session</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function SessionMarkets({ symbols, markets, showChart }: { symbols: string[]; markets: Market[]; showChart: boolean }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const pay = new Map(markets.map((m) => [m.symbol, m.payout]))
  return (
    <div>
      <p className="cf-mono mb-2 text-[10.5px] uppercase tracking-[0.18em] text-white/45">
        Monitoring <span className="text-[#CDFF17]">{symbols.length}</span> market{symbols.length === 1 ? "" : "s"}
      </p>
      {!symbols.length ? (
        <p className="rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 px-4 py-3 text-[12.5px] text-white/50">No markets currently meet the session conditions. The engine re-checks payouts every minute.</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2" data-testid="auto-session-markets">
          {symbols.map((sym) => {
            const visible = open[sym] ?? showChart
            return (
              <div key={sym} className="rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <MarketFlagFor market={sym} alt={sym} size="sm" />
                    <MarketName symbol={sym} className="truncate text-[13.5px] font-semibold text-white" />
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="cf-mono text-[12px] font-bold text-[#CDFF17]">{pay.get(sym) ?? "—"}%</span>
                    <button data-testid={`auto-chart-toggle-${sym}`} onClick={() => setOpen((o) => ({ ...o, [sym]: !visible }))} className={cn(GHOST_BTN, "h-8 px-2.5 text-[11px]")}>
                      {visible ? <EyeOff className="size-3" /> : <BarChart3 className="size-3" />} {visible ? "Hide chart" : "Show chart"}
                    </button>
                  </span>
                </div>
                {visible && <div className="mt-2 overflow-hidden rounded-lg"><MiniChart asset={sym} /></div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const DELIVERY_TEXT: Record<string, string> = { sent: "Sent", sending: "Sending", failed: "Failed", skipped_late: "Skipped (late)", edited: "Sent" }

function deliveryText(s: EngineSignal) {
  return Object.entries(s.delivery ?? {}).map(([k, v]) => `${k}: ${DELIVERY_TEXT[v.state] ?? v.state}${v.result?.state ? ` · result ${DELIVERY_TEXT[v.result.state] ?? v.result.state}` : ""}`).join(" · ")
}

export function SessionSignals({ uid, sid }: { uid: string; sid: string }) {
  const { items, loading } = useRtdbList<EngineSignal>(`auto/signals/${uid}/${sid}`, 300)
  const [open, setOpen] = useState<EngineSignal | null>(null)
  if (loading) return <div className="flex items-center gap-2 text-[12.5px] text-white/55"><Loader2 className="size-4 animate-spin text-[#CDFF17]" /> Loading signals…</div>
  if (!items.length)
    return (
      <p className="rounded-xl border border-dashed border-white/[0.1] px-4 py-6 text-center text-[12.5px] text-white/50" data-testid="auto-signals-empty">
        No signals yet. The engine checks the markets every minute and only signals when real data shows a clear setup.
      </p>
    )
  return (
    <div data-testid="auto-signals-table">
      <p className="cf-mono mb-2 text-[10.5px] uppercase tracking-[0.18em] text-white/45">
        <span className="text-[#CDFF17]">{items.length}</span> signal{items.length === 1 ? "" : "s"} · tap for details
      </p>
      <ul className="flex flex-col gap-2 md:hidden">
        {items.map((s) => (
          <li key={s.key}>
            <button type="button" data-testid={`auto-signal-card-${s.key}`} onClick={() => setOpen(s)} className="flex w-full flex-col gap-2.5 rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 px-3.5 py-3 text-left transition-colors hover:border-[#CDFF17]/30">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <MarketFlagFor market={s.asset} alt={s.asset} size="sm" />
                  <MarketName symbol={s.asset} className="truncate text-[13.5px] font-semibold text-white" />
                </span>
                <ResultBadge status={s.status} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <DirectionChip direction={s.direction} />
                <span className="cf-mono text-[12px] font-bold tabular-nums text-white/85">{fmtTime(s.entry_at)} <span className="text-white/30">→</span> {fmtTime(s.expiry_at)}</span>
              </div>
              <div className="cf-mono flex justify-between text-[9.5px] uppercase tracking-[0.14em] text-white/40">
                <span>Payout <span className="text-[#CDFF17]">{s.payout ?? "—"}%</span></span>
                <span>Telegram <span className="text-white/70">{deliveryText(s) || "—"}</span></span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-xl border border-white/[0.06] md:block">
        <table className="w-full text-left text-[12.5px]">
          <thead className="cf-mono bg-[#0E0F11]/60 text-[9.5px] uppercase tracking-[0.18em] text-white/45">
            <tr>{["Market", "Signal", "Entry → Expiry", "Payout", "1st attempt", "MTG", "Result", "Telegram"].map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((s) => {
              const mtg = s.attempts?.["1"]
              return (
                <tr key={s.key} data-testid={`auto-signal-row-${s.key}`} onClick={() => setOpen(s)} className="cursor-pointer border-t border-white/[0.05] transition-colors hover:bg-white/[0.03]">
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <MarketFlagFor market={s.asset} alt={s.asset} size="sm" />
                      <MarketName symbol={s.asset} className="font-semibold text-white" />
                    </span>
                  </td>
                  <td className="px-3"><DirectionChip direction={s.direction} /></td>
                  <td className="cf-mono px-3 tabular-nums text-white/85">{fmtTime(s.entry_at)} → {fmtTime(s.expiry_at)}</td>
                  <td className="cf-mono px-3 text-[#CDFF17]">{s.payout ?? "—"}%</td>
                  <td className="cf-mono px-3 text-white/80">{s.first_result ?? "—"}</td>
                  <td className="cf-mono px-3 text-white/80">{s.first_result === "LOSS" ? (mtg ? mtg.outcome : "Checking") : "—"}</td>
                  <td className="px-3"><ResultBadge status={s.status} /></td>
                  <td className="px-3 text-[11px] text-white/55">{deliveryText(s) || "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <SignalDetail signal={open} onClose={() => setOpen(null)} />
    </div>
  )
}
