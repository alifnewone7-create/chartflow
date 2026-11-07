import type { Metadata } from "next"

import { FutureSignalsClient } from "@/components/engine/future-signals-client"

export const metadata: Metadata = {
  title: "Future Signals · ChartFlow Ai",
  robots: { index: false, follow: false },
}

export default function FutureSignalsPage() {
  return <FutureSignalsClient />
}
