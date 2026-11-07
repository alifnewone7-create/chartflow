import type { Metadata } from "next"

import { AutomaticSignalClient } from "@/components/engine/automatic-signal-client"

export const metadata: Metadata = {
  title: "Automatic Signal · ChartFlow Ai",
  robots: { index: false, follow: false },
}

export default function AutomaticSignalPage() {
  return <AutomaticSignalClient />
}
