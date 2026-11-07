import type { Metadata } from "next"

import { ChartToSignalClient } from "@/components/signal/chart-to-signal-client"

/**
 * /chart-to-signal/[code]
 * -----------------------
 * 1-minute next-candle live signal room. The QXL key carried in the URL
 * is validated by `<SignalShell>`, which gates the rest of the page
 * behind a friendly "Verifying / Invalid / Activate" flow.
 *
 * This file only resolves the route param + metadata; the heavy
 * client-side work (chart subscription, signal generation) lives in
 * `<ChartToSignalClient>`.
 */

export const metadata: Metadata = {
  title: "Chart to Signal · ChartFlow Ai",
  description:
    "1-minute next-candle live signal room with multi-strategy confluence.",
  robots: { index: false, follow: false },
}

export default function ChartToSignalPage() {
  return <ChartToSignalClient />
}
