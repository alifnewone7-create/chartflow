"use client"

import { useEffect, useState } from "react"
import { Check, Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useLanguage } from "@/components/language-provider"
import { LANGUAGES, type Language } from "@/lib/i18n/dictionary"
import { cn } from "@/lib/utils"

/**
 * LanguageSelectPopup
 * --------------------
 * Shows a one-time modal on the user's first visit that asks them to choose
 * their preferred language. Once selected, the choice is persisted via
 * LanguageProvider and the modal won't reappear on future visits.
 */
export function LanguageSelectPopup() {
  const { isSelected, ready, setLanguage, t } = useLanguage()
  // Independently track the user's tentative selection inside the dialog.
  const [pending, setPending] = useState<Language>("en")
  const [open, setOpen] = useState(false)

  // Open the popup only after we've confirmed (post-hydration) that no
  // language preference is stored yet.
  useEffect(() => {
    if (ready && !isSelected) setOpen(true)
  }, [ready, isSelected])

  const handleConfirm = () => {
    setLanguage(pending)
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      // Block dismissing without making a choice — user must tap a language + Continue.
      onOpenChange={() => {
        /* no-op — confirm-only flow */
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="cf-home overflow-hidden rounded-[24px] border-white/[0.08] bg-gradient-to-b from-[#1C1E23] to-[#141517] p-0 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] sm:max-w-md"
      >
        {/* Decorative top accent line */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CDFF17]/70 to-transparent"
        />
        {/* Soft top-left teal glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(205,255,23,0.35) 0%, transparent 70%)" }}
        />
        {/* Soft bottom-right cyan glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(205,255,23,0.25) 0%, transparent 70%)" }}
        />

        <div className="relative px-7 pb-7 pt-9 sm:px-8 sm:pt-10">
          {/* Eyebrow */}
          <div className="flex items-center gap-2.5">
            <span className="cf-orb inline-flex size-9 items-center justify-center rounded-full">
              <Globe className="size-4" strokeWidth={2.25} />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#CDFF17]">
              {t("lang.popup.eyebrow")}
            </span>
          </div>

          {/* Title */}
          <DialogTitle className="cf-headline mt-4 text-balance text-2xl text-white sm:text-[1.75rem]">
            {t("lang.popup.title")}
          </DialogTitle>

          {/* Subtitle */}
          <DialogDescription className="mt-2.5 text-pretty text-[13.5px] leading-relaxed text-white/60">
            {t("lang.popup.subtitle")}
          </DialogDescription>

          {/* Options */}
          <div className="mt-7 flex flex-col gap-3">
            {LANGUAGES.map((lang) => {
              const active = pending === lang.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  data-testid={`lang-popup-option-${lang.code}`}
                  onClick={() => setPending(lang.code)}
                  className={cn(
                    "group relative flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-all duration-200",
                    active
                      ? "border-[#CDFF17]/60 bg-[#CDFF17]/[0.08] shadow-[0_0_24px_-6px_rgba(205,255,23,0.4)]"
                      : "border-white/[0.07] bg-[#0E0F11]/60 hover:border-[#CDFF17]/40 hover:bg-[#CDFF17]/[0.05]",
                  )}
                  aria-pressed={active}
                >
                  {/* Flag */}
                  <span
                    className={cn(
                      "relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 transition-all",
                      active ? "ring-[#CDFF17]/70" : "ring-white/15 group-hover:ring-[#CDFF17]/40",
                    )}
                  >
                    <img
                      src={`https://flagcdn.com/w80/${lang.flag}.png`}
                      alt=""
                      width={44}
                      height={44}
                      className="size-full object-cover"
                    />
                  </span>

                  {/* Labels */}
                  <span className="flex flex-1 flex-col leading-tight">
                    <span className="text-[15px] font-bold text-white">
                      {lang.native}
                    </span>
                    <span className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/50">
                      {lang.label}
                    </span>
                  </span>

                  {/* Checkmark */}
                  <span
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition-all",
                      active
                        ? "border-[#CDFF17] bg-[#CDFF17] text-[#141517] shadow-md shadow-[#CDFF17]/40"
                        : "border-white/15 bg-transparent text-transparent group-hover:border-[#CDFF17]/50",
                    )}
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                </button>
              )
            })}
          </div>

          {/* Confirm */}
          <Button
            type="button"
            data-testid="lang-popup-continue"
            onClick={handleConfirm}
            size="lg"
            className="cf-btn-volt mt-7 h-13 w-full rounded-xl text-base font-bold hover:bg-[#CDFF17]"
          >
            {t("lang.popup.continue")}
          </Button>

          {/* Footnote */}
          <p className="mt-4 text-center text-[11px] text-white/45">
            {t("lang.popup.changeLater")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
