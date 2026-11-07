import type { SVGProps } from "react"

/**
 * ChartFlow Ai — bespoke duotone icon set for the home page.
 * Primary strokes use `currentColor`; accent details use the champagne
 * gold token `--cf-accent` so every icon reads as part of one family.
 */

type P = SVGProps<SVGSVGElement>
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}
const ACC = "var(--cf-accent, #CDFF17)"

export type CfIcon = (p: P) => React.JSX.Element

/* Two solid candles + two dashed "future" candles */
export const IconCandlesAhead: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M5 4v3M5 15v3M9.5 7v2M9.5 17v2" />
    <rect x="3.5" y="7" width="3" height="8" rx="0.8" fill="currentColor" fillOpacity="0.18" />
    <rect x="8" y="9" width="3" height="8" rx="0.8" fill="currentColor" fillOpacity="0.18" />
    <rect x="13" y="6" width="3" height="7" rx="0.8" stroke={ACC} strokeDasharray="1.6 1.4" />
    <rect x="17.5" y="4" width="3" height="7" rx="0.8" stroke={ACC} strokeDasharray="1.6 1.4" />
    <path d="M13 19.5h7.5m0 0-2-2m2 2-2 2" stroke={ACC} />
  </svg>
)

/* Reticle with a check — precision */
export const IconPrecision: CfIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4.2" fill="currentColor" fillOpacity="0.14" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <path d="m10.2 12.1 1.3 1.3 2.6-2.8" stroke={ACC} strokeWidth={1.8} />
  </svg>
)

/* Globe with orbit + pulse — always-on coverage */
export const IconGlobePulse: CfIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="7.5" fill="currentColor" fillOpacity="0.1" />
    <path d="M4.5 12h15M12 4.5c2.2 2.1 3.2 4.6 3.2 7.5s-1 5.4-3.2 7.5c-2.2-2.1-3.2-4.6-3.2-7.5s1-5.4 3.2-7.5Z" />
    <ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-25 12 12)" stroke={ACC} strokeDasharray="2 2" />
    <circle cx="20.6" cy="7.6" r="1.2" fill={ACC} stroke="none" />
  </svg>
)

/* Concierge headset with spark */
export const IconConcierge: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4.5 13v-1.5a7.5 7.5 0 0 1 15 0V13" />
    <rect x="3" y="12.5" width="4" height="6" rx="1.6" fill="currentColor" fillOpacity="0.16" />
    <rect x="17" y="12.5" width="4" height="6" rx="1.6" fill="currentColor" fillOpacity="0.16" />
    <path d="M19 18.5c0 1.7-1.6 2.5-4.5 2.5H13" />
    <path d="M12 6.2v2.6M10.7 7.5h2.6" stroke={ACC} />
  </svg>
)

/* Layered diamond — choose a plan */
export const IconLayers: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m12 3 8.5 4.8L12 12.6 3.5 7.8 12 3Z" fill="currentColor" fillOpacity="0.16" />
    <path d="m3.5 12 8.5 4.8 8.5-4.8" />
    <path d="m3.5 16.2 8.5 4.8 8.5-4.8" stroke={ACC} />
  </svg>
)

/* Key with gem bow — QXL key */
export const IconGemKey: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m7.5 3.5 3.5 2v4l-3.5 2-3.5-2v-4l3.5-2Z" fill="currentColor" fillOpacity="0.16" />
    <path d="m10 10.5 9.5 9.5M16 16.5l2-2M18 18.5l1.6-1.6" />
    <circle cx="7.5" cy="7.5" r="1" fill={ACC} stroke="none" />
  </svg>
)

/* Open padlock with rising line — activate & trade */
export const IconUnlockChart: CfIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="10.5" width="16" height="10" rx="2.4" fill="currentColor" fillOpacity="0.12" />
    <path d="M8 10.5V7.4a4 4 0 0 1 7.6-1.8" />
    <path d="m7.5 17.5 3-2.6 2.2 1.6 3.8-3.6" stroke={ACC} strokeWidth={1.8} />
  </svg>
)

/* Tier icons ----------------------------------------------------------- */
export const IconSeed: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21v-7" />
    <path d="M12 14c0-4.5 3-7.5 8-7.5 0 4.5-3 7.5-8 7.5Z" fill="currentColor" fillOpacity="0.16" />
    <path d="M12 11.5C12 7.6 9.4 5 5 5c0 3.9 2.6 6.5 7 6.5Z" stroke={ACC} />
  </svg>
)

export const IconFacet: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M7 4h10l4 5-9 11L3 9l4-5Z" fill="currentColor" fillOpacity="0.14" />
    <path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5" />
    <path d="M12 1.5v1.2M18.5 2.5l-.7.9M5.5 2.5l.7.9" stroke={ACC} />
  </svg>
)

export const IconCrown: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m3.5 8 4.2 3.6L12 5l4.3 6.6L20.5 8l-1.6 9.5H5.1L3.5 8Z" fill="currentColor" fillOpacity="0.16" />
    <path d="M5.5 20.5h13" stroke={ACC} />
    <circle cx="12" cy="13.6" r="1.3" fill={ACC} stroke="none" />
  </svg>
)

export const IconLaurel: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" fill="currentColor" fillOpacity="0.16" />
    <path d="M12 12.5V16M9 20h6M10 16h4v4h-4z" />
    <path d="M5.5 5c-1.8 2.8-1.4 6.2 1.4 8.3M18.5 5c1.8 2.8 1.4 6.2-1.4 8.3" stroke={ACC} />
  </svg>
)

/* Utility -------------------------------------------------------------- */
export const IconPlane: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M21 3.5 2.8 10.6c-.8.3-.7 1.4.1 1.6l4.6 1.3 1.6 5.3c.2.7 1.1.9 1.6.3l2.6-2.8 4.6 3.4c.6.4 1.4.1 1.5-.6L21.9 4.5c.1-.7-.4-1.2-.9-1Z" fill="currentColor" fillOpacity="0.14" />
    <path d="m7.5 13.5 9-6.5" stroke={ACC} />
  </svg>
)

export const IconArrow: CfIcon = (p) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="M5 12h14m0 0-5-5m5 5-5 5" />
  </svg>
)

export const IconQuote: CfIcon = (p) => (
  <svg viewBox="0 0 32 24" fill="currentColor" {...p}>
    <path d="M0 24V14.4C0 6.4 4.3 1.6 12.2 0l1.3 3.2C9 4.6 6.8 7.4 6.6 11.2H12V24H0Zm18 0V14.4C18 6.4 22.3 1.6 30.2 0l1.3 3.2c-4.5 1.4-6.7 4.2-6.9 8H30V24H18Z" />
  </svg>
)

export const IconStar: CfIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="m12 2.8 2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.6l-5.6 3.2 1.3-6.2L3 9.3l6.3-.7L12 2.8Z" />
  </svg>
)

/* Archive box with download arrow — source code zip */
export const IconArchive: CfIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="4" width="17" height="5" rx="1.4" fill="currentColor" fillOpacity="0.16" />
    <path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9" />
    <path d="M12 11.5v5m0 0-2.2-2.2M12 16.5l2.2-2.2" stroke={ACC} strokeWidth={1.8} />
  </svg>
)

/* Shield with check — safe to share */
export const IconShield: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3 19.5 6v5.5c0 4.4-3.1 8.3-7.5 9.5-4.4-1.2-7.5-5.1-7.5-9.5V6L12 3Z" fill="currentColor" fillOpacity="0.14" />
    <path d="m9 12 2.2 2.2L15.2 10" stroke={ACC} strokeWidth={1.8} />
  </svg>
)

/* Terminal prompt — run locally */
export const IconTerminal: CfIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.4" fill="currentColor" fillOpacity="0.12" />
    <path d="m7 10 2.5 2L7 14" />
    <path d="M12 14.5h5" stroke={ACC} />
  </svg>
)

/* Verified seal — scalloped badge with a check */
export const IconVerified: CfIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 1.6l2.3 1.9 2.9-.6 1.1 2.8 2.7 1.3-.5 3L22.4 12l-1.9 2.3.5 3-2.7 1.3-1.1 2.8-2.9-.6L12 22.4l-2.3-1.9-2.9.6-1.1-2.8-2.7-1.3.5-3L1.6 12l1.9-2.3-.5-3 2.7-1.3 1.1-2.8 2.9.6z" />
    <path d="M8 12.2l2.6 2.6L16.4 9" fill="none" stroke="#141517" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/* ---------------------------------------------------------------------- */
/* Account / signal-room icons — same duotone family                      */
/* ---------------------------------------------------------------------- */

/* ID card with a person and a lime seal — profile identity */
export const IconIdBadge: CfIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.4" fill="currentColor" fillOpacity="0.12" />
    <circle cx="8.5" cy="11" r="2.1" fill="currentColor" fillOpacity="0.2" />
    <path d="M5.2 16.2c.6-1.6 1.8-2.4 3.3-2.4s2.7.8 3.3 2.4" />
    <path d="M14 9.5h4.5M14 12.5h3" stroke={ACC} />
    <circle cx="18.2" cy="15.6" r="1.1" fill={ACC} stroke="none" />
  </svg>
)

/* Envelope with a lime wax seal — email */
export const IconMailSeal: CfIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.2" fill="currentColor" fillOpacity="0.12" />
    <path d="m3.5 7.5 8.5 6 8.5-6" />
    <circle cx="17.5" cy="16.5" r="2.4" fill={ACC} stroke="none" />
    <path d="m16.5 16.5.7.7 1.3-1.4" stroke="#141517" strokeWidth={1.4} />
  </svg>
)

/* Calendar with a checked day — membership */
export const IconMembership: CfIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.2" fill="currentColor" fillOpacity="0.12" />
    <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
    <path d="m9 14.5 2 2 4-4.2" stroke={ACC} strokeWidth={1.8} />
  </svg>
)

/* Speed gauge with a lime needle — daily limit */
export const IconGauge: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 16.5a8 8 0 1 1 16 0" fill="currentColor" fillOpacity="0.12" />
    <path d="M4 16.5h16" />
    <path d="M7.5 10.2l.8.8M16.5 10.2l-.8.8M12 7.5v1.2" />
    <path d="m12 16.5 3.6-4.6" stroke={ACC} strokeWidth={1.9} />
    <circle cx="12" cy="16.5" r="1.3" fill={ACC} stroke="none" />
  </svg>
)

/* Heartbeat line in a frame — live 1m signal */
export const IconPulse: CfIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.4" fill="currentColor" fillOpacity="0.12" />
    <path d="M5.5 12h3l1.6-3.5 2.4 7 1.9-5 1.1 1.5h3" stroke={ACC} strokeWidth={1.8} />
  </svg>
)

/* Clock with a forward arrow — future signals */
export const IconFutureClock: CfIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="12" r="7.5" fill="currentColor" fillOpacity="0.12" />
    <path d="M11 7.8V12l2.8 1.8" />
    <path d="M16.5 17.5h5m0 0-1.8-1.8m1.8 1.8-1.8 1.8" stroke={ACC} />
  </svg>
)

/* Robot head with an antenna spark — automatic signals */
export const IconBot: CfIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="8" width="16" height="11" rx="3" fill="currentColor" fillOpacity="0.12" />
    <path d="M12 8V5.5" />
    <circle cx="12" cy="4.2" r="1.2" fill={ACC} stroke="none" />
    <circle cx="9" cy="13" r="1.2" fill={ACC} stroke="none" />
    <circle cx="15" cy="13" r="1.2" fill={ACC} stroke="none" />
    <path d="M9.5 16.5h5" />
  </svg>
)

/* Circular arrows — daily reset */
export const IconRefresh: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M19.5 12a7.5 7.5 0 0 1-12.9 5.2" />
    <path d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2" stroke={ACC} />
    <path d="M17.4 3.8v3.2h-3.2M6.6 20.2V17h3.2" stroke={ACC} />
  </svg>
)

/* Rocket with a lime flame — upgrade */
export const IconRocket: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M14.5 4.5c2.6-.6 4.6-.3 5 .1.4.4.7 2.4.1 5l-7.8 7.8-5.2-5.2 7.9-7.7Z" fill="currentColor" fillOpacity="0.14" />
    <circle cx="15.3" cy="8.7" r="1.4" />
    <path d="M6.6 12.2 4.5 13.4l2.2 2.2M11.8 17.4l1.2 2.1 2.2-2.2" />
    <path d="M7.5 16.5c-1.6 1-2.4 2.3-2.9 4 1.7-.5 3-1.3 4-2.9" stroke={ACC} />
  </svg>
)

/* Infinity loop — no limit */
export const IconInfinity: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 12c-1.7-2.4-3.1-3.6-4.9-3.6a3.6 3.6 0 0 0 0 7.2c1.8 0 3.2-1.2 4.9-3.6Z" fill="currentColor" fillOpacity="0.14" />
    <path d="M12 12c1.7 2.4 3.1 3.6 4.9 3.6a3.6 3.6 0 0 0 0-7.2c-1.8 0-3.2 1.2-4.9 3.6Z" stroke={ACC} />
  </svg>
)

/* Closed padlock — locked feature */
export const IconLock: CfIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.4" fill="currentColor" fillOpacity="0.14" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    <circle cx="12" cy="15.5" r="1.3" fill={ACC} stroke="none" />
  </svg>
)

/* Hourglass timer — quota time */
export const IconTimer: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M7 3.5h10M7 20.5h10" />
    <path d="M8 3.5c0 4 4 5.5 4 8.5s-4 4.5-4 8.5M16 3.5c0 4-4 5.5-4 8.5s4 4.5 4 8.5" fill="currentColor" fillOpacity="0.12" />
    <path d="M10 17.5h4" stroke={ACC} strokeWidth={1.9} />
  </svg>
)

/* Eye with a lime iris — look-ahead view */
export const IconEye: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M2.5 12c2.4-4.2 5.6-6.3 9.5-6.3s7.1 2.1 9.5 6.3c-2.4 4.2-5.6 6.3-9.5 6.3S4.9 16.2 2.5 12Z" fill="currentColor" fillOpacity="0.12" />
    <circle cx="12" cy="12" r="3.2" stroke={ACC} />
    <circle cx="12" cy="12" r="1.1" fill={ACC} stroke="none" />
  </svg>
)

/* Triangle alert — limit reached */
export const IconAlert: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M10.3 4.6 2.9 17.5c-.7 1.2.2 2.7 1.6 2.7h15c1.4 0 2.3-1.5 1.6-2.7L13.7 4.6c-.7-1.3-2.6-1.3-3.4 0Z" fill="currentColor" fillOpacity="0.14" />
    <path d="M12 9.5v4.5" stroke={ACC} strokeWidth={1.9} />
    <circle cx="12" cy="17" r="1" fill={ACC} stroke="none" />
  </svg>
)

/* Rising / falling trend arrows — direction call */
export const IconTrendUp: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m3.5 16.5 5-5 3.5 3.5 7-7" />
    <path d="M14.5 8h4.5v4.5" stroke={ACC} strokeWidth={1.9} />
  </svg>
)
export const IconTrendDown: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m3.5 7.5 5 5 3.5-3.5 7 7" />
    <path d="M14.5 16h4.5v-4.5" stroke={ACC} strokeWidth={1.9} />
  </svg>
)

/* Sideways waves — indecisive market */
export const IconWaves: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 9c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 3.3-1.5 5 0" />
    <path d="M3 15c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 3.3-1.5 5 0" stroke={ACC} />
  </svg>
)

/* Sign-out door with arrow */
export const IconExit: CfIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M10 4.5H6.5A2 2 0 0 0 4.5 6.5v11a2 2 0 0 0 2 2H10" fill="currentColor" fillOpacity="0.12" />
    <path d="M14 8.5 17.5 12 14 15.5M17.5 12H9" stroke={ACC} strokeWidth={1.8} />
  </svg>
)
