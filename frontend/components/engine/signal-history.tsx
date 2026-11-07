"use client"

import { useMemo, useState } from "react"
import { History, Inbox, Loader2, Search } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRtdbList } from "@/hooks/use-rtdb-list"
import { dhakaDay, fmtDate, fmtTime, type EngineSignal, type SignalStatus } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

import { CARD, DirectionChip, GHOST_BTN, INPUT, MarketName, ResultBadge, marketText } from "@/components/engine/ui-bits"
import { MarketFlagFor } from "@/components/signal/market-flag"
import { BatchCard, groupBatches } from "@/components/engine/future-batch"
import { HistoryDatePicker, dayLabel, todayDay } from "@/components/engine/history-date-picker"

const PAGE = 15
const RESULTS: ("ALL" | SignalStatus)[] = ["ALL", "WIN", "MTG WIN", "LOSS", "PENDING"]

type Props = { path: string | null; title: string; testId: string; id?: string; batches?: boolean }

export function SignalHistory({ path, title, testId, id, batches }: Props) {
  const [limit, setLimit] = useState(batches ? 300 : 100)
  const { items, loading, error } = useRtdbList<EngineSignal>(path, limit)
  const [q, setQ] = useState("")
  const [day, setDay] = useState(todayDay)
  const [dir, setDir] = useState<"ALL" | "CALL" | "PUT">("ALL")
  const [res, setRes] = useState<(typeof RESULTS)[number]>("ALL")
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState<EngineSignal | null>(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
    return items.filter(
      (s) =>
        (!needle || s.asset.toLowerCase().replace(/[^a-z0-9]+/g, "").includes(needle) || s.asset_name?.toLowerCase().replace(/[^a-z0-9]+/g, "").includes(needle)) &&
        (dir === "ALL" || s.direction === dir) &&
        (res === "ALL" || s.status === res) &&
        (!day || dhakaDay(s.entry_at * 1000) === day),
    )
  }, [items, q, dir, res, day])
  const groups = useMemo(() => (batches ? groupBatches(filtered) : []), [batches, filtered])
  const total = batches ? groups.length : filtered.length
  const pages = Math.max(1, Math.ceil(total / PAGE))
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE)
  const groupRows = groups.slice(page * PAGE, page * PAGE + PAGE)
  const reset = () => setPage(0)
  const stats = useMemo(() => {
    const win = filtered.filter((s) => s.status === "WIN").length
    const mtg = filtered.filter((s) => s.status === "MTG WIN").length
    const loss = filtered.filter((s) => s.status === "LOSS").length
    const done = win + mtg + loss
    return { win, mtg, loss, rate: done ? Math.round(((win + mtg) / done) * 100) : null }
  }, [filtered])

  const [lead, ...rest] = title.split(" ")

  return (
    <section id={id} data-testid={testId} className={cn(CARD, "relative overflow-hidden p-4 sm:p-6")}>
      <span
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 size-56 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(205,255,23,0.14), transparent 70%)" }}
      />
      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="cf-orb inline-flex size-10 items-center justify-center rounded-full">
            <History className="size-[18px]" strokeWidth={2.2} />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.28em] text-[#CDFF17]/80">Saved · verified by engine</span>
            <h2 className="cf-display text-[20px] text-white sm:text-[24px]">
              {lead} <span className="text-[#CDFF17]">{rest.join(" ")}</span>
            </h2>
          </div>
        </div>
        <div className="grid w-full grid-cols-5 gap-1.5 sm:w-auto sm:gap-2" data-testid={`${testId}-stats`}>
          <Stat label="Signals" value={String(filtered.length)} testId={`${testId}-count`} />
          <Stat label="Win rate" value={stats.rate === null ? "—" : `${stats.rate}%`} tone={stats.rate !== null && stats.rate >= 50 ? "good" : undefined} testId={`${testId}-winrate`} />
          <Stat label="Win" value={String(stats.win)} cls="text-emerald-300" testId={`${testId}-win`} />
          <Stat label="MTG Win" value={String(stats.mtg)} cls="text-sky-300" testId={`${testId}-mtg`} />
          <Stat label="Loss" value={String(stats.loss)} cls="text-rose-300" testId={`${testId}-loss`} />
        </div>
      </div>

      <div className="relative mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className={cn(INPUT, "flex items-center gap-2.5")}>
          <Search className="size-4 shrink-0 text-[#CDFF17]/80" />
          <input data-testid={`${testId}-search`} value={q} onChange={(e) => (setQ(e.target.value), reset())} placeholder="Search market" className="w-full bg-transparent text-[13.5px] text-white outline-none placeholder:text-white/35" />
        </label>
        <HistoryDatePicker value={day} onChange={(d) => (setDay(d), reset())} testId={testId} />
        <select data-testid={`${testId}-direction`} value={dir} onChange={(e) => (setDir(e.target.value as typeof dir), reset())} className={INPUT}>
          <option value="ALL">UP & DOWN</option>
          <option value="CALL">UP</option>
          <option value="PUT">DOWN</option>
        </select>
        <select data-testid={`${testId}-result`} value={res} onChange={(e) => (setRes(e.target.value as typeof res), reset())} className={INPUT}>
          {RESULTS.map((r) => (
            <option key={r} value={r}>{r === "ALL" ? "All results" : r}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-white/60" data-testid={`${testId}-loading`}>
          <Loader2 className="size-4 animate-spin text-[#CDFF17]" /> Loading history…
        </div>
      ) : error ? (
        <p className="rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-[12.5px] text-rose-100" data-testid={`${testId}-error`}>
          Couldn't load your history: {error}
        </p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center" data-testid={`${testId}-empty`}>
          <span className="cf-orb inline-flex size-12 items-center justify-center rounded-full">
            <Inbox className="size-5" />
          </span>
          <p className="max-w-xs text-[13px] leading-relaxed text-white/55">
            {items.length ? `No signals found for ${dayLabel(day)}.` : "No signals yet. Generated signals appear here and stay saved."}
          </p>
        </div>
      ) : batches ? (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" data-testid={`${testId}-batches`}>
          {groupRows.map((b) => <BatchCard key={b.id} batch={b} testId={`${testId}-batch-${b.id}`} />)}
        </div>
      ) : (
        <>
          {/* Mobile — stacked cards */}
          <ul className="flex flex-col gap-2 md:hidden" data-testid={`${testId}-cards`}>
            {rows.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  data-testid={`${testId}-card-${s.key}`}
                  onClick={() => setOpen(s)}
                  className="flex w-full flex-col gap-2.5 rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 px-3.5 py-3 text-left transition-colors hover:border-[#CDFF17]/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <MarketFlagFor market={s.asset} alt={s.asset} size="sm" />
                      <span className="flex min-w-0 flex-col leading-tight">
                        <MarketName symbol={s.asset} className="truncate text-[13.5px] font-semibold text-white" />
                        <span className="cf-mono text-[9.5px] uppercase tracking-[0.14em] text-white/40">{fmtDate(s.entry_at * 1000)}</span>
                      </span>
                    </span>
                    <ResultBadge status={s.status} testId={`${testId}-card-${s.key}-status`} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <DirectionChip direction={s.direction} />
                    <span className="cf-mono text-[12px] font-bold tabular-nums text-white/85">
                      {fmtTime(s.entry_at)} <span className="text-white/30">→</span> {fmtTime(s.expiry_at)}
                    </span>
                  </div>
                  <div className="cf-mono flex justify-between text-[9.5px] uppercase tracking-[0.14em] text-white/40">
                    <span>Payout <span className="text-[#CDFF17]">{s.payout ? `${s.payout}%` : "—"}</span></span>
                    <span>Confidence <span className="text-white/80">{Math.round(s.confidence * 100)}%</span></span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop — table */}
          <div className="hidden overflow-hidden rounded-xl border border-white/[0.06] md:block">
            <table className="w-full text-left text-[12.5px]">
              <thead className="cf-mono bg-[#0E0F11]/60 text-[9.5px] uppercase tracking-[0.18em] text-white/45">
                <tr>
                  {["Market", "Signal", "Entry → Expiry", "Payout", "Confidence", "Result"].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <HistoryRow key={s.key} s={s} onOpen={() => setOpen(s)} testId={`${testId}-row-${s.key}`} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button data-testid={`${testId}-prev`} className={cn(GHOST_BTN, "h-9")} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span className="cf-mono text-[11px] text-white/55">{page + 1} / {pages}</span>
          <button data-testid={`${testId}-next`} className={cn(GHOST_BTN, "h-9")} disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
        {items.length >= limit && (
          <button data-testid={`${testId}-load-more`} className={cn(GHOST_BTN, "h-9")} onClick={() => setLimit((l) => l + 100)}>Load older</button>
        )}
      </div>

      <SignalDetail signal={open} onClose={() => setOpen(null)} />
    </section>
  )
}

function Stat({ label, value, tone, cls, testId }: { label: string; value: string; tone?: "good"; cls?: string; testId?: string }) {
  return (
    <span className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 px-1.5 py-2 text-center leading-none sm:w-[92px] sm:px-2">
      <span className="cf-mono w-full truncate text-[7.5px] uppercase tracking-[0.12em] text-white/45 sm:text-[9px] sm:tracking-[0.16em]">{label}</span>
      <span data-testid={testId} className={cn("cf-display text-[15px] tabular-nums text-white sm:text-[18px]", tone === "good" && "text-[#CDFF17]", cls)}>{value}</span>
    </span>
  )
}

function HistoryRow({ s, onOpen, testId }: { s: EngineSignal; onOpen: () => void; testId: string }) {
  return (
    <tr data-testid={testId} onClick={onOpen} className="cursor-pointer border-t border-white/[0.05] transition-colors hover:bg-white/[0.03]">
      <td className="px-3 py-2.5">
        <span className="flex items-center gap-2.5">
          <MarketFlagFor market={s.asset} alt={s.asset} size="sm" />
          <span className="flex flex-col leading-tight">
            <MarketName symbol={s.asset} className="font-semibold text-white" />
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.12em] text-white/40">{fmtDate(s.entry_at * 1000)}</span>
          </span>
        </span>
      </td>
      <td className="px-3"><DirectionChip direction={s.direction} /></td>
      <td className="cf-mono px-3 tabular-nums text-white/85">{fmtTime(s.entry_at)} → {fmtTime(s.expiry_at)}</td>
      <td className="cf-mono px-3 text-[#CDFF17]">{s.payout ? `${s.payout}%` : "—"}</td>
      <td className="cf-mono px-3 text-white/85">{Math.round(s.confidence * 100)}%</td>
      <td className="px-3"><ResultBadge status={s.status} testId={`${testId}-status`} /></td>
    </tr>
  )
}

export function SignalDetail({ signal: s, onClose }: { signal: EngineSignal | null; onClose: () => void }) {
  return (
    <Dialog open={!!s} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="signal-detail-dialog" className="cf-card-strong max-h-[85svh] overflow-y-auto rounded-[22px] border-0 text-white sm:max-w-lg">
        {s && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-white">
                <MarketFlagFor market={s.asset} alt={s.asset} size="sm" />
                <span className="cf-display text-[18px]">{marketText(s.asset)}</span>
                <DirectionChip direction={s.direction} /> <ResultBadge status={s.status} />
              </DialogTitle>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-2 text-[12.5px]">
              <Item k="Signal ID" v={s.signal_id} mono />
              <Item k="Timeframe" v="M1" />
              <Item k="Entry" v={fmtTime(s.entry_at)} mono />
              <Item k="Expiry" v={fmtTime(s.expiry_at)} mono />
              <Item k="Payout" v={s.payout ? `${s.payout}%` : "—"} />
              <Item k="Confidence" v={`${Math.round(s.confidence * 100)}%`} />
              <Item k="Generated" v={new Date(s.generated_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} />
              <Item k="MTG" v={s.mtg_steps ? `${s.mtg_steps} step` : "Off"} />
              <Item k="First attempt" v={s.first_result ?? "—"} />
              <Item k="Evaluation" v={s.eval_state.replace(/_/g, " ")} />
            </dl>
            {s.attempts && Object.keys(s.attempts).length > 0 && (
              <div className="mt-2 space-y-1.5">
                <p className="cf-mono text-[9.5px] uppercase tracking-[0.2em] text-[#CDFF17]/80">Verified candles</p>
                {Object.values(s.attempts).map((a) => (
                  <div key={a.step} className="cf-mono flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 px-3 py-2 text-[11.5px]">
                    <span>{a.step === 0 ? "Entry" : `MTG ${a.step}`} · {fmtTime(a.candle_time)}</span>
                    <span className="text-white/70">O {a.open} → C {a.close}</span>
                    <span className={a.color === "green" ? "text-emerald-300" : a.color === "red" ? "text-rose-300" : "text-amber-200"}>{a.outcome}</span>
                  </div>
                ))}
              </div>
            )}
            {s.review_required && <p className="text-[12px] text-amber-200">The entry candle closed flat (doji). This signal stays PENDING until the broker data confirms a direction.</p>}
            {s.analysis?.summary && <p className="mt-2 rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 p-3 text-[12px] leading-relaxed text-white/75">{s.analysis.summary}</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Item({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 px-3 py-2">
      <dt className="cf-mono text-[9px] uppercase tracking-[0.2em] text-white/40">{k}</dt>
      <dd className={cn("mt-0.5 break-all text-white", mono && "cf-mono text-[11.5px]")}>{v}</dd>
    </div>
  )
}
