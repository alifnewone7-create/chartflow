import { Suspense } from "react"

import { AuthPage } from "@/components/auth/auth-page"
import { NewPasswordCard } from "@/components/auth/new-password-card"

export const metadata = {
  title: "Reset Password — ChartFlow Ai",
  description: "Set a new password for your ChartFlow Ai account.",
}

export default function AuthActionPage() {
  return (
    <AuthPage mode="reset">
      <Suspense>
        <NewPasswordCard />
      </Suspense>
    </AuthPage>
  )
}
