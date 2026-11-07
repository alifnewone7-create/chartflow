"use client"

import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type SectionTab<K extends string> = { key: K; label: string; Icon: LucideIcon; iconOnly?: boolean }

/** Segmented control used at the top of every signal room (2 or 3 tabs; last tab may be icon-only). */
export function SectionTabs<K extends string>({
  tabs,
  value,
  onChange,
  testId,
}: {
  tabs: SectionTab<K>[]
  value: K
  onChange: (k: K) => void
  testId: string
}) {
  const cols = tabs.map((t) => (t.iconOnly ? "1px auto" : "minmax(0,1fr)")).join(" ")
  return (
    <div role="tablist" data-testid={testId} className="cf-card grid gap-1.5 rounded-xl p-1.5 sm:rounded-2xl sm:p-2" style={{ gridTemplateColumns: cols }}>
      {tabs.map(({ key, label, Icon, iconOnly }) => {
        const on = value === key
        return [
          iconOnly && <span key={`${key}-divider`} aria-hidden data-testid={`${testId}-divider`} className="my-2 w-px self-stretch rounded-full bg-white/15" />,
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={label}
            title={label}
            data-testid={`${testId}-${key}`}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-lg text-[13px] font-bold tracking-[-0.005em] sm:h-12 sm:rounded-xl sm:text-[14.5px]",
              iconOnly ? "w-11 sm:w-12" : "px-2",
              on ? "cf-btn-volt" : "text-white/55 transition-colors duration-300 hover:bg-white/[0.04] hover:text-white",
            )}
          >
            <Icon className={cn("shrink-0", iconOnly ? "size-[18px]" : "size-4")} strokeWidth={2.2} aria-hidden />
            {!iconOnly && <span className="truncate">{label}</span>}
          </button>,
        ]
      })}
    </div>
  )
}
