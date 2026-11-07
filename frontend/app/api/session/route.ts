import { NextResponse } from "next/server"

import { adminDb, verifyUser } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

/** GET /api/session → the signed-in user's uid, name, email and tier. */
export async function GET(req: Request) {
  const user = await verifyUser(req)
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  if (user.createdAt === null) {
    user.createdAt = Date.now()
    await adminDb().ref(`users/${user.uid}`).update({ email: user.email, name: user.name, tier: user.tier, createdAt: user.createdAt })
  }
  return NextResponse.json({ ok: true, ...user })
}
