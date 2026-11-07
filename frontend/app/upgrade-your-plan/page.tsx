import type { Metadata } from "next"

import { UpgradeYourPlanClient } from "@/components/upgrade-your-plan-client"

export const metadata: Metadata = {
  title: "Upgrade Your Plan · ChartFlow Ai",
  description:
    "Move up a tier on ChartFlow Ai — automatic account swap once admin approves your upgrade.",
  robots: { index: false, follow: false },
}

export default function UpgradeYourPlanPage() {
  return <UpgradeYourPlanClient />
}
