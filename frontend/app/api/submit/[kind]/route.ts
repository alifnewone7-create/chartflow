import { NextResponse } from "next/server"
import { ServerValue } from "firebase-admin/database"

import { adminDb, readJson, str, verifyUser } from "@/lib/server/firebase-admin"
import { normalizeTier, TIER_LABEL } from "@/lib/admin-types"

export const runtime = "nodejs"

const KINDS = new Set(["purchases", "upgrades"])
const PROOF_RE = /^\/api\/payment-proof\/[A-Za-z0-9_-]+$/

/** POST /api/submit/{purchases|upgrades} — create a pending submission; returns its id. */
export async function POST(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params
  if (!KINDS.has(kind)) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const user = await verifyUser(req)
  if (!user) return NextResponse.json({ ok: false, error: "Please log in to your account first." }, { status: 401 })
  const b = await readJson(req)

  const fullName = str(b.fullName, 60)
  const username = str(b.username, 40)
  const deviceId = str(b.deviceId, 100)
  const paymentProof = str(b.paymentProof, 300)
  if (fullName.length < 2 || !deviceId || !PROOF_RE.test(paymentProof)) {
    return NextResponse.json({ ok: false, error: "Please check the form and try again." }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    tierName: str(b.tierName, 60),
    paymentProof,
    amount: str(b.amount, 30),
    fullName,
    username,
    uid: user.uid,
    email: user.email.toLowerCase(),
    telegram: str(b.telegram, 60),
    note: str(b.note, 1000),
    status: "pending",
    deviceId,
    submittedAt: ServerValue.TIMESTAMP,
  }
  if (kind === "upgrades") {
    payload.tier = normalizeTier(str(b.tierName, 60))
    payload.fromTier = user.tier
    payload.fromTierName = TIER_LABEL[user.tier]
  }

  try {
    const created = await adminDb().ref(kind).push(payload)
    return NextResponse.json({ ok: true, id: created.key })
  } catch (err) {
    console.log(`/api/submit/${kind} failed:`, err)
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 })
  }
}
