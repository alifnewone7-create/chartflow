"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"

import { getFirebaseAuth } from "@/lib/firebase"

/** Current Firebase user; `undefined` while the session is still loading. */
export function useFirebaseUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => onAuthStateChanged(getFirebaseAuth(), (u) => setUser(u && !u.isAnonymous && u.email ? u : null)), [])
  return user
}
