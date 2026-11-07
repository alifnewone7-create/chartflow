// Usage: node scripts/seed-test-user.mjs <email> <password> <tier>
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
let raw = env.FIREBASE_SERVICE_ACCOUNT ?? process.env.FIREBASE_SERVICE_ACCOUNT
let text = raw.trim()
try { JSON.parse(text) } catch { text = text.replace(/\\"/g, '"').replace(/\r?\n/g, "\\n") }
const sa = JSON.parse(text)
if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\\n/g, "\n")

const app = getApps()[0] ?? initializeApp({ credential: cert(sa), databaseURL: "https://chartflow-ai-476d2-default-rtdb.asia-southeast1.firebasedatabase.app" })
const [email, password, tier = "pro"] = process.argv.slice(2)
const auth = getAuth(app)
let user
try { user = await auth.getUserByEmail(email) } catch { user = await auth.createUser({ email, password, displayName: "QA Trader", emailVerified: true }) }
await auth.updateUser(user.uid, { password, emailVerified: true })
await getDatabase(app).ref(`users/${user.uid}`).update({ email, name: "QA Trader", tier, createdAt: Date.now(), updatedAt: Date.now() })
console.log(JSON.stringify({ uid: user.uid, email, tier }))
process.exit(0)
