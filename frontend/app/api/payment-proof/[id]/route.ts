import { type NextRequest, NextResponse } from "next/server"

import { sql } from "@/lib/neon"

/**
 * Serve a payment-proof screenshot stored in Neon.
 *
 * Streams back the raw bytes with the original Content-Type so an
 * <img src="/api/payment-proof/{id}"> tag in the admin panel renders
 * the screenshot inline. Falls back to a 404 if the id is unknown.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const rows = (await sql`
      SELECT content_type, data
      FROM payment_proofs
      WHERE id = ${id}
      LIMIT 1
    `) as Array<{ content_type: string; data: unknown }>

    const row = rows[0]
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // The Neon serverless driver may return BYTEA as a Buffer, a Uint8Array,
    // or a hex-encoded string (e.g. "\\x89504e47..."). Normalise all three
    // forms back into raw bytes before streaming them to the browser.
    let buffer: Uint8Array
    const data = row.data
    if (data instanceof Uint8Array) {
      buffer = data
    } else if (Buffer.isBuffer(data)) {
      buffer = new Uint8Array(data)
    } else if (typeof data === "string") {
      const hex = data.startsWith("\\x") ? data.slice(2) : data
      buffer = new Uint8Array(Buffer.from(hex, "hex"))
    } else if (data && typeof data === "object" && "data" in (data as object)) {
      // Some drivers return `{ type: "Buffer", data: number[] }`.
      buffer = new Uint8Array((data as { data: number[] }).data)
    } else {
      console.log("payment-proof unexpected data shape:", typeof data)
      return NextResponse.json({ error: "Corrupt image" }, { status: 500 })
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": row.content_type || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.log("payment-proof fetch failed:", error)
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 })
  }
}
