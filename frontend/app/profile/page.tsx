import { ProfileClient } from "@/components/signal/profile-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Profile · ChartFlow Ai",
  description: "View your account, plan, and live signal usage.",
  robots: { index: false, follow: false },
}

export default function ProfilePage() {
  return <ProfileClient />
}
