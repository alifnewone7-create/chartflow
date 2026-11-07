"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { CalendarDays, Check, ChevronDown, X } from "lucide-react"

import { dhakaDay } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

const DAY_MS = 86_400_000

export const todayDay = () => dhakaDay(Date.now())

export function dayLabel(day: string): string {
  const days = Array.from({ length: 2 }, (_, i) => dhakaDay(Date.now() - i * DAY_MS))
  if (day === days[0]) return "Today"
  if (day === days[1]) return "Yesterday"
  return longDate(day)
}

function longDate(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", year: "numeric" })
}

export function HistoryDatePicker({ value, onChange, testId }: { value: string; onChange: (day: string) => void; testId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        data-testid={`${testId}-date-trigger`}
        onClick={() => setOpen(true)}
        className="group flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#CDFF17]/30 bg-[#CDFF17]/[0.06] px-3 text-left transition-colors duration-200 hover:border-[#CDFF17]/60 hover:bg-[#CDFF17]/[0.1]"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <CalendarDays className="size-4 shrink-0 text-[#CDFF17]" aria-hidden />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="cf-mono text-[8.5px] uppercase tracking-[0.22em] text-white/45">History date</span>
            <span data-testid={`${testId}-date-value`} className="truncate text-[13px] font-semibold text-white">{dayLabel(value)}</span>
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-[#CDFF17] transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden />
      </button>
      {open && (
        <DateSheet
          value={value}
          testId={testId}
          onClose={() => setOpen(false)}
          onPick={(d) => (onChange(d), setOpen(false))}
        />
      )}
    </>
  )
}

function DateSheet({ value, testId, onClose, onPick }: { value: string; testId: string; onClose: () => void; onPick: (day: string) => void }) {
  const [custom, setCustom] = useState("")
  const today = todayDay()
  const days = Array.from({ length: 9 }, (_, i) => dhakaDay(Date.now() - i * DAY_MS))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose history date"
      data-testid={`${testId}-date-modal`}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#0C0D0E]/80 backdrop-blur-md sm:items-center sm:p-6"
    >
      <div onClick={(e) => e.stopPropagation()} className="cf-card-strong cf-rise flex max-h-[88svh] w-full flex-col overflow-hidden rounded-t-[24px] sm:max-w-md sm:rounded-[24px]">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="flex flex-col">
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.28em] text-[#CDFF17]/80">Signal history</span>
            <h2 className="cf-display text-[20px] text-white">
              History <span className="text-[#CDFF17]">date</span>
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" data-testid={`${testId}-date-close`} className="cf-btn-dark inline-flex size-10 items-center justify-center rounded-xl">
            <X className="size-4" strokeWidth={2.4} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid gap-1.5">
            {days.map((d, i) => {
              const on = d === value
              return (
                <button
                  key={d}
                  type="button"
                  data-testid={`${testId}-date-option-${i}`}
                  onClick={() => onPick(d)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-200",
                    on ? "border-[#CDFF17]/45 bg-[#CDFF17]/[0.09]" : "border-white/[0.06] bg-[#0E0F11]/50 hover:border-white/15 hover:bg-white/[0.03]",
                  )}
                >
                  <span className="flex flex-col leading-tight">
                    <span className={cn("text-[14px] font-semibold", on ? "text-[#CDFF17]" : "text-white")}>{i === 0 ? "Today" : i === 1 ? "Yesterday" : longDate(d).split(",")[0]}</span>
                    <span className="cf-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{longDate(d)}</span>
                  </span>
                  {on && <Check className="size-4 text-[#CDFF17]" strokeWidth={2.6} aria-hidden />}
                </button>
              )
            })}
          </div>

          <div className="mt-3 rounded-xl border border-white/[0.06] bg-[#0E0F11]/50 p-3.5">
            <p className="cf-mono text-[9.5px] uppercase tracking-[0.24em] text-[#CDFF17]/80">Custom date</p>
            <div className="mt-2.5 flex gap-2">
              <input
                type="date"
                data-testid={`${testId}-date-custom-input`}
                max={today}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="cf-input h-11 min-w-0 flex-1 rounded-xl px-3 text-[13.5px] text-white outline-none [color-scheme:dark]"
              />
              <button
                type="button"
                data-testid={`${testId}-date-custom-apply`}
                disabled={!custom}
                onClick={() => onPick(custom)}
                className="cf-btn-volt h-11 shrink-0 rounded-xl px-4 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Show
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
