/**
 * Shared upgrade-flow data types — used by the public upgrade pages
 * (Standard / Premium / Extreme), the global UpgradeNotice popup, and the
 * admin Upgrades panel.
 *
 * The upgrade flow mirrors the purchase flow on purpose: same shape,
 * same approve / reject ergonomics, same payment-proof mechanics. The
 * only structural differences are:
 *
 *   • An upgrade row carries the buyer's *current* access token + qxl
 *     key + tier so the admin approve flow can revoke them and reissue
 *     fresh credentials for the upgraded tier in a single transaction.
 *   • Approval cleanly transitions the buyer's session: the old
 *     `/access_tokens/{token}` and `/qxl_keys/{key}` rows are removed
 *     and a new pair is minted bound to the same deviceId + username.
 */

import type { Tier } from "@/lib/admin-types"

export type UpgradeStatus = "pending" | "approved" | "rejected"

export type Upgrade = {
  id?: string
  /** Marketing tier name the buyer is upgrading TO. */
  tierName: string
  /** Lowercased canonical slug for the destination tier. */
  tier: Tier
  /** Marketing tier name the buyer is upgrading FROM. */
  fromTierName: string
  /** Canonical slug for the current tier. */
  fromTier: Tier
  /** Public Blob URL of the payment-proof screenshot. */
  paymentProof?: string
  amount: string
  fullName: string
  username: string
  email?: string
  /** Firebase uid of the signed-in buyer. */
  uid?: string
  telegram: string
  note?: string
  status: UpgradeStatus
  submittedAt: number
  /**
   * Browser fingerprint captured at submit time. Used to validate the
   * upgrade approval popup is shown on the same browser that requested
   * it.
   */
  deviceId?: string
  /**
   * The CURRENT access token the buyer holds. The approve flow uses
   * it to find / delete the previous session and qxl_key rows.
   */
  currentToken?: string
  /** The CURRENT qxl key bound to that token. */
  currentKey?: string
  /** New QXL key minted by the approve flow for the upgraded tier. */
  assignedKey?: string
  /** New access token issued for the upgraded tier. */
  assignedToken?: string
  /** When the user dismissed the success / reject popup. */
  acknowledgedAt?: number
  /** Admin-supplied rejection reason. */
  rejectionReason?: string
}
