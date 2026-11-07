"use client"

/**
 * Pending-purchase pointer
 * ------------------------
 *
 * When a user submits a purchase from the public site we store a
 * lightweight pointer in localStorage:
 *
 *   { id: "<firebase-push-id>", deviceId: "<browser-fingerprint>" }
 *
 * The pointer is used by the global `<PurchaseNotice />` component to
 * subscribe to that exact `/purchases/{id}` row and react to admin
 * approve / reject decisions:
 *
 *   • approved  → auto-activate this browser by writing the token +
 *                 deviceId (already stamped by the admin flow) into
 *                 localStorage + cookies, then show a success popup.
 *   • rejected  → show a "purchase rejected" popup. No auto-activation.
 *
 * After the user dismisses the popup we mark the row's
 * `acknowledgedAt` timestamp so it never re-pops, and clear the
 * pointer locally — the user is done with this purchase.
 *
 * The deviceId is captured here (rather than in the form component)
 * so the same browser fingerprint travels with the user across page
 * reloads while they wait for admin approval.
 */


const POINTER_KEY = "qxl-pending-purchase-v1"
const DEVICE_KEY = "qxl-purchase-device-v1"

export type PendingPointer = {
  id: string
  deviceId: string
}

/** Read or mint the per-browser device fingerprint used at purchase time. */
export function getOrCreatePurchaseDeviceId(): string {
  if (typeof window === "undefined") return ""
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY)
    if (existing && existing.length > 0) return existing
  } catch {
    /* localStorage may be blocked — fall back to a fresh id every time */
  }
  const id = crypto.randomUUID()
  try {
    window.localStorage.setItem(DEVICE_KEY, id)
  } catch {
    /* ignore */
  }
  return id
}

export function readPendingPurchase(): PendingPointer | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(POINTER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingPointer>
    if (
      parsed &&
      typeof parsed.id === "string" &&
      typeof parsed.deviceId === "string" &&
      parsed.id.length > 0 &&
      parsed.deviceId.length > 0
    ) {
      return parsed as PendingPointer
    }
    return null
  } catch {
    return null
  }
}

export function writePendingPurchase(pointer: PendingPointer): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(POINTER_KEY, JSON.stringify(pointer))
  } catch {
    /* ignore */
  }
}

export function clearPendingPurchase(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(POINTER_KEY)
  } catch {
    /* ignore */
  }
}
