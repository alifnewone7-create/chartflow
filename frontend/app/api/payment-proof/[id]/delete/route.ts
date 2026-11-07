import { type NextRequest, NextResponse } from "next/server"

import { sql } from "@/lib/neon"

/**
 * Delete a payment-proof row from Neon.
 *
 * Called by the admin panel when a purchase row is deleted, so the
 * uploaded screenshot doesn't keep eating Neon storage after the
 * Firebase purchase entry is gone.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    await sql`DELETE FROM payment_proofs WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.log("payment-proof delete failed:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
