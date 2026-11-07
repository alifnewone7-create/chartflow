"use client"

/**
 * Track daily signal usage for a specific (scopeId, system) pair.
 *
 * Firebase tree
 * -------------
 *   /usage/{scopeId}/{YYYY-MM-DD}/{system}/count
 *
 * `scopeId` is the per-user access token issued at activation time
 * (e.g. `qxl-pro-abc123…`) — NOT the underlying QXL key. This is
 * deliberate: a single QXL key with key-type "no_limit" or "limited"
 * can be activated by many distinct users, each receiving their own
 * unique access token. Keying usage by access token instead of by
 * QXL key gives every activated user their own daily counter, so one
 * user's signals don't drain everyone else's quota.
 *
 * All reads/writes go through `/api/usage` (the database itself is closed
 * to browsers). The count is re-polled so two tabs stay in sync, and
 * `consume()` bumps it by one in a server-side transaction that refuses
 * to pass the tier's daily limit.
 */

import { useCallback, useEffect, useState } from "react"
import { postJson } from "@/lib/api-client"
import {
  DAILY_LIMITS,
  todayKey,
  type SignalSystem,
  type Tier,
} from "@/lib/tiers"

const POLL_MS = 15_000

export type UsageState = {
  count: number
  limit: number
  remaining: number
  loading: boolean
}

type ConsumeResult =
  | { ok: true; count: number; remaining: number }
  | { ok: false; reason: "limit-reached"; count: number; limit: number }
  | { ok: false; reason: "error"; message: string }

/**
 * Read + write helper for the daily usage counter. Returns reactive state
 * + a `consume()` function that atomically increments the counter (or
 * refuses if the day's limit is already reached).
 */
export function useSignalUsage(
  scopeId: string | null,
  tier: Tier | null,
  system: SignalSystem,
): UsageState & { consume: () => Promise<ConsumeResult>; date: string } {
  const [date, setDate] = useState<string>(() => todayKey())
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Refresh the date every minute so the bucket rolls over without a page
  // reload at 6:00 AM Bangladesh time (UTC+6) — fully automatic, no user
  // action required. The RTDB subscription below resubscribes to the new
  // bucket the moment the date string flips, so the counter visibly resets
  // to 0 in real time.
  useEffect(() => {
    const id = window.setInterval(() => setDate(todayKey()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // Poll the counter for the current (scope, date, system) triplet.
  useEffect(() => {
    if (!scopeId) {
      setCount(0)
      setLoading(false)
      return
    }
    setLoading(true)
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await postJson<{ ok: boolean; count?: number }>("/api/usage", {
          action: "get",
          system,
        })
        if (!cancelled && data?.ok) setCount(data.count ?? 0)
      } catch {
        /* keep the last value */
      }
      if (!cancelled) setLoading(false)
    }
    load()
    const id = window.setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [scopeId, date, system])

  const limit = tier ? DAILY_LIMITS[tier][system] : 0

  const consume = useCallback(async (): Promise<ConsumeResult> => {
    if (!scopeId || !tier) {
      return { ok: false, reason: "error", message: "Missing scope or tier" }
    }
    try {
      const { data } = await postJson<{ ok: boolean; reason?: string; count?: number }>("/api/usage", {
        action: "consume",
        system,
      })
      if (data?.reason === "limit-reached") {
        setCount(limit)
        return { ok: false, reason: "limit-reached", count: limit, limit }
      }
      if (!data?.ok) throw new Error("Usage update failed")
      const next = data.count ?? 0
      setCount(next)
      return { ok: true, count: next, remaining: Math.max(0, limit - next) }
    } catch (err) {
      console.log("[signal-usage] consume failed:", err)
      return {
        ok: false,
        reason: "error",
        message: err instanceof Error ? err.message : String(err),
      }
    }
  }, [scopeId, tier, system, limit])

  return {
    count,
    limit,
    remaining: Math.max(0, limit - count),
    loading,
    consume,
    date,
  }
}
