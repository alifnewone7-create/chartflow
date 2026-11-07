"use client"

import Image from "next/image"

import { cn } from "@/lib/utils"

type BrandLoaderProps = {
  variant?: "overlay" | "inline"
  className?: string
}

export function BrandLoader({ variant = "overlay", className }: BrandLoaderProps) {
  const wrapperClass =
    variant === "overlay"
      ? "fixed inset-0 z-[100] flex items-center justify-center bg-[#141517]"
      : "flex min-h-[55vh] w-full items-center justify-center"

  return (
    <div className={cn(wrapperClass, className)} role="status" aria-label="Loading" data-testid="brand-loader">
      {variant === "overlay" && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(205,255,23,0.10),transparent_65%)] blur-2xl" />
          <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(205,255,23,0.08),transparent_70%)]" />
        </div>
      )}
      <div className="relative grid size-20 place-items-center">
        <span aria-hidden className="absolute inset-0 animate-spin rounded-full border-2 border-[#CDFF17]/15 border-t-[#CDFF17] shadow-[0_0_24px_-6px_rgba(205,255,23,0.6)]" />
        <Image src="/brand/chartflow-mark.png" alt="" width={40} height={40} priority className="size-10 animate-pulse object-contain" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}
