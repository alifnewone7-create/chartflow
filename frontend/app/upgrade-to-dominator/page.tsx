import { UpgradePage, type UpgradeTheme } from "@/components/upgrade-page"

export const metadata = {
  title: "Upgrade to Extreme — ChartFlow Ai",
  description: "Upgrade your ChartFlow Ai account to the Extreme tier with USDT (BEP20).",
}

const theme: UpgradeTheme = {
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

export default function UpgradeToDominatorPage() {
  return (
    <UpgradePage
      tierName="Extreme"
      destinationTier="dominator"
      price="$149"
      description="Top-tier package — maximum edge, highest signal priority, lifetime live chart access, and a 1-on-1 strategy review with our admin."
      theme={theme}
    />
  )
}
