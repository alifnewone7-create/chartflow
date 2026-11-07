import { UpgradePage, type UpgradeTheme } from "@/components/upgrade-page"

export const metadata = {
  title: "Upgrade to Premium — ChartFlow Ai",
  description: "Upgrade your ChartFlow Ai account to the Premium tier with USDT (BEP20).",
}

const theme: UpgradeTheme = {
  heroBg:
    "bg-gradient-to-b from-[#04090C] via-[#0A2C30] to-[#0F4A4D] text-white",
  heroText: "text-white",
  heroTextMuted: "text-[#C8E8E0]/75",
  priceText:
    "bg-gradient-to-br from-[#7CE2C8] via-[#5BC0D8] to-[#1B7892] bg-clip-text text-transparent",
  chip: "border-[#7CE2C8]/40 bg-[#7CE2C8]/10 text-[#A8EDD9]",
  buttonClass:
    "bg-gradient-to-br from-[#7CE2C8] via-[#5BC0D8] to-[#1B7892] text-[#04090C] shadow-[0_8px_24px_-8px_rgba(124,226,200,0.6)] hover:brightness-110 hover:shadow-[0_12px_32px_-8px_rgba(124,226,200,0.8)]",
  cardRing: "ring-1 ring-[#7CE2C8]/10",
  accent: "#7CE2C8",
}

export default function UpgradeToProPage() {
  return (
    <UpgradePage
      tierName="Premium"
      destinationTier="pro"
      price="$75"
      description="Premium-grade access with refined entries, extended market coverage, and a VIP support channel for our most active traders."
      theme={theme}
    />
  )
}
