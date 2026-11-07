"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, ImageIcon, Loader2, Upload, X } from "lucide-react"

import { useFirebaseUser } from "@/hooks/use-firebase-user"
import { postJson } from "@/lib/api-client"
import {
  getOrCreatePurchaseDeviceId,
  writePendingPurchase,
} from "@/lib/pending-purchase"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  tierName: string
  /** Tailwind classes for the submit button accent (per-tier color). */
  buttonClass: string
  /** Fixed USDT amount the user must send (derived from tier price). */
  fixedAmount: string
}

// ---------------------------------------------------------------------------
// Activation rules mirrored from the activate-account form so the auto-issued
// QXL key + access token end up valid the moment the admin clicks Approve.
// ---------------------------------------------------------------------------
const USERNAME_MIN = 5
const USERNAME_MAX = 32
const USERNAME_RE = /^[A-Za-z0-9_]+$/

const FULLNAME_MIN = 4
const FULLNAME_MAX = 14

  const MAX_PROOF_BYTES = 4 * 1000 * 1024 // 4 MB (4000 KB)

function normaliseTelegramHandle(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  return trimmed.replace(/^@+/, "").toLowerCase()
}

function validateTelegramHandle(raw: string): string | null {
  if (!raw.trim()) return null
  const handle = normaliseTelegramHandle(raw)
  if (handle.length < USERNAME_MIN) {
    return `Username must be at least ${USERNAME_MIN} characters.`
  }
  if (handle.length > USERNAME_MAX) {
    return `Username cannot exceed ${USERNAME_MAX} characters.`
  }
  if (!USERNAME_RE.test(handle)) {
    return "Only letters, numbers, and underscores — no spaces, dots, or symbols."
  }
  return null
}

/**
 * Two-section form for paid tiers:
 *   1. Payment Proof — screenshot of the BSC transfer (image upload).
 *   2. Personal Information — full name + telegram.
 */
export function PurchaseForm({ tierName, buttonClass, fixedAmount }: Props) {
  const router = useRouter()
  const user = useFirebaseUser()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [telegramValue, setTelegramValue] = useState("")
  const telegramError = useMemo(
    () => validateTelegramHandle(telegramValue),
    [telegramValue],
  )
  const telegramHandleValid =
    telegramValue.trim().length > 0 && telegramError === null

  // Payment-proof image state
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)

  function onPickFile(file: File | null) {
    setProofError(null)
    if (!file) {
      setProofFile(null)
      setProofPreview((curr) => {
        if (curr) URL.revokeObjectURL(curr)
        return null
      })
      return
    }
    if (!file.type.startsWith("image/")) {
      setProofError("Please upload an image file (PNG, JPG, etc.).")
      return
    }
    if (file.size > MAX_PROOF_BYTES) {
        setProofError("Image is too large. Please upload an image smaller than 4 MB (4000 KB).")
      return
    }
    setProofFile(file)
    setProofPreview((curr) => {
      if (curr) URL.revokeObjectURL(curr)
      return URL.createObjectURL(file)
    })
  }

  async function uploadProof(file: File): Promise<string> {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/payment-proof", {
      method: "POST",
      body: fd,
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(data?.error || "Upload failed")
    }
    const data = (await res.json()) as { url: string }
    return data.url
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const fullName = String(formData.get("fullName") ?? "").trim()
    const telegramRaw = String(formData.get("telegram") ?? "").trim()
    const note = String(formData.get("note") ?? "").trim()

    const username = normaliseTelegramHandle(telegramRaw)
    const telegram = username ? `@${username}` : telegramRaw

    if (fullName.length < FULLNAME_MIN || fullName.length > FULLNAME_MAX) {
      setError(`Full name must be ${FULLNAME_MIN}-${FULLNAME_MAX} characters.`)
      return
    }
    if (
      username.length < USERNAME_MIN ||
      username.length > USERNAME_MAX ||
      !USERNAME_RE.test(username)
    ) {
      setError(
        `Telegram username must be ${USERNAME_MIN}-${USERNAME_MAX} characters and use only letters, numbers, or underscores (no spaces, no dots).`,
      )
      return
    }
    if (!proofFile) {
      setError("Please attach a screenshot of your payment.")
      return
    }

    setSubmitting(true)
    try {
      // 1) Upload the screenshot first so we have a permanent URL.
      const paymentProof = await uploadProof(proofFile)

      // 2) Capture this browser's device fingerprint.
      const deviceId = getOrCreatePurchaseDeviceId()

      const payload = {
        tierName,
        paymentProof,
        amount: fixedAmount,
        fullName,
        username,
        telegram,
        note,
        deviceId,
      }

      const { data } = await postJson<{ ok: boolean; id?: string; error?: string }>(
        "/api/submit/purchases",
        payload,
      )
      if (!data?.ok) throw new Error(data?.error || "")
      const purchaseId = data.id
      if (purchaseId) {
        writePendingPurchase({ id: purchaseId, deviceId })
        try {
          window.dispatchEvent(new Event("qxl:pending-purchase-changed"))
        } catch {
          /* ignore */
        }
      }
      router.push("/purchase-submitted")
    } catch (err) {
      console.log("purchase submit failed:", err)
      setError(
        err instanceof Error && err.message
          ? err.message
          : "We couldn't submit your purchase right now. Please try again, or contact our admin on Telegram.",
      )
      setSubmitting(false)
    }
  }

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/60">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Checking your account…
      </div>
    )
  }
  if (user === null) {
    return (
      <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-5 text-center" data-testid="purchase-login-required">
        <p className="text-sm leading-relaxed text-amber-100/90">
          Please log in (or create an account) first. Your plan is added to the account you buy with.
        </p>
        <Link href="/login" data-testid="purchase-login-link" className="mt-3 inline-flex text-sm font-semibold text-amber-200 underline-offset-4 hover:underline">
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* ----- Payment proof ----- */}
      <FieldSet>
        <FieldLegend className="text-base">Payment Proof</FieldLegend>
        <FieldDescription>
          After sending USDT (BEP20) to the address above, upload a clear
          screenshot of your transaction so the admin can verify it.
        </FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="paymentProof">Send Payment Screenshot</FieldLabel>
            <input
              ref={fileInputRef}
              id="paymentProof"
              name="paymentProof"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            {proofPreview ? (
              <div className="flex flex-col gap-2">
                {/* Using <img> intentionally — preview is an in-memory blob URL. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofPreview || "/placeholder.svg"}
                  alt="Payment proof preview"
                  className="max-h-72 w-full rounded-xl border border-white/10 bg-black/40 object-contain"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  >
                    <Upload className="mr-1.5 size-3.5" aria-hidden />
                    Change image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPickFile(null)}
                    className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  >
                    <X className="mr-1.5 size-3.5" aria-hidden />
                    Remove
                  </Button>
                  {proofFile && (
                    <span className="text-xs text-white/55">
                      {proofFile.name} · {(proofFile.size / 1024).toFixed(0)} KB
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-6 py-8 text-center transition hover:border-white/35 hover:bg-white/[0.05]"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-white/5 text-white/65">
                  <ImageIcon className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-medium text-white">
                  Send Payment Screenshot
                </span>
                <span className="text-xs text-white/55">
                  PNG or JPG, up to 4 MB
                </span>
              </button>
            )}
            {proofError && (
              <p role="alert" className="text-xs leading-relaxed text-rose-300">
                {proofError}
              </p>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="amount">Amount Sent (USDT)</FieldLabel>
            <Input
              id="amount"
              name="amount"
              value={fixedAmount}
              readOnly
              aria-readonly="true"
              tabIndex={-1}
              className="cursor-not-allowed font-mono"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="note">Note (optional)</FieldLabel>
            <Textarea
              id="note"
              name="note"
              rows={3}
              placeholder="Any extra context you want the admin to know."
            />
          </Field>
        </FieldGroup>
      </FieldSet>

      {/* ----- Personal information ----- */}
      <FieldSet>
        <FieldLegend className="text-base">Personal Information</FieldLegend>
        <FieldDescription>
          The admin may contact you on Telegram, so make
          sure it&apos;s 5-32 characters using only letters, numbers, or
          underscores.
        </FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
            <Input
              id="fullName"
              name="fullName"
              required
              minLength={FULLNAME_MIN}
              maxLength={FULLNAME_MAX}
              placeholder="Your full name"
              autoComplete="name"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="telegram">Telegram Username</FieldLabel>
            <Input
              id="telegram"
              name="telegram"
              required
              placeholder="@yourhandle"
              autoComplete="off"
              spellCheck={false}
              maxLength={USERNAME_MAX + 1}
              value={telegramValue}
              onChange={(e) => setTelegramValue(e.target.value)}
              aria-invalid={telegramError ? true : undefined}
              aria-describedby="telegram-hint"
            />
            {telegramError ? (
              <p
                id="telegram-hint"
                role="alert"
                className="text-xs leading-relaxed text-rose-300"
              >
                {telegramError}
              </p>
            ) : telegramHandleValid ? (
              <p
                id="telegram-hint"
                className="inline-flex items-center gap-1.5 text-xs leading-relaxed text-emerald-300"
              >
                <CheckCircle2 className="size-3.5" aria-hidden />
                Looks good.
              </p>
            ) : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting || telegramError !== null}
        className={`h-12 w-full text-base font-semibold ${buttonClass}`}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            Submitting...
          </>
        ) : (
          `Submit ${tierName} Purchase`
        )}
      </Button>
    </form>
  )
}
