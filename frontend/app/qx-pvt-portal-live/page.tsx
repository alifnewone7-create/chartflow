import { AdminPortal } from "@/components/admin/admin-portal"

/**
 * Hidden admin portal — gated by a password and only reachable
 * if you know this slug. The actual login + dashboard logic lives
 * in `<AdminPortal />` so we can keep this entry slim.
 */
export default function QxPrivatePortalPage() {
  return <AdminPortal />
}
