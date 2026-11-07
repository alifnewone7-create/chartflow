"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { BarChart3, Check, ChevronDown, Search, X, type LucideIcon } from "lucide-react"

import type { Asset } from "@/hooks/use-quotex-ws"
import { matchAllowedMarket } from "@/lib/allowed-markets"
import { MarketFlagFor, marketCategory } from "@/components/signal/market-flag"
import { cn } from "@/lib/utils"

export const CATEGORY_TABS: Array<{ id: string; label: string }> = [
  { id: "currencies", label: "Currencies" },
  { id: "crypto", label: "Crypto" },
  { id: "commodities", label: "Commodities" },
  { id: "stocks", label: "Stocks" },
  { id: "indices", label: "Indices" },
]

type Row = { asset: Asset; category: string; displayLabel: string; haystack: string }

type Props = {
  assets: Asset[]
  current: string | null
  onSelect: (symbol: string) => void
  loading?: boolean
  icon?: LucideIcon
  disabled?: boolean
}

/** Splits "EUR/USD (OTC)" into a base + lime "(OTC)" suffix like the home hero. */
export function splitOtc(label: string): { base: string; suffix: string } {
  const m = label.match(/^(.*?)\s*(\(OTC\))\s*$/i)
  return m ? { base: m[1], suffix: "(OTC)" } : { base: label, suffix: "" }
}

export function AssetSelector({ assets, current, onSelect, loading, icon: Icon = BarChart3, disabled = false }: Props) {
  const [open, setOpen] = useState(false)

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    const seen = new Set<string>()
    for (const a of assets) {
      const entry = matchAllowedMarket(a.symbol, a.name)
      const label = entry?.label ?? (a.name || a.symbol)
      if (seen.has(label)) continue
      seen.add(label)
      out.push({
        asset: a,
        category: marketCategory(a.symbol, a.name, a.category),
        displayLabel: label,
        haystack: [a.symbol, a.name ?? "", label].map(norm).filter(Boolean).join(" "),
      })
    }
    out.sort((a, b) => (b.asset.payout ?? -1) - (a.asset.payout ?? -1) || a.displayLabel.localeCompare(b.displayLabel))
    return out
  }, [assets])

  const currentRow = rows.find((r) => r.asset.symbol === current)
  const currentAsset = currentRow?.asset ?? assets.find((a) => a.symbol === current)
  const hasSelection = current !== null
  const label = splitOtc(currentRow?.displayLabel ?? currentAsset?.symbol ?? "")

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        data-testid="market-select-trigger"
        onClick={() => setOpen(true)}
        className={cn(
          "group inline-flex min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-left transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-55 sm:gap-3 sm:px-3 sm:py-2",
          hasSelection
            ? "border-white/[0.08] bg-white/[0.03] hover:border-[#CDFF17]/40 hover:bg-white/[0.05]"
            : "border-[#CDFF17]/45 bg-[#CDFF17]/[0.08] hover:border-[#CDFF17]/70 hover:bg-[#CDFF17]/[0.12]",
        )}
      >
        {hasSelection ? (
          <MarketFlagFor market={currentAsset?.symbol ?? null} alt={currentRow?.displayLabel} size="md" className="shrink-0" />
        ) : (
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#CDFF17]/15 text-[#CDFF17]">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="cf-display truncate text-[14px] text-white sm:text-[15px]">
            {hasSelection ? (
              <>
                {label.base} {label.suffix && <span className="text-[#CDFF17]">{label.suffix}</span>}
              </>
            ) : (
              "Select Market"
            )}
          </span>
          <span className="cf-mono truncate text-[9.5px] uppercase tracking-[0.18em] text-white/40">
            {hasSelection ? currentAsset?.symbol : "Choose a pair"}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-[#CDFF17] transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden />
      </button>

      {open && (
        <MarketModal
          rows={rows}
          current={current}
          loading={!!loading}
          onClose={() => setOpen(false)}
          onSelect={(s) => {
            onSelect(s)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function MarketModal({
  rows,
  current,
  loading,
  onClose,
  onSelect,
}: {
  rows: Row[]
  current: string | null
  loading: boolean
  onClose: () => void
  onSelect: (symbol: string) => void
}) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const tabs = useMemo(() => CATEGORY_TABS.filter((t) => rows.some((r) => r.category === t.id)), [rows])
  const currentCategory = rows.find((r) => r.asset.symbol === current)?.category
  const [tab, setTab] = useState(currentCategory ?? "currencies")
  const activeTab = tabs.some((t) => t.id === tab) ? tab : (tabs[0]?.id ?? "currencies")

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const tokens = query.split(/\s+/).map(norm).filter(Boolean)
  const filtered = tokens.length
    ? rows.filter((r) => tokens.every((t) => r.haystack.includes(t)))
    : rows.filter((r) => r.category === activeTab)
  const openRows = filtered.filter((r) => r.asset.is_open !== false)
  const closedRows = filtered.filter((r) => r.asset.is_open === false)

  if (typeof document === "undefined") return null
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select market"
      data-testid="market-select-modal"
      className="fixed inset-0 z-[120] flex items-stretch justify-center bg-[#0C0D0E]/80 backdrop-blur-md sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cf-card-strong cf-rise flex h-[100svh] w-full flex-col overflow-hidden rounded-none sm:h-auto sm:max-h-[88vh] sm:max-w-3xl sm:rounded-[26px]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-col">
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.28em] text-[#CDFF17]/80">Live markets</span>
            <h2 className="cf-display text-[20px] text-white sm:text-[24px]">
              Select <span className="text-[#CDFF17]">Market</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="market-select-close"
            className="cf-btn-dark inline-flex size-10 items-center justify-center rounded-xl"
          >
            <X className="size-4" strokeWidth={2.4} aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6">
          <label className="cf-input flex h-11 items-center gap-2.5 rounded-xl px-3.5">
            <Search className="size-4 shrink-0 text-[#CDFF17]/80" aria-hidden />
            <input
              ref={inputRef}
              data-testid="market-select-search"
              type="text"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search markets… e.g. USD BRL"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/30"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-white/40 hover:text-white">
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </label>
          {tabs.length > 0 && !query && (
            <div role="tablist" data-testid="market-category-tabs" className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map((t) => {
                const on = t.id === activeTab
                const count = rows.filter((r) => r.category === t.id).length
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    data-testid={`market-tab-${t.id}`}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition-colors duration-200",
                      on
                        ? "border-[#CDFF17]/40 bg-[#CDFF17]/12 text-[#CDFF17]"
                        : "border-white/[0.07] bg-white/[0.03] text-white/60 hover:border-white/15 hover:text-white",
                    )}
                  >
                    {t.label}
                    <span className={cn("cf-mono text-[10px]", on ? "text-[#CDFF17]/70" : "text-white/35")}>{count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3" data-testid="market-select-list">
          {loading && <p className="py-12 text-center text-[13px] text-white/50">Loading markets…</p>}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-1 py-12 text-center">
              <p className="text-[14px] font-semibold text-white">No markets match</p>
              <p className="text-[12px] text-white/45">Try a different search term.</p>
            </div>
          )}
          {openRows.length > 0 && (
            <Group label={query ? "Results" : (CATEGORY_TABS.find((t) => t.id === activeTab)?.label ?? "Open")} hint="Payout high → low">
              {openRows.map((r) => (
                <MarketRow key={r.asset.symbol} row={r} active={r.asset.symbol === current} onClick={() => onSelect(r.asset.symbol)} />
              ))}
            </Group>
          )}
          {closedRows.length > 0 && (
            <Group label="Closed" hint="Market currently closed">
              {closedRows.map((r) => (
                <MarketRow key={r.asset.symbol} row={r} active={r.asset.symbol === current} onClick={() => onSelect(r.asset.symbol)} />
              ))}
            </Group>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Group({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between px-2 pb-1.5 pt-2">
        <span className="cf-mono text-[9.5px] uppercase tracking-[0.24em] text-[#CDFF17]/75">{label}</span>
        <span className="cf-mono text-[9.5px] uppercase tracking-[0.14em] text-white/30">{hint}</span>
      </div>
      <div className="grid gap-1 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function MarketRow({ row, active, onClick }: { row: Row; active: boolean; onClick: () => void }) {
  const { asset, displayLabel } = row
  const label = splitOtc(displayLabel)
  const closed = asset.is_open === false
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`market-option-${asset.symbol}`}
      data-active={active || undefined}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors duration-200",
        active
          ? "border-[#CDFF17]/45 bg-[#CDFF17]/[0.09]"
          : "border-transparent hover:border-white/[0.08] hover:bg-white/[0.04]",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <MarketFlagFor market={asset.symbol} alt={displayLabel} size="sm" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[13.5px] font-semibold text-white">
            {label.base} {label.suffix && <span className="text-[#CDFF17]">{label.suffix}</span>}
          </span>
          <span className="cf-mono truncate text-[10px] uppercase tracking-[0.12em] text-white/35">{asset.symbol}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {asset.payout != null && <span className="cf-mono text-[12px] font-bold text-[#CDFF17]">{asset.payout}%</span>}
        {active ? (
          <Check className="size-4 text-[#CDFF17]" strokeWidth={2.6} aria-hidden />
        ) : (
          <span className={cn("size-1.5 rounded-full", closed ? "bg-rose-400" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]")} aria-hidden />
        )}
      </span>
    </button>
  )
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "")
}
