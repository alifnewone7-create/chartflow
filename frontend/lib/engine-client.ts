"use client"

import { authHeaders } from "@/lib/api-client"
import { resolveHttpBase } from "@/lib/signals-client"

export type SignalStatus = "PENDING" | "WIN" | "MTG WIN" | "LOSS"

export type Attempt = {
  step: number
  candle_time: number
  open: number
  high: number
  low: number
  close: number
  color: "green" | "red" | "doji"
  outcome: "WIN" | "LOSS" | "DOJI"
}

export type Delivery = {
  state: "sending" | "sent" | "failed" | "skipped_late"
  chat_id?: string
  message_id?: number
  error?: string
  result?: { state: string; error?: string }
}

export type EngineSignal = {
  signal_id: string
  key: string
  feature: "c2s" | "future" | "auto"
  asset: string
  asset_name: string
  market_type: "OTC" | "Regular"
  direction: "CALL" | "PUT"
  timeframe: "M1"
  entry_at: number
  expiry_at: number
  payout: number | null
  confidence: number
  analysis?: {
    summary: string
    votes?: { name: string; direction: string | null; confidence: number; note: string }[]
    technical?: Record<string, string | number | null>
  }
  mtg_steps: number
  status: SignalStatus
  eval_state: string
  first_result?: "WIN" | "LOSS" | null
  attempts?: Record<string, Attempt>
  review_required?: boolean
  generated_at: number
  evaluated_at?: number
  batch_id?: string
  session_id?: string
  delivery?: Record<string, Delivery>
}

export type Market = { symbol: string; name: string; type: "OTC" | "Regular"; payout: number; open: boolean }

export class EngineError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Call the VPS signal engine (`/engine/*`) with the signed-in user's Firebase ID token. */
export async function engine<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", ...(await authHeaders()) }
  const apiKey = process.env.NEXT_PUBLIC_WS_SHARED_SECRET
  if (apiKey) headers["x-api-key"] = apiKey
  let res: Response
  try {
    res = await fetch(`${resolveHttpBase()}/engine${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    })
  } catch {
    throw new EngineError(0, "Signal server is unreachable. Check your connection and try again.")
  }
  const data = (await res.json().catch(() => null)) as (T & { detail?: unknown; error?: string }) | null
  if (!res.ok) {
    const d = data?.detail
    const msg = typeof d === "string" ? d : Array.isArray(d) ? "Please check the values you entered." : data?.error || res.statusText
    throw new EngineError(res.status, msg || "Request failed")
  }
  return data as T
}

export const marketLabel = (symbol: string): { base: string; otc: boolean } => {
  const otc = /_otc$/i.test(symbol)
  const raw = symbol.replace(/_otc$/i, "").toUpperCase()
  return { base: raw.length === 6 && /^[A-Z]+$/.test(raw) ? `${raw.slice(0, 3)}/${raw.slice(3)}` : raw, otc }
}

const dhaka = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", ...opts })
export const fmtTime = (sec: number) => dhaka({ hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(sec * 1000)
export const fmtHM = (sec: number) => dhaka({ hour: "2-digit", minute: "2-digit", hour12: false }).format(sec * 1000)
export const fmtDate = (ms: number) => dhaka({ day: "2-digit", month: "short", year: "numeric" }).format(ms)
export const dhakaDay = (ms: number) => dhaka({ year: "numeric", month: "2-digit", day: "2-digit" }).format(ms).split("/").reverse().join("-")
