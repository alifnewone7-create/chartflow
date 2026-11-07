"use client"

import { useCallback, useEffect, useState } from "react"
import { get, limitToLast, orderByChild, query, ref, startAt } from "firebase/database"

import { postJson } from "@/lib/api-client"
import { getDb } from "@/lib/firebase"
import { todayKey } from "@/lib/tiers"

export type DailyUsage = { live: number; candle2Seconds: number; future: number; auto: number; loading: boolean }

const REFRESH_MS = 60_000

/** Start of today's quota day (6:00 AM BD = 00:00 UTC) in ms. */
export function quotaDayStart(): number {
  const [y, m, d] = todayKey().split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

async function countFuture(uid: string, startSec: number) {
  const snap = await get(query(ref(getDb(), `signals/future/${uid}`), orderByChild("entry_at"), startAt(startSec)))
  return snap.size
}

async function countAuto(uid: string, startMs: number) {
  const snap = await get(query(ref(getDb(), `auto/sessions/${uid}`), orderByChild("created_at"), limitToLast(40)))
  const sids = Object.entries((snap.val() ?? {}) as Record<string, { closed_at?: number }>)
    .filter(([, s]) => !s.closed_at || s.closed_at >= startMs)
    .map(([sid]) => sid)
  const counts = await Promise.all(
    sids.map(async (sid) => {
      const sigs = (await get(ref(getDb(), `auto/signals/${uid}/${sid}`))).val() as Record<string, { entry_at?: number }> | null
      return Object.values(sigs ?? {}).filter((s) => (s.entry_at ?? 0) * 1000 >= startMs).length
    }),
  )
  return counts.reduce((a, b) => a + b, 0)
}

export function useDailyUsage(uid: string): DailyUsage {
  const [state, setState] = useState<DailyUsage>({ live: 0, candle2Seconds: 0, future: 0, auto: 0, loading: true })

  const load = useCallback(async () => {
    const startMs = quotaDayStart()
    const [usage, future, auto] = await Promise.all([
      postJson<{ ok: boolean; count?: number; usedSeconds?: number }>("/api/usage", { action: "get", system: "chart-to-signal" }).catch(() => null),
      countFuture(uid, Math.floor(startMs / 1000)).catch(() => 0),
      countAuto(uid, startMs).catch(() => 0),
    ])
    setState({ live: usage?.data?.count ?? 0, candle2Seconds: usage?.data?.usedSeconds ?? 0, future, auto, loading: false })
  }, [uid])

  useEffect(() => {
    load()
    const id = window.setInterval(load, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [load])

  return state
}
