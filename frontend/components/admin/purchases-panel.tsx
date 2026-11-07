"use client"

/**
 * PurchasesPanel
 * --------------
 * Admin view of every public purchase submission in /purchases.
 *   • Filters: status (pending / approved / rejected / all)
 *   • Free-text search across name, telegram, tier
 *   • Per-row actions: approve, reject (locked after one click), delete
 *   • Click a row to expand and see the payment-proof screenshot + note
 */

import { useEffect, useMemo, useState } from "react"
import { onValue, ref, remove, serverTimestamp, set, update } from "firebase/database"
import {
  AtSign,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Hash,
  Image as ImageIcon,
  Loader2,
  Search,
  ShoppingBag,
  Trash2,
  User,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  normalizeTier,
  type Purchase,
  type PurchaseStatus,
  type Tier,
} from "@/lib/admin-types"
import { applyTierToUser } from "@/lib/admin-approve"
import { getDb } from "@/lib/firebase"
import { cn } from "@/lib/utils"

type StatusFilter = "all" | PurchaseStatus

export function PurchasesPanel() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Purchase | null>(null)

  // Subscribe to /purchases.
  useEffect(() => {
    const r = ref(getDb(), "purchases")
    const unsub = onValue(
      r,
      (snap) => {
        const value = snap.val() as Record<string, Purchase> | null
        const list: Purchase[] = value
          ? Object.entries(value).map(([id, v]) => ({ ...v, id }))
          : []
        list.sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))
        setPurchases(list)
        setLoading(false)
      },
      (err) => {
        console.log("purchases listener error:", err)
        setError("Could not load purchases. Check Firebase rules / network.")
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  const stats = useMemo(() => {
    let pending = 0
    let approved = 0
    let rejected = 0
    for (const p of purchases) {
      if (p.status === "pending") pending++
      else if (p.status === "approved") approved++
      else if (p.status === "rejected") rejected++
    }
    return { pending, approved, rejected, total: purchases.length }
  }, [purchases])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return purchases.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false
      if (!q) return true
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.telegram.toLowerCase().includes(q) ||
        (p.username ?? "").toLowerCase().includes(q) ||
        p.tierName.toLowerCase().includes(q)
      )
    })
  }, [purchases, search, statusFilter])

  /** Approve: set the buyer's account tier (matched by uid, else email), then mark the row approved. */
  async function handleApprove(p: Purchase) {
    if (!p.id || p.status !== "pending") return
    const tier: Tier = normalizeTier(p.tierName)
    try {
      const uid = await applyTierToUser(p.uid, p.email, tier)
      if (!uid) {
        window.alert("No registered account matches this buyer's email. Ask them to register first, then approve again.")
        return
      }
      await update(ref(getDb(), `purchases/${p.id}`), { status: "approved", assignedTier: tier, assignedUid: uid })
    } catch (err) {
      console.log("approve flow failed:", err)
      window.alert("Approval failed. Please try again.")
    }
  }

  async function handleReject(p: Purchase, reason: string) {
    if (!p.id) return
    // Decisions are final — only pending rows can be rejected.
    if (p.status !== "pending") return
    await update(ref(getDb(), `purchases/${p.id}`), {
      status: "rejected",
      rejectionReason: reason,
    })
  }

  async function handleDelete(p: Purchase) {
    if (!p.id) return
    if (!window.confirm(`Delete this purchase from ${p.fullName}?`)) return

    // If a payment-proof image was uploaded, remove it from Neon first so
    // the screenshot doesn't keep occupying storage after the purchase is
    // gone from Firebase.
    const proof = p.paymentProof
    if (proof) {
      const match = proof.match(/\/api\/payment-proof\/([^/?#]+)/)
      const proofId = match?.[1]
      if (proofId) {
        try {
          await fetch(`/api/payment-proof/${proofId}/delete`, {
            method: "DELETE",
          })
        } catch (error) {
          console.log("failed to delete payment proof from Neon:", error)
        }
      }
    }

    await remove(ref(getDb(), `purchases/${p.id}`))
  }

  async function copy(value: string, fieldId: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(fieldId)
      setTimeout(
        () => setCopiedField((curr) => (curr === fieldId ? null : curr)),
        1400,
      )
    } catch (err) {
      console.log("copy failed:", err)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ------- Stats ------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} accent="#5BC0D8" />
        <StatCard label="Pending" value={stats.pending} accent="#fbbf24" />
        <StatCard label="Approved" value={stats.approved} accent="#34d399" />
        <StatCard label="Rejected" value={stats.rejected} accent="#fb7185" />
      </div>

      {/* ------- Search + filter ------- */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/45"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, telegram, txid…"
            className="h-11 border-white/15 bg-white/[0.04] pl-10 text-white placeholder:text-white/35"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-11 border-white/15 bg-white/[0.04] text-white sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
        >
          {error}
        </p>
      )}

      {/* ------- List ------- */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-white/55">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading purchases…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-white/5 text-white/55">
              <ShoppingBag className="size-5" aria-hidden />
            </span>
            <h3 className="text-sm font-semibold text-white">
              {purchases.length === 0
                ? "No purchases yet"
                : "Nothing matches your filter"}
            </h3>
            <p className="max-w-sm text-pretty text-xs text-white/55">
              {purchases.length === 0
                ? "Submissions from the public purchase pages will appear here."
                : "Try clearing your search or switching the status filter."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((p) => (
              <PurchaseRow
                key={p.id}
                purchase={p}
                expanded={expandedId === p.id}
                onToggle={() =>
                  setExpandedId((curr) => (curr === p.id ? null : (p.id ?? null)))
                }
                onApprove={() => handleApprove(p)}
                onReject={() => setRejectTarget(p)}
                onDelete={() => handleDelete(p)}
                onCopy={(value, fieldId) => copy(value, fieldId)}
                copiedField={copiedField}
              />
            ))}
          </ul>
        )}
      </div>
      {rejectTarget && (
        <RejectReasonDialog
          purchase={rejectTarget}
          onCancel={() => setRejectTarget(null)}
          onConfirm={async (reason) => {
            const target = rejectTarget
            setRejectTarget(null)
            await handleReject(target, reason)
          }}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Row                                                                       */
/* -------------------------------------------------------------------------- */

function PurchaseRow({
  purchase: p,
  expanded,
  onToggle,
  onApprove,
  onReject,
  onDelete,
  onCopy,
  copiedField,
}: {
  purchase: Purchase
  expanded: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
  onDelete: () => void
  onCopy: (value: string, fieldId: string) => void
  copiedField: string | null
}) {
  const id = p.id ?? p.orderId ?? p.fullName

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left transition hover:opacity-90"
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#5BC0D8]/20 via-[#1B7892]/20 to-[#03161B]/60 text-[#7DE3FF] ring-1 ring-inset ring-[#5BC0D8]/30">
            <ShoppingBag className="size-4" aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">
                {p.fullName || "Anonymous"}
              </p>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/55">
              <span className="uppercase tracking-wider">{p.tierName}</span>
              <span className="text-white/25">·</span>
              <span className="font-mono">{p.amount} USDT</span>
              <span className="text-white/25">·</span>
              <span>{formatDate(p.submittedAt)}</span>
            </p>
          </div>

          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-white/55 transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {p.status === "pending" && (
            <>
              <Button
                size="sm"
                onClick={onApprove}
                className="bg-emerald-500 font-medium text-emerald-950 hover:bg-emerald-400"
              >
                <Check className="mr-1.5 size-3.5" aria-hidden />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReject}
                className="border-rose-400/30 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20"
              >
                <X className="mr-1.5 size-3.5" aria-hidden />
                Reject
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="border-white/15 bg-white/[0.04] text-white/65 hover:bg-white/10 hover:text-white"
          >
            <Trash2 className="size-3.5" aria-hidden />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2">
          <DetailRow
            icon={<User className="size-3.5" aria-hidden />}
            label="Full name"
            value={p.fullName}
            fieldId={`${id}-name`}
            onCopy={onCopy}
            copiedField={copiedField}
          />
          <DetailRow
            icon={<AtSign className="size-3.5" aria-hidden />}
            label="Account email"
            value={p.email || "—"}
            fieldId={`${id}-email`}
            onCopy={onCopy}
            copiedField={copiedField}
          />
          <DetailRow
            icon={<AtSign className="size-3.5" aria-hidden />}
            label="Telegram"
            value={p.telegram}
            fieldId={`${id}-tg`}
            onCopy={onCopy}
            copiedField={copiedField}
          />
          {/* Payment proof — full-width image, click to open original. */}
          <div className="sm:col-span-2">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
              <span className="text-[#5BC0D8]">
                <ImageIcon className="size-3.5" aria-hidden />
              </span>
              Payment proof
            </p>
            {p.paymentProof ? (
              <a
                href={p.paymentProof}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-1 block overflow-hidden rounded-lg border border-white/10 bg-black/40 transition hover:border-white/25"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.paymentProof || "/placeholder.svg"}
                  alt={`Payment proof from ${p.fullName}`}
                  className="max-h-80 w-full object-contain"
                />
                <span className="flex items-center justify-end gap-1 px-3 py-1.5 text-[11px] text-white/55 group-hover:text-white">
                  Open full size
                  <ExternalLink className="size-3" aria-hidden />
                </span>
              </a>
            ) : p.orderId ? (
              <p className="mt-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-sm text-white/80">
                Legacy TxID: {p.orderId}
              </p>
            ) : (
              <p className="mt-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/55">
                No proof submitted.
              </p>
            )}
          </div>
          {p.note && (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                Note
              </p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm leading-relaxed text-white/80">
                {p.note}
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/*  UI bits                                                                   */
/* -------------------------------------------------------------------------- */

function DetailRow({
  icon,
  label,
  value,
  fieldId,
  onCopy,
  copiedField,
  mono,
}: {
  icon: React.ReactNode
  label: string
  value: string
  fieldId: string
  onCopy: (value: string, fieldId: string) => void
  copiedField: string | null
  mono?: boolean
}) {
  const copied = copiedField === fieldId
  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
        <span className="text-[#5BC0D8]">{icon}</span>
        {label}
      </p>
      <button
        type="button"
        onClick={() => onCopy(value, fieldId)}
        className={cn(
          "group flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-white/85 transition hover:border-white/20 hover:bg-white/[0.06]",
          mono && "font-mono tracking-wide",
        )}
      >
        <span className="truncate">{value || "—"}</span>
        <span
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded text-white/45 transition",
            copied ? "text-emerald-300" : "group-hover:text-white",
          )}
          aria-hidden
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </span>
      </button>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
      style={{ boxShadow: `inset 0 1px 0 ${accent}22` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
        {label}
      </p>
      <p
        className="mt-1.5 font-mono text-2xl font-semibold tabular-nums"
        style={{ color: accent }}
      >
        {value}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: PurchaseStatus }) {
  const styles: Record<PurchaseStatus, string> = {
    pending: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    approved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    rejected: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
        styles[status],
      )}
    >
      {status}
    </Badge>
  )
}

function formatDate(ts: number) {
  if (!ts) return "—"
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/* -------------------------------------------------------------------------- */
/*  Reject reason dialog                                                       */
/* -------------------------------------------------------------------------- */

const PRESET_REASONS: Array<{ id: string; label: string; build: (amount: string) => string }> = [
  {
    id: "wrong_screenshot",
    label: "Wrong Screenshot",
    build: () => "You submitted the wrong screenshot in payment proof.",
  },
  {
    id: "fake_screenshot",
    label: "Fake Screenshot",
    build: () => "You submitted a fake screenshot in payment proof.",
  },
  {
    id: "wrong_address",
    label: "Wrong Address",
    build: () => "You sent the payment to the wrong address.",
  },
  {
    id: "wrong_network",
    label: "Wrong Network",
    build: () => "You sent the payment on the wrong network.",
  },
  {
    id: "wrong_an",
    label: "Wrong A/N",
    build: () =>
      "You sent the payment on the wrong network and to the wrong address.",
  },
  {
    id: "low_dollar",
    label: "Low Dollar",
    build: (amount) =>
      `The package you purchased costs ${amount} USDT, but you didn't send the full price.`,
  },
  {
    id: "custom",
    label: "Custom Reason",
    build: () => "",
  },
]

function RejectReasonDialog({
  purchase,
  onCancel,
  onConfirm,
}: {
  purchase: Purchase
  onCancel: () => void
  onConfirm: (reason: string) => void | Promise<void>
}) {
  const [selected, setSelected] = useState<string>("wrong_screenshot")
  const [customText, setCustomText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const preset = PRESET_REASONS.find((r) => r.id === selected)
  const finalReason =
    selected === "custom"
      ? customText.trim()
      : (preset?.build(purchase.amount) ?? "")

  async function handleSubmit() {
    if (!finalReason) return
    setSubmitting(true)
    try {
      await onConfirm(finalReason)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        disabled={submitting}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0A1B22] to-[#04111A] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/60 to-transparent"
        />
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-rose-300/85">
            Reject purchase
          </p>
          <h3 className="font-serif text-xl font-semibold text-white">
            Pick a rejection reason
          </h3>
          <p className="text-xs leading-relaxed text-white/55">
            The buyer will see this exact message in their popup.
          </p>
        </div>

        <ul className="mt-4 flex flex-col gap-1.5">
          {PRESET_REASONS.map((r) => {
            const isActive = selected === r.id
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(r.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                    isActive
                      ? "border-rose-400/40 bg-rose-400/10 text-rose-100"
                      : "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex size-4 shrink-0 items-center justify-center rounded-full border",
                      isActive
                        ? "border-rose-300 bg-rose-300"
                        : "border-white/30",
                    )}
                  >
                    {isActive && (
                      <span className="size-1.5 rounded-full bg-[#04111A]" />
                    )}
                  </span>
                  <span className="font-medium">{r.label}</span>
                </button>
              </li>
            )
          })}
        </ul>

        {selected === "custom" ? (
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={3}
            placeholder="Type your custom reason for the buyer…"
            className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-rose-400/40 focus:outline-none"
          />
        ) : preset ? (
          <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-white/70">
            {preset.build(purchase.amount)}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="border-white/15 bg-white/[0.04] text-white/85 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !finalReason}
            className="bg-rose-500 font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
            ) : (
              <X className="mr-1.5 size-3.5" aria-hidden />
            )}
            Reject purchase
          </Button>
        </div>
      </div>
    </div>
  )
}
