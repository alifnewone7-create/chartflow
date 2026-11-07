// Usage: node scripts/seed-test-auto.mjs <uid>  — seeds QA Automatic Signal sessions (keys prefixed qa_)
import { readFileSync } from "node:fs"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getDatabase } from "firebase-admin/database"

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=")
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]
  }),
)
let text = (env.FIREBASE_SERVICE_ACCOUNT ?? process.env.FIREBASE_SERVICE_ACCOUNT).trim()
try { JSON.parse(text) } catch { text = text.replace(/\\"/g, '"').replace(/\r?\n/g, "\\n") }
const sa = JSON.parse(text)
if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\\n/g, "\n")
const app = getApps()[0] ?? initializeApp({ credential: cert(sa), databaseURL: "https://chartflow-ai-476d2-default-rtdb.asia-southeast1.firebasedatabase.app" })
const db = getDatabase(app)

const [uid] = process.argv.slice(2)
if (!uid) throw new Error("uid required")

const MARKETS = ["USDBDT_otc", "EURUSD_otc", "USDBRL_otc", "GBPUSD_otc", "USDINR_otc"]
const now = Date.now()
const minute = Math.floor(now / 60000) * 60

function signal(sid, i, entry, status, dir) {
  const first = status === "WIN" ? "WIN" : status === "PENDING" ? null : "LOSS"
  const attempts = {}
  if (first) attempts["0"] = { step: 0, candle_time: entry, open: 1.085, high: 1.0858, low: 1.0845, close: first === "WIN" ? 1.0856 : 1.0847, color: first === "WIN" ? "green" : "red", outcome: first }
  if (status === "MTG WIN") attempts["1"] = { step: 1, candle_time: entry + 60, open: 1.0847, high: 1.0855, low: 1.0844, close: 1.0853, color: "green", outcome: "WIN" }
  if (status === "LOSS") attempts["1"] = { step: 1, candle_time: entry + 60, open: 1.0847, high: 1.0849, low: 1.084, close: 1.0842, color: "red", outcome: "LOSS" }
  return {
    signal_id: `qa-${sid}-${i}`, key: `qa_${sid}_${i}`, feature: "auto", asset: MARKETS[i % MARKETS.length], asset_name: MARKETS[i % MARKETS.length].replace("_otc", " (OTC)"),
    market_type: "OTC", direction: dir, timeframe: "M1", entry_at: entry, expiry_at: entry + 60, payout: 82 + (i % 3) * 3, confidence: 0.62 + (i % 4) * 0.07,
    analysis: { summary: "QA sample: momentum + support bounce on real M1 data." }, mtg_steps: 1, status, eval_state: status === "PENDING" ? "waiting_entry" : "final",
    first_result: first, attempts: Object.keys(attempts).length ? attempts : null, generated_at: (entry - 45) * 1000, session_id: sid,
    delivery: { personal: { state: "sent", chat_id: "1", message_id: 100 + i, photo: true, ...(status !== "PENDING" ? { result: { state: "sent", message_id: 200 + i } } : {}) } },
  }
}

const sessions = [
  { sid: "qa_sess_closed_1", status: "closed", mode: "payout", createdOffset: 6 * 3600, closedOffset: 4 * 3600, results: ["WIN", "LOSS", "MTG WIN", "WIN", "WIN", "LOSS", "MTG WIN", "WIN"] },
  { sid: "qa_sess_closed_2", status: "closed", mode: "manual", createdOffset: 3 * 3600, closedOffset: 1.5 * 3600, results: ["WIN", "MTG WIN", "WIN", "LOSS", "WIN"] },
]
const updates = {}
for (const s of sessions) {
  const created = (minute - s.createdOffset) * 1000
  const st = { total: s.results.length, pending: s.results.filter((r) => r === "PENDING").length, win: s.results.filter((r) => r === "WIN").length, mtg_win: s.results.filter((r) => r === "MTG WIN").length, loss: s.results.filter((r) => r === "LOSS").length }
  const done = st.win + st.mtg_win + st.loss
  st.accuracy = done ? Math.round(((st.win + st.mtg_win) / done) * 100) : null
  updates[`auto/sessions/${uid}/${s.sid}`] = {
    session_id: s.sid, status: s.status, mode: s.mode, markets: s.mode === "manual" ? MARKETS.slice(0, 3) : null, active_markets: MARKETS,
    min_payout: 80, min_confidence: 60, mtg_steps: 1, destination: "personal", created_at: created, closed_at: (minute - s.closedOffset) * 1000,
    last_signal_at: (minute - s.closedOffset - 120) * 1000, stats: st,
  }
  s.results.forEach((r, i) => {
    const entry = minute - s.createdOffset + 300 + i * 600
    updates[`auto/signals/${uid}/${s.sid}/qa_${s.sid}_${i}`] = signal(s.sid, i, entry, r, i % 2 ? "PUT" : "CALL")
  })
}
await db.ref().update(updates)
console.log(JSON.stringify({ uid, sessions: sessions.map((s) => s.sid) }))
process.exit(0)
