"use client"

import { useEffect } from "react"

/**
 * Suppresses browser console output in production so casual visitors
 * opening DevTools don't see app logs, warnings, or errors. Dev mode
 * is left untouched so we can still debug locally.
 */
export function ConsoleSilencer() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof window === "undefined") return

    const noop = () => {}
    try {
      const methods: (keyof Console)[] = [
        "log",
        "debug",
        "info",
        "warn",
        "error",
        "trace",
        "table",
        "dir",
        "group",
        "groupCollapsed",
        "groupEnd",
        "time",
        "timeEnd",
        "count",
        "assert",
      ]
      for (const m of methods) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(console as any)[m] = noop
      }
    } catch {
      /* ignore */
    }
  }, [])

  return null
}
