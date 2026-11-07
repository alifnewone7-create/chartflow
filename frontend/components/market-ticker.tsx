"use client"

/**
 * MarketTicker — a continuously scrolling strip of OTC market pair
 * names. Purely decorative; the real live data lives on the chart
 * pages. Per request, prices and percent changes are intentionally
 * omitted — only pair names scroll across the strip.
 */

const PAIRS: string[] = [
  "USD/BRL OTC",
  "EUR/USD OTC",
  "GBP/JPY OTC",
  "AUD/CAD OTC",
  "USD/JPY OTC",
  "EUR/GBP OTC",
  "NZD/USD OTC",
  "USD/CHF OTC",
  "BTC/USD OTC",
  "EUR/JPY OTC",
]

export function MarketTicker() {
  // Render twice in a row so the marquee can loop seamlessly via -50%.
  const loop = [...PAIRS, ...PAIRS]

  return (
    <div className="relative overflow-hidden border-y border-[#1B7892]/30 bg-[#03161B]/70 py-3 backdrop-blur">
      {/* Soft fade on the edges so items never appear to "pop" in. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#03161B] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#03161B] to-transparent"
      />

      <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap will-change-transform">
        {loop.map((pair, i) => (
          <div
            key={`${pair}-${i}`}
            className="flex items-center gap-8 font-mono text-xs text-[#E8F4F7]/80 sm:text-sm"
          >
            <span className="font-semibold tracking-wide text-[#E8F4F7]">
              {pair}
            </span>
            <span aria-hidden className="text-[#E8F4F7]/20">
              |
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
