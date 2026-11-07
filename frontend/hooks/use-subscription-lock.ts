"use client"

/**
 * Cross-tab subscription lock.
 *
 * Enforces the product rule: "a single user can only have one
 * market/pair subscribed at any moment across every signal-room page
 * inside this browser". When the same access-token is opened in a
 * second tab and the user tries to pick a pair, that tab is blocked
 * with an overlay until either (a) the first tab releases the lock
 * (closes, navigates away, or unsubscribes) or (b) the user clicks
 * "Take over here" in the new tab.
 *
 * Scope
 * -----
 * - Same browser only (BroadcastChannel + localStorage).
 * - Keyed by the user's access token, so two different QXL keys in
 *   the same browser can each hold their own pair simultaneously.
 * - One pair per user across ALL signal pages (5s / 1m / 2-candle /
 *   autosignal) — the lock key is the token, not the page.
 *
 * Wire-protocol
 * -------------
 * Each tab has a stable random ``tabId`` (per session). The lock is
 * stored in ``localStorage`` under ``qxl:active-pair:<token>`` as
 * ``{ tabId, pair, period, ts }``. Tabs also chat over a
 * ``BroadcastChannel("qxl:pair-lock:<token>")`` so the owner is
 * notified immediately when another tab requests a takeover, instead
 * of waiting for a localStorage poll.
 *
 *   - ``claim``    — "I want to subscribe to <pair>". If no current
 *                    owner (or the existing lock is stale), claim it.
 *                    Otherwise stay ``blocked``.
 *   - ``takeover`` — "I'm forcefully taking the lock". The current
 *                    owner switches to ``blocked``; the sender becomes
 *                    the new owner.
 *   - ``release`` — "I'm no longer holding the lock" (page unload,
 *                    user cleared the selection, or hook unmount).
 *   - ``ping``    — heartbeat sent by the owner every ~5s; stale
 *                    locks (older than ~12s) are considered abandoned
 *                    and any tab is allowed to claim.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

const HEARTBEAT_MS = 5_000
const STALE_AFTER_MS = 12_000

export type LockStatus = "idle" | "owner" | "blocked"

export type LockState = {
  status: LockStatus
  /** Pair currently held by the OTHER tab, if any (only when ``blocked``). */
  otherPair: string | null
  /** Pair this tab is allowed to own (only when ``owner``). */
  pair: string | null
}

type LockRecord = {
  tabId: string
  pair: string
  period: number
  ts: number
}

type Msg =
  | { type: "claim"; tabId: string; pair: string; period: number; ts: number }
  | { type: "takeover"; tabId: string; pair: string; period: number; ts: number }
  | { type: "release"; tabId: string }
  | { type: "ping"; tabId: string; pair: string; period: number; ts: number }
  | { type: "who"; tabId: string }

function storageKey(token: string) {
  return `qxl:active-pair:${token}`
}

function channelName(token: string) {
  return `qxl:pair-lock:${token}`
}

function readLock(token: string): LockRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(storageKey(token))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LockRecord>
    if (
      typeof parsed.tabId !== "string" ||
      typeof parsed.pair !== "string" ||
      typeof parsed.period !== "number" ||
      typeof parsed.ts !== "number"
    ) {
      return null
    }
    return parsed as LockRecord
  } catch {
    return null
  }
}

function writeLock(token: string, record: LockRecord) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey(token), JSON.stringify(record))
  } catch {
    /* quota / private-mode — ignored */
  }
}

function clearLock(token: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(storageKey(token))
  } catch {
    /* ignored */
  }
}

function isStale(record: LockRecord) {
  return Date.now() - record.ts > STALE_AFTER_MS
}

export type UseSubscriptionLockArgs = {
  /** Access-token (or empty string while session is still loading). */
  token: string | null | undefined
  /** Pair the consumer wants to subscribe to (or null when none). */
  desiredPair: string | null
  /** Candle period in seconds — stored in the lock record for debugging. */
  period: number
}

/**
 * Coordinate the "one pair per user across this browser" lock.
 *
 * The hook is intentionally side-effect-light: it does NOT
 * subscribe/unsubscribe to the WebSocket itself. Instead it returns
 * a ``status`` and lets the caller gate its own subscribe() call.
 *
 * @returns
 *   - ``status: "idle"``    — user hasn't picked a pair yet
 *   - ``status: "owner"``   — caller is allowed to subscribe to ``pair``
 *   - ``status: "blocked"`` — another tab owns ``otherPair``; caller
 *                              must NOT subscribe. Show "Take over"
 *                              UI; call ``takeOver()`` to seize the
 *                              lock.
 */
export function useSubscriptionLock({
  token,
  desiredPair,
  period,
}: UseSubscriptionLockArgs): LockState & { takeOver: () => void } {
  // Stable per-tab id for the lifetime of this **browser tab** (not
  // just this hook instance). We persist the id in ``sessionStorage``
  // so that navigating between signal pages in the same tab — which
  // mounts a fresh ``useSubscriptionLock`` hook each time — keeps
  // reusing the same id. Without this, the new page would generate a
  // fresh random id, see the previous page's lock as "another tab",
  // and incorrectly block the user from picking a pair until the
  // ~12s stale timeout kicks in. ``sessionStorage`` is scoped per
  // browser tab, so a *different* tab still gets a different id and
  // the cross-tab takeover flow keeps working as before.
  const tabIdRef = useRef<string>("")
  if (!tabIdRef.current) {
    const SESSION_KEY = "qxl:tab-id"
    let id = ""
    if (typeof window !== "undefined") {
      try {
        id = window.sessionStorage.getItem(SESSION_KEY) ?? ""
      } catch {
        /* private mode / disabled storage — fall back to in-memory */
      }
    }
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tab_${Math.random().toString(36).slice(2)}_${Date.now()}`
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(SESSION_KEY, id)
        } catch {
          /* ignored */
        }
      }
    }
    tabIdRef.current = id
  }

  const safeToken = (token ?? "").trim().toLowerCase()
  const desired = desiredPair ?? null

  const [otherLock, setOtherLock] = useState<LockRecord | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ownsLockRef = useRef(false)

  // Open the BroadcastChannel once per token. Re-creates if the token
  // changes (e.g. logout → login as a different user in the same tab).
  useEffect(() => {
    if (!safeToken) return
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      return
    }
    const ch = new BroadcastChannel(channelName(safeToken))
    channelRef.current = ch

    // Ask whoever else is alive to identify themselves.
    ch.postMessage({ type: "who", tabId: tabIdRef.current } satisfies Msg)

    const onMessage = (ev: MessageEvent<Msg>) => {
      const m = ev.data
      if (!m || m.tabId === tabIdRef.current) return
      if (m.type === "release") {
        // The other tab gave up the lock — clear our cached view.
        setOtherLock((prev) => (prev && prev.tabId === m.tabId ? null : prev))
        return
      }
      if (m.type === "who") {
        // Someone asked who's alive; if we currently own a lock,
        // re-broadcast it so they can pick it up.
        if (ownsLockRef.current) {
          const ours = readLock(safeToken)
          if (ours && ours.tabId === tabIdRef.current) {
            ch.postMessage({
              type: "ping",
              tabId: tabIdRef.current,
              pair: ours.pair,
              period: ours.period,
              ts: Date.now(),
            } satisfies Msg)
          }
        }
        return
      }
      if (m.type === "takeover") {
        // Another tab forcibly grabbed the lock — drop our ownership.
        ownsLockRef.current = false
        setOtherLock({
          tabId: m.tabId,
          pair: m.pair,
          period: m.period,
          ts: m.ts,
        })
        return
      }
      // claim / ping from another tab — remember its lock.
      setOtherLock({
        tabId: m.tabId,
        pair: m.pair,
        period: m.period,
        ts: m.ts,
      })
    }

    ch.addEventListener("message", onMessage)
    return () => {
      ch.removeEventListener("message", onMessage)
      ch.close()
      if (channelRef.current === ch) channelRef.current = null
    }
  }, [safeToken])

  // Cross-tab fallback via the `storage` event — fires when another
  // tab calls writeLock/clearLock, including in browsers without
  // BroadcastChannel.
  useEffect(() => {
    if (!safeToken) return
    if (typeof window === "undefined") return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey(safeToken)) return
      if (!e.newValue) {
        setOtherLock((prev) => (prev ? null : prev))
        return
      }
      try {
        const parsed = JSON.parse(e.newValue) as LockRecord
        if (parsed.tabId !== tabIdRef.current) {
          setOtherLock(parsed)
        }
      } catch {
        /* ignored */
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [safeToken])

  // Compute the effective status. We re-read localStorage on every
  // render so a hard refresh in another tab doesn't leave us with a
  // stale view (the storage event won't fire for the same window).
  const persisted = safeToken ? readLock(safeToken) : null
  const otherActive = (() => {
    const candidate =
      otherLock ??
      (persisted && persisted.tabId !== tabIdRef.current ? persisted : null)
    if (!candidate) return null
    if (isStale(candidate)) return null
    return candidate
  })()

  let status: LockStatus = "idle"
  let pair: string | null = null
  let otherPair: string | null = null

  if (!desired) {
    status = "idle"
  } else if (otherActive && otherActive.tabId !== tabIdRef.current) {
    status = "blocked"
    otherPair = otherActive.pair
  } else {
    status = "owner"
    pair = desired
  }

  // Claim / heartbeat / release side-effects.
  useEffect(() => {
    if (!safeToken) return
    if (status === "owner" && desired) {
      // Write our claim and start heartbeating.
      const record: LockRecord = {
        tabId: tabIdRef.current,
        pair: desired,
        period,
        ts: Date.now(),
      }
      writeLock(safeToken, record)
      ownsLockRef.current = true
      channelRef.current?.postMessage({
        type: "claim",
        ...record,
      } satisfies Msg)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      heartbeatRef.current = setInterval(() => {
        const beat: LockRecord = {
          tabId: tabIdRef.current,
          pair: desired,
          period,
          ts: Date.now(),
        }
        writeLock(safeToken, beat)
        channelRef.current?.postMessage({
          type: "ping",
          ...beat,
        } satisfies Msg)
      }, HEARTBEAT_MS)
    } else {
      // Either idle or blocked — make sure we're not heartbeating and
      // that we're not still listed as the owner in localStorage.
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
      if (ownsLockRef.current) {
        ownsLockRef.current = false
        const ours = readLock(safeToken)
        if (ours && ours.tabId === tabIdRef.current) {
          clearLock(safeToken)
        }
        channelRef.current?.postMessage({
          type: "release",
          tabId: tabIdRef.current,
        } satisfies Msg)
      }
    }
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
    }
  }, [safeToken, status, desired, period])

  // Release the lock on hook unmount (route change away from any chart
  // page). Without this, navigating from a chart page to another route
  // leaves the lock held in localStorage until the heartbeat goes
  // stale (~12s), during which any other tab/page is blocked. We
  // intentionally separate this from the claim-effect above so the
  // release fires only on true unmount, not on every status flip.
  useEffect(() => {
    if (!safeToken) return
    return () => {
      if (!ownsLockRef.current) return
      ownsLockRef.current = false
      const ours = readLock(safeToken)
      if (ours && ours.tabId === tabIdRef.current) {
        clearLock(safeToken)
      }
      try {
        channelRef.current?.postMessage({
          type: "release",
          tabId: tabIdRef.current,
        } satisfies Msg)
      } catch {
        /* ignored */
      }
    }
  }, [safeToken])

  // Best-effort release on tab close / navigation away.
  useEffect(() => {
    if (!safeToken) return
    if (typeof window === "undefined") return
    const onUnload = () => {
      if (!ownsLockRef.current) return
      const ours = readLock(safeToken)
      if (ours && ours.tabId === tabIdRef.current) clearLock(safeToken)
      try {
        channelRef.current?.postMessage({
          type: "release",
          tabId: tabIdRef.current,
        } satisfies Msg)
      } catch {
        /* ignored */
      }
    }
    window.addEventListener("pagehide", onUnload)
    window.addEventListener("beforeunload", onUnload)
    return () => {
      window.removeEventListener("pagehide", onUnload)
      window.removeEventListener("beforeunload", onUnload)
    }
  }, [safeToken])

  const takeOver = useCallback(() => {
    if (!safeToken || !desired) return
    const record: LockRecord = {
      tabId: tabIdRef.current,
      pair: desired,
      period,
      ts: Date.now(),
    }
    writeLock(safeToken, record)
    ownsLockRef.current = true
    setOtherLock(null)
    channelRef.current?.postMessage({
      type: "takeover",
      ...record,
    } satisfies Msg)
  }, [safeToken, desired, period])

  return useMemo(
    () => ({ status, pair, otherPair, takeOver }),
    [status, pair, otherPair, takeOver],
  )
}
