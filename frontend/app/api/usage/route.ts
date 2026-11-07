import { NextResponse } from "next/server"
import { ServerValue } from "firebase-admin/database"

import { adminDb, readJson, verifyUser } from "@/lib/server/firebase-admin"
import { asTier, CANDLE2_TIME_LIMITS, DAILY_LIMITS, todayKey, type SignalSystem } from "@/lib/tiers"

export const runtime = "nodejs"

const SYSTEMS = new Set<string>(["chart-to-signal", "chart-15sec-signal"])
// The browser syncs every 5 s; allow some slack but never a jump.
const MAX_CANDLE2_STEP_S = 30

/**
 * POST /api/usage { action, system?, usedSeconds? } (signed-in user via Authorization header)
 *   action "get"     → { count, usedSeconds } for today
 *   action "consume" → +1 signal for `system` (refused past the daily limit)
 *   action "candle2" → raise today's 2-candle seconds (only forward, max 30 s per call)
 */
export async function POST(req: Request) {
  const body = await readJson(req)
  try {
    const user = await verifyUser(req)
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const tier = asTier(user.tier)
    const date = todayKey()
    const base = adminDb().ref(`usage/${user.uid}/${date}`)
    const action = body.action

    if (action === "get") {
      const system = typeof body.system === "string" && SYSTEMS.has(body.system) ? body.system : null
      const [count, used] = await Promise.all([
        system ? base.child(`${system}/count`).get() : null,
        base.child("chart-2candle/usedSeconds").get(),
      ])
      return NextResponse.json({
        ok: true,
        date,
        count: typeof count?.val() === "number" ? count.val() : 0,
        usedSeconds: typeof used.val() === "number" ? used.val() : 0,
      })
    }

    if (action === "consume") {
      if (typeof body.system !== "string" || !SYSTEMS.has(body.system)) {
        return NextResponse.json({ ok: false, error: "Bad system" }, { status: 400 })
      }
      const system = body.system as SignalSystem
      const limit = DAILY_LIMITS[tier][system]
      const result = await base.child(`${system}/count`).transaction((current) => {
        const next = (typeof current === "number" ? current : 0) + 1
        if (next > limit) return undefined
        return next
      })
      if (!result.committed) {
        return NextResponse.json({ ok: false, reason: "limit-reached", count: limit, limit, date })
      }
      await base.child(system).update({ lastAt: ServerValue.TIMESTAMP })
      const count = (result.snapshot.val() as number) ?? 0
      return NextResponse.json({ ok: true, count, limit, date })
    }

    if (action === "candle2") {
      const wanted = typeof body.usedSeconds === "number" ? Math.floor(body.usedSeconds) : NaN
      const cap = CANDLE2_TIME_LIMITS[tier]
      if (!Number.isFinite(wanted) || !Number.isFinite(cap) || cap <= 0) {
        return NextResponse.json({ ok: false, error: "Bad value" }, { status: 400 })
      }
      const ref = base.child("chart-2candle/usedSeconds")
      const result = await ref.transaction((current) => {
        const cur = typeof current === "number" ? current : 0
        return Math.max(cur, Math.min(wanted, cur + MAX_CANDLE2_STEP_S))
      })
      await base.child("chart-2candle").update({ lastAt: ServerValue.TIMESTAMP })
      return NextResponse.json({ ok: true, usedSeconds: result.snapshot.val() ?? 0, date })
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 })
  } catch (err) {
    console.log("/api/usage failed:", err)
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 })
  }
}
