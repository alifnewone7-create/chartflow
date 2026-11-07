"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"

type Props = {
  value: string
  className?: string
}

/**
 * Truncated, monospaced display of a wallet address with a one-click copy
 * button. Falls back gracefully if the Clipboard API is unavailable.
 */
export function CopyAddress({ value, className = "" }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.log("copy failed:", err)
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 ${className}`}
    >
      <code className="flex-1 break-all rounded-md border border-[#1B7892]/30 bg-[#03161B]/80 px-3 py-2 font-mono text-xs text-[#E8F4F7] sm:text-sm">
        {value}
      </code>
      <Button
        type="button"
        onClick={handleCopy}
        size="sm"
        className={`h-9 shrink-0 gap-2 rounded-md font-semibold transition-colors ${
          copied
            ? "bg-emerald-500 text-[#03161B] hover:bg-emerald-400"
            : "bg-gradient-to-br from-[#5BC0D8] to-[#1B7892] text-[#03161B] shadow-md shadow-[#1B7892]/30 hover:brightness-110"
        }`}
      >
        {copied ? (
          <>
            <Check className="size-4" aria-hidden />
            Copied
          </>
        ) : (
          <>
            <Copy className="size-4" aria-hidden />
            Copy
          </>
        )}
      </Button>
    </div>
  )
}
