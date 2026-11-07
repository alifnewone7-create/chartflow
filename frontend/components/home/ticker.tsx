"use client"

const PAIRS = [
  "USD/BRL",
  "EUR/USD",
  "GBP/JPY",
  "AUD/CAD",
  "USD/JPY",
  "EUR/GBP",
  "NZD/USD",
  "USD/CHF",
  "BTC/USD",
  "EUR/JPY",
]

export function HomeTicker() {
  const loop = [...PAIRS, ...PAIRS]
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-[#0E0F11] py-4" data-testid="home-ticker">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0E0F11] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0E0F11] to-transparent" />
      <div className="cf-marquee flex w-max items-center gap-10 whitespace-nowrap will-change-transform">
        {loop.map((p, i) => (
          <div key={`${p}-${i}`} className="flex items-center gap-10">
            <span className="cf-mono text-[13px] font-semibold tracking-wide text-white/80">
              {p} <span className="text-[#CDFF17]/85">OTC</span>
            </span>
            <span aria-hidden className="size-1.5 rounded-full bg-[#CDFF17]/70" />
          </div>
        ))}
      </div>
    </div>
  )
}
