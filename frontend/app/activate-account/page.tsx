import { permanentRedirect } from "next/navigation"

export default function ActivateAccountPage() {
  permanentRedirect("/login")
}
