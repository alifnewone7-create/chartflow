"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Loader2, RefreshCw, Search, X } from "lucide-react"

import { engine, type Market } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

import { GHOST_BTN, INPUT, MarketName } from "@/components/engine/ui-bits"
import { MarketFlagFor, marketCategory } from "@/components/signal/market-flag"
import { CATEGORY_TABS } from "@/components/asset-selector"

/** Active markets from the signal server (refreshed every 30 s). */
export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let off = false
    const load = () =>
      engine<{ markets: Market[] }>("/markets")
        .then((d) => !off && (setMarkets(d.markets), setError(null)))
        .catch((e: Error) => !off && setError(e.message))
        .finally(() => !off && setLoading(false))
    load()
    const id = window.setInterval(load, 30_000)
    return () => {
      off = true
      window.clearInterval(id)
    }
  }, [tick])
  return { markets, loading, error, reload: () => (setLoading(true), setTick((t) => t + 1)) }
}

type Props = {
  markets: Market[]
  loading: boolean
  error: string | null
  onReload: () => void
  selected: string[]
  onChange: (next: string[]) => void
  testId: string
}

export function MarketPicker({ markets, loading, error, onReload, selected, onChange, testId }: Props) {
  const [q, setQ] = useState("")
  const [tab, setTab] = useState("currencies")
  const cats = useMemo(() => new Map(markets.map((m) => [m.symbol, marketCategory(m.symbol, m.name)])), [markets])
  const tabs = useMemo(() => CATEGORY_TABS.filter((t) => markets.some((m) => cats.get(m.symbol) === t.id)), [markets, cats])
  const activeTab = tabs.some((t) => t.id === tab) ? tab : (tabs[0]?.id ?? "currencies")
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
    if (!n) return markets.filter((m) => cats.get(m.symbol) === activeTab)
    return markets.filter((m) => m.symbol.toLowerCase().replace(/[^a-z0-9]+/g, "").includes(n) || m.name.toLowerCase().replace(/[^a-z0-9]+/g, "").includes(n))
  }, [markets, q, cats, activeTab])
  const set = new Set(selected)
  const toggle = (s: string) => onChange(set.has(s) ? selected.filter((x) => x !== s) : [...selected, s])

  return (
    <div data-testid={testId}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className={cn(INPUT, "flex h-11 min-w-0 items-center gap-2.5 sm:flex-1")}>
          <Search className="size-4 shrink-0 text-[#CDFF17]/80" aria-hidden />
          <input
            data-testid={`${testId}-search`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search markets… e.g. USD BRL"
            className="w-full bg-transparent text-[13.5px] text-white outline-none placeholder:text-white/35"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="text-white/40 hover:text-white">
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </label>
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 sm:flex">
          <button data-testid={`${testId}-select-all`} className={cn(GHOST_BTN, "h-11 px-2 sm:px-3")} onClick={() => onChange(Array.from(new Set([...selected, ...shown.map((m) => m.symbol)])))}>
            Select all
          </button>
          <button data-testid={`${testId}-deselect-all`} className={cn(GHOST_BTN, "h-11 px-2 sm:px-3")} onClick={() => onChange(selected.filter((s) => !shown.some((m) => m.symbol === s)))}>
            Deselect
          </button>
          <button data-testid={`${testId}-clear`} className={cn(GHOST_BTN, "h-11 px-2 sm:px-3")} onClick={() => onChange([])}>
            Clear
          </button>
          <button data-testid={`${testId}-reload`} className={cn(GHOST_BTN, "h-11 w-11 px-0")} onClick={onReload} aria-label="Reload markets">
            <RefreshCw className={cn("size-4 text-[#CDFF17]", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {tabs.length > 0 && !q && (
        <div role="tablist" data-testid={`${testId}-tabs`} className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => {
            const on = t.id === activeTab
            const count = markets.filter((m) => cats.get(m.symbol) === t.id).length
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                data-testid={`${testId}-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition-colors duration-200",
                  on ? "border-[#CDFF17]/40 bg-[#CDFF17]/12 text-[#CDFF17]" : "border-white/[0.07] bg-white/[0.03] text-white/60 hover:border-white/15 hover:text-white",
                )}
              >
                {t.label}
                <span className={cn("cf-mono text-[10px]", on ? "text-[#CDFF17]/70" : "text-white/35")}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      <p className="cf-mono mt-3 text-[10.5px] uppercase tracking-[0.18em] text-white/45" data-testid={`${testId}-selected-count`}>
        <span className="text-[#CDFF17]">{selected.length}</span> selected · {markets.length} active
      </p>

      {error ? (
        <p className="mt-2 rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-[12.5px] text-rose-100" data-testid={`${testId}-error`}>
          {error}
        </p>
      ) : loading && !markets.length ? (
        <div className="flex items-center gap-2 py-8 text-[13px] text-white/60">
          <Loader2 className="size-4 animate-spin text-[#CDFF17]" /> Loading markets…
        </div>
      ) : !shown.length ? (
        <p className="py-8 text-center text-[13px] text-white/55" data-testid={`${testId}-empty`}>
          No active markets{q && " match your search"}.
        </p>
      ) : (
        <div className="mt-2 grid max-h-[360px] gap-1.5 overflow-y-auto pr-1 [scrollbar-width:thin] sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((m) => {
            const on = set.has(m.symbol)
            return (
              <button
                key={m.symbol}
                type="button"
                data-testid={`${testId}-item-${m.symbol}`}
                aria-pressed={on}
                onClick={() => toggle(m.symbol)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors duration-200",
                  on ? "border-[#CDFF17]/50 bg-[#CDFF17]/[0.08]" : "border-white/[0.06] bg-[#0E0F11]/50 hover:border-white/15 hover:bg-white/[0.03]",
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border transition-colors", on ? "border-[#CDFF17] bg-[#CDFF17] text-[#141517]" : "border-white/20")}>
                    {on && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <MarketFlagFor market={m.symbol} alt={m.name} size="sm" />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <MarketName symbol={m.symbol} className="truncate text-[13px] font-semibold text-white" />
                  </span>
                </span>
                <span className="cf-mono shrink-0 text-[12px] font-bold text-[#CDFF17]">{m.payout}%</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
