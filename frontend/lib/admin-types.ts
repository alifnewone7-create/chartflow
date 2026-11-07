/**
 * Shared admin data types — used by both the public site (when
 * writing purchases) and the admin panel (when reading & approving).
 */

export type Tier = "free" | "basic" | "smart" | "pro" | "dominator" | "personal"

/**
 * QXL key reuse policy — controls how many distinct activations a single
 * key permits before it becomes inert.
 *
 *  one_time → single activation; once a browser claims the key it
 *             flips to status="used" and rejects further holders.
 *  no_limit → unlimited activations as long as the row exists in
 *             `/qxl_keys`. Each activation issues a brand-new access
 *             token; deleting the key from the admin panel revokes
 *             every session bound to it.
 *  limited  → bounded activations. `userLimit` caps the number of
 *             distinct (username) holders. When `usageCount` reaches
 *             `userLimit` the key transitions to status="used" and
 *             refuses further activations — same behaviour as
 *             one_time, just delayed.
 */
export type KeyType = "one_time" | "no_limit" | "limited"

export const KEY_TYPE_LABEL: Record<KeyType, string> = {
  one_time: "One Time",
  no_limit: "No Limit",
  limited: "Limited",
}

export type QxlKey = {
  /** Firebase push id — set in lists, not in the record itself. */
  id?: string
  key: string
  tier: Tier
  /**
   * Reuse policy for the key. Defaults to "one_time" so legacy keys
   * (where the field is absent) keep their original behaviour.
   */
  keyType?: KeyType
  /**
   * Cap for `keyType === "limited"`. Number of distinct activations
   * allowed before the key expires. Ignored for other key types.
   */
  userLimit?: number
  /** Number of distinct activations claimed so far. Drives expiry. */
  usageCount?: number
  status: "unused" | "used"
  createdAt: number
  usedBy?: {
    fullName: string
    username: string
  }
  usedAt?: number
  /**
   * Set after activation — the random `qxl-<hex>` access token issued
   * to the activating browser. Lets the admin trace a key → its session.
   * For multi-use keys ("no_limit" / "limited") this stores the *most
   * recent* token; per-session audit trail lives in /access_tokens.
   */
  accessToken?: string
  /**
   * Browser fingerprint that the access token is bound to. Stored only
   * for admin diagnostics; the page client uses it to verify identity.
   */
  deviceId?: string
  /**
   * Marks a key created automatically by the admin approve flow on a
   * purchase submission. Lets the admin see at a glance which keys are
   * customer-paid vs hand-issued.
   */
  source?: "manual" | "purchase"
  /** Linked purchase id for source="purchase". */
  purchaseId?: string
}

/**
 * Per-activation session record. One row per activated browser; if
 * the same QXL key is re-activated from a new browser the row is
 * overwritten (same path) so the previous browser loses access.
 *
 * Stored at `/access_tokens/{token}` so token → session is O(1).
 */
export type AccessToken = {
  /** Convenience id for list rendering — equals the path key. */
  id?: string
  token: string
  qxlKey: string
  deviceId: string
  tier: Tier
  fullName: string
  username: string
  activatedAt: number
  userAgent?: string
}

export type PurchaseStatus = "pending" | "approved" | "rejected"

export type Purchase = {
  id?: string
  tierName: string
  /**
   * @deprecated Replaced by `paymentProof` (uploaded screenshot).
   * Older rows may still carry a TxID string here.
   */
  orderId?: string
  /**
   * Public Blob URL of the payment-proof screenshot the buyer
   * uploaded. The admin panel renders this inline for verification.
   */
  paymentProof?: string
  amount: string
  fullName: string
  /** Username chosen by the buyer — used to seed the auto-issued QXL key. */
  username: string
  email: string
  /** Firebase uid of the signed-in buyer. */
  uid?: string
  telegram: string
  note?: string
  status: PurchaseStatus
  submittedAt: number
  /**
   * Browser fingerprint captured at submission time. When the admin
   * approves the purchase, the auto-issued access token is bound to
   * this exact deviceId so the visiting browser is recognised as the
   * activated one without the user typing anything.
   */
  deviceId?: string
  /**
   * Auto-issued by the approve flow. Records the QXL key minted for
   * the customer so the admin can audit the chain
   * purchase → key → session.
   */
  assignedKey?: string
  /** Auto-issued access token (mirror of `assignedKey` on the session side). */
  assignedToken?: string
  /**
   * When the customer's browser dismissed the success/reject popup. We
   * persist this so the popup doesn't re-show on every visit.
   */
  acknowledgedAt?: number
  /**
   * Admin-supplied rejection reason — surfaced in the rejection popup
   * on the user's browser so they know why the purchase was declined.
   */
  rejectionReason?: string
}

/**
 * Map a marketing tier name (e.g. "Premium") to the canonical lowercase
 * tier slug we store in Firebase. Falls back to "smart" so callers
 * never end up writing an undefined tier.
 */
export function normalizeTier(tierName: string): Tier {
  const lower = tierName.trim().toLowerCase()
  if (lower.includes("dominator")) return "dominator"
  if (lower.includes("extreme")) return "dominator"
  if (lower.includes("premium")) return "pro"
  if (lower.includes("personal")) return "personal"
  if (lower.includes("basic")) return "basic"
  if (lower.includes("pro")) return "pro"
  return "smart"
}

/**
 * Pretty label for a tier slug — used in admin panel cards and
 * dropdowns where we want consistent capitalised names. Order
 * matches the lineup shown in the admin panel:
 *   Basic / Standard / Premium / Extreme / Personal
 */
export const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  basic: "Basic",
  smart: "Standard",
  pro: "Premium",
  dominator: "Extreme",
  personal: "Personal",
}

/** Canonical lineup order used everywhere (admin panel, badges, stats). */
export const TIER_ORDER: Tier[] = ["free", "basic", "smart", "pro", "dominator", "personal"]
