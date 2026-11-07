"use client"

import { useEffect, useState } from "react"
import { Bell, Loader2, Megaphone, Save, ShieldCheck, Trash2, User, Users } from "lucide-react"
import { toast } from "sonner"

import { Switch } from "@/components/ui/switch"
import { engine } from "@/lib/engine-client"
import { cn } from "@/lib/utils"

import { type AutoSettings, useAutoSettings } from "@/components/engine/auto-config"
import { TelegramCard, useTelegramLink } from "@/components/engine/telegram-card"
import { TelegramIcon } from "@/components/icons/telegram-icon"
import { CARD, GHOST_BTN, GLOW, INPUT, LIME_BTN, SectionHead } from "@/components/engine/ui-bits"

const DESTS = [
  { id: "personal", label: "Personal chat", hint: "Bot DM to your account", Icon: User },
  { id: "channel", label: "Channel", hint: "Post to your own channel", Icon: Megaphone },
  { id: "both", label: "Both", hint: "Chat and channel together", Icon: Users },
] as const

const TOGGLES: { key: "show_chart" | "result_notifications" | "auto_report"; label: string; hint: string }[] = [
  { key: "show_chart", label: "Show charts by default", hint: "Open the live mini-chart for every running market" },
  { key: "result_notifications", label: "Send result messages", hint: "A separate result message with its own chart after each signal" },
  { key: "auto_report", label: "Auto-send partial report", hint: "Deliver the session report to Telegram once every signal is verified" },
]

export function AutoSettingsPanel({ uid, tgEnabled }: { uid: string; tgEnabled: boolean }) {
  const live = useAutoSettings(uid)
  const { value: link } = useTelegramLink(uid)
  const [d, setD] = useState<AutoSettings>(live)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState<"save" | "verify" | "remove" | null>(null)
  const liveKey = JSON.stringify(live)
  useEffect(() => {
    if (!dirty) setD(live)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey])

  const patch = (p: Partial<AutoSettings>) => (setD((x) => ({ ...x, ...p })), setDirty(true))
  const showChannel = d.destination === "channel"
  const savedChannel = live.channel_verified && !!live.channel_id && d.channel_id === live.channel_id

  async function removeChannel() {
    setBusy("remove")
    try {
      await engine("/auto/settings", { method: "PUT", body: { destination: d.destination, channel_id: "" } })
      setD((x) => ({ ...x, channel_id: "" }))
      toast.success("Channel removed")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function act(kind: "save" | "verify") {
    setBusy(kind)
    try {
      if (kind === "save") {
        await engine("/auto/settings", { method: "PUT", body: d })
        setDirty(false)
        toast.success("Settings saved")
      } else {
        await engine("/auto/settings", { method: "PUT", body: { destination: d.destination, channel_id: d.channel_id } })
        const info = await engine<{ title: string }>("/auto/channel/verify", { method: "POST", body: { chat_id: d.channel_id ?? "" } })
        setDirty(false)
        toast.success(`Channel verified: ${info.title}`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6" data-testid="auto-settings">
      <TelegramCard uid={uid} enabled={tgEnabled} />

      <section className={cn(CARD, "relative overflow-hidden p-4 sm:p-6", !link && "opacity-60")} data-testid="auto-destination-card">
        {GLOW}
        <SectionHead Icon={TelegramIcon} eyebrow="Delivery" lead="Telegram" accent="destination" hint="Where every signal, result and report is posted." />
        <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup">
          {DESTS.map((o) => {
            const on = d.destination === o.id
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                data-testid={`auto-dest-${o.id}`}
                onClick={() => patch({ destination: o.id })}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-200",
                  on ? "border-[#CDFF17]/50 bg-[#CDFF17]/[0.08]" : "border-white/[0.07] bg-[#0E0F11]/50 hover:border-white/15",
                )}
              >
                <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg", on ? "bg-[#CDFF17] text-[#141517]" : "bg-white/[0.05] text-white/60")}>
                  <o.Icon className="size-4" strokeWidth={2.3} />
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className={cn("text-[13.5px] font-bold", on ? "text-white" : "text-white/75")}>{o.label}</span>
                  <span className="truncate text-[11px] text-white/45">{o.hint}</span>
                </span>
              </button>
            )
          })}
        </div>

        {showChannel && savedChannel && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.05] p-3.5 sm:flex-row sm:items-center sm:justify-between" data-testid="auto-channel-saved">
            <div className="flex min-w-0 items-center gap-3">
              <TelegramIcon className="size-9 shrink-0" />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[14px] font-semibold text-white" data-testid="auto-channel-title">{live.channel_title || "Your channel"}</span>
                <span className="cf-mono truncate text-[11px] text-white/55">Chat ID <span data-testid="auto-channel-saved-id" className="text-white/80">{live.channel_id}</span></span>
              </div>
            </div>
            <button data-testid="auto-channel-remove-button" onClick={removeChannel} disabled={busy !== null} className={cn(GHOST_BTN, "h-10 shrink-0 border-rose-400/30 px-4 text-rose-200")}>
              {busy === "remove" ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Delete channel
            </button>
          </div>
        )}

        {showChannel && !savedChannel && (
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 p-3.5" data-testid="auto-channel-box">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/50">Channel chat ID</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input data-testid="auto-channel-id-input" value={d.channel_id ?? ""} onChange={(e) => patch({ channel_id: e.target.value })} placeholder="e.g. -1001234567890 or @yourchannel" className={cn(INPUT, "cf-mono")} />
              <button data-testid="auto-channel-verify-button" onClick={() => act("verify")} disabled={busy !== null || !d.channel_id} className={cn(GHOST_BTN, "h-11 shrink-0 px-4")}>
                {busy === "verify" ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />} Verify channel
              </button>
            </div>
            <p data-testid="auto-channel-status" className={cn("mt-2 text-[11.5px]", live.channel_error ? "text-amber-200" : "text-white/50")}>
              {live.channel_error || "Add the bot to your channel as an admin with “Post messages”, then verify."}
            </p>
          </div>
        )}
      </section>

      <section className={cn(CARD, "relative overflow-hidden p-4 sm:p-6")} data-testid="auto-notifications-card">
        <SectionHead Icon={Bell} eyebrow="Preferences" lead="Notifications" accent="& charts" />
        <div className="mt-4 grid gap-2 lg:grid-cols-3">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0E0F11]/55 px-3.5 py-3">
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-[13px] font-semibold text-white">{t.label}</span>
                <span className="text-[11px] text-white/45">{t.hint}</span>
              </span>
              <Switch data-testid={`auto-${t.key.replace(/_/g, "-")}`} checked={d[t.key]} onCheckedChange={(v) => patch({ [t.key]: v } as Partial<AutoSettings>)} />
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11.5px] text-white/40" data-testid="auto-settings-dirty">{dirty ? "You have unsaved changes." : "All changes saved."}</p>
        <button data-testid="auto-save-settings-button" onClick={() => act("save")} disabled={busy !== null || !dirty} className={cn(LIME_BTN, "h-11 px-6")}>
          {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save settings
        </button>
      </div>
    </div>
  )
}
