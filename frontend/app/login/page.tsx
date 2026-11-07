import { AuthPage } from "@/components/auth/auth-page"

export const metadata = {
  title: "Login — ChartFlow Ai",
  description: "Log in to your ChartFlow Ai account.",
}

export default function LoginPage() {
  return <AuthPage mode="login" />
}
