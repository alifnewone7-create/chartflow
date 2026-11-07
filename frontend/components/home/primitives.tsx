"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { IconArrow, type CfIcon } from "@/components/home/icons"

export const ADMIN_TELEGRAM_URL = "https://t.me/Mushfiq2615"
export const QUOTEX_SIGNUP_URL = "https://market-qx.pro/sign-up/?lid=1506771"

/* -------------------------------------------------------------------------- */
/* Emblem — round lime orb housing an icon                                    */
/* -------------------------------------------------------------------------- */
const EMBLEM_SIZE = {
  sm: { box: "size-10", icon: "size-[18px]" },
  md: { box: "size-12", icon: "size-[22px]" },
  lg: { box: "size-16", icon: "size-7" },
}

export function Emblem({
  icon: Icon,
  size = "md",
  tone = "emerald",
  className,
}: {
  icon: CfIcon
  size?: keyof typeof EMBLEM_SIZE
  tone?: "emerald" | "gold"
  className?: string
}) {
  const s = EMBLEM_SIZE[size]
  return (
    <span
      className={cn(
        "cf-orb relative inline-flex shrink-0 items-center justify-center rounded-full",
        tone === "gold" && "text-white",
        s.box,
        className,
      )}
    >
      <Icon className={s.icon} />
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Section heading                                                            */
/* -------------------------------------------------------------------------- */
export function Eyebrow({ children, className, icon: Icon }: { children: ReactNode; className?: string; icon?: CfIcon }) {
  return (
    <span className={cn("cf-pill", className)}>
      {Icon ? <Icon className="size-3.5 text-[#CDFF17]" /> : <span aria-hidden className="size-1.5 rounded-full bg-[#CDFF17] shadow-[0_0_10px_#CDFF17]" />}
      {children}
    </span>
  )
}

export function SectionTitle({
  lead,
  accent,
  className,
  as: Tag = "h2",
  id,
  tone = "steel",
}: {
  lead: string
  accent: string
  className?: string
  as?: "h1" | "h2"
  id?: string
  tone?: "steel" | "volt"
}) {
  return (
    <Tag
      id={id}
      className={cn(
        "cf-headline text-balance text-[2.1rem] text-white sm:text-[2.8rem] lg:text-[3.4rem]",
        className,
      )}
    >
      {lead}
      <br className="hidden sm:block" />{" "}
      <span className={tone === "volt" ? "cf-text-volt" : "cf-text-steel"}>{accent}</span>
    </Tag>
  )
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */
type BtnProps = {
  href: string
  children: ReactNode
  className?: string
  external?: boolean
  icon?: CfIcon
  testId?: string
  arrow?: boolean
}

function BtnLink({ href, external, className, children, testId }: { href: string; external?: boolean; className: string; children: ReactNode; testId?: string }) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} data-testid={testId}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className} data-testid={testId}>
      {children}
    </Link>
  )
}

export function PrimaryButton({ href, children, className, external, icon: Icon, testId, arrow = true }: BtnProps) {
  return (
    <BtnLink
      href={href}
      external={external}
      testId={testId}
      className={cn(
        "cf-btn-volt group inline-flex h-14 items-center justify-center gap-2.5 whitespace-nowrap rounded-xl px-7 text-[15px] font-bold",
        className,
      )}
    >
      {Icon && <Icon className="size-[18px]" />}
      <span>{children}</span>
      {arrow && <IconArrow className="size-4 transition-transform duration-300 group-hover:translate-x-1" />}
    </BtnLink>
  )
}

export function GhostButton({ href, children, className, external, icon: Icon, testId, arrow = false }: BtnProps) {
  return (
    <BtnLink
      href={href}
      external={external}
      testId={testId}
      className={cn(
        "cf-btn-dark group inline-flex h-14 items-center justify-center gap-2.5 whitespace-nowrap rounded-xl px-7 text-[15px] font-semibold",
        className,
      )}
    >
      {Icon && <Icon className="size-[18px] text-[#CDFF17]" />}
      <span>{children}</span>
      {arrow && <IconArrow className="size-4 text-[#CDFF17] transition-transform duration-300 group-hover:translate-x-1" />}
    </BtnLink>
  )
}

/* Stat tile — orb + big figure + label */
export function StatCard({ icon: Icon, value, label, testId }: { icon: CfIcon; value: string; label: string; testId?: string }) {
  return (
    <div className="cf-card flex items-center gap-4 rounded-2xl px-5 py-4 sm:px-6 sm:py-5" data-testid={testId}>
      <Emblem icon={Icon} size="md" />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="cf-display text-[1.75rem] leading-none text-white sm:text-[2rem]">{value}</span>
        <span className="mt-1.5 text-[10.5px] font-semibold uppercase leading-snug tracking-[0.18em] text-white/45">{label}</span>
      </div>
    </div>
  )
}

/* Thin hairline divider */
export function Hairline({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-px w-full", className)}>
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}
