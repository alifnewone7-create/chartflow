/**
 * Tier system + daily signal limits per signal system.
 * -----------------------------------------------------
 * Five plans (Basic → Personal) gate access to three signal systems:
 *
 *   chart-to-signal      → 1-minute next-candle live signal
 *   chart-15sec-signal    → 15-second next-candle live signal
 *   chart-2candle        → chart + tutorial video (no daily limit)
 *
 * The daily limit lives at the intersection of (tier, system). Limits are
 * tracked in Firebase RTDB at `/usage/{qxlKey}/{YYYY-MM-DD}/{system}`.
 */

export type Tier = "free" | "basic" | "smart" | "pro" | "dominator" | "personal"

/**
 * Signal systems that consume daily quota. `chart-2candle` is excluded
 * because it has no signal generation — it's chart + video only.
 */
export type SignalSystem =
  | "chart-to-signal"
  | "chart-15sec-signal"

export const TIERS: Tier[] = ["free", "basic", "smart", "pro", "dominator", "personal"]

export const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  basic: "Basic",
  smart: "Standard",
  pro: "Premium",
  dominator: "Extreme",
  personal: "Personal",
}

/**
 * Daily limit per (tier, system). Per the spec, every signal system that
 * generates signals shares the same limit table — only the timeframe
 * differs.
 */
export const DAILY_LIMITS: Record<Tier, Record<SignalSystem, number>> = {
  free: {
    "chart-to-signal": 0,
    "chart-15sec-signal": 0,
  },
  basic: {
    "chart-to-signal": 10,
    "chart-15sec-signal": 10,
  },
  smart: {
    "chart-to-signal": 25,
    "chart-15sec-signal": 25,
  },
  pro: {
    "chart-to-signal": 50,
    "chart-15sec-signal": 50,
  },
  dominator: {
    "chart-to-signal": 150,
    "chart-15sec-signal": 150,
  },
  personal: {
    "chart-to-signal": Infinity,
    "chart-15sec-signal": Infinity,
  },
}

/**
 * Visual treatment per tier — used by the profile page and signal page
 * headers to colour the tier chip consistently.
 */
export const TIER_ACCENT: Record<
  Tier,
  { from: string; to: string; ring: string; fg: string }
> = {
  free: {
    from: "#94A3B8",
    to: "#475569",
    ring: "rgba(148, 163, 184, 0.40)",
    fg: "#0B1218",
  },
  basic: {
    // Basic tier intentionally uses the same emerald gradient as the
    // primary "Generate Live Signal" CTA so the button reads as a
    // confident go-action instead of looking disabled (the previous
    // gray gradient was being misread as inactive). Foreground stays
    // dark for AA contrast against the bright green fill.
    from: "#34D399",
    to: "#059669",
    ring: "rgba(52, 211, 153, 0.45)",
    fg: "#03161B",
  },
  smart: {
    from: "#34D399",
    to: "#059669",
    ring: "rgba(52, 211, 153, 0.45)",
    fg: "#03161B",
  },
  pro: {
    from: "#7DE3FF",
    to: "#1B7892",
    ring: "rgba(91, 192, 216, 0.45)",
    fg: "#03161B",
  },
  dominator: {
    from: "#FBBF24",
    to: "#B45309",
    ring: "rgba(251, 191, 36, 0.45)",
    fg: "#1A1208",
  },
  personal: {
    from: "#C4B5FD",
    to: "#6D28D9",
    ring: "rgba(196, 181, 253, 0.45)",
    fg: "#0E0420",
  },
}

/**
 * Pretty label for a signal system — used in the profile page usage rows.
 */
export const SYSTEM_LABEL: Record<SignalSystem, string> = {
  "chart-to-signal": "Chart to Signal (1m)",
  "chart-15sec-signal": "15-Second Signal (15s)",
}

/**
 * Daily time limit (in seconds) for the 2 Candle Ahead feature per tier.
 * Basic and Personal have unlimited access (represented as Infinity).
 * Standard: 50 minutes, Premium: 2 hours, Extreme: 4 hours.
 */
export const CANDLE2_TIME_LIMITS: Record<Tier, number> = {
  free: 0,
  basic: Infinity,
  smart: 50 * 60,       // 50 minutes
  pro: 2 * 60 * 60,     // 2 hours
  dominator: 4 * 60 * 60, // 4 hours
  personal: Infinity,
}

/**
 * Human-readable label for the 2 Candle Ahead daily limit.
 */
export function candle2LimitLabel(tier: Tier): string {
  const secs = CANDLE2_TIME_LIMITS[tier]
  if (!isFinite(secs)) return "Unlimited"
  if (secs <= 0) return "Locked"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs} hr`
}

/**
 * Bangladesh-axis "trading day" reset offset.
 *
 * Per product spec the daily quota resets every day at **6:00 AM
 * Bangladesh Standard Time (UTC+6)**. We pick the bucket date by
 * shifting the wall clock by `BD_OFFSET_HOURS - RESET_HOUR_BD = 6 - 6 = 0`
 * hours, which is the same as plain UTC midnight — so a counter started
 * before 6 AM BD still belongs to "yesterday's" bucket and a fresh
 * bucket appears the moment 6 AM BD ticks over.
 *
 * Concretely: 6:00 AM BD (UTC+6) === 00:00 UTC, so the bucket rolls at
 * UTC midnight. We compute it explicitly off a shifted timestamp so the
 * intent is obvious and easy to change if the reset hour ever moves.
 */
const BD_OFFSET_MS = 6 * 60 * 60 * 1000   // UTC+6
const RESET_HOUR_BD = 6                    // 6:00 AM BD

/**
 * Today's bucket key in `YYYY-MM-DD` on the **Bangladesh trading-day axis**.
 * Stored under `/usage/{qxlKey}/{date}/...`. The bucket rolls automatically
 * at 6:00 AM Bangladesh time (UTC+6) every day with no user action — the
 * usage hook re-evaluates this key once a minute and the live RTDB
 * subscription seamlessly switches to the new bucket, which starts at 0.
 */
export function todayKey(): string {
  // Shift "now" by (BD offset − reset hour) so that the calendar date
  // flips precisely at 6 AM BD instead of local midnight.
  const shiftMs = BD_OFFSET_MS - RESET_HOUR_BD * 60 * 60 * 1000 // = 0
  const shifted = new Date(Date.now() + shiftMs)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0")
  const day = String(shifted.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Human label for the daily reset moment, shown in the profile and the
 * quota-exceeded toasts. Single source of truth so we never get drift
 * between the docs and the UI.
 */
export const RESET_LABEL = "6:00 AM BD (UTC+6)"

/**
 * Coerce an arbitrary string from Firebase (or a legacy admin record) into
 * a known Tier. Defaults to "smart" so callers never end up with an
 * undefined tier — the same fallback already used by the admin panel's
 * `normalizeTier` helper.
 */
export function asTier(value: unknown): Tier {
  const v = String(value ?? "").trim().toLowerCase()
  if (TIERS.includes(v as Tier)) return v as Tier
  return "free"
}

/** Daily signal limit as display text ("Unlimited" for the Personal tier). */
export function limitLabel(n: number): string {
  return isFinite(n) ? String(n) : "Unlimited"
}
