"use client"

import { useEffect, useState } from "react"
import { FileText, Loader2, RefreshCw, Send } from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { engine, EngineError } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

import { CARD, GHOST_BTN, LIME_BTN } from "@/components/engine/ui-bits"

type Report = { text: string; stats: { finalized: number; win: number; mtg_win: number; loss: number; pending: number; accuracy: number | null }; sends: Record<string, unknown> }

/** Partial report preview + send for a closed Automatic Signal session. */
export function ReportCard({ sid, pending }: { sid: string; pending: number }) {
  const [rep, setRep] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [confirmResend, setConfirmResend] = useState(false)

  const load = () => {
    setLoading(true)
    engine<Report>(`/auto/sessions/${sid}/report`)
      .then(setRep)
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [sid, pending])

  async function send(resend: boolean) {
    setSending(true)
    try {
      await engine(`/auto/sessions/${sid}/report/send`, { method: "POST", body: { resend } })
      toast.success("Partial report sent to Telegram")
      load()
    } catch (e) {
      if (e instanceof EngineError && e.status === 409 && !resend && Object.keys(rep?.sends ?? {}).length) setConfirmResend(true)
      else toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  const sentBefore = Object.keys(rep?.sends ?? {}).length > 0
  return (
    <section className={cn(CARD, "p-4 sm:p-6")} data-testid="auto-report-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="cf-orb inline-flex size-10 items-center justify-center rounded-xl"><FileText className="size-[18px]" strokeWidth={2.2} /></span>
          <div className="flex flex-col leading-tight">
            <span className="cf-mono text-[9.5px] uppercase tracking-[0.28em] text-[#CDFF17]/80">Session summary</span>
            <h2 className="cf-display text-[20px] text-white sm:text-[24px]">Partial <span className="text-[#CDFF17]">report</span></h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button data-testid="auto-report-refresh" onClick={load} className={cn(GHOST_BTN, "h-10 w-10 px-0")} aria-label="Refresh report"><RefreshCw className={cn("size-3.5", loading && "animate-spin")} /></button>
          <button data-testid="auto-report-send-button" onClick={() => (sentBefore ? setConfirmResend(true) : send(false))} disabled={sending || !rep} className={cn(LIME_BTN, "h-10 px-4")}>
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} {sentBefore ? "Resend" : "Send to Telegram"}
          </button>
        </div>
      </div>
      {rep && rep.stats.pending > 0 && (
        <p className="mb-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-3 py-2 text-[12px] text-amber-100" data-testid="auto-report-pending">{rep.stats.pending} signal(s) still PENDING — excluded from totals and accuracy until verified.</p>
      )}
      {loading && !rep ? (
        <div className="flex items-center gap-2 text-[12.5px] text-white/55"><Loader2 className="size-4 animate-spin text-[#CDFF17]" /> Building report…</div>
      ) : (
        <pre data-testid="auto-report-preview" className="cf-mono max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-[#0E0F11]/70 p-4 text-[12.5px] leading-relaxed text-white/85">{rep?.text}</pre>
      )}
      <AlertDialog open={confirmResend} onOpenChange={setConfirmResend}>
        <AlertDialogContent className="cf-card-strong border-0 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Send this report again?</AlertDialogTitle>
            <AlertDialogDescription>This report was already delivered. Resending posts it to your Telegram destinations once more.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="auto-report-resend-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="auto-report-resend-confirm" onClick={() => send(true)}>Resend</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
