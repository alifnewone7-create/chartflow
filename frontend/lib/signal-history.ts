"use client"

/**
 * Per-user / per-system signal history stored in `localStorage`.
 *
 * The signal-room pages (`/chart-to-signal`, `/chart-15sec-signal`) push
 * every successful generation here so the user can pull up a "History"
 * drawer and review the trades the system has surfaced. The storage is
 * intentionally browser-local — signals are advisory, not accounted —
 * and namespaced by `(system, scopeId)` where `scopeId` is the
 * per-user access token (NOT the QXL key) so:
 *
 *   - switching systems on the same browser shows separate lists
 *   - two users sharing the same no-limit / limited QXL key still get
 *     fully separate histories (their access tokens differ)
 *   - SSR never touches `window`
 *
 * The list is capped at MAX entries (newest first) so a hot signal day
 * can't blow up `localStorage`.
 */

import { useEffect, useState } from "react"

import type { SignalDirection, SignalResponse } from "@/lib/signals-client"
import type { SignalSystem } from "@/lib/tiers"

export type SignalHistoryEntry = {
  /** Stable id used as React key; unix-ms + random suffix. */
  id: string
  system: SignalSystem
  asset: string
  direction: SignalDirection
  /** Candle period in seconds (60 or 15). */
  period: number
  /** Unix seconds — when the signal was generated. */
  generatedAt: number
  /** Unix seconds — the candle the user is meant to enter on. */
  entryAt: number
  /** 0–1 confidence from the backend. */
  confidence: number
}

const MAX_ENTRIES = 100

function storageKey(system: SignalSystem, scopeId: string): string {
  return `qxl_signal_history:${system}:${scopeId}`
}

function safeParse(raw: string | null): SignalHistoryEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e) =>
        e &&
        typeof e === "object" &&
        typeof e.id === "string" &&
        typeof e.asset === "string" &&
        typeof e.generatedAt === "number",
    )
  } catch {
    return []
  }
}

export function getSignalHistory(
  system: SignalSystem,
  scopeId: string,
): SignalHistoryEntry[] {
  if (typeof window === "undefined") return []
  return safeParse(window.localStorage.getItem(storageKey(system, scopeId)))
}

export function addSignalHistoryEntry(
  system: SignalSystem,
  scopeId: string,
  result: SignalResponse,
  entryAt: number,
): SignalHistoryEntry {
  const entry: SignalHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    system,
    asset: result.asset,
    direction: result.direction,
    period: result.period,
    generatedAt: result.generated_at ?? Math.floor(Date.now() / 1000),
    entryAt,
    confidence: result.confidence ?? 0,
  }
  if (typeof window === "undefined") return entry
  const next = [entry, ...getSignalHistory(system, scopeId)].slice(0, MAX_ENTRIES)
  try {
    window.localStorage.setItem(storageKey(system, scopeId), JSON.stringify(next))
    // Notify other listeners in this tab — the native `storage` event
    // only fires across tabs, not within the same one.
    window.dispatchEvent(
      new CustomEvent("qxl:signal-history", { detail: { system, scopeId } }),
    )
  } catch {
    /* quota or disabled storage — fail silently */
  }
  return entry
}

export function clearSignalHistory(
  system: SignalSystem,
  scopeId: string,
): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(storageKey(system, scopeId))
    window.dispatchEvent(
      new CustomEvent("qxl:signal-history", { detail: { system, scopeId } }),
    )
  } catch {
    /* ignore */
  }
}

/**
 * React hook: subscribe to the history list for `(system, scopeId)`.
 * Re-renders on:
 *   - mount
 *   - cross-tab `storage` events
 *   - in-tab `qxl:signal-history` events fired by the helpers above
 */
export function useSignalHistory(
  system: SignalSystem,
  scopeId: string,
): SignalHistoryEntry[] {
  const [list, setList] = useState<SignalHistoryEntry[]>([])

  useEffect(() => {
    setList(getSignalHistory(system, scopeId))
    const refresh = () => setList(getSignalHistory(system, scopeId))

    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(system, scopeId)) refresh()
    }
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { system?: SignalSystem; scopeId?: string }
        | undefined
      if (
        !detail ||
        (detail.system === system && detail.scopeId === scopeId)
      ) {
        refresh()
      }
    }

    window.addEventListener("storage", onStorage)
    window.addEventListener("qxl:signal-history", onCustom)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("qxl:signal-history", onCustom)
    }
  }, [system, scopeId])

  return list
}

// Imports are at the top of the file.
