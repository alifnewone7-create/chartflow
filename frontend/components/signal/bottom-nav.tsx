"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { NAV, useActiveKey } from "@/components/signal/signal-navigation"
import { cn } from "@/lib/utils"

// Height of any browser toolbar overlapping the bottom of the page (iOS Safari, in-app browsers).
function useBrowserBarOffset() {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      if (vv.scale > 1.01) return
      const gap = Math.round(window.innerHeight - vv.height - vv.offsetTop)
      setOffset(gap > 0 && gap < 150 ? gap : 0)
    }
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    window.addEventListener("orientationchange", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
      window.removeEventListener("orientationchange", update)
    }
  }, [])
  useEffect(() => {
    document.documentElement.style.setProperty("--cf-browser-bar", `${offset}px`)
  }, [offset])
  return offset
}

/** Mobile-only floating "liquid glass" tab bar for the signed-in pages. */
export function BottomNav() {
  const active = useActiveKey()
  const barOffset = useBrowserBarOffset()
  return (
    <nav
      aria-label="Primary"
      data-testid="mobile-bottom-nav"
      style={{ bottom: barOffset }}
      className="fixed inset-x-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),8px)] transition-[bottom] duration-200 md:hidden"
    >
      <div className="cf-liquid-glass relative mx-auto flex max-w-md items-center justify-between gap-1 rounded-full p-1">
        {NAV.map((item) => {
          const on = item.key === active
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={item.buildHref("")}
              aria-label={item.label}
              aria-current={on ? "page" : undefined}
              data-testid={`bottom-nav-${item.key}`}
              className={cn(
                "relative flex h-10 flex-1 items-center justify-center rounded-full transition-[background-color,color,transform] duration-300 active:scale-95",
                on ? "cf-liquid-pill text-[#CDFF17]" : "text-white/75 hover:text-white",
              )}
            >
              <Icon className="size-5" strokeWidth={on ? 2.4 : 2} aria-hidden />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
