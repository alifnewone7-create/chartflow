"use client"

import { equalTo, get, orderByChild, query, ref, update } from "firebase/database"

import { getDb } from "@/lib/firebase"
import type { Tier } from "@/lib/admin-types"

/** Set a registered user's tier, found by uid or (fallback) by email. Returns the uid, or null if no user matched. */
export async function applyTierToUser(uid: string | undefined, email: string | undefined, tier: Tier): Promise<string | null> {
  let target = uid || null
  if (!target && email) {
    const snap = await get(query(ref(getDb(), "users"), orderByChild("email"), equalTo(email.trim().toLowerCase())))
    const rows = snap.val() as Record<string, unknown> | null
    target = rows ? Object.keys(rows)[0] : null
  }
  if (!target) return null
  await update(ref(getDb(), `users/${target}`), { tier, updatedAt: Date.now() })
  return target
}
