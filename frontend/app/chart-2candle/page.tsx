import type { Metadata } from "next"

import { Chart2CandleClient } from "@/components/signal/chart-2candle-client"

export const metadata: Metadata = {
  title: "See 2 Candle Ahead View · ChartFlow Ai",
  description: "Two-candle look-ahead view with multi-strategy confluence.",
  robots: { index: false, follow: false },
}

export default function Chart2CandlePage() {
  return <Chart2CandleClient />
}
