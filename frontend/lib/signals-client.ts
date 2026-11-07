/**
 * Thin client for the Python backend's `/signals/generate` endpoint.
 *
 * Mirrors `resolveDefaultWsUrl()` in `hooks/use-quotex-ws.ts` — we derive
 * the HTTP base URL from the configured WebSocket URL so users only need
 * to set the backend host once on the `/livechart` settings page.
 */

import { resolveDefaultWsUrl } from "@/hooks/use-quotex-ws"

export type SignalDirection = "CALL" | "PUT" | null

export type StrategyVote = {
  name: string
  direction: SignalDirection
  confidence: number
  note: string
}

export type SignalResponse = {
  asset: string
  period: number
  direction: SignalDirection
  confidence: number
  bullish: number
  bearish: number
  abstain: number
  votes: StrategyVote[]
  candle_count: number
  generated_at: number
}

/**
 * Convert a `ws://host:port/ws` (or `wss://`) URL into its HTTP origin so
 * we can hit the FastAPI REST endpoints on the same backend.
 */
export function resolveHttpBase(): string {
  const ws = resolveDefaultWsUrl()
  let url: URL
  try {
    url = new URL(ws)
  } catch {
    return "http://localhost:8000"
  }
  const isSecure = url.protocol === "wss:"
  return `${isSecure ? "https:" : "http:"}//${url.host}`
}

/**
 * Fetch a fresh signal from the backend. Throws an Error on transport or
 * server failure — the caller surfaces this to the user as a toast.
 */
export async function generateSignal(args: {
  asset: string
  period: number
  count?: number
}): Promise<SignalResponse> {
  const base = resolveHttpBase()
  // Backend's `_origin_guard_http` middleware requires `X-API-Key` on all
  // non-GET requests when `WS_SHARED_SECRET` is configured server-side.
  // We expose the same value on the client as `NEXT_PUBLIC_WS_SHARED_SECRET`
  // so the browser can authenticate against the FastAPI signal endpoint.
  const apiKey = process.env.NEXT_PUBLIC_WS_SHARED_SECRET
  const headers: Record<string, string> = {
    "content-type": "application/json",
  }
  if (apiKey) headers["x-api-key"] = apiKey

  const res = await fetch(`${base}/signals/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      asset: args.asset,
      period: args.period,
      count: args.count ?? 120,
    }),
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { detail?: string }
      if (body?.detail) detail = body.detail
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  return (await res.json()) as SignalResponse
}
