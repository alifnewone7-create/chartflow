"use client"

import { useEffect, useState } from "react"
import { limitToLast, onValue, orderByKey, query, ref } from "firebase/database"

import { getDb } from "@/lib/firebase"

type State<T> = { items: T[]; loading: boolean; error: string | null }

/** Live RTDB children of `path` (newest key last in RTDB, returned newest first). */
export function useRtdbList<T>(path: string | null, limit = 50): State<T> {
  const [state, setState] = useState<State<T>>({ items: [], loading: true, error: null })
  useEffect(() => {
    if (!path) {
      setState({ items: [], loading: false, error: null })
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    return onValue(
      query(ref(getDb(), path), orderByKey(), limitToLast(limit)),
      (snap) => {
        const val = (snap.val() ?? {}) as Record<string, T>
        setState({ items: Object.keys(val).sort().reverse().map((k) => val[k]), loading: false, error: null })
      },
      (err) => setState({ items: [], loading: false, error: err.message || "Could not load data" }),
    )
  }, [path, limit])
  return state
}

/** Live RTDB value at `path`. */
export function useRtdbValue<T>(path: string | null): { value: T | null; loading: boolean } {
  const [state, setState] = useState<{ value: T | null; loading: boolean }>({ value: null, loading: true })
  useEffect(() => {
    if (!path) {
      setState({ value: null, loading: false })
      return
    }
    return onValue(
      ref(getDb(), path),
      (snap) => setState({ value: (snap.val() as T) ?? null, loading: false }),
      () => setState({ value: null, loading: false }),
    )
  }, [path])
  return state
}
