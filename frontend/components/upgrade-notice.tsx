"use client"

/**
 * UpgradeNotice
 * -------------
 *
 * Mirror of PurchaseNotice but for upgrade submissions. Mounted globally
 * inside the root layout. Watches `/upgrades/{id}` for the row whose id
 * is stored in the user's localStorage upgrade pointer and reacts to
 * admin decisions:
 *
 *   • approved  → write the freshly-issued `assignedToken` + the user's
 *                 deviceId into client session storage so this browser is
 *                 immediately recognised on the upgraded tier, then show
 *                 a success popup linking to the new dashboard.
 *   • rejected  → show an "upgrade rejected" popup. The user's existing
 *                 account remains untouched.
 *
 * Once the popup is dismissed we stamp `acknowledgedAt` on the upgrade
 * row (so it never re-pops on subsequent visits) and clear the local
 * pointer.
 */

import Link from "next/link"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { CheckCircle2, Loader2, ShieldX, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { postJson } from "@/lib/api-client"
import type { Upgrade, UpgradeStatus } from "@/lib/upgrade-types"
import {
  clearPendingUpgrade,
  readPendingUpgrade,
} from "@/lib/pending-upgrade"

// The database is closed to browsers, so the decision is polled from the server.
const NOTICE_POLL_MS = 8_000

type Snapshot = {
  pointerId: string
  status: UpgradeStatus
  toTierName: string
  fromTierName: string
  fullName: string
  username: string
  assignedToken?: string
  assignedKey?: string
  rejectionReason?: string
  acknowledged: boolean
}

export function UpgradeNotice() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [open, setOpen] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [pointerVersion, setPointerVersion] = useState(0)

  useEffect(() => {
    const bump = () => setPointerVersion((v) => v + 1)
    window.addEventListener("qxl:pending-upgrade-changed", bump)
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("qxl-")) bump()
    }
    window.addEventListener("storage", onStorage)
    const onFocus = () => bump()
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("qxl:pending-upgrade-changed", bump)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [])

  useEffect(() => {
    const pointer = readPendingUpgrade()
    if (!pointer) {
      setSnapshot(null)
      setOpen(false)
      return
    }

    let cancelled = false
    const apply = (value: Upgrade | null) => {
        if (!value) {
          clearPendingUpgrade()
          setSnapshot(null)
          setOpen(false)
          return
        }
        const acknowledged = !!value.acknowledgedAt
        const next: Snapshot = {
          pointerId: pointer.id,
          status: value.status,
          toTierName: value.toTierName,
          fromTierName: value.fromTierName,
          fullName: value.fullName,
          username: value.username,
          assignedToken: value.assignedToken,
          assignedKey: value.assignedKey,
          rejectionReason: value.rejectionReason,
          acknowledged,
        }
        setSnapshot(next)

        if (
          !acknowledged &&
          (value.status === "approved" || value.status === "rejected")
        ) {
          setOpen(true)
        } else {
          setOpen(false)
        }
    }
    const load = async () => {
      try {
        const { data } = await postJson<{ ok: boolean; record?: Upgrade | null }>(
          "/api/notice/upgrades",
          { id: pointer.id, deviceId: pointer.deviceId },
        )
        if (!cancelled && data?.ok) apply(data.record ?? null)
      } catch (err) {
        console.log("upgrade-notice poll error:", err)
      }
    }
    load()
    const id = window.setInterval(load, NOTICE_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [pointerVersion])

  async function handleClose() {
    if (!snapshot) return
    setDismissing(true)
    try {
      await postJson("/api/notice/upgrades", {
        id: snapshot.pointerId,
        deviceId: readPendingUpgrade()?.deviceId,
        ack: true,
      })
    } catch (err) {
      console.log("upgrade-notice ack write failed:", err)
    } finally {
      clearPendingUpgrade()
      setOpen(false)
      setDismissing(false)
    }
  }

  if (!open || !snapshot) return null
  if (snapshot.status === "approved") {
    return (
      <NoticeOverlay onClose={handleClose} dismissing={dismissing}>
        <span className="grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/35">
          <CheckCircle2 className="size-7" aria-hidden strokeWidth={2.2} />
        </span>
        <div className="flex flex-col gap-2 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300/85">
            Upgrade approved
          </p>
          <h3 className="font-serif text-2xl font-semibold text-white">
            You&apos;re upgraded, {snapshot.fullName.split(" ")[0] || "friend"}.
          </h3>
          <p className="text-pretty text-sm leading-relaxed text-white/70">
            Your account has been upgraded from{" "}
            <span className="text-white">{snapshot.fromTierName}</span> to{" "}
            <span className="text-white">{snapshot.toTierName}</span>. The new
            tier is now active on your account.
          </p>
        </div>
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={dismissing}
            className="border-white/15 bg-white/[0.04] text-white/85 hover:bg-white/10 hover:text-white"
          >
            Close
          </Button>
          {snapshot.status === "approved" && (
            <Button
              asChild
              className="bg-emerald-500 font-semibold text-emerald-950 hover:bg-emerald-400"
              onClick={handleClose}
            >
              <Link
                href={`/profile`}
              >
                Go to dashboard
              </Link>
            </Button>
          )}
        </div>
      </NoticeOverlay>
    )
  }

  // rejected
  return (
    <NoticeOverlay onClose={handleClose} dismissing={dismissing}>
      <span className="grid size-14 place-items-center rounded-full bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-400/35">
        <ShieldX className="size-7" aria-hidden strokeWidth={2.2} />
      </span>
      <div className="flex flex-col gap-2 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-rose-300/85">
          Upgrade rejected
        </p>
        <h3 className="font-serif text-2xl font-semibold text-white">
          We couldn&apos;t verify this upgrade.
        </h3>
        {snapshot.rejectionReason ? (
          <p className="rounded-xl border border-rose-400/25 bg-rose-500/[0.07] px-4 py-3 text-pretty text-sm leading-relaxed text-rose-100">
            {snapshot.rejectionReason}
          </p>
        ) : (
          <p className="text-pretty text-sm leading-relaxed text-white/70">
            Your upgrade from {snapshot.fromTierName} to{" "}
            {snapshot.toTierName} was rejected by our team. Your existing
            account is unchanged. Reach out on Telegram if you&apos;d like to
            dispute the decision or try again.
          </p>
        )}
      </div>
      <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={dismissing}
          className="border-white/15 bg-white/[0.04] text-white/85 hover:bg-white/10 hover:text-white"
        >
          Close
        </Button>
        <Button
          asChild
          className="bg-rose-500 font-semibold text-white hover:bg-rose-400"
          onClick={handleClose}
        >
          <a
            href="https://t.me/Mushfiq2615"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact admin
          </a>
        </Button>
      </div>
    </NoticeOverlay>
  )
}

function NoticeOverlay({
  children,
  onClose,
  dismissing,
}: {
  children: React.ReactNode
  onClose: () => void
  dismissing: boolean
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        disabled={dismissing}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0A1B22] to-[#04111A] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] sm:p-7">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5BC0D8]/60 to-transparent"
        />
        <button
          type="button"
          onClick={onClose}
          disabled={dismissing}
          className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full text-white/55 transition hover:bg-white/5 hover:text-white"
          aria-label="Close"
        >
          {dismissing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <X className="size-4" aria-hidden />
          )}
        </button>
        <div className="flex flex-col items-center gap-5">{children}</div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}
