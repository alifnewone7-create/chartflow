import { type NextRequest, NextResponse } from "next/server"

import { sql } from "@/lib/neon"

/**
 * Ensure the `payment_proofs` table exists. This makes the upload
 * endpoint self-healing: as soon as a Neon integration is connected
 * (which sets DATABASE_URL), the very first upload will create the
 * required table — no manual SQL/migration step needed.
 */
let _schemaReady: Promise<void> | null = null
function ensureSchema(): Promise<void> {
  if (_schemaReady) return _schemaReady
  _schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS payment_proofs (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL,
        data BYTEA NOT NULL,
        size_bytes INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
  })().catch((err) => {
    // Reset so a future request can retry (e.g. transient Neon error).
    _schemaReady = null
    throw err
  })
  return _schemaReady
}

/**
 * Upload a payment-proof screenshot to Neon (binary `bytea`).
 *
 * - Accepts a single `file` field via multipart/form-data.
 * - Stores `content_type`, raw bytes, and a generated id row in the
 *   `payment_proofs` table.
 * - Returns the public retrieval URL `/api/payment-proof/{id}` which is
 *   then persisted on the Firebase purchase row so the admin panel can
 *   render it inline.
 *
 * Neon is intentionally used ONLY for these images — every other piece
 * of website state still lives in Firebase Realtime Database.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error:
            "Database not connected. Please connect the Neon integration in Project Settings → Integrations.",
        },
        { status: 503 },
      )
    }
    await ensureSchema()
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed." },
        { status: 400 },
      )
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be 4 MB or smaller." },
        { status: 400 },
      )
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const arrayBuffer = await file.arrayBuffer()
    const bytes = Buffer.from(arrayBuffer)

    await sql`
      INSERT INTO payment_proofs (id, content_type, data, size_bytes)
      VALUES (${id}, ${file.type}, ${bytes}, ${file.size})
    `

    const origin = request.nextUrl.origin
    // Store the proof under a relative path so it works on any host
    // (localhost, preview, production) when rendered in the admin panel.
    const path = `/api/payment-proof/${id}`
    const url = `${origin}${path}`
    return NextResponse.json({ url: path, absoluteUrl: url, id })
  } catch (error) {
    console.log("payment-proof upload failed:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
