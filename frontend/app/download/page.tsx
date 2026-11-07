"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Check, FolderClosed, Loader2, RotateCcw, TriangleAlert } from "lucide-react"

import { ChartFlowLogo } from "@/components/brand/chartflow-logo"
import { useLanguage } from "@/components/language-provider"
import { Emblem, Eyebrow, SectionTitle } from "@/components/home/primitives"
import { IconArchive, IconShield, IconTerminal } from "@/components/home/icons"
import { cn } from "@/lib/utils"

type Info = {
  available: boolean
  fileCount: number
  totalBytes: number
  lastUpdated: string | null
  fileName: string
  folders: { name: string; count: number }[]
}

type Phase = "idle" | "preparing" | "downloading" | "done" | "error"

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function DownloadPage() {
  const { t, language } = useLanguage()
  const [info, setInfo] = useState<Info | null>(null)
  const [infoError, setInfoError] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [received, setReceived] = useState(0)

  useEffect(() => {
    let alive = true
    fetch("/download/info", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Info) => alive && setInfo(d))
      .catch(() => alive && setInfoError(true))
    return () => {
      alive = false
    }
  }, [])

  const startDownload = useCallback(async () => {
    setPhase("preparing")
    setReceived(0)
    try {
      const res = await fetch("/download/source", { cache: "no-store" })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      setPhase("downloading")
      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []
      let total = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          total += value.length
          setReceived(total)
        }
      }
      const blob = new Blob(chunks as BlobPart[], { type: "application/zip" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = info?.fileName ?? "chartflow-ai-source.zip"
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setPhase("done")
    } catch (e) {
      console.error("[download] failed", e)
      setPhase("error")
    }
  }, [info?.fileName])

  const busy = phase === "preparing" || phase === "downloading"
  const unavailable = infoError || (info !== null && !info.available)
  const updated =
    info?.lastUpdated &&
    new Date(info.lastUpdated).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

  const stats = [
    { label: t("download.stat.files"), value: info ? info.fileCount.toLocaleString() : "—" },
    { label: t("download.stat.size"), value: info ? formatBytes(info.totalBytes) : "—" },
    { label: t("download.stat.updated"), value: updated || "—" },
  ]

  return (
    <div className="cf-home relative min-h-screen overflow-x-clip" data-testid="download-page">
      {/* Backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="cf-aurora absolute -left-40 -top-48 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.26),transparent_62%)] blur-2xl" />
        <div className="cf-aurora absolute -right-40 top-40 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(110,231,183,0.10),transparent_62%)] blur-2xl [animation-delay:-7s]" />
        <div className="cf-grid absolute inset-0" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="ChartFlow Ai home" data-testid="download-logo">
          <ChartFlowLogo markClassName="size-9" />
        </Link>
        <Link
          href="/"
          data-testid="download-back-btn"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[13px] font-semibold text-[#ECF3EF]/75 transition-all hover:border-[#6EE7B7]/45 hover:text-[#6EE7B7]"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">{t("download.back")}</span>
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        <div className="flex flex-col items-center text-center">
          <Eyebrow>{t("download.badge")}</Eyebrow>
          <SectionTitle as="h1" lead={t("download.title.1")} accent={t("download.title.2")} className="mt-5 max-w-3xl" />
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-[#ECF3EF]/60 sm:text-[17px]">
            {t("download.subtitle")}
          </p>
        </div>

        {/* Main download card */}
        <section
          className="cf-card-strong relative mt-12 overflow-hidden rounded-[30px] p-6 shadow-[0_50px_120px_-40px_rgba(16,185,129,0.45)] sm:p-10"
          data-testid="download-card"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.16), transparent 70%)" }}
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <Emblem icon={IconArchive} size="lg" />
              <div className="min-w-0">
                <p className="cf-display text-xl text-[#F2F6F3] sm:text-2xl">ChartFlow Ai</p>
                <p className="cf-mono mt-1 truncate text-[12px] text-[#6EE7B7]/85" data-testid="download-file-name">
                  {info?.fileName ?? "chartflow-ai-source.zip"}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 sm:gap-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3 py-3 text-center sm:px-5">
                  <dd className="cf-display text-lg text-[#F2F6F3] sm:text-xl" data-testid={`download-stat-${s.label}`}>
                    {s.value}
                  </dd>
                  <dt className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#ECF3EF]/45">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mt-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Action */}
          <div className="relative mt-8 flex flex-col items-center gap-4">
            {unavailable ? (
              <p className="inline-flex items-center gap-2 rounded-xl border border-[#F87171]/30 bg-[#F87171]/10 px-4 py-3 text-sm text-[#FCA5A5]" data-testid="download-unavailable">
                <TriangleAlert className="size-4" />
                {t("download.unavailable")}
              </p>
            ) : (
              <button
                type="button"
                onClick={startDownload}
                disabled={busy || !info}
                data-testid="download-zip-btn"
                className="group relative inline-flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-xl px-10 text-base font-bold text-[#03140D] shadow-[0_18px_50px_-15px_rgba(16,185,129,0.8),inset_0_1px_0_rgba(255,255,255,0.45)] transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-wait disabled:hover:translate-y-0 sm:w-auto"
              >
                <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(135deg, #A7F3D0 0%, #34D399 35%, #10B981 70%, #059669 100%)" }} />
                {!busy && <span aria-hidden className="cf-btn-shine" />}
                {busy ? (
                  <Loader2 className="relative size-5 animate-spin" />
                ) : phase === "done" ? (
                  <RotateCcw className="relative size-5" />
                ) : (
                  <IconArchive className="relative size-5" />
                )}
                <span className="relative">
                  {phase === "preparing"
                    ? t("download.preparing")
                    : phase === "downloading"
                      ? t("download.downloading")
                      : phase === "done"
                        ? t("download.again")
                        : t("download.button")}
                </span>
              </button>
            )}

            {/* Status line */}
            <div className="min-h-6 text-center text-[13px]" aria-live="polite" data-testid="download-status">
              {phase === "downloading" && (
                <span className="cf-mono text-[#ECF3EF]/60">
                  {formatBytes(received)} {t("download.received")}
                </span>
              )}
              {phase === "done" && (
                <span className="inline-flex items-center gap-2 font-semibold text-[#6EE7B7]">
                  <Check className="size-4" strokeWidth={3} />
                  {t("download.done")} · <span className="cf-mono font-normal text-[#ECF3EF]/55">{formatBytes(received)}</span>
                </span>
              )}
              {phase === "error" && (
                <span className="inline-flex items-center gap-2 text-[#FCA5A5]">
                  <TriangleAlert className="size-4" />
                  {t("download.error")}
                </span>
              )}
            </div>

            {busy && (
              <div className="h-1 w-full max-w-sm overflow-hidden rounded-full bg-white/[0.06]">
                <div className="cf-indeterminate h-full w-1/3 rounded-full bg-gradient-to-r from-[#10B981] via-[#6EE7B7] to-[#6EE7B7]" />
              </div>
            )}
          </div>
        </section>

        {/* Details */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="cf-card rounded-[24px] p-6 md:col-span-1" data-testid="download-included">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#10B981]/12 text-[#6EE7B7] ring-1 ring-inset ring-[#34D399]/30">
                <FolderClosed className="size-[18px]" strokeWidth={1.8} />
              </span>
              <h2 className="cf-display text-lg text-[#F2F6F3]">{t("download.included")}</h2>
            </div>
            <ul className="mt-5 flex flex-col gap-2">
              {(info?.folders ?? []).map((f) => (
                <li key={f.name} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <span className="cf-mono truncate text-[13px] text-[#ECF3EF]/85">{f.name === "(root)" ? "/" : `${f.name}/`}</span>
                  <span className="shrink-0 text-[11px] text-[#ECF3EF]/45">
                    {f.count} {t("download.filesCount")}
                  </span>
                </li>
              ))}
              {!info && !infoError && (
                <li className="flex items-center gap-2 text-sm text-[#ECF3EF]/45">
                  <Loader2 className="size-4 animate-spin" />
                </li>
              )}
            </ul>
          </div>

          <InfoCard icon={IconShield} tone="gold" title={t("download.safe.title")} desc={t("download.safe.desc")} testId="download-safe" />
          <InfoCard icon={IconTerminal} title={t("download.howto.title")} desc={t("download.howto.desc")} testId="download-howto" />
        </div>
      </main>
    </div>
  )
}

function InfoCard({
  icon,
  title,
  desc,
  tone = "emerald",
  testId,
}: {
  icon: typeof IconShield
  title: string
  desc: string
  tone?: "emerald" | "gold"
  testId?: string
}) {
  return (
    <div className={cn("cf-card rounded-[24px] p-6")} data-testid={testId}>
      <Emblem icon={icon} size="md" tone={tone} />
      <h2 className="cf-display mt-5 text-lg text-[#F2F6F3]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#ECF3EF]/58">{desc}</p>
    </div>
  )
}
