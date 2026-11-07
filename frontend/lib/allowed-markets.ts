/**
 * Curated 43-market allow-list for the asset selector.
 *
 * The Quotex broker exposes hundreds of pairs, but we intentionally
 * restrict the selector to these 43 markets so users don't get lost in
 * a long list and so the backend doesn't accidentally subscribe to
 * exotic / illiquid pairs whose unofficial pyquotex behaviour is
 * unreliable.
 *
 * Matching strategy
 * -----------------
 * Quotex symbol naming is a moving target across forks (e.g. Trump
 * has shipped under both ``TRUMP_otc`` and ``TRUMPUSD_otc``). To stay
 * resilient we accept ANY of:
 *
 *   1. ``symbols``  — case-insensitive exact match against
 *      ``Asset.symbol`` (the canonical broker code).
 *   2. ``nameMatch`` — a regex run against ``Asset.name``
 *      (the broker's human-readable label, e.g. ``"Binance Coin OTC"``).
 *      This is the fallback that catches broker-side renames.
 *
 * Each entry must specify a primary ``label`` that the selector can
 * fall back to when an asset row is rendered before the broker has
 * delivered its ``name`` (rare but happens during a cold reconnect).
 */

export type AllowedMarket = {
  /** Human-friendly label shown in the dropdown when no broker name is available. */
  label: string
  /** Acceptable broker symbols (case-insensitive). At least one must be present per entry. */
  symbols: string[]
  /** Optional regex fallback against ``Asset.name``. */
  nameMatch?: RegExp
}

export const ALLOWED_MARKETS: AllowedMarket[] = [
  // ----- Major forex pairs (OTC) -----
  { label: "EUR/USD (OTC)", symbols: ["EURUSD_otc"], nameMatch: /eur.*usd/i },
  { label: "GBP/USD (OTC)", symbols: ["GBPUSD_otc"], nameMatch: /gbp.*usd/i },
  { label: "USD/JPY (OTC)", symbols: ["USDJPY_otc"], nameMatch: /usd.*jpy/i },
  { label: "EUR/JPY (OTC)", symbols: ["EURJPY_otc"], nameMatch: /eur.*jpy/i },
  { label: "GBP/JPY (OTC)", symbols: ["GBPJPY_otc"], nameMatch: /gbp.*jpy/i },
  { label: "USD/CHF (OTC)", symbols: ["USDCHF_otc"], nameMatch: /usd.*chf/i },
  { label: "AUD/USD (OTC)", symbols: ["AUDUSD_otc"], nameMatch: /aud.*usd/i },
  { label: "USD/CAD (OTC)", symbols: ["USDCAD_otc"], nameMatch: /usd.*cad/i },
  { label: "NZD/USD (OTC)", symbols: ["NZDUSD_otc"], nameMatch: /nzd.*usd/i },
  { label: "EUR/GBP (OTC)", symbols: ["EURGBP_otc"], nameMatch: /eur.*gbp/i },
  { label: "AUD/JPY (OTC)", symbols: ["AUDJPY_otc"], nameMatch: /aud.*jpy/i },
  { label: "EUR/AUD (OTC)", symbols: ["EURAUD_otc"], nameMatch: /eur.*aud/i },
  { label: "GBP/AUD (OTC)", symbols: ["GBPAUD_otc"], nameMatch: /gbp.*aud/i },
  { label: "CAD/CHF (OTC)", symbols: ["CADCHF_otc"], nameMatch: /cad.*chf/i },
  { label: "NZD/JPY (OTC)", symbols: ["NZDJPY_otc"], nameMatch: /nzd.*jpy/i },
  { label: "EUR/CAD (OTC)", symbols: ["EURCAD_otc"], nameMatch: /eur.*cad/i },
  { label: "GBP/CAD (OTC)", symbols: ["GBPCAD_otc"], nameMatch: /gbp.*cad/i },
  { label: "AUD/CAD (OTC)", symbols: ["AUDCAD_otc"], nameMatch: /aud.*cad/i },
  { label: "CHF/JPY (OTC)", symbols: ["CHFJPY_otc"], nameMatch: /chf.*jpy/i },
  { label: "NZD/CHF (OTC)", symbols: ["NZDCHF_otc"], nameMatch: /nzd.*chf/i },
  { label: "AUD/CHF (OTC)", symbols: ["AUDCHF_otc"], nameMatch: /aud.*chf/i },
  { label: "CAD/JPY (OTC)", symbols: ["CADJPY_otc"], nameMatch: /cad.*jpy/i },
  { label: "EUR/NZD (OTC)", symbols: ["EURNZD_otc"], nameMatch: /eur.*nzd/i },
  { label: "GBP/NZD (OTC)", symbols: ["GBPNZD_otc"], nameMatch: /gbp.*nzd/i },
  { label: "NZD/CAD (OTC)", symbols: ["NZDCAD_otc"], nameMatch: /nzd.*cad/i },

  // ----- Emerging-market currency pairs vs USD (OTC) -----
  { label: "USD/BRL (OTC)", symbols: ["USDBRL_otc"], nameMatch: /usd.*brl/i },
  { label: "USD/MXN (OTC)", symbols: ["USDMXN_otc"], nameMatch: /usd.*mxn/i },
  { label: "USD/ARS (OTC)", symbols: ["USDARS_otc"], nameMatch: /usd.*ars/i },
  { label: "USD/PKR (OTC)", symbols: ["USDPKR_otc"], nameMatch: /usd.*pkr/i },
  { label: "USD/PHP (OTC)", symbols: ["USDPHP_otc"], nameMatch: /usd.*php/i },

  // ----- Crypto (OTC). Multiple plausible symbol forms accepted. -----
  {
    label: "Binance Coin (OTC)",
    symbols: ["BNBUSD_otc", "BNB_otc"],
    nameMatch: /binance.*coin|\bbnb\b/i,
  },
  {
    label: "Bitcoin (OTC)",
    symbols: ["BTCUSD_otc", "BTC_otc"],
    nameMatch: /\bbitcoin\b|\bbtc\b/i,
  },
  {
    label: "Ethereum (OTC)",
    symbols: ["ETHUSD_otc", "ETH_otc"],
    nameMatch: /\bethereum\b|\beth\b/i,
  },
  {
    label: "Trump (OTC)",
    symbols: ["TRUMPUSD_otc", "TRUMP_otc"],
    nameMatch: /\btrump\b/i,
  },
  {
    label: "Toncoin (OTC)",
    symbols: ["TONUSD_otc", "TON_otc", "TONCOIN_otc"],
    nameMatch: /\btoncoin\b|\bton\b/i,
  },

  // ----- Commodities (OTC) -----
  {
    label: "UKBrent (OTC)",
    symbols: ["UKBrent_otc", "BRENT_otc", "UKOIL_otc"],
    nameMatch: /uk.*brent|brent/i,
  },
  {
    label: "Gold (OTC)",
    symbols: ["XAUUSD_otc", "GOLD_otc"],
    nameMatch: /\bgold\b|xauusd/i,
  },
  {
    label: "Silver (OTC)",
    symbols: ["XAGUSD_otc", "SILVER_otc"],
    nameMatch: /\bsilver\b|xagusd/i,
  },
  {
    label: "USCrude (OTC)",
    symbols: ["USCrude_otc", "WTI_otc", "USOIL_otc"],
    nameMatch: /us.*crude|wti|usoil/i,
  },

  // ----- Stocks (OTC) -----
  { label: "Intel (OTC)", symbols: ["INTC_otc"], nameMatch: /\bintel\b|intc/i },
  {
    label: "Microsoft (OTC)",
    symbols: ["MSFT_otc"],
    nameMatch: /microsoft|msft/i,
  },
  {
    label: "Facebook Inc (OTC)",
    symbols: ["FB_otc", "META_otc"],
    nameMatch: /facebook|\bmeta\b|\bfb\b/i,
  },
  {
    label: "American Express (OTC)",
    symbols: ["AXP_otc"],
    nameMatch: /american.*express|amex|axp/i,
  },
]

/**
 * Internal lookup map: ``lowercase symbol -> AllowedMarket entry``.
 * Built once at module load so per-render filtering is O(n) over the
 * incoming asset list (instead of O(n*m) against the allow-list).
 */
const SYMBOL_INDEX: Map<string, AllowedMarket> = (() => {
  const m = new Map<string, AllowedMarket>()
  for (const entry of ALLOWED_MARKETS) {
    for (const s of entry.symbols) {
      m.set(s.toLowerCase(), entry)
    }
  }
  return m
})()

/**
 * Resolve a broker asset (by ``symbol`` and ``name``) to its allow-list
 * entry, or ``null`` if the asset isn't in the allow-list.
 *
 * IMPORTANT: We only allow OTC variants. The broker exposes BOTH a real
 * (live, e.g. ``EURUSD``) and an OTC (synthetic, e.g. ``EURUSD_otc``)
 * version of most pairs. Selecting a non-OTC asset here would trigger
 * real-market subscriptions, which we never want from this selector.
 * So even if the ``nameMatch`` regex matches a brokerage name like
 * ``"EUR/USD"`` (without OTC), we reject it unless the symbol clearly
 * marks it as OTC.
 */
function isOtcSymbol(symbol: string, name?: string | null): boolean {
  const s = symbol.toLowerCase()
  if (s.endsWith("_otc") || s.includes("_otc")) return true
  // Some forks expose the OTC marker only on the human-readable name.
  if (name && /\botc\b/i.test(name)) return true
  return false
}

export function matchAllowedMarket(
  symbol: string,
  name?: string | null,
): AllowedMarket | null {
  if (!isOtcSymbol(symbol, name)) return null
  const direct = SYMBOL_INDEX.get(symbol.toLowerCase())
  if (direct) return direct
  if (!name) return null
  const lname = name
  for (const entry of ALLOWED_MARKETS) {
    if (entry.nameMatch && entry.nameMatch.test(lname)) {
      return entry
    }
  }
  return null
}

/**
 * Stable sort key so the dropdown renders in the EXACT order the
 * product spec listed (forex first, then EM currencies, crypto,
 * commodities, stocks).
 */
const ORDER_INDEX: Map<AllowedMarket, number> = new Map(
  ALLOWED_MARKETS.map((entry, i) => [entry, i] as const),
)

export function allowedMarketOrder(entry: AllowedMarket): number {
  return ORDER_INDEX.get(entry) ?? Number.MAX_SAFE_INTEGER
}
