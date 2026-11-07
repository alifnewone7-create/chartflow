import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

/**
 * Lightweight Neon SQL client used ONLY for the payment-proof image store.
 *
 * The rest of the app's data (purchases, qxl_keys, access_tokens, etc.)
 * lives in Firebase Realtime Database — Neon is intentionally scoped to
 * just the binary screenshot blobs to keep Firebase rows small and fast.
 *
 * The client is created lazily so that builds don't fail when
 * DATABASE_URL isn't available at module-load time (e.g. during
 * Next.js "collect page data" step on Vercel).
 */
let _sql: NeonQueryFunction<false, false> | null = null

function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }
  _sql = neon(url)
  return _sql
}

// Proxy that forwards both tagged-template calls and method access
// (e.g. sql.query(...)) to a lazily initialized neon client.
export const sql = new Proxy(function () {} as unknown as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, args: unknown[]) {
    const client = getSql() as unknown as (...a: unknown[]) => unknown
    return client(...args)
  },
  get(_target, prop: string | symbol) {
    const client = getSql() as unknown as Record<string | symbol, unknown>
    const value = client[prop]
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value
  },
}) as NeonQueryFunction<false, false>
