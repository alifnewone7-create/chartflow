import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Download Source Code — ChartFlow Ai",
  description: "Download the full ChartFlow Ai website source code as a zip file.",
  robots: { index: false, follow: false },
}

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return children
}
