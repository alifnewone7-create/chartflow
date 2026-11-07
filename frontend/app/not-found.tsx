"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Home } from "lucide-react"
import { ChartFlowMark } from "@/components/brand/chartflow-logo"

export default function NotFound() {
  const router = useRouter()
  const goBack = () => {
    const ref = document.referrer.replace(/^(https?:\/\/[^/]+)\/{2,}/, "$1/").replace(/([^:]\/)\/+/g, "$1")
    const sameOriginRef = ref.startsWith(window.location.origin) && ref !== window.location.href
    const cameInApp = sessionStorage.getItem("cf_landing") !== window.location.href
    const hadPrev = (window as unknown as { __cfHadPrev?: boolean }).__cfHadPrev
    if (sameOriginRef || cameInApp || hadPrev) router.back()
    else router.push("/")
  }

  return (
    <div className="cf-home cf-grain relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 text-center antialiased" data-testid="not-found-page">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="cf-haze absolute inset-0" />
        <div className="cf-grid absolute inset-0" />
        <div className="absolute left-1/2 top-[-20%] h-[640px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(205,255,23,0.12),transparent_62%)] blur-3xl" />
      </div>

      <ChartFlowMark className="cf-rise size-14" />
      <span className="cf-mono cf-rise cf-d1 mt-8 inline-flex items-center gap-1.5 rounded-lg border border-[#CDFF17]/35 bg-[#CDFF17]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#CDFF17]">
        <span className="cf-pulse size-1.5 rounded-full bg-[#CDFF17] shadow-[0_0_8px_#CDFF17]" />
        Error 404
      </span>
      <h1 data-testid="not-found-code" className="cf-display cf-rise cf-d2 mt-5 text-[96px] font-bold leading-none tracking-[-0.04em] text-[#CDFF17] [text-shadow:0_0_40px_rgba(205,255,23,0.45)] sm:text-[140px]">
        404
      </h1>
      <p data-testid="not-found-title" className="cf-display cf-rise cf-d2 mt-4 text-2xl font-bold text-white sm:text-3xl">Page not found</p>
      <p className="cf-rise cf-d3 mt-3 max-w-md text-sm text-white/60 sm:text-base">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="cf-rise cf-d3 mt-10 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={goBack}
          data-testid="not-found-back-button"
          className="cf-btn-volt group inline-flex h-14 items-center justify-center gap-2.5 rounded-xl px-7 text-[15px] font-bold"
        >
          <ArrowLeft className="size-[18px] transition-transform duration-300 group-hover:-translate-x-1" />
          Go Back
        </button>
        <Link
          href="/"
          data-testid="not-found-home-link"
          className="inline-flex h-14 items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-7 text-[15px] font-semibold text-white transition-colors hover:bg-white/[0.08]"
        >
          <Home className="size-[18px]" />
          Home
        </Link>
      </div>
    </div>
  )
}
