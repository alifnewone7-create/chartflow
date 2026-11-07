"use client"

import { getFirebaseAuth } from "@/lib/firebase"

/** Bearer header for the signed-in Firebase user (empty when signed out). */
export async function authHeaders(): Promise<Record<string, string>> {
  const user = getFirebaseAuth().currentUser
  return user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {}
}

/** POST JSON to one of the site's own API routes. */
export async function postJson<T>(path: string, body: unknown): Promise<{ status: number; data: T | null }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const data = (await res.json().catch(() => null)) as T | null
  return { status: res.status, data }
}
