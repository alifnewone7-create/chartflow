"use client"

import { useState, type ComponentType } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

type FieldProps = {
  id: string
  label: string
  type?: string
  placeholder: string
  icon: ComponentType<{ className?: string }>
  autoComplete?: string
}

export function AuthField({ id, label, type = "text", placeholder, icon: Icon, autoComplete }: FieldProps) {
  const [show, setShow] = useState(false)
  const isPassword = type === "password"
  return (
    <label htmlFor={id} className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{label}</span>
      <span className="cf-input group relative flex h-13 items-center rounded-xl">
        <Icon className="pointer-events-none absolute left-4 size-[18px] text-[#CDFF17]/80" />
        <input
          id={id}
          name={id}
          type={isPassword && show ? "text" : type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          data-testid={`auth-input-${id}`}
          className={cn("h-full w-full bg-transparent pl-12 text-[15px] text-white outline-none placeholder:text-white/30", isPassword ? "pr-12" : "pr-4")}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            data-testid={`auth-toggle-${id}`}
            className="absolute right-3 flex size-8 items-center justify-center rounded-lg text-white/45 transition-colors hover:text-[#CDFF17]"
          >
            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        )}
      </span>
    </label>
  )
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4" aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/12" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">{label}</span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/12" />
    </div>
  )
}

export function GoogleButton({ label, onClick, busy = false }: { label: string; onClick?: () => void; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      data-testid="auth-google-btn"
      className="cf-btn-dark inline-flex h-13 w-full items-center justify-center gap-3 rounded-xl px-6 text-[15px] font-semibold disabled:cursor-wait disabled:opacity-70"
    >
      {busy && <Loader2 className="size-[18px] animate-spin" />}
      <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      <span>{label}</span>
    </button>
  )
}

export function SubmitButton({ label, testId, busy = false }: { label: string; testId: string; busy?: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      data-testid={testId}
      className="cf-btn-volt inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-xl px-6 text-[15px] font-bold disabled:cursor-wait disabled:opacity-80"
    >
      {busy && <Loader2 className="size-[18px] animate-spin" />}
      {label}
    </button>
  )
}
