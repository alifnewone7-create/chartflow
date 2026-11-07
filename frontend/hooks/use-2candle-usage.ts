"use client"

/**
 * Track daily time-based usage for the 2 Candle Ahead feature.
 *
 * Firebase tree
 * -------------
 *   /usage/{scopeId}/{YYYY-MM-DD}/chart-2candle/usedSeconds
 *
 * `scopeId` is the per-user access token (NOT the QXL key) so that
 * users sharing a no-limit / limited QXL key each get their own daily
 * timer. See `use-signal-usage.ts` for the full rationale.
 *
 * The hook:
 * - Reads the cumulative used seconds via `/api/usage`
 * - Ticks locally while `isActive` is true (market selected)
 * - Sends the updated seconds to the server every 5 seconds (the server
 *   only lets the value move forward, never back)
 * - Exposes remaining time, limit exhausted state, and reset countdown
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { postJson } from "@/lib/api-client"
import {
  CANDLE2_TIME_LIMITS,
  todayKey,
  type Tier,
} from "@/lib/tiers"

export type Candle2UsageState = {
  usedSeconds: number
  limitSeconds: number
  remainingSeconds: number
  isExhausted: boolean
  isUnlimited: boolean
  loading: boolean
  resetCountdown: { hours: number; minutes: number; seconds: number }
}

/**
 * Hook to track 2 Candle Ahead time usage.
 * @param scopeId - Per-user access token (issued at activation)
 * @param tier - User's tier
 * @param isActive - Whether to count time (true when market is selected)
 */
export function use2CandleUsage(
  scopeId: string | null,
  tier: Tier | null,
  isActive: boolean,
): Candle2UsageState {
  const [date, setDate] = useState<string>(() => todayKey())
  const [usedSeconds, setUsedSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resetCountdown, setResetCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })
  
  const localUsedRef = useRef(0)
  const lastSyncRef = useRef(0)

  const limitSeconds = tier ? CANDLE2_TIME_LIMITS[tier] : 0
  const isUnlimited = !isFinite(limitSeconds)
  const remainingSeconds = isUnlimited ? Infinity : Math.max(0, limitSeconds - usedSeconds)
  const isExhausted = !isUnlimited && remainingSeconds <= 0

  // Refresh date every minute for bucket rollover at 6 AM BD
  useEffect(() => {
    const id = window.setInterval(() => setDate(todayKey()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // Calculate reset countdown (time until 6 AM BD)
  useEffect(() => {
    const calculateReset = () => {
      const now = new Date()
      // 6 AM BD (UTC+6) = 00:00 UTC
      const nowUTC = now.getTime()
      const todayMidnightUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      const nextResetUTC = nowUTC >= todayMidnightUTC 
        ? todayMidnightUTC + 24 * 60 * 60 * 1000 
        : todayMidnightUTC
      
      const diffMs = nextResetUTC - nowUTC
      const hours = Math.floor(diffMs / (60 * 60 * 1000))
      const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000))
      const seconds = Math.floor((diffMs % (60 * 1000)) / 1000)
      
      setResetCountdown({ hours, minutes, seconds })
    }
    
    calculateReset()
    const id = window.setInterval(calculateReset, 1000)
    return () => window.clearInterval(id)
  }, [])

  // Load today's seconds from the server
  useEffect(() => {
    if (!scopeId) {
      setUsedSeconds(0)
      setLoading(false)
      return
    }
    setLoading(true)
    let cancelled = false
    postJson<{ ok: boolean; usedSeconds?: number }>("/api/usage", {
      action: "get",
    })
      .then(({ data }) => {
        if (cancelled || !data?.ok) return
        const secs = data.usedSeconds ?? 0
        setUsedSeconds(secs)
        localUsedRef.current = secs
        lastSyncRef.current = secs
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scopeId, date])

  // Sync to the server periodically
  const syncToFirebase = useCallback(async () => {
    if (!scopeId || isUnlimited) return
    const current = localUsedRef.current
    if (current === lastSyncRef.current) return // No change

    try {
      const { data } = await postJson<{ ok: boolean; usedSeconds?: number }>("/api/usage", {
        action: "candle2",
        usedSeconds: current,
      })
      if (data?.ok) lastSyncRef.current = current
    } catch (err) {
      console.log("[2candle-usage] sync failed:", err)
    }
  }, [scopeId, isUnlimited])

  // Tick every second when active
  useEffect(() => {
    if (!isActive || isUnlimited || isExhausted || !scopeId) return

    const tickInterval = window.setInterval(() => {
      localUsedRef.current += 1
      setUsedSeconds(localUsedRef.current)
    }, 1000)

    // Sync every 5 seconds
    const syncInterval = window.setInterval(syncToFirebase, 5000)

    return () => {
      window.clearInterval(tickInterval)
      window.clearInterval(syncInterval)
      // Final sync on unmount
      syncToFirebase()
    }
  }, [isActive, isUnlimited, isExhausted, scopeId, syncToFirebase])

  // Sync when becoming inactive
  useEffect(() => {
    if (!isActive) {
      syncToFirebase()
    }
  }, [isActive, syncToFirebase])

  return {
    usedSeconds,
    limitSeconds,
    remainingSeconds,
    isExhausted,
    isUnlimited,
    loading,
    resetCountdown,
  }
}

/**
 * Format seconds as HH:MM:SS or MM:SS
 */
export function formatTime(totalSeconds: number, showHours = false): string {
  if (!isFinite(totalSeconds)) return "--:--"
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  
  if (showHours || h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(Math.floor(s)).padStart(2, "0")}`
  }
  return `${String(m).padStart(2, "0")}:${String(Math.floor(s)).padStart(2, "0")}`
}
