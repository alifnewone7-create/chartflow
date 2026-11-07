import type { Metadata } from "next"

import { FutureBatchPageClient } from "@/components/engine/future-batch"

export const metadata: Metadata = {
  title: "Future Signal Batch · ChartFlow Ai",
  robots: { index: false, follow: false },
}

export default function FutureBatchPage() {
  return <FutureBatchPageClient />
}
