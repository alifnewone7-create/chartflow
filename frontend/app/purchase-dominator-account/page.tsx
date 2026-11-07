import { PurchasePage, type Theme } from "@/components/purchase-page"

export const metadata = {
  title: "Purchase Extreme Account — ChartFlow Ai",
  description: "Activate the Extreme tier on ChartFlow Ai with USDT (BEP20).",
}

const theme: Theme = {
  // Champagne-on-onyx hero — top tier blends teal base with luxe gold accent
  heroBg:
    "bg-gradient-to-b from-[#04090C] via-[#0E1F26] to-[#1A2820] text-white",
  heroText: "text-white",
  heroTextMuted: "text-[#E8DCBC]/75",
  priceText:
    "bg-gradient-to-br from-[#F5D77A] via-[#FCE8B0] to-[#D4AF37] bg-clip-text text-transparent",
  chip: "border-[#F5D77A]/40 bg-[#F5D77A]/10 text-[#F5E4A8]",
  buttonClass:
    "bg-gradient-to-br from-[#F5D77A] via-[#E5BE5A] to-[#B8862E] text-[#04090C] shadow-[0_8px_24px_-8px_rgba(245,215,122,0.6)] hover:brightness-110 hover:shadow-[0_12px_32px_-8px_rgba(245,215,122,0.8)]",
  cardRing: "ring-1 ring-[#F5D77A]/10",
  accent: "#F5D77A",
}

export default function PurchaseDominatorAccountPage() {
  return (
    <PurchasePage
      tierName="Extreme"
      price="$149"
      description="Top-tier package — maximum edge, highest signal priority, lifetime live chart access, and a 1-on-1 strategy review with our admin."
      theme={theme}
      features={[
        "Everything in Premium, plus the Extreme edge",
        "Highest priority signal feed",
        "1-on-1 strategy review with admin",
        "Direct VIP line for instant support",
        "Lifetime access — never expires",
      ]}
    />
  )
}
