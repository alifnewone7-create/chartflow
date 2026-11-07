"use client"

import { useState, type FormEvent } from "react"
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  /**
   * Returns ``true`` on a successful unlock; ``false`` on any
   * failure. The handler is async because verification is now a
   * server round-trip via ``/api/admin/verify`` — the credentials
   * never reach the client bundle.
   */
  onSubmit: (password: string, secret: string) => Promise<boolean>
}

export function AdminLogin({ onSubmit }: Props) {
  const [password, setPassword] = useState("")
  const [secret, setSecret] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const ok = await onSubmit(password, secret)
    if (!ok) {
      // Single generic message: don't leak which field was wrong.
      setError("Invalid credentials.")
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-md">
        {/*
          Card. Removed the previous radial halo above the card top
          edge — it was bleeding outside the card border and looked
          like a stray glow on darker viewports.
        */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] backdrop-blur-md sm:p-8">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5BC0D8]/65 to-transparent"
          />

          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#5BC0D8]/25 via-[#1B7892]/25 to-[#03161B]/60 text-[#7DE3FF] ring-1 ring-inset ring-[#5BC0D8]/40">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                Internal access
              </p>
              <h1 className="mt-0.5 font-serif text-2xl font-semibold text-white">
                QX Private Portal
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="admin-password"
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  data-testid="admin-password-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  autoFocus
                  className="h-12 border-white/15 bg-white/[0.04] pr-12 text-white placeholder:text-white/35 focus-visible:border-[#5BC0D8]/65 focus-visible:ring-[#5BC0D8]/30"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-white/55 transition hover:bg-white/5 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="admin-secret"
                className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65"
              >
                <KeyRound className="size-3" aria-hidden />
                Secret key
              </Label>
              <div className="relative">
                <Input
                  id="admin-secret"
                  data-testid="admin-secret-input"
                  name="secret"
                  type={showSecret ? "text" : "password"}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  required
                  autoComplete="off"
                  spellCheck={false}
                  className="h-12 border-white/15 bg-white/[0.04] pr-12 font-mono text-sm text-white placeholder:text-white/35 focus-visible:border-[#5BC0D8]/65 focus-visible:ring-[#5BC0D8]/30"
                  placeholder="Enter secret key"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-white/55 transition hover:bg-white/5 hover:text-white"
                  aria-label={showSecret ? "Hide secret key" : "Show secret key"}
                >
                  {showSecret ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              data-testid="admin-login-submit"
              disabled={
                submitting || password.length === 0 || secret.length === 0
              }
              className="h-12 w-full bg-[#5BC0D8] text-base font-semibold text-[#03161B] hover:bg-[#7DE3FF] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Verifying…
                </>
              ) : (
                "Unlock portal"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-[11px] text-white/40">
            This page is restricted. All access is logged.
          </p>
        </div>
      </div>
    </main>
  )
}
