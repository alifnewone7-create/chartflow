"use client"

import { useState } from "react"
import { CheckCircle2, ExternalLink, Link2Off, Loader2 } from "lucide-react"

import { TelegramIcon } from "@/components/icons/telegram-icon"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useRtdbValue } from "@/hooks/use-rtdb-list"
import { engine, fmtDate } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

import { CARD, GHOST_BTN, GLOW, LIME_BTN, SectionHead } from "@/components/engine/ui-bits"

export type TgLink = { telegram_id: number; username: string | null; first_name: string | null; connected_at: number; status: string }

export function useTelegramLink(uid: string) {
  return useRtdbValue<TgLink>(`telegram/links/${uid}`)
}

export function TelegramCard({ uid: _uid, enabled }: { uid: string; enabled: boolean }) {
  const { value: link, loading } = useTelegramLink(_uid)
  const [url, setUrl] = useState<{ url: string; expires_at: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function createLink() {
    setBusy(true)
    try {
      setUrl(await engine<{ url: string; expires_at: number }>("/telegram/link", { method: "POST" }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    try {
      await engine("/telegram/link", { method: "DELETE" })
      setUrl(null)
      toast.success("Telegram disconnected")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const status = (
    <span data-testid="telegram-status" className={cn("cf-mono inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", link ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/5 text-white/55")}>
      <span className={cn("size-1.5 rounded-full bg-current", link && "cf-pulse")} /> {loading ? "…" : link ? "Connected" : "Not connected"}
    </span>
  )

  return (
    <section className={cn(CARD, "relative overflow-hidden p-4 sm:p-6")} data-testid="telegram-card">
      {GLOW}
      <div className="absolute right-4 top-4 z-10 sm:hidden">{status}</div>
      <div className="pr-28 sm:pr-0">
        <SectionHead Icon={TelegramIcon} eyebrow="Connection" lead="Telegram" accent="account" hint="Signals are delivered by the ChartFlow Ai bot. Connect once — it stays linked." right={<div className="hidden sm:block">{status}</div>} />
      </div>
      <div className="mt-4">
        {!enabled ? (
          <p className="rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-[12.5px] text-amber-100" data-testid="telegram-disabled">The Telegram bot is not configured on the signal server yet.</p>
        ) : link ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 px-4 py-3">
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#CDFF17] text-[15px] font-bold text-[#141517]">{(link.first_name ?? link.username ?? "T").slice(0, 1).toUpperCase()}</span>
              <div className="flex flex-col leading-tight">
                <span className="text-[14px] font-semibold text-white">{link.first_name ?? "Telegram user"} <span className="text-white/45">{link.username ? `@${link.username}` : ""}</span></span>
                <span className="cf-mono text-[10.5px] uppercase tracking-[0.12em] text-white/40">ID <span data-testid="telegram-id" className="text-white/70">{link.telegram_id}</span> · since {fmtDate(link.connected_at)}</span>
              </div>
            </div>
            <button data-testid="telegram-disconnect-button" onClick={() => setConfirm(true)} className={cn(GHOST_BTN, "h-10 border-rose-400/30 text-rose-200")}>
              <Link2Off className="size-3.5" /> Disconnect
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="text-[12.5px] leading-relaxed text-white/60">Create a one-time link, open it in Telegram and press <b className="text-white">Start</b>. The link expires in 10 minutes.</p>
            {url ? (
              <div className="flex flex-col gap-1.5">
                <a data-testid="telegram-connect-url" href={url.url} target="_blank" rel="noreferrer" className={cn(LIME_BTN, "h-11 px-5")}>
                  <ExternalLink className="size-4" /> Open Telegram & press Start
                </a>
                <p className="inline-flex items-center justify-center gap-1 text-[11px] text-white/50"><Loader2 className="size-3 animate-spin" /> Waiting for you to press Start…</p>
              </div>
            ) : (
              <button data-testid="telegram-create-link-button" onClick={createLink} disabled={busy} className={cn(LIME_BTN, "h-11 px-5")}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Connect Telegram
              </button>
            )}
          </div>
        )}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="cf-card-strong border-0 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Telegram?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">Automatic signals will stop reaching this Telegram account until you connect again.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="telegram-disconnect-cancel" className={GHOST_BTN}>Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="telegram-disconnect-confirm" onClick={disconnect} className="cf-btn-volt rounded-xl font-bold">Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
