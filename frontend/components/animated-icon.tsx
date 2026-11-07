import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type Tone = "emerald" | "gold" | "ivory" | "onyx" | "teal" | "cyan" | "volt"

const TONES: Record<
  Tone,
  {
    halo: string
    ring: string
    surface: string
    icon: string
    glow: string
    edge: string
  }
> = {
  emerald: {
    halo: "from-emerald-300/70 via-emerald-500/40 to-transparent",
    ring: "border-emerald-400/40",
    surface: "bg-emerald-500/15",
    icon: "text-emerald-300",
    glow: "glow-soft",
    edge: "shadow-[0_0_28px_-6px_rgba(16,185,129,0.6)]",
  },
  gold: {
    halo: "from-champagne-light/70 via-champagne/40 to-transparent",
    ring: "border-champagne/40",
    surface: "bg-champagne/15",
    icon: "text-champagne-light",
    glow: "glow-gold",
    edge: "shadow-[0_0_28px_-6px_rgba(245,193,108,0.55)]",
  },
  ivory: {
    halo: "from-white/70 via-white/30 to-transparent",
    ring: "border-white/30",
    surface: "bg-white/10",
    icon: "text-white",
    glow: "",
    edge: "shadow-[0_0_24px_-6px_rgba(255,255,255,0.35)]",
  },
  onyx: {
    halo: "from-champagne/40 via-champagne/20 to-transparent",
    ring: "border-champagne/25",
    surface: "bg-charcoal-raised/80",
    icon: "text-champagne",
    glow: "glow-gold",
    edge: "shadow-[0_0_24px_-6px_rgba(245,193,108,0.35)]",
  },
  teal: {
    halo: "from-[#5BC0D8]/70 via-[#1B7892]/40 to-transparent",
    ring: "border-[#5BC0D8]/40",
    surface: "bg-[#1B7892]/15",
    icon: "text-[#5BC0D8]",
    glow: "",
    edge: "shadow-[0_0_28px_-6px_rgba(91,192,216,0.55)]",
  },
  volt: {
    halo: "from-[#CDFF17]/60 via-[#9FCC10]/30 to-transparent",
    ring: "border-[#CDFF17]/40",
    surface: "bg-[#CDFF17]/10",
    icon: "text-[#CDFF17]",
    glow: "",
    edge: "shadow-[0_0_28px_-6px_rgba(205,255,23,0.5)]",
  },
  cyan: {
    halo: "from-[#7DE3FF]/70 via-[#5BC0D8]/40 to-transparent",
    ring: "border-[#7DE3FF]/40",
    surface: "bg-[#5BC0D8]/15",
    icon: "text-[#7DE3FF]",
    glow: "",
    edge: "shadow-[0_0_28px_-6px_rgba(125,227,255,0.55)]",
  },
}

const SIZES = {
  sm: { box: "size-10", icon: "size-4" },
  md: { box: "size-12", icon: "size-5" },
  lg: { box: "size-14", icon: "size-6" },
} as const

type Props = {
  icon: LucideIcon
  tone?: Tone
  size?: keyof typeof SIZES
  /** Render expanding rings + glow. Default: true. */
  animated?: boolean
  className?: string
}

/**
 * AnimatedIcon — a luxurious badge that wraps any lucide icon.
 * Layers (back-to-front):
 *   1. Slowly rotating conic-gradient halo (spin-slow)
 *   2. Two expanding pulse rings (icon-ring)
 *   3. Tinted glass surface
 *   4. The icon itself with a soft drop-shadow glow
 */
export function AnimatedIcon({
  icon: Icon,
  tone = "emerald",
  size = "md",
  animated = true,
  className,
}: Props) {
  const t = TONES[tone]
  const s = SIZES[size]

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-2xl",
        s.box,
        className,
      )}
      aria-hidden
    >
      {/* Conic-gradient halo */}
      <span
        className={cn(
          "absolute inset-0 rounded-2xl bg-gradient-to-br",
          t.halo,
          animated && "spin-slow opacity-70",
        )}
        style={{ filter: "blur(6px)" }}
      />

      {/* Expanding pulse rings */}
      {animated && (
        <>
          <span
            className={cn(
              "absolute inset-0 rounded-2xl border icon-ring",
              t.ring,
            )}
          />
          <span
            className={cn(
              "absolute inset-0 rounded-2xl border icon-ring icon-ring-delay",
              t.ring,
            )}
          />
        </>
      )}

      {/* Glass surface */}
      <span
        className={cn(
          "relative inline-flex items-center justify-center rounded-2xl border backdrop-blur",
          s.box,
          t.surface,
          t.ring,
          t.edge,
        )}
      >
        <Icon className={cn(s.icon, t.icon, animated && t.glow)} />
      </span>
    </span>
  )
}
