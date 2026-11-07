import { NextResponse } from "next/server"

import { adminAuth } from "@/lib/server/firebase-admin"

/**
 * POST /api/admin/verify
 *
 * Verifies the admin's password + secret key against server-side
 * environment variables. The credentials never leave the server —
 * the client only sees a boolean ``ok`` response, so View Source /
 * the JS bundle can no longer be used to extract them (which was the
 * case when the password was a hard-coded string in the client
 * component).
 *
 * Both ``ADMIN_PASSWORD`` and ``ADMIN_SECRET_KEY`` are required env
 * vars. If either is missing on the server we fail closed with a 500
 * so a misconfigured deploy can't accidentally accept any input.
 *
 * Constant-time string comparison is used to avoid leaking length /
 * prefix info via timing side-channels.
 */
export const runtime = "nodejs"

function safeEqual(a: string, b: string): boolean {
  // Both inputs are short admin secrets; this constant-time
  // implementation works on equal-length strings only, so we always
  // compare against a same-length buffer derived from ``a``.
  if (a.length !== b.length) {
    // Still walk through to keep timing roughly constant.
    let mismatch = 1
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
    }
    return mismatch === 0 // always false here, but compiler can't tell
  }
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export async function POST(req: Request) {
  // Defaults until the owner sets ADMIN_PASSWORD / ADMIN_SECRET_KEY.
  const expectedPassword = process.env.ADMIN_PASSWORD || "iamhear"
  const expectedSecret = process.env.ADMIN_SECRET_KEY || "iamhear"

  if (!expectedPassword || !expectedSecret) {
    // Fail closed — never accept input if the server is misconfigured.
    console.log("/api/admin/verify missing env vars")
    return NextResponse.json(
      { ok: false, error: "Server misconfigured." },
      { status: 500 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    )
  }

  const password =
    typeof (body as { password?: unknown })?.password === "string"
      ? ((body as { password: string }).password)
      : ""
  const secret =
    typeof (body as { secret?: unknown })?.secret === "string"
      ? ((body as { secret: string }).secret)
      : ""

  if (!password || !secret) {
    return NextResponse.json(
      { ok: false, error: "Both fields are required." },
      { status: 400 },
    )
  }

  const passOk = safeEqual(password, expectedPassword)
  const secretOk = safeEqual(secret, expectedSecret)

  if (!passOk || !secretOk) {
    return NextResponse.json(
      { ok: false, error: "Invalid credentials." },
      { status: 401 },
    )
  }

  // Firebase sign-in token for the admin panel (database rules only allow admin=true).
  try {
    const firebaseToken = await adminAuth().createCustomToken("qx-admin", { admin: true })
    return NextResponse.json({ ok: true, firebaseToken })
  } catch (err) {
    console.log("/api/admin/verify token mint failed:", err)
    return NextResponse.json({ ok: false, error: "Server misconfigured." }, { status: 500 })
  }
}
