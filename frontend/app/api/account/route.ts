import { NextResponse } from "next/server"

import { adminDb, readJson, str, verifyUser } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

/** POST /api/account { name } → create/update /users/{uid}; new users start on the free tier. */
export async function POST(req: Request) {
  const user = await verifyUser(req)
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  const body = await readJson(req)
  const name = str(body.name, 80)
  if (!name) return NextResponse.json({ ok: false, error: "name-required" }, { status: 400 })
  const ref = adminDb().ref(`users/${user.uid}`)
  const existing = (await ref.get()).val()
  await ref.update({
    name,
    email: user.email,
    tier: existing?.tier ?? "free",
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  })
  return NextResponse.json({ ok: true })
}
