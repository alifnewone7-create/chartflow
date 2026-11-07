import type { Metadata } from "next"

/**
 * Admin portal layout.
 * --------------------
 * Marks every route under /qx-pvt-portal-live as noindex so search
 * engines never list the panel. The actual UI lives in /page.tsx.
 */
export const metadata: Metadata = {
  title: "QX Private Portal",
  description: "Internal admin console.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-[#04090C] text-white">{children}</div>
}
