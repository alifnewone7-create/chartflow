"use client"

/**
 * Tiny visual helper that maps a curated allow-list label (or a backend
 * symbol) to a pair of country/asset flags. Used by the asset selector
 * trigger, the asset-selector dropdown rows, the live signal popup, and
 * the history drawer so the same visual identity follows the user
 * across the entire signal-room experience.
 *
 * For currency pairs we render two stacked circular flags (base + quote
 * currency) the same way the marketing home page renders the USD/BRL
 * card. For non-currency assets (crypto, commodities, stocks) we render
 * a single round badge with a brand glyph and a fitting accent colour
 * so the row still has a recognisable mark instead of an empty slot.
 */

import { useState } from "react"

import { matchAllowedMarket } from "@/lib/allowed-markets"
import { cn } from "@/lib/utils"

/** Flag CDN url builder (same provider used elsewhere in the app). */
function flagUrl(code: string, w: 20 | 40 | 80 = 80): string {
  return `https://flagcdn.com/w${w}/${code}.png`
}

type CurrencyMeta = {
  /** ISO-3166 alpha-2 country code consumed by flagcdn. */
  cc: string
  /** Currency code (USD, EUR, …). */
  code: string
}

/**
 * ISO-4217 → country flag mapping for every currency we surface in the
 * allow-list. Stored as a flat record so the lookup is O(1) and adding
 * a new pair is a one-line change.
 */
const CURRENCY: Record<string, CurrencyMeta> = Object.fromEntries(
  Object.entries({
    USD: "us", EUR: "eu", GBP: "gb", JPY: "jp", CHF: "ch", AUD: "au", CAD: "ca",
    NZD: "nz", BRL: "br", MXN: "mx", ARS: "ar", PKR: "pk", PHP: "ph", INR: "in",
    BDT: "bd", IDR: "id", TRY: "tr", ZAR: "za", EGP: "eg", NGN: "ng", DZD: "dz",
    COP: "co", CLP: "cl", PEN: "pe", SGD: "sg", HKD: "hk", CNY: "cn", CNH: "cn",
    KRW: "kr", THB: "th", MYR: "my", VND: "vn", RUB: "ru", UAH: "ua", SAR: "sa",
    AED: "ae", QAR: "qa", KWD: "kw", BHD: "bh", OMR: "om", JOD: "jo", LBP: "lb",
    YER: "ye", SYP: "sy", IRR: "ir", ILS: "il", KES: "ke", TND: "tn", MAD: "ma",
    CZK: "cz", PLN: "pl", HUF: "hu", SEK: "se", NOK: "no", DKK: "dk", RON: "ro",
    BGN: "bg", ISK: "is", KZT: "kz", UZS: "uz", LKR: "lk", NPR: "np", MMK: "mm",
    TWD: "tw", GHS: "gh", XOF: "sn", XAF: "cm", ETB: "et", TZS: "tz", UGX: "ug",
    VES: "ve", BOB: "bo", PYG: "py", UYU: "uy", DOP: "do", GEL: "ge", AMD: "am",
    AZN: "az", MNT: "mn", KHR: "kh", LAK: "la", AFN: "af", IQD: "iq", LYD: "ly",
  }).map(([code, cc]) => [code, { cc, code }]),
)

/** Crypto base code -> coin icon slug (spothq icon set) + fallback badge. */
const CRYPTO: Record<string, { slug: string; badge: SpecialBadge }> = {
  BTC: { slug: "btc", badge: { glyph: "₿", bg: "#F7931A", fg: "#FFFFFF" } },
  ETH: { slug: "eth", badge: { glyph: "Ξ", bg: "#627EEA", fg: "#FFFFFF" } },
  BNB: { slug: "bnb", badge: { glyph: "BNB", bg: "#F3BA2F", fg: "#0B0E11" } },
  XRP: { slug: "xrp", badge: { glyph: "XRP", bg: "#23292F", fg: "#FFFFFF" } },
  LTC: { slug: "ltc", badge: { glyph: "Ł", bg: "#345D9D", fg: "#FFFFFF" } },
  BCH: { slug: "bch", badge: { glyph: "BCH", bg: "#8DC351", fg: "#FFFFFF" } },
  ADA: { slug: "ada", badge: { glyph: "ADA", bg: "#0033AD", fg: "#FFFFFF" } },
  DOG: { slug: "doge", badge: { glyph: "Ð", bg: "#C2A633", fg: "#FFFFFF" } },
  DOGE: { slug: "doge", badge: { glyph: "Ð", bg: "#C2A633", fg: "#FFFFFF" } },
  DOT: { slug: "dot", badge: { glyph: "DOT", bg: "#E6007A", fg: "#FFFFFF" } },
  SOL: { slug: "sol", badge: { glyph: "SOL", bg: "#9945FF", fg: "#FFFFFF" } },
  TRX: { slug: "trx", badge: { glyph: "TRX", bg: "#EF0027", fg: "#FFFFFF" } },
  LIN: { slug: "link", badge: { glyph: "LNK", bg: "#2A5ADA", fg: "#FFFFFF" } },
  LINK: { slug: "link", badge: { glyph: "LNK", bg: "#2A5ADA", fg: "#FFFFFF" } },
  AVA: { slug: "avax", badge: { glyph: "AVX", bg: "#E84142", fg: "#FFFFFF" } },
  AVAX: { slug: "avax", badge: { glyph: "AVX", bg: "#E84142", fg: "#FFFFFF" } },
  ATO: { slug: "atom", badge: { glyph: "ATM", bg: "#2E3148", fg: "#FFFFFF" } },
  ETC: { slug: "etc", badge: { glyph: "ETC", bg: "#328332", fg: "#FFFFFF" } },
  ZEC: { slug: "zec", badge: { glyph: "ZEC", bg: "#ECB244", fg: "#1A1208" } },
  DAS: { slug: "dash", badge: { glyph: "DSH", bg: "#008CE7", fg: "#FFFFFF" } },
  SHIB: { slug: "shib", badge: { glyph: "SHB", bg: "#FFA409", fg: "#1A1208" } },
  MATIC: { slug: "matic", badge: { glyph: "MTC", bg: "#8247E5", fg: "#FFFFFF" } },
  AXS: { slug: "axs", badge: { glyph: "AXS", bg: "#0055D5", fg: "#FFFFFF" } },
  TON: { slug: "ton", badge: { glyph: "TON", bg: "#0098EA", fg: "#FFFFFF" } },
  APT: { slug: "apt", badge: { glyph: "APT", bg: "#1B1B1B", fg: "#FFFFFF" } },
  ARB: { slug: "arb", badge: { glyph: "ARB", bg: "#28A0F0", fg: "#FFFFFF" } },
  BON: { slug: "bonk", badge: { glyph: "BNK", bg: "#F8A11C", fg: "#1A1208" } },
  FLO: { slug: "floki", badge: { glyph: "FLK", bg: "#E5A73A", fg: "#1A1208" } },
  GAL: { slug: "gala", badge: { glyph: "GAL", bg: "#1B1B1B", fg: "#FFFFFF" } },
  HMS: { slug: "hmstr", badge: { glyph: "HMS", bg: "#D98A2B", fg: "#FFFFFF" } },
  MEL: { slug: "melania", badge: { glyph: "MEL", bg: "#B8860B", fg: "#FFFFFF" } },
  TIA: { slug: "tia", badge: { glyph: "TIA", bg: "#7B2BF9", fg: "#FFFFFF" } },
  TRU: { slug: "tru", badge: { glyph: "TRU", bg: "#1A5AFF", fg: "#FFFFFF" } },
  WIF: { slug: "wif", badge: { glyph: "WIF", bg: "#C9A27E", fg: "#1A1208" } },
  TRUMP: { slug: "trump", badge: { glyph: "TRP", bg: "#B22234", fg: "#FFFFFF" } },
}

/** Broker crypto names -> base code (for label-only lookups). */
const CRYPTO_NAMES: Record<string, string> = {
  bitcoin: "BTC", ethereum: "ETH", "binance coin": "BNB", ripple: "XRP", litecoin: "LTC",
  "bitcoin cash": "BCH", cardano: "ADA", dogecoin: "DOGE", polkadot: "DOT", solana: "SOL",
  tron: "TRX", chainlink: "LINK", avalanche: "AVAX", cosmos: "ATO", "ethereum classic": "ETC",
  zcash: "ZEC", dash: "DAS", "shiba inu": "SHIB", polygon: "MATIC", "axie infinity": "AXS",
  toncoin: "TON", aptos: "APT", arbitrum: "ARB", bonk: "BON", floki: "FLO", gala: "GAL",
  "hamster kombat": "HMS", "melania meme": "MEL", celestia: "TIA", truefi: "TRU",
  dogwifhat: "WIF", trump: "TRUMP",
}

/** Index symbol -> country flag. */
const INDEX_FLAG: Record<string, string> = {
  DJIUSD: "us", NDXUSD: "us", SPXUSD: "us", F40EUR: "fr", FTSGBP: "gb", HSIHKD: "hk",
  IBXEUR: "es", JPXJPY: "jp", CHIA50: "cn", STXEUR: "eu", E50EUR: "eu", D30EUR: "de",
  DAXEUR: "de", AUS200: "au", E35EUR: "es",
}

/** Commodity symbol prefix -> badge. */
const COMMODITY: Array<[string, SpecialBadge]> = [
  ["XAU", { glyph: "Au", bg: "#D4A015", fg: "#1A1208" }],
  ["XAG", { glyph: "Ag", bg: "#B7BEC9", fg: "#1A1F2A" }],
  ["XPT", { glyph: "Pt", bg: "#8E9AAF", fg: "#101418" }],
  ["XPD", { glyph: "Pd", bg: "#6E7B8B", fg: "#FFFFFF" }],
  ["XNG", { glyph: "NG", bg: "#1E6FB8", fg: "#FFFFFF" }],
  ["UKBRENT", { glyph: "BR", bg: "#1F3B2A", fg: "#F3F5EF" }],
  ["USCRUDE", { glyph: "WTI", bg: "#2A2F1F", fg: "#F3F5EF" }],
]

/** Stock ticker -> brand-coloured badge; unknown tickers get a neutral one. */
const STOCK_BG: Record<string, string> = {
  AAPL: "#1D1D1F", MSFT: "#0078D4", INTC: "#0071C5", FB: "#1877F2", META: "#0866FF",
  AXP: "#006FCF", BA: "#0033A1", JNJ: "#D51900", MCD: "#DA291C", PFE: "#0093D0",
  TSLA: "#CC0000", AMZN: "#FF9900", NFLX: "#E50914", GOOGL: "#4285F4", NVDA: "#76B900",
  CSCO: "#049FD9", XOM: "#ED1B2D", C: "#003B70", BABA: "#FF6A00", PEP: "#004B93",
  KO: "#F40009", DIS: "#113CCF", V: "#1A1F71", MA: "#EB001B", JPM: "#005EB8",
  GE: "#3B73B9", IBM: "#1F70C1", NKE: "#111111", WMT: "#0071CE", ORCL: "#C74634",
}

type SpecialBadge = {
  /** Display glyph (1-3 chars) shown inside the round badge. */
  glyph: string
  /** Tailwind/inline background colour hex for the badge. */
  bg: string
  /** Foreground / glyph colour. */
  fg: string
}

/**
 * Non-currency markets get a brand-styled glyph badge. We keep the
 * palette monochromatic-friendly with the page's teal theme so the
 * badges read as "asset chips" rather than competing with the chart.
 */
const SPECIAL: Record<string, SpecialBadge> = {
  // Crypto
  Bitcoin: { glyph: "₿", bg: "#F7931A", fg: "#FFFFFF" },
  Ethereum: { glyph: "Ξ", bg: "#627EEA", fg: "#FFFFFF" },
  "Binance Coin": { glyph: "BNB", bg: "#F3BA2F", fg: "#0B0E11" },
  Toncoin: { glyph: "TON", bg: "#0098EA", fg: "#FFFFFF" },
  Trump: { glyph: "TRP", bg: "#B22234", fg: "#FFFFFF" },
  // Commodities
  Gold: { glyph: "Au", bg: "#D4A015", fg: "#1A1208" },
  Silver: { glyph: "Ag", bg: "#B7BEC9", fg: "#1A1F2A" },
  UKBrent: { glyph: "BR", bg: "#1F3B2A", fg: "#F3F5EF" },
  USCrude: { glyph: "WTI", bg: "#2A2F1F", fg: "#F3F5EF" },
  // Stocks
  Intel: { glyph: "INTC", bg: "#0071C5", fg: "#FFFFFF" },
  Microsoft: { glyph: "MS", bg: "#0078D4", fg: "#FFFFFF" },
  "Facebook Inc": { glyph: "FB", bg: "#1877F2", fg: "#FFFFFF" },
  "American Express": { glyph: "AXP", bg: "#006FCF", fg: "#FFFFFF" },
}

export type FlagSpec =
  | { kind: "currencies"; left: CurrencyMeta; right: CurrencyMeta }
  | { kind: "badge"; badge: SpecialBadge }
  | { kind: "image"; url: string; badge: SpecialBadge }
  | { kind: "flag"; cc: string }
  | { kind: "fallback"; glyph: string }

function cryptoSpec(base: string): FlagSpec | null {
  const c = CRYPTO[base]
  if (!c) return null
  return {
    kind: "image",
    url: `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${c.slug}.png`,
    badge: c.badge,
  }
}

/**
 * Quotex market group for a row. Symbol / name checks win so crypto and
 * commodities never land in Currencies even if the backend type is off.
 */
export function marketCategory(
  symbol: string,
  name?: string | null,
  backend?: string | null,
): string {
  const sym = symbol.replace(/_otc$/i, "").toUpperCase()
  const nm = (name ?? "").replace(/\s*\(OTC\)\s*$/i, "").trim().toLowerCase()
  if (
    COMMODITY.some(([p]) => sym.startsWith(p)) ||
    /\b(gold|silver|brent|crude|oil|natural gas|platinum|palladium|copper)\b/.test(nm)
  ) {
    return "commodities"
  }
  if (CRYPTO[sym] || (sym.endsWith("USD") && CRYPTO[sym.slice(0, -3)]) || CRYPTO_NAMES[nm]) {
    return "crypto"
  }
  if (INDEX_FLAG[sym]) return "indices"
  if (parseCurrencyPair(sym)) return "currencies"
  if (backend === "currencies" && /^[A-Z]{6}$/.test(sym)) return "currencies"
  return backend && backend !== "currencies" ? backend : "stocks"
}

/** Resolve a raw broker symbol (``BTCUSD_otc``, ``XAUUSD``, ``DJIUSD``, ``AXP_otc``). */
function symbolSpec(input: string): FlagSpec | null {
  const sym = input.replace(/_otc$/i, "").toUpperCase()
  if (!/^[A-Z0-9]+$/.test(sym)) return null
  const com = COMMODITY.find(([p]) => sym.startsWith(p))
  if (com) return { kind: "badge", badge: com[1] }
  if (INDEX_FLAG[sym]) return { kind: "flag", cc: INDEX_FLAG[sym] }
  const crypto = cryptoSpec(sym) ?? (sym.endsWith("USD") ? cryptoSpec(sym.slice(0, -3)) : null)
  if (crypto) return crypto
  const ticker = STOCK_BG[sym] ? sym : sym.endsWith("USD") && STOCK_BG[sym.slice(0, -3)] ? sym.slice(0, -3) : null
  if (ticker) {
    return { kind: "badge", badge: { glyph: ticker.slice(0, 4), bg: STOCK_BG[ticker], fg: "#FFFFFF" } }
  }
  return null
}

/**
 * Resolve any backend-or-allow-list label into a visual spec. Accepts
 * both raw broker symbols (e.g. ``EURUSD_otc``) and curated labels
 * (e.g. ``"USD/BRL (OTC)"``, ``"Bitcoin (OTC)"``).
 */
export function resolveMarketFlag(input: string | null | undefined): FlagSpec {
  if (!input) return { kind: "fallback", glyph: "?" }

  // Strip the (OTC) suffix and any whitespace; that's purely decorative.
  const cleaned = input.replace(/\s*\(OTC\)\s*$/i, "").trim()

  // 1. Currency-pair shortcut: "USD/BRL", "EUR-USD", "USDBRL", "EURUSD_otc".
  const pair = parseCurrencyPair(cleaned)
  if (pair) return pair

  // 2. Curated allow-list label (e.g. "Bitcoin").
  if (SPECIAL[cleaned]) return { kind: "badge", badge: SPECIAL[cleaned] }

  // 2b. Raw broker symbol: crypto / commodity / index / stock.
  const bySymbol = symbolSpec(cleaned)
  if (bySymbol) return bySymbol

  // 2c. Broker crypto name (e.g. "Cardano").
  const cryptoBase = CRYPTO_NAMES[cleaned.toLowerCase()]
  if (cryptoBase) {
    const spec = cryptoSpec(cryptoBase)
    if (spec) return spec
  }

  // 3. Try resolving the raw input through the allow-list — handles
  //    backend symbols like ``BTCUSD_otc`` that we map to "Bitcoin".
  const entry = matchAllowedMarket(input, input)
  if (entry) {
    const stripped = entry.label.replace(/\s*\(OTC\)\s*$/i, "").trim()
    const p2 = parseCurrencyPair(stripped)
    if (p2) return p2
    if (SPECIAL[stripped]) return { kind: "badge", badge: SPECIAL[stripped] }
  }

  // 4. Last resort: first 1-3 letters of the input.
  return { kind: "fallback", glyph: cleaned.slice(0, 3).toUpperCase() }
}

function parseCurrencyPair(s: string): FlagSpec | null {
  // ``USD/BRL``, ``USD-BRL``, or ``USDBRL`` (6 letters).
  const slash = s.match(/^([A-Z]{3})[\/\-]([A-Z]{3})$/i)
  const flat = s.match(/^([A-Z]{3})([A-Z]{3})(?:_otc)?$/i)
  const m = slash ?? flat
  if (!m) return null
  const a = m[1].toUpperCase()
  const b = m[2].toUpperCase()
  const left = CURRENCY[a]
  const right = CURRENCY[b]
  if (!left || !right) return null
  return { kind: "currencies", left, right }
}

/**
 * Render the resolved flag spec as a compact icon (single round mark
 * for non-currency assets, two stacked rounds for currency pairs).
 *
 * Sizing presets:
 *   - "xs" — selector dropdown rows
 *   - "sm" — selector trigger / inline chips
 *   - "md" — popups / history cards
 */
export function MarketFlag({
  spec,
  size = "sm",
  className,
}: {
  spec: FlagSpec
  size?: "xs" | "sm" | "md"
  className?: string
}) {
  const sz =
    size === "xs"
      ? { single: "size-4", pair: "size-4", overlap: "-ml-1.5", ring: "ring-1" }
      : size === "md"
        ? { single: "size-8", pair: "size-7", overlap: "-ml-2.5", ring: "ring-2" }
        : { single: "size-6", pair: "size-5", overlap: "-ml-2", ring: "ring-2" }

  if (spec.kind === "currencies") {
    return (
      <span className={cn("relative inline-flex shrink-0 items-center", className)}>
        <img
          src={flagUrl(spec.left.cc) || "/placeholder.svg"}
          alt={`${spec.left.code} flag`}
          width={32}
          height={32}
          className={cn(
            sz.pair,
            "rounded-full object-cover shadow-sm ring-[#16181C]",
            sz.ring,
          )}
          loading="lazy"
        />
        <img
          src={flagUrl(spec.right.cc) || "/placeholder.svg"}
          alt={`${spec.right.code} flag`}
          width={32}
          height={32}
          className={cn(
            sz.pair,
            sz.overlap,
            "rounded-full object-cover shadow-sm ring-[#16181C]",
            sz.ring,
          )}
          loading="lazy"
        />
      </span>
    )
  }

  if (spec.kind === "flag") {
    return (
      <img
        src={flagUrl(spec.cc)}
        alt=""
        width={32}
        height={32}
        className={cn(sz.single, "shrink-0 rounded-full object-cover shadow-sm ring-[#16181C]", sz.ring, className)}
        loading="lazy"
      />
    )
  }

  if (spec.kind === "image") {
    return <CoinIcon spec={spec} single={sz.single} ring={sz.ring} className={className} />
  }

  if (spec.kind === "badge") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold tracking-wider shadow-sm ring-[#16181C]",
          sz.single,
          sz.ring,
          size === "md" && "text-[10px]",
          className,
        )}
        style={{ backgroundColor: spec.badge.bg, color: spec.badge.fg }}
        aria-hidden
      >
        {spec.badge.glyph}
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[#3A3E46]/40 font-mono text-[9px] font-bold tracking-wider text-[#E3FF5C] shadow-sm ring-[#16181C]",
        sz.single,
        sz.ring,
        className,
      )}
      aria-hidden
    >
      {spec.glyph}
    </span>
  )
}

/** Coin logo with a glyph-badge fallback when the icon CDN has no image. */
function CoinIcon({
  spec,
  single,
  ring,
  className,
}: {
  spec: Extract<FlagSpec, { kind: "image" }>
  single: string
  ring: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) return <MarketFlag spec={{ kind: "badge", badge: spec.badge }} className={className} />
  return (
    <img
      src={spec.url}
      alt=""
      width={32}
      height={32}
      onError={() => setFailed(true)}
      className={cn(single, "shrink-0 rounded-full bg-[#16181C] object-contain shadow-sm ring-[#16181C]", ring, className)}
      loading="lazy"
    />
  )
}

/**
 * Convenience: resolve + render in one call, given any market string.
 * ``alt`` (e.g. the display label) is tried when ``market`` gives no match.
 */
export function MarketFlagFor({
  market,
  alt,
  size,
  className,
}: {
  market: string | null | undefined
  alt?: string | null
  size?: "xs" | "sm" | "md"
  className?: string
}) {
  let spec = resolveMarketFlag(market)
  if (spec.kind === "fallback" && alt) spec = resolveMarketFlag(alt)
  return <MarketFlag spec={spec} size={size} className={className} />
}
