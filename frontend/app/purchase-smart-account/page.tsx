import { PurchasePage, type Theme } from "@/components/purchase-page"

export const metadata = {
  title: "Purchase Standard Account — ChartFlow Ai",
  description: "Activate the Standard tier on ChartFlow Ai with USDT (BEP20).",
}

const theme: Theme = {
  // Cyan-tinted onyx hero
  heroBg:
    "bg-gradient-to-b from-[#04090C] via-[#072028] to-[#0A3340] text-white",
  heroText: "text-white",
  heroTextMuted: "text-[#B6E2EC]/70",
  priceText:
    "bg-gradient-to-br from-[#5BC0D8] via-[#7DD3E8] to-[#5BC0D8] bg-clip-text text-transparent",
  chip: "border-[#5BC0D8]/40 bg-[#5BC0D8]/10 text-[#9DDCE8]",
  buttonClass:
    "bg-gradient-to-br from-[#5BC0D8] to-[#1B7892] text-[#04090C] shadow-[0_8px_24px_-8px_rgba(91,192,216,0.6)] hover:brightness-110 hover:shadow-[0_12px_32px_-8px_rgba(91,192,216,0.8)]",
  cardRing: "ring-1 ring-[#5BC0D8]/10",
  accent: "#5BC0D8",
}

export default function PurchaseSmartAccountPage() {
  return (
    <PurchasePage
      tierName="Standard"
      price="$50"
      description="Step-up plan for serious traders ready to scale signal accuracy with priority admin support and the 2-candles-ahead view."
      theme={theme}
      features={[
        "Live OTC chart — 2 candles ahead of Quotex",
        "Priority signal feed with verified entries",
        "Admin support over Telegram",
        "Lifetime activation, one-time payment",
      ]}
    />
  )
}
