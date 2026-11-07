"use client"

/**
 * Premium signal-history drawer for `/chart-to-signal` and
 * `/chart-15sec-signal`.
 *
 * Surfaced via the new "History" button next to the generate panel
 * (desktop + mobile). Reads from `useSignalHistory` (localStorage),
 * scoped to `(system, qxlKey)` so different rooms / accounts keep
 * separate lists.
 *
 * Visual goals
 * ------------
 *   - Same dark teal palette as the rest of the activated experience
 *     (matches `MarketChartCard`, `SignalResultPopup`).
 *   - Each historical signal lives in its own card with: the market
 *     flag(s), pair label, an UP/DOWN direction badge with directional
 *     glow, the entry time, the absolute generation timestamp, and a
 *     relative "X minutes ago" hint so the user can quickly scan
 *     freshness.
 *   - Direction-aware accent rails on the left edge of each card make
 *     the list scannable at a glance.
 *   - The header carries a subtle live count chip plus a
 *     "Clear history" affordance gated behind a confirm step.
 */

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  CircleSlash,
  Clock,
  History,
  Inbox,
  Trash2,
  X,
} from "lucide-react"

import {
  clearSignalHistory,
  useSignalHistory,
  type SignalHistoryEntry,
} from "@/lib/signal-history"
import type { SignalSystem } from "@/lib/tiers"
import { matchAllowedMarket } from "@/lib/allowed-markets"
import { MarketFlagFor } from "@/components/signal/market-flag"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  system: SignalSystem
  /** Per-user access token used as the localStorage scope. */
  scopeId: string
  onClose: () => void
}

export function SignalHistoryPopup({ open, system, scopeId, onClose }: Props) {
  const list = useSignalHistory(system, scopeId)
  const [confirmingClear, setConfirmingClear] = useState(false)

  // Tick once a minute so the relative timestamps stay fresh while the
  // drawer is open. We don't bother updating when closed — saves a
  // background interval doing nothing for the 99% case.
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    if (!open) return
    setNow(Math.floor(Date.now() / 1000))
    const id = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      30_000,
    )
    return () => window.clearInterval(id)
  }, [open])

  // Reset the destructive-confirm state every time the drawer reopens.
  useEffect(() => {
    if (!open) setConfirmingClear(false)
  }, [open])

  const eyebrow =
    system === "chart-15sec-signal" ? "15-Second Signal History" : "1-Minute Signal History"

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signal-history-title"
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/75 px-3 py-4 backdrop-blur-md sm:items-center sm:px-4 sm:py-6"
    >
      <div
        className="relative my-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-[#3A3E46]/40 bg-[#16181C]/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] sm:rounded-[20px]"
        style={{
          background:
            "radial-gradient(ellipse 95% 60% at 50% 0%, rgba(205,255,23,0.18), transparent 65%), #16181C",
          maxHeight: "92svh",
        }}
      >
        {/* Hairline highlight at top */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E3FF5C]/55 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-t-[24px] ring-1 ring-inset ring-white/[0.04] sm:rounded-[20px]"
        />

        {/* Mobile drag handle */}
        <div
          aria-hidden
          className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#3A3E46]/45 sm:hidden"
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4 sm:px-7 sm:pt-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#CDFF17]/40 bg-[#CDFF17]/12 text-[#E3FF5C] shadow-[0_0_24px_-6px_rgba(205,255,23,0.55)] sm:size-12">
              <History className="size-5 sm:size-[22px]" aria-hidden strokeWidth={2.3} />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.32em] text-[#E3FF5C]/85 sm:text-[10.5px]">
                {eyebrow}
              </span>
              <h2
                id="signal-history-title"
                className="truncate font-display text-[19px] leading-tight tracking-wide text-[#F3F5EF] sm:text-[22px]"
              >
                <span className="font-normal">Recent</span>{" "}
                <span className="italic text-[#E3FF5C]/90">signals</span>
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1 rounded-full border border-[#3A3E46]/45 bg-[#17191D]/65 px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-[0.18em] text-[#E3FF5C] sm:inline-flex">
              <span className="size-1.5 rounded-full bg-[#E3FF5C] motion-safe:animate-pulse" aria-hidden />
              {list.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex size-9 items-center justify-center rounded-full border border-[#3A3E46]/45 bg-[#17191D]/65 text-[#F3F5EF]/75 transition-colors hover:bg-[#3A3E46]/25 hover:text-[#F3F5EF]"
            >
              <X className="size-4" aria-hidden strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Hair divider */}
        <span
          aria-hidden
          className="mx-5 block h-px bg-gradient-to-r from-transparent via-[#3A3E46]/45 to-transparent sm:mx-7"
        />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          {list.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {list.map((e) => (
                <li key={e.id}>
                  <HistoryCard entry={e} now={now} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — clear-history affordance, only when there is anything */}
        {list.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-[#3A3E46]/30 bg-[#17191D]/55 px-5 py-3 sm:px-7">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F3F5EF]/55">
              Stored on this device
            </span>
            {confirmingClear ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[#3A3E46]/45 bg-[#17191D]/65 px-3 text-[11.5px] font-medium text-[#F3F5EF]/75 transition-colors hover:text-[#F3F5EF]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearSignalHistory(system, scopeId)
                    setConfirmingClear(false)
                  }}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-rose-400/45 bg-rose-400/10 px-3 text-[11.5px] font-semibold text-rose-200 transition-colors hover:bg-rose-400/20"
                >
                  <Trash2 className="size-3.5" aria-hidden strokeWidth={2.4} />
                  Confirm clear
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#3A3E46]/45 bg-[#17191D]/65 px-3 text-[11.5px] font-medium text-[#F3F5EF]/80 transition-colors hover:border-rose-400/45 hover:bg-rose-400/10 hover:text-rose-200"
              >
                <Trash2 className="size-3.5" aria-hidden strokeWidth={2.4} />
                Clear history
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

function HistoryCard({ entry, now }: { entry: SignalHistoryEntry; now: number }) {
  const market = useMemo(() => formatMarket(entry.asset), [entry.asset])
  const isCall = entry.direction === "CALL"
  const isPut = entry.direction === "PUT"
  const DirIcon = isCall ? ArrowUp : isPut ? ArrowDown : CircleSlash

  const tones = isCall
    ? {
        rail: "bg-emerald-400/70",
        chip: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
        accent: "text-emerald-300",
        glow: "shadow-[0_0_22px_-8px_rgba(52,211,153,0.55)]",
      }
    : isPut
      ? {
          rail: "bg-rose-400/70",
          chip: "border-rose-400/40 bg-rose-400/10 text-rose-200",
          accent: "text-rose-300",
          glow: "shadow-[0_0_22px_-8px_rgba(248,113,113,0.55)]",
        }
      : {
          rail: "bg-[#CDFF17]/70",
          chip: "border-[#CDFF17]/40 bg-[#CDFF17]/10 text-[#E3FF5C]",
          accent: "text-[#E3FF5C]",
          glow: "shadow-[0_0_22px_-8px_rgba(205,255,23,0.5)]",
        }

  const directionLabel = isCall ? "UP" : isPut ? "DOWN" : "NEUTRAL"
  const generatedLabel = formatTime(entry.generatedAt)
  const generatedDateLabel = formatDate(entry.generatedAt)
  const entryLabel = entry.period >= 60 ? formatTime(entry.entryAt) : "—"
  const durationLabel = formatDuration(entry.period)
  const relative = formatRelative(entry.generatedAt, now)

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border border-[#3A3E46]/35 bg-[#17191D]/75 px-3 py-2.5 transition-colors hover:border-[#CDFF17]/45 sm:rounded-2xl sm:px-4 sm:py-3.5",
      )}
    >
      {/* Direction-coloured rail */}
      <span
        aria-hidden
        className={cn("absolute inset-y-2 left-0 w-[3px] rounded-r-full", tones.rail)}
      />

      <div className="flex items-start gap-3 pl-2 sm:gap-3.5">
        <MarketFlagFor market={entry.asset} size="md" className={tones.glow} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate font-display text-[14.5px] leading-tight tracking-wide text-[#F3F5EF] sm:text-[16px]">
              <span className="font-normal">{market.base}</span>
              {market.suffix && (
                <>
                  {" "}
                  <span className={cn("italic", tones.accent)}>{market.suffix}</span>
                </>
              )}
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em]",
                tones.chip,
              )}
            >
              <DirIcon className="size-3" aria-hidden strokeWidth={2.6} />
              {directionLabel}
            </span>
          </div>

          {/* Inline meta row — entry time + duration */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10.5px] tabular-nums text-[#F3F5EF]/65 sm:text-[11px]">
            {entry.period >= 60 && (
              <span>
                <span className="text-[#F3F5EF]/45">Entry</span>{" "}
                <span className={cn("font-semibold", tones.accent)}>{entryLabel}</span>
              </span>
            )}
            <span>
              <span className="text-[#F3F5EF]/45">Duration</span>{" "}
              <span className="text-[#F3F5EF]/85">{durationLabel}</span>
            </span>
          </div>

          {/* Generated-at row — absolute timestamp + relative hint */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-[#F3F5EF]/55 sm:text-[11px]">
            <span className="inline-flex items-center gap-1 font-mono">
              <Clock className="size-3 text-[#E3FF5C]/85" aria-hidden strokeWidth={2.4} />
              <span className="tabular-nums text-[#F3F5EF]/75">{generatedLabel}</span>
              <span className="text-[#F3F5EF]/40">·</span>
              <span className="tabular-nums text-[#F3F5EF]/55">{generatedDateLabel}</span>
            </span>
            <span aria-hidden className="hidden h-2 w-px bg-[#3A3E46]/40 sm:block" />
            <span className="italic text-[#E3FF5C]/75">{relative}</span>
          </div>
        </div>
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*  Empty state                                                               */
/* -------------------------------------------------------------------------- */

function EmptyState() {
  return (
    <div className="flex min-h-[40svh] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span className="relative flex size-14 items-center justify-center rounded-2xl border border-[#CDFF17]/35 bg-[#CDFF17]/8 text-[#E3FF5C]/85">
        <Inbox className="size-6" aria-hidden strokeWidth={2.2} />
      </span>
      <h3 className="font-display text-[17px] tracking-wide text-[#F3F5EF]">
        <span className="font-normal">No signals</span>{" "}
        <span className="italic text-[#E3FF5C]/85">yet</span>
      </h3>
      <p className="max-w-xs text-pretty text-[12.5px] leading-relaxed text-[#F3F5EF]/65">
        Generated signals will appear here so you can review every entry the system has surfaced for you.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Format a backend symbol into "{base} {(OTC)}" — mirrors the result popup. */
function formatMarket(symbol: string): { base: string; suffix: string } {
  if (!symbol) return { base: "—", suffix: "" }
  const stripped = symbol.replace(/_otc$/i, "")
  const lookupSymbol = symbol.toLowerCase().endsWith("_otc")
    ? symbol
    : `${stripped}_otc`
  const entry = matchAllowedMarket(lookupSymbol, lookupSymbol)
  if (entry) {
    const base = entry.label.replace(/\s*\(OTC\)\s*$/i, "").trim()
    return { base, suffix: "(OTC)" }
  }
  if (/^[A-Za-z]{6}$/.test(stripped)) {
    const upper = stripped.toUpperCase()
    return { base: `${upper.slice(0, 3)}/${upper.slice(3)}`, suffix: "(OTC)" }
  }
  return { base: stripped.toUpperCase(), suffix: "(OTC)" }
}

function formatTime(unixSec: number): string {
  const d = new Date(unixSec * 1000)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

function formatDate(unixSec: number): string {
  const d = new Date(unixSec * 1000)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}/${mm}`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.round(seconds / 60)
  return m === 1 ? "1m" : `${m}m`
}

function formatRelative(unixSec: number, nowSec: number): string {
  const diff = Math.max(0, nowSec - unixSec)
  if (diff < 30) return "just now"
  if (diff < 60) return `${diff}s ago`
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}
