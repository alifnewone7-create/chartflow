"use client"

import { useEffect, useState } from "react"
import { onValue, push, ref, remove, set } from "firebase/database"
import { CheckCircle2, Info, Loader2, Plus, RotateCcw, Save, Send, Smile, SquarePen, Trash2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BOT_KINDS, PLACEHOLDER_INFO, checkTemplate, renderPreview, type BotKind } from "@/lib/bot-style"
import { EngineError, engine } from "@/lib/engine-client"
import { getDb } from "@/lib/firebase"
import { cn } from "@/lib/utils"

type EmojiRow = { id: string; emoji: string; emoji_id: string }
type Section = "styles" | "emojis"

export function BotSettingsPanel() {
  const [section, setSection] = useState<Section>("styles")
  return (
    <div className="flex flex-col gap-5" data-testid="bot-settings-panel">
      <TestSendCard />
      <div role="tablist" className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 sm:w-fit">
        {([["styles", "Message styles", SquarePen], ["emojis", "Emoji ID", Smile]] as const).map(([k, label, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={section === k} data-testid={`bot-section-${k}`} onClick={() => setSection(k)}
            className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors", section === k ? "bg-[#CDFF17] text-[#141517]" : "text-white/60 hover:text-white")}>
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      {section === "styles" ? <StylesSection /> : <EmojiSection />}
    </div>
  )
}

const TEST_ID_KEY = "cf-admin-bot-test-id"

function TestSendCard() {
  const [userId, setUserId] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => setUserId(localStorage.getItem(TEST_ID_KEY) ?? ""), [])
  const valid = /^\d{3,20}$/.test(userId)

  async function send() {
    setBusy(true)
    setResult(null)
    localStorage.setItem(TEST_ID_KEY, userId)
    try {
      const r = await engine<{ sent: number; premium_emojis: number }>("/admin/bot-test", { method: "POST", body: { user_id: userId } })
      setResult({ ok: true, text: `Sent ${r.sent} test messages (signal, result, partial) to ${userId}. Premium emojis set: ${r.premium_emojis}.` })
    } catch (e) {
      const notDeployed = e instanceof EngineError && e.status === 404
      setResult({ ok: false, text: notDeployed ? "The VPS signal server doesn't have the test feature yet. Update and restart python_backend on the VPS, then try again." : e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[#CDFF17]/25 bg-[#CDFF17]/[0.04] p-4 sm:p-5" data-testid="bot-test-card">
      <h3 className="text-base font-semibold text-white">Send a test message</h3>
      <p className="mb-3 text-xs text-white/55">Sends a sample signal, result and partial report with the saved styles and premium emojis. The user must have pressed /start on the bot first. Save your style changes before testing.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={userId} onChange={(e) => (setUserId(e.target.value.replace(/\D/g, "")), setResult(null))} placeholder="Telegram user ID e.g. 123456789" inputMode="numeric" className="border-white/10 bg-black/30 font-mono text-white" data-testid="bot-test-user-id-input" />
        <Button onClick={send} disabled={busy || !valid} data-testid="bot-test-send-button" className="shrink-0 bg-[#CDFF17] text-[#141517] hover:bg-[#CDFF17]/90">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send test
        </Button>
      </div>
      {result && (
        <p data-testid={result.ok ? "bot-test-success" : "bot-test-error"} className={cn("mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs", result.ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-rose-400/30 bg-rose-500/10 text-rose-200")}>
          {result.ok ? <CheckCircle2 className="mt-px size-3.5 shrink-0" /> : <TriangleAlert className="mt-px size-3.5 shrink-0" />} {result.text}
        </p>
      )}
    </section>
  )
}

function StylesSection() {
  const [saved, setSaved] = useState<Partial<Record<BotKind, string>>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => onValue(ref(getDb(), "bot_config/templates"), (s) => (setSaved(s.val() ?? {}), setLoading(false)), () => setLoading(false)), [])

  return (
    <div className="flex flex-col gap-4">
      <Instructions />
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-white/60"><Loader2 className="size-4 animate-spin" /> Loading…</p>
      ) : (
        (Object.keys(BOT_KINDS) as BotKind[]).map((k) => <TemplateEditor key={k} kind={k} saved={saved[k]} />)
      )}
    </div>
  )
}

function Instructions() {
  return (
    <div className="flex gap-3 rounded-xl border border-sky-400/25 bg-sky-400/[0.06] p-4 text-[13px] leading-relaxed text-sky-50/90" data-testid="bot-style-instructions">
      <Info className="mt-0.5 size-4 shrink-0 text-sky-300" aria-hidden />
      <div>
        <p className="font-semibold text-white">How styling works</p>
        <p>Change the emojis, labels, lines and layout freely. Words in curly brackets like <code className="rounded bg-white/10 px-1">{"{asset}"}</code> are filled in automatically by the bot with the real asset, signal, time and result — you cannot change those values, only where they appear. Click a placeholder chip to insert it. Required placeholders must stay in the message.</p>
        <p className="mt-1 text-white/60">Example: <code className="rounded bg-white/10 px-1">{"🚀 Asset ➜ {asset}"}</code> sends <code className="rounded bg-white/10 px-1">🚀 Asset ➜ 𝚄𝚂𝙳/𝙸𝙽𝚁 (𝙾𝚃𝙲)</code></p>
      </div>
    </div>
  )
}

function TemplateEditor({ kind, saved }: { kind: BotKind; saved?: string }) {
  const meta = BOT_KINDS[kind]
  const current = saved || meta.fallback
  const [text, setText] = useState(current)
  const [busy, setBusy] = useState(false)
  useEffect(() => setText(current), [current])
  const error = checkTemplate(kind, text)
  const dirty = text !== current

  async function save(value: string | null) {
    setBusy(true)
    try {
      await set(ref(getDb(), `bot_config/templates/${kind}`), value)
      toast.success(value === null ? `${meta.label} reset to default` : `${meta.label} saved`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5" data-testid={`bot-template-${kind}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">{meta.label}</h3>
          <p className="text-xs text-white/50">{meta.hint}</p>
        </div>
        <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", saved ? "bg-[#CDFF17]/15 text-[#CDFF17]" : "bg-white/10 text-white/50")}>{saved ? "Custom" : "Default"}</span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {meta.allowed.map((p) => (
          <button key={p} type="button" title={PLACEHOLDER_INFO[p]} data-testid={`bot-chip-${kind}-${p}`} onClick={() => setText((t) => `${t}{${p}}`)}
            className={cn("rounded-md border px-2 py-1 font-mono text-[11px]", meta.required.includes(p) ? "border-[#CDFF17]/40 text-[#CDFF17]" : "border-white/15 text-white/70")}>
            {`{${p}}`}{meta.required.includes(p) && " *"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <textarea data-testid={`bot-template-input-${kind}`} value={text} onChange={(e) => setText(e.target.value)} rows={11} spellCheck={false}
          className="w-full rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[13px] leading-relaxed text-white outline-none focus:border-[#CDFF17]/50" />
        <div className="rounded-xl border border-white/10 bg-[#17212B] p-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Preview (example values)</p>
          <pre data-testid={`bot-template-preview-${kind}`} className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Math", "DejaVu Sans", sans-serif' }}>{renderPreview(kind, text)}</pre>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-rose-300" data-testid={`bot-template-error-${kind}`}>{error}</p>}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" disabled={busy || !saved} onClick={() => save(null)} data-testid={`bot-template-reset-${kind}`} className="border-white/15 bg-transparent text-white">
          <RotateCcw className="size-3.5" /> Reset default
        </Button>
        <Button size="sm" disabled={busy || !!error || !dirty} onClick={() => save(text)} data-testid={`bot-template-save-${kind}`} className="bg-[#CDFF17] text-[#141517] hover:bg-[#CDFF17]/90">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save
        </Button>
      </div>
    </section>
  )
}

function EmojiSection() {
  const [rows, setRows] = useState<EmojiRow[]>([])
  const [emoji, setEmoji] = useState("")
  const [emojiId, setEmojiId] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(
    () => onValue(ref(getDb(), "bot_config/emojis"), (s) => setRows(Object.entries((s.val() ?? {}) as Record<string, Omit<EmojiRow, "id">>).map(([id, v]) => ({ id, ...v })))),
    [],
  )
  const idOk = /^\d{5,25}$/.test(emojiId.trim())
  const dup = rows.some((r) => r.emoji === emoji.trim())

  async function add() {
    setBusy(true)
    try {
      await set(push(ref(getDb(), "bot_config/emojis")), { emoji: emoji.trim(), emoji_id: emojiId.trim(), createdAt: Date.now() })
      setEmoji("")
      setEmojiId("")
      toast.success("Premium emoji added")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 rounded-xl border border-sky-400/25 bg-sky-400/[0.06] p-4 text-[13px] leading-relaxed text-sky-50/90" data-testid="bot-emoji-instructions">
        <Info className="mt-0.5 size-4 shrink-0 text-sky-300" aria-hidden />
        <p>Pair a normal emoji with a Telegram <b>custom emoji ID</b>. In personal chats the bot replaces that emoji with the premium version in signal, result and report messages. If an ID is wrong, the bot quietly sends the normal emoji instead. Channels always get normal emojis. Example: <code className="rounded bg-white/10 px-1">🔥</code> → <code className="rounded bg-white/10 px-1">5368324170671202286</code></p>
      </div>
      <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[120px_1fr_auto]">
        <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="Emoji 🔥" className="border-white/10 bg-black/30 text-center text-lg text-white" data-testid="bot-emoji-input" />
        <Input value={emojiId} onChange={(e) => setEmojiId(e.target.value.replace(/\s/g, ""))} placeholder="Custom emoji ID e.g. 5368324170671202286" inputMode="numeric" className="border-white/10 bg-black/30 font-mono text-white" data-testid="bot-emoji-id-input" />
        <Button onClick={add} disabled={busy || !emoji.trim() || !idOk || dup} data-testid="bot-emoji-add-button" className="bg-[#CDFF17] text-[#141517] hover:bg-[#CDFF17]/90">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
        </Button>
        {(dup || (emojiId && !idOk)) && <p className="text-xs text-rose-300 sm:col-span-3" data-testid="bot-emoji-error">{dup ? "This emoji already has an ID. Delete it first to change it." : "Emoji ID must be numbers only."}</p>}
      </div>
      {!rows.length ? (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50" data-testid="bot-emoji-empty">No premium emojis yet.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2" data-testid="bot-emoji-list">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3" data-testid={`bot-emoji-row-${r.id}`}>
              <span className="flex min-w-0 items-center gap-3">
                <span className="text-2xl">{r.emoji}</span>
                <span className="truncate font-mono text-xs text-white/70">{r.emoji_id}</span>
              </span>
              <Button variant="ghost" size="icon" onClick={() => remove(ref(getDb(), `bot_config/emojis/${r.id}`)).catch((e) => toast.error(String(e)))} data-testid={`bot-emoji-delete-${r.id}`} className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200">
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
