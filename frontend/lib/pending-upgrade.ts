"use client"

/**
 * Pending-upgrade pointer
 * ----------------------
 *
 * Mirror of `lib/pending-purchase.ts`, but for the upgrade flow:
 *
 *   { id: "<firebase-push-id>", deviceId: "<browser-fingerprint>" }
 *
 * Stored in localStorage so the global `<UpgradeNotice />` component
 * can subscribe to that exact `/upgrades/{id}` row and react to admin
 * approval / rejection. Kept separate from the purchase pointer so an
 * existing purchase popup never collides with a fresh upgrade popup
 * (and vice-versa).
 */


const POINTER_KEY = "qxl-pending-upgrade-v1"
const DEVICE_KEY = "qxl-purchase-device-v1" // intentionally shared

export type PendingUpgradePointer = {
  id: string
  deviceId: string
}

export function getOrCreateUpgradeDeviceId(): string {
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

export function readPendingUpgrade(): PendingUpgradePointer | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(POINTER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingUpgradePointer>
    if (
      parsed &&
      typeof parsed.id === "string" &&
      typeof parsed.deviceId === "string" &&
      parsed.id.length > 0 &&
      parsed.deviceId.length > 0
    ) {
      return parsed as PendingUpgradePointer
    }
    return null
  } catch {
    return null
  }
}

export function writePendingUpgrade(pointer: PendingUpgradePointer): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(POINTER_KEY, JSON.stringify(pointer))
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event("qxl:pending-upgrade-changed"))
  } catch {
    /* ignore */
  }
}

export function clearPendingUpgrade(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(POINTER_KEY)
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event("qxl:pending-upgrade-changed"))
  } catch {
    /* ignore */
  }
}
