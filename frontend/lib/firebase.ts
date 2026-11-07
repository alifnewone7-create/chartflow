/**
 * Firebase initialization (client SDK).
 * --------------------------------------
 * Uses the Realtime Database in the asia-southeast1 region. The
 * `getFirebaseApp()` helper is idempotent so HMR / multiple imports
 * during development don't crash with "Firebase app already exists".
 *
 * Database tree
 * -------------
 *   /qxl_keys/{pushId}     QXL keys generated from the admin panel
 *     - key        : string  (e.g. "QXL-AB12-CD34-EF56")
 *     - tier       : "smart" | "pro" | "dominator"
 *     - status     : "unused" | "used"
 *     - createdAt  : number  (ms epoch)
 *     - usedBy     : { fullName, username }   (optional)
 *     - usedAt     : number                   (optional)
 *
 *   /purchases/{pushId}    Submissions from the public purchase form
 *     - tierName   : string
 *     - orderId    : string
 *     - amount     : string
 *     - fullName   : string
 *     - email      : string
 *     - telegram   : string
 *     - note       : string
 *     - status     : "pending" | "approved" | "rejected"
 *     - submittedAt: number
 *     - assignedKey: string  (optional — set when admin approves)
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getDatabase, type Database } from "firebase/database"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "chartflow-ai-476d2.firebaseapp.com",
  databaseURL:
    "https://chartflow-ai-476d2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chartflow-ai-476d2",
  storageBucket: "chartflow-ai-476d2.firebasestorage.app",
  messagingSenderId: "981485768905",
  appId: "1:981485768905:web:7b7c132cad16cea28efd18",
  measurementId: "G-Z7EVKFMLCK",
}

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

export function getDb(): Database {
  return getDatabase(getFirebaseApp())
}

/** Admin panel sign-in (custom token from /api/admin/verify). */
export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp())
}
