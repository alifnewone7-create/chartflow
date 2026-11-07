"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useFirebaseUser } from "@/hooks/use-firebase-user"
import { asTier, type Tier } from "@/lib/tiers"

export type AccessSession =
  | { state: "loading" }
  | { state: "invalid"; reason: "signed-out" | "error" }
  | {
      state: "ok"
      /** Firebase uid — used as the per-user scope for usage, history and the chart socket. */
      token: string
      qxlKey: string
      tier: Tier
      email: string
      holder: { fullName?: string; username?: string } | null
    }

type SessionResponse = { ok: boolean; uid: string; name: string; email: string; tier: string }

// Re-poll fast so a tier change from the admin panel shows up almost instantly.
const POLL_MS = 4_000

/** The signed-in user's account + tier, kept fresh by polling /api/session. */
export function useAccessSession(): AccessSession {
  const user = useFirebaseUser()
  const [session, setSession] = useState<AccessSession>({ state: "loading" })

  useEffect(() => {
    if (user === undefined) return
    if (user === null) {
      setSession({ state: "invalid", reason: "signed-out" })
      return
    }
    let cancelled = false
    let timer: number | undefined
    let failures = 0
    const check = async () => {
      try {
        const res = await fetch("/api/session", {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
          cache: "no-store",
        })
        const data = (await res.json().catch(() => null)) as SessionResponse | null
        if (cancelled) return
        if (data?.ok) {
          failures = 0
          setSession((prev) => {
            const tier = asTier(data.tier)
            const name = data.name || user.displayName || ""
            if (prev.state === "ok" && prev.tier === tier && prev.holder?.fullName === name) return prev
            return {
              state: "ok",
              token: data.uid,
              qxlKey: data.uid,
              tier,
              email: data.email,
              holder: { fullName: name, username: data.email },
            }
          })
        } else if (++failures >= 3) {
          setSession((prev) => (prev.state === "ok" ? prev : { state: "invalid", reason: "error" }))
        }
      } catch {
        if (!cancelled && ++failures >= 3) {
          setSession((prev) => (prev.state === "ok" ? prev : { state: "invalid", reason: "error" }))
        }
      }
      if (!cancelled) timer = window.setTimeout(check, POLL_MS)
    }
    check()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [user])

  return session
}

/** Send signed-out visitors to the login page. */
export function useSignedOutRedirect(session: AccessSession) {
  const router = useRouter()
  useEffect(() => {
    if (session.state === "invalid" && session.reason === "signed-out") router.replace("/login")
  }, [session, router])
}
