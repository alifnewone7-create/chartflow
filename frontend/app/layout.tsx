import type { Metadata, Viewport } from "next"
import {
  Cormorant_Garamond,
  Geist,
  Geist_Mono,
  IM_Fell_Double_Pica_SC,
  Space_Grotesk,
  JetBrains_Mono,
  Manrope,
  Noto_Sans_Bengali,
  New_Rocker,
  Oswald,
  Quintessential,
  Roboto,
} from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { LanguageProvider } from "@/components/language-provider"
import { PurchaseNotice } from "@/components/purchase-notice"
import { UpgradeNotice } from "@/components/upgrade-notice"
import { ConsoleSilencer } from "@/components/console-silencer"
import { Toaster } from "sonner"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

/**
 * Luxury body font — scoped to the Activate Account flow only.
 * IM Fell Double Pica SC is a refined, antique small-caps serif drawn from
 * John Fell's 17th-century type — gives the activation page a "membership
 * certificate" feel that pairs naturally with the gem / unlock motifs.
 * Only weight 400 + normal style are published on Google Fonts.
 */
const imFellPicaSc = IM_Fell_Double_Pica_SC({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-im-fell",
  display: "swap",
})

const quintessential = Quintessential({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-quintessential",
  display: "swap",
})
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
})

/**
 * Google Roboto — used as the primary typeface on the Profile page.
 * Loads both upright and italic so `italic` utility classes pick up
 * the correct Roboto Italic cut rather than a synthesized slant.
 */
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-roboto",
  display: "swap",
})

/**
 * Google New Rocker — decorative blackletter-style display font.
 * Used selectively on the Profile page for headline accents, tier
 * labels, and large stat numerals to give the page a luxe, crested
 * "membership card" feel while body copy stays in clean sans.
 */
const newRocker = New_Rocker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-new-rocker",
  display: "swap",
})

/**
 * Google Oswald — primary typeface on the Profile page.
 * Loaded across all weights so utility classes and inline styles
 * pick up the right cut. Numerals stay on New Rocker for accent.
 */
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
})

/**
 * ChartFlow Ai home-page typography (Black + Emerald luxury theme).
 * Sora (bold fintech) for headlines, Inter for UI copy, JetBrains
 * Mono for figures, and Noto Sans Bengali so Bangla text stays crisp.
 */
const cfDisplay = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cf-display",
  display: "swap",
})
const cfSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cf-sans",
  display: "swap",
})
const cfMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cf-mono",
  display: "swap",
})
const cfBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cf-bengali",
  display: "swap",
})

export const metadata: Metadata = {
  title: "ChartFlow Ai — Premium Signals & Live Charts",
  description:
    "Premium signals from Quotex OTC market live and live charts.",
  // Branded share image used by social platforms (OpenGraph) and Twitter
  // when a ChartFlow Ai link is unfurled. The asset is the official logo
  // (white "Quotex / LIVE" wordmark + candlestick emblem on black) saved
  // at /public/og-image.png so it ships with the static build.
  openGraph: {
    title: "ChartFlow Ai — Premium Signals & Live Charts",
    description:
      "Premium signals from Quotex OTC market live and live charts.",
    images: [
      {
        url: "/og-image.png",
        alt: "ChartFlow Ai",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChartFlow Ai — Premium Signals & Live Charts",
    description:
      "Premium signals from Quotex OTC market live and live charts.",
    images: ["/og-image.png"],
  },
}

export const viewport: Viewport = {
  themeColor: "#141517",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${imFellPicaSc.variable} ${quintessential.variable} ${cormorant.variable} ${roboto.variable} ${newRocker.variable} ${oswald.variable} ${cfDisplay.variable} ${cfSans.variable} ${cfMono.variable} ${cfBengali.variable} bg-background`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=location.pathname;if(p.indexOf("//")>-1){location.replace(p.replace(/\\/{2,}/g,"/")+location.search+location.hash);return}try{var sb=localStorage.getItem("cf_sidebar");document.documentElement.dataset.sidebar=sb==="collapsed"?"collapsed":"expanded"}catch(e){}try{var s=sessionStorage.getItem("cf_landing");window.__cfHadPrev=!!s&&s!==location.href;sessionStorage.setItem("cf_landing",location.href)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <ConsoleSilencer />
        <LanguageProvider>
          {children}
          <PurchaseNotice />
          <UpgradeNotice />
        </LanguageProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  )
}
