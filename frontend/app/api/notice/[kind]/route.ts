import { NextResponse } from "next/server"

import { adminDb, readJson, str } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

const KINDS = new Set(["purchases", "upgrades"])
const FIELDS = [
  "status", "tierName", "toTierName", "fromTierName", "fullName", "username",
  "assignedToken", "assignedKey", "rejectionReason", "deviceId", "acknowledgedAt",
]

/**
 * POST /api/notice/{purchases|upgrades} { id, deviceId, ack? }
 * Returns the submission's decision fields to the browser that made it
 * (deviceId must match). With `ack: true` it stamps `acknowledgedAt`.
 */
export async function POST(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params
  if (!KINDS.has(kind)) return NextResponse.json({ ok: false }, { status: 404 })
  const b = await readJson(req)
  const id = str(b.id, 64)
  const deviceId = str(b.deviceId, 100)
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !deviceId) return NextResponse.json({ ok: false }, { status: 400 })

  try {
    const ref = adminDb().ref(`${kind}/${id}`)
    const value = (await ref.get()).val() as Record<string, unknown> | null
    if (!value) return NextResponse.json({ ok: true, record: null })
    if (value.deviceId !== deviceId) return NextResponse.json({ ok: false }, { status: 403 })
    if (b.ack === true) {
      await ref.update({ acknowledgedAt: Date.now() })
      return NextResponse.json({ ok: true })
    }
    const record = Object.fromEntries(FIELDS.filter((f) => value[f] !== undefined).map((f) => [f, value[f]]))
    return NextResponse.json({ ok: true, record })
  } catch (err) {
    console.log(`/api/notice/${kind} failed:`, err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
