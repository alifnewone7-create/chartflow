"use client"

import { useEffect, useState } from "react"
import { Gauge, Loader2, Play, Settings, Sparkles, Target } from "lucide-react"
import { toast } from "sonner"

import { useRtdbValue } from "@/hooks/use-rtdb-list"
import { engine, marketLabel } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

import { MarketPicker, useMarkets } from "@/components/engine/market-picker"
import { CARD, GHOST_BTN, GLOW, INPUT, LIME_BTN, SectionHead } from "@/components/engine/ui-bits"

export type MarketType = "otc" | "real" | "both"

export type AutoSettings = {
  destination: "personal" | "channel" | "both"
  channel_id: string | null
  channel_title: string | null
  channel_verified: boolean
  channel_error?: string | null
  min_payout: number
  market_type: MarketType
  min_confidence: number
  mtg_steps: number
  show_chart: boolean
  result_notifications: boolean
  auto_report: boolean
}

export const DEFAULTS: AutoSettings = {
  destination: "personal",
  channel_id: null,
  channel_title: null,
  channel_verified: false,
  min_payout: 80,
  market_type: "both",
  min_confidence: 60,
  mtg_steps: 1,
  show_chart: false,
  result_notifications: true,
  auto_report: false,
}

export function useAutoSettings(uid: string): AutoSettings {
  const { value } = useRtdbValue<Partial<AutoSettings>>(`auto/settings/${uid}`)
  return { ...DEFAULTS, ...(value ?? {}) }
}

const PAYOUTS = [70, 75, 80, 85, 90]
const CONFS = [50, 60, 70, 80]
const MTG = [
  { v: 0, label: "No MTG", hint: "Entry candle only" },
  { v: 1, label: "1 step", hint: "One martingale candle" },
  { v: 2, label: "2 steps", hint: "Two martingale candles" },
]

type Props = { uid: string; tgConnected: boolean; tgEnabled: boolean; onOpenSettings: () => void }

export function AutoConfig({ uid, tgConnected, tgEnabled, onOpenSettings }: Props) {
  const live = useAutoSettings(uid)
  const pick = () => ({ min_payout: live.min_payout, market_type: live.market_type, min_confidence: live.min_confidence, mtg_steps: live.mtg_steps })
  const [rules, setRules] = useState(pick)
  const [touched, setTouched] = useState(false)
  const [mode, setMode] = useState<"manual" | "payout">("payout")
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const m = useMarkets()
  const liveKey = `${live.min_payout}|${live.market_type}|${live.min_confidence}|${live.mtg_steps}`
  useEffect(() => {
    if (!touched) setRules(pick())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey])

  const patch = (p: Partial<typeof rules>) => (setRules((r) => ({ ...r, ...p })), setTouched(true))
  const needsChannel = live.destination !== "personal"
  const typed = m.markets.filter((x) => typeMatches(x.symbol, rules.market_type))
  const eligible = typed.filter((x) => x.payout >= rules.min_payout)
  const blocker = !tgEnabled
    ? "The Telegram bot is not configured on the signal server yet."
    : !tgConnected
      ? "Connect your Telegram account in Settings before starting."
      : needsChannel && !live.channel_verified
        ? "Verify your Telegram channel in Settings before starting."
        : mode === "manual" && !selected.length
          ? "Select at least one market."
          : null

  async function start() {
    setBusy(true)
    try {
      await engine("/auto/settings", { method: "PUT", body: rules })
      await engine("/auto/sessions", { method: "POST", body: { mode, markets: mode === "manual" ? selected : [] } })
      toast.success("Automatic session started — it keeps running even if you close the browser")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6" data-testid="auto-config">
      <section className={cn(CARD, "relative overflow-hidden p-4 sm:p-6")} data-testid="auto-market-card">
        {GLOW}
        <SectionHead Icon={Target} eyebrow="Step 1" lead="Market" accent="selection" hint="Let the engine pick every market above your payout floor, or hand-pick the markets yourself." />
        <div className="mt-4 grid grid-cols-2 gap-2" role="tablist">
          <ModeButton on={mode === "payout"} onClick={() => setMode("payout")} testId="auto-mode-payout" title="Automatic by payout" hint="Engine scans all open markets" Icon={Sparkles} />
          <ModeButton on={mode === "manual"} onClick={() => setMode("manual")} testId="auto-mode-manual" title="Manual selection" hint="Only the markets you choose" Icon={Target} />
        </div>
        <div className="mt-4">
          {mode === "manual" ? (
            <MarketPicker {...m} onReload={m.reload} selected={selected} onChange={setSelected} testId="auto-markets" />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 px-4 py-3" data-testid="auto-payout-preview">
              <p className="text-[12.5px] leading-relaxed text-white/60">
                <span className="cf-display text-[20px] text-[#CDFF17]">{eligible.length}</span>
                <span className="text-white/40"> / {typed.length}</span> open {TYPE_WORD[rules.market_type]}markets currently pay ≥ {rules.min_payout}%. The list refreshes automatically while the session runs.
              </p>
              {eligible.length ? <EligibleList items={eligible} /> : (
                <p className="w-full text-[11.5px] text-amber-200" data-testid="auto-eligible-empty">
                  {typed.length ? `No ${TYPE_WORD[rules.market_type]}markets pay ≥ ${rules.min_payout}% right now — the engine keeps checking every minute.` : `${rules.market_type === "real" ? "Real" : "OTC"} markets are closed right now — the session will wait until they open.`}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className={cn(CARD, "relative overflow-hidden p-4 sm:p-6")} data-testid="auto-rules-card">
        <SectionHead Icon={Gauge} eyebrow="Step 2" lead="Session" accent="rules" hint="Timeframe M1 (fixed) · Timezone Asia/Dhaka. These rules are saved with the session." />
        {mode === "payout" && <MarketTypePicker value={rules.market_type} onChange={(v) => patch({ market_type: v })} />}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <NumField label="Minimum payout" unit="%" value={rules.min_payout} min={1} max={100} presets={PAYOUTS} onChange={(v) => patch({ min_payout: v })} testId="auto-min-payout" hint="Broker payout floor" />
          <NumField label="Minimum confidence" unit="%" value={rules.min_confidence} min={40} max={95} presets={CONFS} onChange={(v) => patch({ min_confidence: v })} testId="auto-min-confidence" hint="Signal strength floor" />
          <div>
            <Label>MTG steps</Label>
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" data-testid="auto-mtg-steps">
              {MTG.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={rules.mtg_steps === o.v}
                  data-testid={`auto-mtg-${o.v}`}
                  onClick={() => patch({ mtg_steps: o.v })}
                  className={cn(
                    "flex h-[52px] flex-col items-center justify-center rounded-xl border text-[12.5px] font-bold transition-colors duration-200",
                    rules.mtg_steps === o.v ? "border-[#CDFF17]/50 bg-[#CDFF17]/[0.1] text-[#CDFF17]" : "border-white/[0.07] bg-[#0E0F11]/50 text-white/65 hover:border-white/15 hover:text-white",
                  )}
                >
                  {o.label}
                  <span className="cf-mono mt-0.5 text-[8.5px] font-normal uppercase tracking-[0.1em] text-white/40">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[12px] text-white/55">
            {blocker ? (
              <span className="inline-flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-3 py-2 text-amber-100" data-testid="auto-start-hint">
                {blocker}
                {blocker.includes("Settings") && (
                  <button type="button" onClick={onOpenSettings} className={cn(GHOST_BTN, "h-7 px-2 text-[11px]")} data-testid="auto-open-settings-button">
                    <Settings className="size-3" /> Open
                  </button>
                )}
              </span>
            ) : (
              <span data-testid="auto-start-ready">Signals go to <span className="font-semibold text-white">{live.destination === "personal" ? "your Telegram chat" : live.destination === "channel" ? live.channel_title ?? "your channel" : "your chat + channel"}</span>. Change it in Settings.</span>
            )}
          </div>
          <button data-testid="auto-start-session-button" onClick={start} disabled={busy || !!blocker} className={cn(LIME_BTN, "h-12 px-8 text-[15px]")}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} {busy ? "Starting…" : "Start session"}
          </button>
        </div>
      </section>
    </div>
  )
}

function ModeButton({ on, onClick, testId, title, hint, Icon }: { on: boolean; onClick: () => void; testId: string; title: string; hint: string; Icon: typeof Sparkles }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3 py-3 text-left transition-colors duration-200 sm:items-center sm:gap-3 sm:px-3.5",
        on ? "border-[#CDFF17]/50 bg-[#CDFF17]/[0.08]" : "border-white/[0.07] bg-[#0E0F11]/50 hover:border-white/15",
      )}
    >
      <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-9", on ? "bg-[#CDFF17] text-[#141517]" : "bg-white/[0.05] text-white/60")}>
        <Icon className="size-4" strokeWidth={2.3} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
        <span className={cn("text-[13px] font-bold sm:text-[13.5px]", on ? "text-white" : "text-white/75")}>{title}</span>
        <span className="text-[10.5px] text-white/45 sm:text-[11px]">{hint}</span>
      </span>
    </button>
  )
}

export function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/50">{children}</p>
}

function NumField({ label, unit, value, min, max, presets, onChange, testId, hint }: { label: string; unit: string; value: number; min: number; max: number; presets: number[]; onChange: (v: number) => void; testId: string; hint: string }) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const commit = () => {
    const n = Number(text)
    const next = Number.isFinite(n) && text !== "" ? Math.max(min, Math.min(max, Math.round(n))) : value
    onChange(next)
    setText(String(next))
  }
  return (
    <div>
      <Label>{label}</Label>
      <label className={cn(INPUT, "flex h-[52px] items-center gap-2")}>
        <input
          data-testid={testId}
          type="number"
          min={min}
          max={max}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="cf-mono w-full bg-transparent text-[18px] font-bold text-white outline-none"
        />
        <span className="cf-mono text-[13px] text-[#CDFF17]">{unit}</span>
      </label>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {presets.map((p) => (
          <button key={p} type="button" onClick={() => onChange(p)} data-testid={`${testId}-preset-${p}`} className={cn("cf-mono rounded-md border px-1.5 py-0.5 text-[10.5px] transition-colors", value === p ? "border-[#CDFF17]/50 text-[#CDFF17]" : "border-white/[0.07] text-white/45 hover:text-white")}>
            {p}
          </button>
        ))}
        <span className="ml-auto text-[10.5px] text-white/35">{hint}</span>
      </div>
    </div>
  )
}

const PREVIEW = 6

function EligibleList({ items }: { items: { symbol: string; payout: number }[] }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, PREVIEW)
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5" data-testid="auto-eligible-list">
      {shown.map((x) => {
        const { base, otc } = marketLabel(x.symbol)
        return (
          <span key={x.symbol} data-testid={`auto-eligible-${x.symbol}`} className="cf-mono rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10.5px] text-white/70">
            {base}{otc ? " (OTC)" : ""} <span className="text-[#CDFF17]">{x.payout}%</span>
          </span>
        )
      })}
      {items.length > PREVIEW && (
        <button type="button" onClick={() => setAll((v) => !v)} data-testid="auto-eligible-toggle" className="cf-mono rounded-lg px-2 py-1 text-[10.5px] font-semibold text-[#CDFF17] hover:underline">
          {all ? "Show less" : `Show all (+${items.length - PREVIEW})`}
        </button>
      )}
    </div>
  )
}

const TYPE_WORD: Record<MarketType, string> = { otc: "OTC ", real: "real ", both: "" }
const TYPES: { v: MarketType; label: string }[] = [
  { v: "otc", label: "Only OTC" },
  { v: "real", label: "Only Real" },
  { v: "both", label: "OTC + Real" },
]

export function typeMatches(symbol: string, t: MarketType) {
  const otc = /_otc$/i.test(symbol)
  return t === "both" || (t === "otc" ? otc : !otc)
}

function MarketTypePicker({ value, onChange }: { value: MarketType; onChange: (v: MarketType) => void }) {
  return (
    <div className="mt-4">
      <Label>Market type</Label>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" data-testid="auto-market-type">
        {TYPES.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            data-testid={`auto-market-type-${o.v}`}
            onClick={() => onChange(o.v)}
            className={cn(
              "flex min-h-[44px] items-center justify-center rounded-xl border px-1.5 py-2 text-center text-[12.5px] font-bold leading-tight transition-colors duration-200",
              value === o.v ? "border-[#CDFF17]/50 bg-[#CDFF17]/[0.1] text-[#CDFF17]" : "border-white/[0.07] bg-[#0E0F11]/50 text-white/65 hover:border-white/15 hover:text-white",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
