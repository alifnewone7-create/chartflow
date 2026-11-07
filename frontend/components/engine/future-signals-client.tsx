"use client"

import { useEffect, useState } from "react"
import { CalendarClock, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { engine, type EngineSignal } from "@/lib/engine-client"
import { useRtdbList } from "@/hooks/use-rtdb-list"
import { cn } from "@/lib/utils"

import { BatchCard, FUTURE_TABS } from "@/components/engine/future-batch"
import { MarketPicker, useMarkets } from "@/components/engine/market-picker"
import { PremiumGate } from "@/components/engine/premium-gate"
import { SignalHistory } from "@/components/engine/signal-history"
import { CARD, INPUT, LIME_BTN } from "@/components/engine/ui-bits"
import { SectionTabs } from "@/components/signal/section-tabs"
import { SignalShell } from "@/components/signal/signal-shell"

const MAX = 10

type Batch = { batch_id: string; requested: number; signals: EngineSignal[]; skipped_markets: number }
type Tab = "future" | "history"
const TABS = FUTURE_TABS

export function FutureSignalsClient() {
  return (
    <SignalShell>
      {({ accessToken, tier }) => (
        <PremiumGate tier={tier} feature="Future Signals">
          <FutureContent uid={accessToken} />
        </PremiumGate>
      )}
    </SignalShell>
  )
}

function FutureContent({ uid }: { uid: string }) {
  const [tab, setTab] = useState<Tab>("future")
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "history") setTab("history")
  }, [])
  const m = useMarkets()
  const [selected, setSelected] = useState<string[]>([])
  const [qty, setQty] = useState("5")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batch, setBatch] = useState<string | null>(null)
  const n = Number(qty)
  const qtyOk = Number.isInteger(n) && n >= 1 && n <= MAX

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      const res = await engine<Batch>("/future/signals", { method: "POST", body: { markets: selected, quantity: n } })
      setBatch(res.batch_id)
      toast.success(`${res.signals.length} future signal${res.signals.length === 1 ? "" : "s"} generated`)
      if (res.signals.length < res.requested) toast.message("Fewer signals than requested — some markets had no clear setup.")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cf-theme flex flex-col gap-4 sm:gap-6" data-testid="future-page">
      <SectionTabs tabs={TABS} value={tab} onChange={setTab} testId="future-tab" />

      {tab === "future" && (
        <div className="flex flex-col gap-4 sm:gap-6" data-testid="future-section">
          <section className={cn(CARD, "relative overflow-hidden p-4 sm:p-6")} data-testid="future-config">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full opacity-60 blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(205,255,23,0.16), transparent 70%)" }}
            />
            <StepHeader n={1} lead="Choose" accent="markets" hint="Pick one or more open markets. Payout is the broker payout, not the signal confidence." />
            <div className="mt-4">
              <MarketPicker {...m} onReload={m.reload} selected={selected} onChange={setSelected} testId="future-markets" />
            </div>
          </section>

          <section className={cn(CARD, "p-4 sm:p-6")} data-testid="future-quantity-card">
            <StepHeader n={2} lead="How many" accent="signals?" hint={`Between 1 and ${MAX}. Signals are spaced 2 minutes apart on the M1 timeframe.`} />
            <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr] sm:items-center">
              <input
                data-testid="future-quantity-input"
                type="number"
                min={1}
                max={MAX}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={cn(INPUT, "cf-mono h-12 text-[16px] font-bold", !qtyOk && qty !== "" && "!border-rose-400/60")}
              />
              <button
                data-testid="future-generate-button"
                onClick={generate}
                disabled={busy || !selected.length || !qtyOk}
                className={cn(LIME_BTN, "h-12 w-full text-[15px] sm:h-13 sm:justify-self-start sm:px-8")}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {busy ? "Analysing markets…" : "Generate Future Signals"}
              </button>
            </div>
            {!selected.length && (
              <p className="mt-3 text-[11.5px] text-white/40">Select at least one market above to enable generation.</p>
            )}
            {error && (
              <p data-testid="future-error" className="mt-3 rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-[12.5px] text-rose-100">
                {error}
              </p>
            )}
          </section>

          {batch && <BatchResults uid={uid} batch={batch} />}
        </div>
      )}

      {tab === "history" && (
        <div data-testid="future-history-section">
          <SignalHistory path={`signals/future/${uid}`} title="Future Signals History" testId="future-history" batches />
        </div>
      )}
    </div>
  )
}

function StepHeader({ n, lead, accent, hint }: { n: number; lead: string; accent: string; hint: string }) {
  return (
    <div className="relative flex items-start gap-3.5">
      <span className="cf-btn-volt inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold">{n}</span>
      <div className="flex min-w-0 flex-col">
        <h2 className="cf-display text-[20px] leading-tight text-white sm:text-[24px]">
          {lead} <span className="text-[#CDFF17]">{accent}</span>
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-white/50 sm:text-[13px]">{hint}</p>
      </div>
    </div>
  )
}

function BatchResults({ uid, batch }: { uid: string; batch: string }) {
  const { items } = useRtdbList<EngineSignal>(`signals/future/${uid}`, 40)
  const rows = items.filter((s) => s.batch_id === batch)
  if (!rows.length) return null
  return (
    <section className={cn(CARD, "p-4 sm:p-6")} data-testid="future-batch-results">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="cf-display inline-flex items-center gap-2 text-[20px] text-white sm:text-[24px]">
          <CalendarClock className="size-5 text-[#CDFF17]" /> Your new <span className="text-[#CDFF17]">signals</span>
        </h2>
        <span className="cf-mono text-[10.5px] uppercase tracking-[0.18em] text-white/45">Tap to open</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <BatchCard batch={{ id: batch, signals: rows.sort((a, b) => a.entry_at - b.entry_at) }} testId="future-new-batch-card" />
      </div>
    </section>
  )
}
