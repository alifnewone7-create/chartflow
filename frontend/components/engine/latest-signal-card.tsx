"use client"

import { useState } from "react"
import { Activity } from "lucide-react"

import { useRtdbList } from "@/hooks/use-rtdb-list"
import { fmtTime, marketLabel, type EngineSignal } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

import { SignalDetail } from "@/components/engine/signal-history"
import { CARD, DirectionChip, ResultBadge } from "@/components/engine/ui-bits"

const STATE_TEXT: Record<string, string> = {
  waiting_expiry: "Waiting for the entry candle to close",
  waiting_data: "Verifying the closed candle",
  mtg_waiting: "First attempt lost — checking the MTG candle",
  doji_hold: "Candle closed flat — re-verifying",
  unverifiable: "Candle data unavailable — still retrying",
  final: "Result verified",
}

/** Most recent signal with its live (server-evaluated) result. */
export function LatestSignalCard({ path }: { path: string }) {
  const { items, loading } = useRtdbList<EngineSignal>(path, 1)
  const [open, setOpen] = useState(false)
  const s = items[0]
  if (loading || !s) return null
  return (
    <>
    <button
      data-testid="c2s-latest-signal"
      onClick={() => setOpen(true)}
      className={cn(CARD, "flex flex-wrap items-center justify-between gap-3 p-3 text-left sm:p-4")}
    >
      <div className="flex items-center gap-3">
        <Activity className="size-5 text-[#CDFF17]" />
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#F3F5EF]/45">Latest signal</p>
          <p className="flex items-center gap-2 text-[14px] font-semibold text-[#F3F5EF]">
            {marketLabel(s.asset).base} {s.market_type === "OTC" && <span className="text-[11px] text-[#F3F5EF]/50">OTC</span>}
            <DirectionChip direction={s.direction} />
          </p>
        </div>
      </div>
      <div className="font-mono text-[12px] text-[#F3F5EF]/75">
        {fmtTime(s.entry_at)} → {fmtTime(s.expiry_at)}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-[11.5px] text-[#F3F5EF]/55 sm:inline" data-testid="c2s-latest-eval-state">{STATE_TEXT[s.eval_state] ?? s.eval_state}</span>
        <ResultBadge status={s.status} testId="c2s-latest-status" />
      </div>
    </button>
    <SignalDetail signal={open ? s : null} onClose={() => setOpen(false)} />
    </>
  )
}
