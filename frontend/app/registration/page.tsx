import { AuthPage } from "@/components/auth/auth-page"

export const metadata = {
  title: "Registration — ChartFlow Ai",
  description: "Create your ChartFlow Ai account.",
}

export default function RegistrationPage() {
  return <AuthPage mode="register" />
}
