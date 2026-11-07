"use client"

import { useEffect, useMemo, useState } from "react"
import { onValue, ref, update } from "firebase/database"
import { Check, Loader2, Mail, Search, ShieldAlert, UserRound, Users } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TIER_LABEL, TIER_ORDER, type Tier } from "@/lib/admin-types"
import { getDb } from "@/lib/firebase"
import { asTier } from "@/lib/tiers"

type UserRow = { uid: string; name: string; email: string; tier: Tier; createdAt: number | null }

const TIER_COLOR: Record<Tier, string> = {
  free: "#94a3b8",
  basic: "#cbd5e1",
  smart: "#34d399",
  pro: "#7DE3FF",
  dominator: "#fbbf24",
  personal: "#c4b5fd",
}

function useUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(
    () =>
      onValue(
        ref(getDb(), "users"),
        (snap) => {
          const value = (snap.val() ?? {}) as Record<string, Record<string, unknown>>
          const list = Object.entries(value).map(([uid, v]) => ({
            uid,
            name: String(v.name ?? ""),
            email: String(v.email ?? ""),
            tier: asTier(v.tier),
            createdAt: typeof v.createdAt === "number" ? v.createdAt : null,
          }))
          list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
          setUsers(list)
          setLoading(false)
        },
        (err) => {
          console.log("users listener error:", err)
          setError("Could not load users. Check Firebase rules / network.")
          setLoading(false)
        },
      ),
    [],
  )
  return { users, loading, error }
}

export function UsersPanel() {
  const { users, loading, error } = useUsers()
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState<"all" | Tier>("all")

  const counts = useMemo(() => {
    const c = Object.fromEntries(TIER_ORDER.map((t) => [t, 0])) as Record<Tier, number>
    users.forEach((u) => c[u.tier]++)
    return c
  }, [users])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(
      (u) =>
        (tierFilter === "all" || u.tier === tierFilter) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    )
  }, [users, search, tierFilter])

  return (
    <div className="flex flex-col gap-6" data-testid="admin-users-panel">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label="Total" value={users.length} color="#E8F4F7" testId="users-stat-total" />
        {TIER_ORDER.map((t) => (
          <Stat key={t} label={TIER_LABEL[t]} value={counts[t]} color={TIER_COLOR[t]} testId={`users-stat-${t}`} />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="border-white/10 bg-white/[0.03] pl-9 text-white"
            data-testid="users-search-input"
          />
        </div>
        <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as "all" | Tier)}>
          <SelectTrigger className="w-full border-white/10 bg-white/[0.03] text-white sm:w-48" data-testid="users-tier-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            {TIER_ORDER.map((t) => (
              <SelectItem key={t} value={t}>{TIER_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200" data-testid="users-error">
          <ShieldAlert className="size-4" aria-hidden /> {error}
        </p>
      ) : loading ? (
        <p className="flex items-center gap-2 text-sm text-white/60"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading users…</p>
      ) : filtered.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-white/10 p-6 text-sm text-white/55" data-testid="users-empty">
          <Users className="size-4" aria-hidden /> No users found.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="users-list">
          {filtered.map((u) => <UserItem key={u.uid} user={u} />)}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value, color, testId }: { label: string; value: number; color: string; testId: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={testId}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color }}>{value}</p>
    </div>
  )
}

function UserItem({ user }: { user: UserRow }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function changeTier(tier: Tier) {
    if (tier === user.tier) return
    setSaving(true)
    try {
      await update(ref(getDb(), `users/${user.uid}`), { tier, updatedAt: Date.now() })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      console.log("tier update failed:", err)
      window.alert("Could not change the tier. Please try again.")
    }
    setSaving(false)
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center" data-testid={`user-row-${user.uid}`}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate font-medium text-white" data-testid="user-row-name">
          <UserRound className="size-4 shrink-0 text-[#5BC0D8]" aria-hidden /> {user.name || "—"}
        </p>
        <p className="mt-1 flex items-center gap-2 truncate text-sm text-white/60" data-testid="user-row-email">
          <Mail className="size-3.5 shrink-0" aria-hidden /> {user.email || "—"}
        </p>
        {user.createdAt && (
          <p className="mt-1 text-[11px] text-white/35">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {saving && <Loader2 className="size-4 animate-spin text-white/60" aria-hidden />}
        {saved && <Check className="size-4 text-emerald-400" aria-label="Saved" data-testid="user-row-saved" />}
        <Select value={user.tier} onValueChange={(v) => changeTier(v as Tier)} disabled={saving}>
          <SelectTrigger className="w-40 border-white/10 bg-white/[0.03] font-semibold" style={{ color: TIER_COLOR[user.tier] }} data-testid="user-row-tier-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIER_ORDER.map((t) => (
              <SelectItem key={t} value={t} data-testid={`user-tier-option-${t}`}>{TIER_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </li>
  )
}
