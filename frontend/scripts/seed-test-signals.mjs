// Usage: node scripts/seed-test-signals.mjs <email>  — QA-only sample history for the test user
import { readFileSync } from "node:fs"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getDatabase } from "firebase-admin/database"

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]
    }),
)
let text = (env.FIREBASE_SERVICE_ACCOUNT ?? process.env.FIREBASE_SERVICE_ACCOUNT).trim()
try { JSON.parse(text) } catch { text = text.replace(/\\"/g, '"').replace(/\r?\n/g, "\\n") }
const sa = JSON.parse(text)
if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\\n/g, "\n")
const app = getApps()[0] ?? initializeApp({ credential: cert(sa), databaseURL: "https://chartflow-ai-476d2-default-rtdb.asia-southeast1.firebasedatabase.app" })
const user = await getAuth(app).getUserByEmail(process.argv[2])
const db = getDatabase(app)

const ASSETS = ["USDBRL_otc", "EURUSD_otc", "BTCUSD_otc", "XAUUSD_otc", "GBPJPY_otc"]
const STATUS = ["WIN", "LOSS", "MTG WIN", "WIN", "PENDING"]
const now = Math.floor(Date.now() / 1000 / 60) * 60
const sig = (feature, i, entry, batch) => {
  const key = `qa_${feature}_${entry}_${i}`
  return [key, {
    signal_id: key, key, feature, asset: ASSETS[i % 5], asset_name: ASSETS[i % 5], market_type: "OTC",
    direction: i % 2 ? "PUT" : "CALL", timeframe: "M1", entry_at: entry, expiry_at: entry + 60, payout: 80 + i,
    confidence: 0.7 + i / 100, mtg_steps: 1, status: STATUS[i % 5], eval_state: "done", generated_at: (entry - 300) * 1000,
    ...(batch ? { batch_id: batch } : {}),
  }]
}
const fut = {}, c2s = {}
for (const [d, n] of [[0, 5], [0, 3], [1, 4]]) {
  const base = now - d * 86400 - n * 600
  const batch = `qa_batch_${base}`
  for (let i = 0; i < n; i++) Object.assign(fut, Object.fromEntries([sig("future", i, base + i * 120, batch)]))
}
for (const d of [0, 1]) for (let i = 0; i < 4; i++) Object.assign(c2s, Object.fromEntries([sig("c2s", i, now - d * 86400 - i * 900)]))
await db.ref(`signals/future/${user.uid}`).update(fut)
await db.ref(`signals/c2s/${user.uid}`).update(c2s)
console.log(JSON.stringify({ uid: user.uid, future: Object.keys(fut).length, c2s: Object.keys(c2s).length }))
process.exit(0)
