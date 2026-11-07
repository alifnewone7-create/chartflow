"use client"

/**
 * Signal generator panel beside the chart on /chart-to-signal.
 * Flow: pick market → wait for ≥ minRemaining s on the candle → reserve a
 * quota slot → call the engine → show the full-screen result popup.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Crosshair, History, Hourglass, Radio, Timer, Zap } from "lucide-react"

import { generateSignal, type SignalResponse } from "@/lib/signals-client"
import { type SignalSystem, type Tier } from "@/lib/tiers"
import { useSignalUsage } from "@/hooks/use-signal-usage"
import { addSignalHistoryEntry } from "@/lib/signal-history"
import { engine, type EngineSignal } from "@/lib/engine-client"
import { playSignalChime } from "@/lib/sound"
import { cn } from "@/lib/utils"
import type { Candle } from "@/hooks/use-quotex-ws"

import { SignalResultPopup, WaitWarningPopup } from "@/components/signal/signal-popups"
import { SignalHistoryPopup } from "@/components/signal/signal-history-popup"

type Props = {
  qxlKey: string
  accessToken: string
  tier: Tier
  system: SignalSystem
  period: number
  minRemaining: number
  asset: string | null
  latest: Candle | null
}

export function GenerateSignalPanel({ accessToken, tier, system, period, minRemaining, asset, latest }: Props) {
  const usage = useSignalUsage(accessToken, tier, system)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warningOpen, setWarningOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const [result, setResult] = useState<SignalResponse | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const persistedSignalRef = useRef<SignalResponse | null>(null)

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 250)
    return () => window.clearInterval(id)
  }, [])

  const remaining = useMemo(() => candleSecondsRemaining(latest, period, now), [latest, period, now])

  const cooldownKey = useMemo(() => `qxl:signal-cooldown:${system}:${accessToken}`, [system, accessToken])
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(cooldownKey)
      const parsed = raw ? Number(raw) : NaN
      if (!Number.isFinite(parsed) || parsed <= Math.floor(Date.now() / 1000)) {
        window.sessionStorage.removeItem(cooldownKey)
        setCooldownUntil(null)
        return
      }
      setCooldownUntil(parsed)
    } catch {
      setCooldownUntil(null)
    }
  }, [cooldownKey])

  useEffect(() => {
    if (cooldownUntil === null || now < cooldownUntil) return
    setCooldownUntil(null)
    try {
      window.sessionStorage.removeItem(cooldownKey)
    } catch {
      /* ignore */
    }
  }, [now, cooldownUntil, cooldownKey])

  const cooldownRemaining = cooldownUntil !== null ? Math.max(0, cooldownUntil - now) : 0
  const inCooldown = cooldownRemaining > 0

  async function onGenerate() {
    if (!asset) {
      setError("Select a market first.")
      return
    }
    if (inCooldown) {
      setError(`Please wait for the current candle to close. Next signal in ${cooldownRemaining}s.`)
      return
    }
    if (latest && remaining !== null && remaining < minRemaining) {
      setWarningOpen(true)
      return
    }
    if (usage.remaining <= 0) {
      setError("You've used your daily signal quota for this system. The counter resets at 6:00 AM BD (UTC+6).")
      return
    }

    setGenerating(true)
    setError(null)

    const consumed = await usage.consume()
    if (!consumed.ok) {
      setGenerating(false)
      setError(
        consumed.reason === "limit-reached"
          ? "Daily signal limit reached. Please come back after the 6:00 AM BD (UTC+6) reset."
          : (consumed.message ?? "Couldn't reserve a signal slot."),
      )
      return
    }

    try {
      const sig =
        system === "chart-to-signal"
          ? toSignalResponse(await engine<EngineSignal>("/c2s/signals", { method: "POST", body: { asset } }), period)
          : await generateSignal({ asset, period, count: 120 })
      setResult(sig)
      setResultOpen(true)
      playSignalChime()
      const nowSec = Math.floor(Date.now() / 1000)
      const boundary = latest
        ? Math.floor(latest.time / period) * period + period
        : Math.ceil((nowSec + 1) / period) * period
      setCooldownUntil(boundary)
      try {
        window.sessionStorage.setItem(cooldownKey, String(boundary))
      } catch {
        /* ignore */
      }
      if (system !== "chart-to-signal" && persistedSignalRef.current !== sig) {
        persistedSignalRef.current = sig
        addSignalHistoryEntry(system, accessToken, sig, nextCandleStart(period))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
    }
  }

  const buttonDisabled = generating || !asset || usage.remaining <= 0 || latest === null || inCooldown
  const countdownTone =
    remaining === null ? "text-white/35" : remaining < minRemaining ? "text-amber-300" : "text-[#CDFF17]"

  return (
    <div className="flex flex-col gap-4" data-testid="generate-signal-panel">
      <section className="cf-card relative overflow-hidden rounded-[18px] p-4 sm:rounded-[24px] sm:p-5">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(205,255,23,0.18), transparent 70%)" }}
        />

        <div className="relative flex items-center gap-3">
          <span className="cf-orb inline-flex size-11 shrink-0 items-center justify-center rounded-full">
            <Crosshair className="size-5" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.28em] text-[#CDFF17]/80">Signal engine</span>
            <span className="cf-display text-[17px] text-white sm:text-[19px]">
              Next-candle <span className="text-[#CDFF17]">live signal</span>
            </span>
          </div>
        </div>

        <div className="relative mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0E0F11]/60 px-3.5 py-3">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            <Timer className="size-3.5 text-[#CDFF17]" strokeWidth={2.4} aria-hidden />
            Current candle
          </span>
          <span className={cn("cf-mono text-[15px] font-bold tabular-nums", countdownTone)} data-testid="candle-countdown">
            {remaining === null ? "—" : `${String(remaining).padStart(2, "0")}s left`}
          </span>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          data-testid="generate-live-signal-button"
          disabled={buttonDisabled}
          aria-busy={generating}
          className={cn(
            "cf-btn-volt mt-3 inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-xl text-[15px] font-bold sm:h-14 sm:text-[16px]",
            "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:filter-none",
          )}
        >
          {generating ? (
            <>
              <Hourglass className="size-4 animate-spin" strokeWidth={2.4} aria-hidden />
              Analyzing strategies…
            </>
          ) : inCooldown ? (
            <>
              <Timer className="size-4" strokeWidth={2.4} aria-hidden />
              Next signal in <span className="cf-mono tabular-nums">{String(cooldownRemaining).padStart(2, "0")}s</span>
            </>
          ) : (
            <>
              <Radio className="size-4" strokeWidth={2.4} aria-hidden />
              Generate Live Signal
            </>
          )}
        </button>

        <button
          type="button"
          data-testid="open-signal-history-button"
          onClick={() =>
            system === "chart-to-signal" ? window.dispatchEvent(new Event("c2s:open-history")) : setHistoryOpen(true)
          }
          className="cf-btn-dark mt-2.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold"
        >
          <History className="size-4 text-[#CDFF17]" strokeWidth={2.3} aria-hidden />
          Signal History
        </button>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-white/40">
          Needs at least {minRemaining}s left on the running candle · one signal per candle
        </p>

        {error && (
          <div
            data-testid="generate-signal-error"
            className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/35 bg-rose-400/10 px-3 py-2.5 text-[12px] leading-relaxed text-rose-100"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-rose-300" strokeWidth={2.2} aria-hidden />
            <span>{error}</span>
          </div>
        )}
      </section>

      <WaitWarningPopup open={warningOpen} minRemaining={minRemaining} onClose={() => setWarningOpen(false)} />
      <SignalResultPopup open={resultOpen} result={result} period={period} system={system} onClose={() => setResultOpen(false)} />
      <SignalHistoryPopup open={historyOpen} system={system} scopeId={accessToken} onClose={() => setHistoryOpen(false)} />
    </div>
  )
}

function candleSecondsRemaining(latest: Candle | null, period: number, now: number): number | null {
  if (!latest) return null
  const end = Math.floor(latest.time / period) * period + period
  return Math.max(0, end - now)
}

function nextCandleStart(period: number): number {
  const nowSec = Math.floor(Date.now() / 1000)
  return Math.ceil((nowSec + 1) / period) * period
}

function toSignalResponse(s: EngineSignal, period: number): SignalResponse {
  const votes = s.analysis?.votes ?? []
  return {
    asset: s.asset,
    period,
    direction: s.direction,
    confidence: s.confidence,
    bullish: votes.filter((v) => v.direction === "CALL").length,
    bearish: votes.filter((v) => v.direction === "PUT").length,
    abstain: votes.filter((v) => !v.direction).length,
    votes: votes.map((v) => ({ ...v, direction: (v.direction as "CALL" | "PUT" | null) ?? null })),
    candle_count: 0,
    generated_at: Math.floor(s.generated_at / 1000),
  }
}
