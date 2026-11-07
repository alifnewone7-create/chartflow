import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getDatabase } from "firebase-admin/database"

import { asTier, type Tier } from "@/lib/tiers"

// Server-only Firebase access. The Realtime Database rules deny every
// browser read/write except a signed-in admin, so all user traffic goes
// through the API routes that use this service-account client.
const DATABASE_URL = "https://chartflow-ai-476d2-default-rtdb.asia-southeast1.firebasedatabase.app"

function adminApp(): App {
  const existing = getApps()[0]
  if (existing) return existing
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set")
  return initializeApp({ credential: cert(parseServiceAccount(raw)), databaseURL: DATABASE_URL })
}

function parseServiceAccount(raw: string): Record<string, string> {
  let text = raw.trim()
  try {
    JSON.parse(text)
  } catch {
    text = text.replace(/\\"/g, '"').replace(/\r?\n/g, "\\n")
  }
  const sa = JSON.parse(text)
  if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\\n/g, "\n")
  return sa
}

export const adminDb = () => getDatabase(adminApp())
export const adminAuth = () => getAuth(adminApp())

export type UserRecord = {
  uid: string
  email: string
  name: string
  tier: Tier
  createdAt: number | null
}

/** The signed-in user (Firebase ID token in `Authorization: Bearer`) with their /users row. */
export async function verifyUser(req: Request): Promise<UserRecord | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return null
  try {
    const decoded = await adminAuth().verifyIdToken(token)
    const row = ((await adminDb().ref(`users/${decoded.uid}`).get()).val() ?? {}) as Record<string, unknown>
    return {
      uid: decoded.uid,
      email: String(row.email || decoded.email || ""),
      name: String(row.name || decoded.name || ""),
      tier: asTier(row.tier),
      createdAt: typeof row.createdAt === "number" ? row.createdAt : null,
    }
  } catch {
    return null
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json()
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export const str = (v: unknown, max = 500): string => (typeof v === "string" ? v.trim().slice(0, max) : "")
