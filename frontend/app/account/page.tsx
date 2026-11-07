import { permanentRedirect } from "next/navigation"

export default function AccountPage() {
  permanentRedirect("/profile")
}
