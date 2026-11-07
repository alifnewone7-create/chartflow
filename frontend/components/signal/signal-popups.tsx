"use client"

/**
 * Full-screen popups for the signal generator. Every popup is portaled to
 * <body> so an animated/transformed ancestor can never trap it inside a
 * section — it always covers the entire viewport.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CircleSlash,
  Clock,
  ListChecks,
  Percent,
  Repeat2,
  X,
} from "lucide-react"

import type { SignalDirection, SignalResponse } from "@/lib/signals-client"
import type { SignalSystem } from "@/lib/tiers"
import { matchAllowedMarket } from "@/lib/allowed-markets"
import { MarketFlagFor } from "@/components/signal/market-flag"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Shared full-screen frame                                                  */
/* -------------------------------------------------------------------------- */

function ModalFrame({
  z = "z-[100]",
  labelledBy,
  testId,
  onBackdrop,
  children,
  className,
  style,
}: {
  z?: string
  labelledBy: string
  testId: string
  onBackdrop?: () => void
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  if (typeof document === "undefined") return null
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      data-testid={testId}
      onClick={onBackdrop}
      className={cn("fixed inset-0 flex items-center justify-center overflow-y-auto bg-[#0C0D0E]/85 px-4 py-6 backdrop-blur-md", z)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn("cf-card-strong cf-rise relative my-auto w-full overflow-hidden rounded-[22px] sm:rounded-[26px]", className)}
        style={style}
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        {children}
      </div>
    </div>,
    document.body,
  )
}

/* -------------------------------------------------------------------------- */
/*  Wait-for-next-candle warning                                              */
/* -------------------------------------------------------------------------- */

export function WaitWarningPopup({ open, minRemaining, onClose }: { open: boolean; minRemaining: number; onClose: () => void }) {
  if (!open) return null
  return (
    <ModalFrame
      labelledBy="wait-warning-title"
      testId="wait-warning-popup"
      className="max-w-sm p-6 text-center sm:p-7"
      style={{ background: "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(251,191,36,0.16), transparent 60%), linear-gradient(180deg,#1b1d21 0%,#121316 100%)" }}
    >
      <span className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-full border border-amber-400/35 bg-amber-400/12 text-amber-300 shadow-[0_0_32px_-8px_rgba(251,191,36,0.6)]">
        <AlertTriangle className="size-6" strokeWidth={2.3} aria-hidden />
      </span>
      <h2 id="wait-warning-title" className="cf-display text-[22px] text-white sm:text-[24px]">
        Wait for the <span className="text-amber-300">next candle</span>
      </h2>
      <p className="mt-2 text-pretty text-[13px] leading-relaxed text-white/60 sm:text-[13.5px]">
        Live signals need at least {minRemaining}s left on the running candle. Let this candle close, then tap generate again.
      </p>
      <button
        type="button"
        onClick={onClose}
        autoFocus
        data-testid="wait-warning-ok"
        className="cf-btn-volt mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl text-[14.5px] font-bold"
      >
        Yes, understood
      </button>
    </ModalFrame>
  )
}

/* -------------------------------------------------------------------------- */
/*  Signal result popup                                                       */
/* -------------------------------------------------------------------------- */

type SignalResultProps = {
  open: boolean
  result: SignalResponse | null
  period: number
  system: SignalSystem
  onClose: () => void
}

const TONES = {
  CALL: { label: "UP", color: "#34D399", soft: "rgba(52,211,153,0.20)", text: "text-emerald-300", border: "border-emerald-400/40", bg: "bg-emerald-400/12" },
  PUT: { label: "DOWN", color: "#FB7185", soft: "rgba(251,113,133,0.20)", text: "text-rose-300", border: "border-rose-400/40", bg: "bg-rose-400/12" },
  NEUTRAL: { label: "NEUTRAL", color: "#CDFF17", soft: "rgba(205,255,23,0.18)", text: "text-[#CDFF17]", border: "border-[#CDFF17]/40", bg: "bg-[#CDFF17]/12" },
} as const

export function SignalResultPopup({ open, result, period, system, onClose }: SignalResultProps) {
  const [countdown, setCountdown] = useState(3)
  const [howToOpen, setHowToOpen] = useState(false)

  const frozenEntryRef = useRef<number | null>(null)
  const entryAt = useMemo(() => {
    if (!open || !result) {
      frozenEntryRef.current = null
      return 0
    }
    if (frozenEntryRef.current == null) frozenEntryRef.current = nextCandleStart(period)
    return frozenEntryRef.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, result])

  useEffect(() => {
    if (!open) {
      setCountdown(3)
      setHowToOpen(false)
      return
    }
    setCountdown(3)
    const started = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const remaining = Math.max(0, 3 - (t - started) / 1000)
      setCountdown(remaining)
      if (remaining > 0) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [open])

  if (!open || !result) return null

  const key: keyof typeof TONES = result.direction === "CALL" ? "CALL" : result.direction === "PUT" ? "PUT" : "NEUTRAL"
  const tone = TONES[key]
  const DirIcon = key === "CALL" ? ArrowUp : key === "PUT" ? ArrowDown : CircleSlash
  const ready = countdown <= 0
  const market = formatMarket(result.asset)
  const showEntryTime = period >= 60
  const durationLabel = formatDuration(period)

  return (
    <>
      <ModalFrame
        labelledBy="signal-result-title"
        testId="signal-result-popup"
        className="max-w-[420px]"
        style={{ background: `radial-gradient(ellipse 100% 55% at 50% 0%, ${tone.soft}, transparent 60%), linear-gradient(180deg,#1b1d21 0%,#121316 100%)` }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <span className="cf-mono inline-flex items-center gap-2 rounded-lg border border-[#CDFF17]/35 bg-[#CDFF17]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#CDFF17]">
            <span className="cf-pulse size-1.5 rounded-full bg-[#CDFF17] shadow-[0_0_8px_#CDFF17]" aria-hidden />
            Live Signal
          </span>
          <span className="cf-mono rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
            {durationLabel}
          </span>
        </div>

        {/* Hero — direction */}
        <div className="flex flex-col items-center px-5 pb-2 pt-5 text-center sm:px-6">
          <span
            className={cn("relative inline-flex size-20 items-center justify-center rounded-full border sm:size-24", tone.border, tone.bg)}
            style={{ boxShadow: `0 0 48px -8px ${tone.color}99, inset 0 1px 0 rgba(255,255,255,0.08)` }}
          >
            <DirIcon className={cn("size-10 sm:size-12", tone.text)} strokeWidth={2.6} aria-hidden />
          </span>
          <h2 id="signal-result-title" className="cf-display mt-4 text-[44px] leading-none text-white sm:text-[52px]" data-testid="signal-result-direction">
            <span style={{ color: tone.color, textShadow: `0 0 28px ${tone.color}80` }}>{tone.label}</span>
          </h2>
          <div className="mt-3 inline-flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5" data-testid="signal-result-market">
            <MarketFlagFor market={result.asset} alt={market.base} size="sm" />
            <span className="cf-display text-[15px] text-white sm:text-[16px]">
              {market.base} {market.suffix && <span className="text-[#CDFF17]">{market.suffix}</span>}
            </span>
          </div>
        </div>

        {/* Details */}
        <dl className="mx-5 mt-4 grid grid-cols-2 gap-2 sm:mx-6">
          {showEntryTime && <Detail label="Entry time" value={formatTime(entryAt)} valueClass={tone.text} big testId="signal-result-entry" />}
          <Detail label="Duration" value={durationLabel} big={!showEntryTime} />
          <Detail label="Direction" value={tone.label} valueClass={tone.text} />
          <Detail label="Timeframe" value={period >= 60 ? `M${period / 60}` : `${period}s`} />
        </dl>

        <p className="cf-mono mt-4 text-center text-[10.5px] uppercase tracking-[0.26em] text-white/55">
          Trade in <span className="text-white">next candle</span>
        </p>

        {/* Rules */}
        <div className="mx-5 mt-4 flex items-center justify-center gap-4 rounded-xl border border-white/[0.06] bg-[#0E0F11]/60 px-3 py-2.5 sm:mx-6">
          <Rule icon={Percent} text={<>Use <strong className="font-bold text-white">1/2% capital</strong></>} />
          <span aria-hidden className="h-3 w-px bg-white/10" />
          <Rule icon={Repeat2} text={<><strong className="font-bold text-white">1 MTG</strong> must</>} />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5 p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setHowToOpen(true)}
            data-testid="signal-result-howto"
            className="cf-btn-dark inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold"
          >
            <BookOpen className="size-4 text-[#CDFF17]" strokeWidth={2.3} aria-hidden />
            How To Trade
          </button>
          <button
            type="button"
            autoFocus={ready}
            onClick={ready ? onClose : undefined}
            disabled={!ready}
            aria-live="polite"
            data-testid="signal-result-close"
            className="cf-btn-volt inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[14px] font-bold disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {ready ? (
              <>
                <X className="size-4" strokeWidth={2.6} aria-hidden /> Close
              </>
            ) : (
              <>
                <Clock className="size-4" strokeWidth={2.4} aria-hidden />
                <span className="cf-mono tabular-nums">{Math.ceil(countdown)}s</span>
              </>
            )}
          </button>
        </div>
      </ModalFrame>

      <HowToTakeTradePopup open={howToOpen} system={system} onClose={() => setHowToOpen(false)} />
    </>
  )
}

function Detail({ label, value, valueClass, big, testId }: { label: string; value: string; valueClass?: string; big?: boolean; testId?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0E0F11]/60 px-3.5 py-3" data-testid={testId}>
      <dt className="cf-mono text-[9.5px] uppercase tracking-[0.22em] text-white/45">{label}</dt>
      <dd className={cn("cf-mono mt-1 truncate font-bold tabular-nums text-white", big ? "text-[20px]" : "text-[14px]", valueClass)}>{value}</dd>
    </div>
  )
}

function Rule({ icon: Icon, text }: { icon: typeof Percent; text: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-white/65">
      <Icon className="size-3.5 shrink-0 text-[#CDFF17]" strokeWidth={2.4} aria-hidden />
      <span>{text}</span>
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  How-To-Take-Trade popup                                                   */
/* -------------------------------------------------------------------------- */

type Lang = "en" | "bn"
type Step = { en: string; bn: string }

const STEPS_1M: Step[] = [
  { en: "Select the 1 Minute timeframe on your broker chart.", bn: "ব্রোকার চার্টে ১ মিনিট টাইমফ্রেম সিলেক্ট করুন।" },
  { en: "Set your trade time to 1 minute and wait for the entry time shown on the signal.", bn: "ট্রেড টাইম ১ মিনিট সেট করুন এবং সিগন্যালে দেখানো এন্ট্রি টাইমের জন্য অপেক্ষা করুন।" },
  { en: "At the exact entry time, open the trade in the signal direction (UP or DOWN).", bn: "ঠিক এন্ট্রি টাইমে সিগন্যালের দিকে (UP বা DOWN) ট্রেড ওপেন করুন।" },
]

const STEPS_15S: Step[] = [
  { en: "Select the 15 Second timeframe.", bn: "১৫ সেকেন্ড টাইমফ্রেম সিলেক্ট করুন।" },
  { en: "Set the timer to 15 seconds and wait for the entry time.", bn: "টাইমার ১৫ সেকেন্ড সেট করুন এবং এন্ট্রি টাইমের জন্য অপেক্ষা করুন।" },
  { en: "At the exact entry time, open the trade in the signal direction.", bn: "ঠিক এন্ট্রি টাইমে সিগন্যালের দিকে ট্রেড ওপেন করুন।" },
]

const COPY = {
  en: { eyebrow: "Trade guide", title: "How To Take Trade", capital: "Use 1/2% capital per trade", mtg: "1 MTG must", ok: "OK, got it" },
  bn: { eyebrow: "ট্রেড গাইড", title: "ট্রেড যেভাবে নিবেন", capital: "প্রতিটি ট্রেডে ১/২% ক্যাপিটাল ব্যবহার করুন", mtg: "১ MTG অবশ্যই", ok: "ঠিক আছে" },
} as const

function HowToTakeTradePopup({ open, system, onClose }: { open: boolean; system: SignalSystem; onClose: () => void }) {
  const [lang, setLang] = useState<Lang>("en")
  useEffect(() => {
    if (!open) setLang("en")
  }, [open])
  if (!open) return null

  const steps = system === "chart-15sec-signal" ? STEPS_15S : STEPS_1M
  const copy = COPY[lang]

  return (
    <ModalFrame z="z-[110]" labelledBy="how-to-trade-title" testId="how-to-trade-popup" className="max-w-[440px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="cf-orb inline-flex size-12 shrink-0 items-center justify-center rounded-full">
            <ListChecks className="size-5" strokeWidth={2.3} aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.28em] text-[#CDFF17]/80">{copy.eyebrow}</span>
            <h2 id="how-to-trade-title" className="cf-display text-[17px] leading-tight text-white sm:text-[22px]">
              {copy.title}
            </h2>
          </div>
        </div>
        <LangSwitch lang={lang} onChange={setLang} />
      </div>

      <ol className="relative mt-5 flex flex-col gap-2.5">
        <span aria-hidden className="absolute bottom-6 left-[21px] top-6 w-px bg-gradient-to-b from-[#CDFF17]/50 via-[#CDFF17]/20 to-transparent" />
        {steps.map((step, i) => (
          <li key={i} className="relative flex items-start gap-3.5 rounded-xl border border-white/[0.06] bg-[#0E0F11]/60 px-3 py-3">
            <span className="cf-btn-volt relative z-10 inline-flex size-[30px] shrink-0 items-center justify-center rounded-lg text-[12.5px] font-bold">
              {i + 1}
            </span>
            <p className="pt-1 text-pretty text-[13px] leading-relaxed text-white/85 sm:text-[13.5px]">{lang === "en" ? step.en : step.bn}</p>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-col gap-1.5 rounded-xl border border-[#CDFF17]/20 bg-[#CDFF17]/[0.06] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-center sm:gap-5">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-white/80">
          <Repeat2 className="size-3.5 text-[#CDFF17]" strokeWidth={2.4} aria-hidden />
          <span className="font-semibold text-white">{copy.mtg}</span>
        </span>
        <span aria-hidden className="hidden h-3 w-px bg-white/10 sm:block" />
        <span className="inline-flex items-center gap-1.5 text-[12px] text-white/80">
          <Percent className="size-3.5 text-[#CDFF17]" strokeWidth={2.4} aria-hidden />
          {copy.capital}
        </span>
      </div>

      <button
        type="button"
        autoFocus
        onClick={onClose}
        data-testid="how-to-trade-ok"
        className="cf-btn-volt mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl text-[14.5px] font-bold"
      >
        {copy.ok}
      </button>
    </ModalFrame>
  )
}

function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  const opts: Array<{ id: Lang; label: string; Flag: typeof UsFlag }> = [
    { id: "en", label: "EN", Flag: UsFlag },
    { id: "bn", label: "BD", Flag: BdFlag },
  ]
  return (
    <div role="group" aria-label="Language" className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/[0.08] bg-[#0E0F11]/60 p-1">
      {opts.map(({ id, label, Flag }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={lang === id}
          data-testid={`howto-lang-${id}`}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[10.5px] font-bold tracking-[0.08em] transition-colors sm:h-8 sm:gap-1.5 sm:px-2.5 sm:text-[11px]",
            lang === id ? "bg-[#CDFF17]/15 text-[#CDFF17] ring-1 ring-inset ring-[#CDFF17]/40" : "text-white/50 hover:text-white",
          )}
        >
          <Flag className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

function UsFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={cn("shrink-0 overflow-hidden rounded-[2px]", className)} aria-hidden>
      <rect width="20" height="14" fill="#B22234" />
      {[1, 3, 5, 7, 9, 11, 13].map((y) => (
        <rect key={y} y={y} width="20" height="1" fill="#FFFFFF" />
      ))}
      <rect width="9" height="7" fill="#3C3B6E" />
    </svg>
  )
}

function BdFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={cn("shrink-0 overflow-hidden rounded-[2px]", className)} aria-hidden>
      <rect width="20" height="14" fill="#006A4E" />
      <circle cx="9" cy="7" r="3.6" fill="#F42A41" />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function nextCandleStart(period: number): number {
  const nowSec = Math.floor(Date.now() / 1000)
  return Math.ceil((nowSec + 1) / period) * period
}

function formatTime(unixSec: number): string {
  const d = new Date(unixSec * 1000)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":")
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} second`
  const m = Math.round(seconds / 60)
  return m === 1 ? "1 minute" : `${m} minutes`
}

export function directionToUpDown(d: SignalDirection): string {
  if (d === "CALL") return "UP"
  if (d === "PUT") return "DOWN"
  return "NEUTRAL"
}

/** Backend symbol → friendly base + "(OTC)" suffix (this app only trades OTC). */
function formatMarket(symbol: string): { base: string; suffix: string } {
  if (!symbol) return { base: "—", suffix: "" }
  const stripped = symbol.replace(/_otc$/i, "")
  const entry = matchAllowedMarket(symbol.toLowerCase().endsWith("_otc") ? symbol : `${stripped}_otc`)
  if (entry) return { base: entry.label.replace(/\s*\(OTC\)\s*$/i, "").trim(), suffix: "(OTC)" }
  if (/^[A-Za-z]{6}$/.test(stripped)) {
    const u = stripped.toUpperCase()
    return { base: `${u.slice(0, 3)}/${u.slice(3)}`, suffix: "(OTC)" }
  }
  return { base: stripped.toUpperCase(), suffix: "(OTC)" }
}
