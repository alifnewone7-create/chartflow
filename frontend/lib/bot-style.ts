export type BotKind = "signal" | "result" | "partial"

const MONO = (t: string) =>
  [...t].map((c) => {
    const n = c.charCodeAt(0)
    if (n >= 65 && n <= 90) return String.fromCodePoint(0x1d670 + n - 65)
    if (n >= 97 && n <= 122) return String.fromCodePoint(0x1d68a + n - 97)
    if (n >= 48 && n <= 57) return String.fromCodePoint(0x1d7f6 + n - 48)
    return c
  }).join("")

export const mono = MONO

const SEP = "━━━━━━━━━━━━━━━━━━━━"
const SEP_R = "━━━━━━━━━━━━━━━━━━━━━"
const SEP_P = "━━━━━━━━━・━━━━━━━━━"

// Mirrors python_backend/signal_engine/bot_style.py
export const BOT_KINDS: Record<BotKind, { label: string; hint: string; allowed: string[]; required: string[]; example: Record<string, string>; fallback: string }> = {
  signal: {
    label: "Signal message",
    hint: "Sent with the chart the moment a new signal is generated.",
    allowed: ["asset", "direction", "entry_time", "payout", "mtg"],
    required: ["asset", "direction", "entry_time"],
    example: { asset: MONO("USD/INR (OTC)"), direction: "🟥 " + MONO("PUT"), entry_time: MONO("14:32"), payout: MONO("91%"), mtg: MONO("1 - Step") },
    fallback: ["✨ ChartFlow Ai", SEP, `💎 ${MONO("Asset")} : {asset}`, `🔥 ${MONO("Signal")} : {direction}`, `⏳ ${MONO("Entry Time")} : {entry_time}`, `💵 ${MONO("Payout")} : {payout}`, `🛡 ${MONO("MTG")} : {mtg}`, SEP].join("\n"),
  },
  result: {
    label: "Result message",
    hint: "Sent as a separate message after the signal's real result is verified.",
    allowed: ["asset", "direction", "entry_time", "result"],
    required: ["asset", "direction", "entry_time", "result"],
    example: { asset: MONO("USD/INR (OTC)"), direction: "🟥 " + MONO("PUT"), entry_time: MONO("14:32"), result: "✅ " + MONO("WIN") },
    fallback: [`📊 ${MONO("SIGNAL RESULT")}`, SEP_R, `💎 ${MONO("Asset")} : {asset}`, `🔥 ${MONO("Signal")} : {direction}`, `⏳ ${MONO("Entry Time")} : {entry_time}`, `🎯 ${MONO("Result")} : {result}`, SEP_R].join("\n"),
  },
  partial: {
    label: "Partial report",
    hint: "Session summary sent after a session is closed.",
    allowed: ["date", "total", "rows", "win", "loss", "accuracy", "pending"],
    required: ["rows", "win", "loss"],
    example: {
      date: MONO("07.11.2026"),
      total: MONO("3"),
      rows: [`${MONO("M1 USDINR-OTC 14:32 PUT")} 👍`, `${MONO("M1 EURUSD-OTC 14:40 CALL")} 👍¹`, `${MONO("M1 USDBRL-OTC 14:52 PUT")} ❌`].join("\n"),
      win: MONO("2"),
      loss: MONO("1"),
      accuracy: MONO("67%"),
      pending: MONO("1"),
    },
    fallback: [`=========== ${MONO("PARTIAL")} ===========`, SEP_P, "🗓 {date}", SEP_P, `☠️ ${MONO("Total")} : {total}`, SEP_P, "{rows}", SEP_P, `🔥 ${MONO("Win")}: {win} | ❌ ${MONO("Loss")}: {loss} | ⚖️ Accuracy ({accuracy})`, SEP_P, `⏳ ${MONO("Pending")}: {pending} (${MONO("not counted")})`].join("\n"),
  },
}

export const PLACEHOLDER_INFO: Record<string, string> = {
  asset: "Market name",
  direction: "CALL / PUT with its colour",
  entry_time: "Entry time (Dhaka)",
  payout: "Payout %",
  mtg: "MTG steps",
  result: "WIN / MTG WIN / LOSS",
  date: "Report date",
  total: "Finished signals",
  rows: "One line per signal",
  win: "Wins (incl. MTG)",
  loss: "Losses",
  accuracy: "Win rate",
  pending: "Pending count (line hidden when 0)",
}

const TOKEN = /\{([a-z_]+)\}/g

export function checkTemplate(kind: BotKind, tpl: string): string | null {
  if (!tpl.trim()) return "Message cannot be empty."
  const { allowed, required } = BOT_KINDS[kind]
  const used = new Set([...tpl.matchAll(TOKEN)].map((m) => m[1]))
  const unknown = [...used].filter((u) => !allowed.includes(u))
  if (unknown.length) return `Unknown placeholder: ${unknown.map((u) => `{${u}}`).join(", ")}`
  const missing = required.filter((r) => !used.has(r))
  if (missing.length) return `Required placeholder missing: ${missing.map((m) => `{${m}}`).join(", ")}`
  return null
}

export function renderPreview(kind: BotKind, tpl: string): string {
  const ex = BOT_KINDS[kind].example
  return tpl.replace(TOKEN, (m, k: string) => ex[k] ?? m)
}
