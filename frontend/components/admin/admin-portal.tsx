"use client"

/**
 * AdminPortal
 * -----------
 * Top-level wrapper for the /qx-pvt-portal-live route. Handles the
 * password + secret-key gate and remembers the unlock state for the
 * session so the operator doesn't have to retype credentials on
 * every reload.
 *
 * SECURITY NOTE
 * The actual password/secret are stored in server env vars
 * (``ADMIN_PASSWORD``, ``ADMIN_SECRET_KEY``) and verified by
 * ``/api/admin/verify``. The client never sees them, so View Source
 * or the JS bundle cannot be used to extract credentials. The only
 * client-side artefact is a localStorage flag indicating the session
 * was previously verified — clearing it just forces a re-login.
 *
 * On success the server also returns a Firebase custom token with the
 * ``admin`` claim; the RTDB rules only allow that signed-in admin to
 * read/write, everything else goes through server API routes.
 */

import { useEffect, useState } from "react"
import { onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth"

import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { AdminLogin } from "@/components/admin/admin-login"
import { getFirebaseAuth } from "@/lib/firebase"

const STORAGE_FLAG = "qx-admin-unlocked"

export function AdminPortal() {
  const [unlocked, setUnlocked] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Restore the unlocked state from localStorage so the admin stays
  // logged in across reloads and browser sessions until they log out.
  // The database only answers a Firebase user with the admin claim, so the
  // dashboard opens only once that sign-in is restored.
  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), async (user) => {
      let isAdmin = false
      try {
        isAdmin = !!user && (await user.getIdTokenResult()).claims.admin === true
        if (isAdmin && window.localStorage.getItem(STORAGE_FLAG) !== "1") isAdmin = false
      } catch {
        isAdmin = false
      }
      setUnlocked(isAdmin)
      setHydrated(true)
    })
  }, [])

  /**
   * Verifies credentials by calling the server route. Returns
   * ``true`` on success / ``false`` on any failure (wrong creds,
   * network error, server misconfig). The login form surfaces the
   * boolean as a generic "Invalid credentials" error so we don't
   * leak which field was wrong.
   */
  async function handleLogin(
    password: string,
    secret: string,
  ): Promise<boolean> {
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, secret }),
      })
      if (!res.ok) return false
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; firebaseToken?: string }
        | null
      if (!data?.ok || !data.firebaseToken) return false
      try {
        window.localStorage.setItem(STORAGE_FLAG, "1")
      } catch {
        /* ignore */
      }
      await signInWithCustomToken(getFirebaseAuth(), data.firebaseToken)
      setUnlocked(true)
      return true
    } catch (err) {
      console.log("admin verify failed:", err)
      return false
    }
  }

  function handleLogout() {
    try {
      window.localStorage.removeItem(STORAGE_FLAG)
    } catch {
      /* ignore */
    }
    signOut(getFirebaseAuth()).catch(() => undefined)
    setUnlocked(false)
  }

  // Avoid a flash of the login screen when the admin is already
  // authenticated for the session.
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-white/60">
        Loading…
      </div>
    )
  }

  return unlocked ? (
    <AdminDashboard onLogout={handleLogout} />
  ) : (
    <AdminLogin onSubmit={handleLogin} />
  )
}
