import type { Metadata } from "next"

import { AutoSessionPageClient } from "@/components/engine/auto-session"

export const metadata: Metadata = {
  title: "Automatic Signal Session · ChartFlow Ai",
  robots: { index: false, follow: false },
}

export default function AutoSessionPage() {
  return <AutoSessionPageClient />
}
