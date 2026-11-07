import { cn } from "@/lib/utils"

/** ChartFlow Ai brand mark — lime "C" with a rising candlestick chart inside. */
export function ChartFlowMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/chartflow-mark.png"
      alt=""
      aria-hidden
      draggable={false}
      className={cn("size-9 select-none object-contain drop-shadow-[0_0_10px_rgba(205,255,23,0.28)]", className)}
    />
  )
}

export function ChartFlowLogo({
  className,
  markClassName,
  compact = false,
}: {
  className?: string
  markClassName?: string
  compact?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <ChartFlowMark className={markClassName} />
      {!compact && (
        <span className="cf-display whitespace-nowrap text-[20px] leading-none tracking-[-0.02em] sm:text-[22px]">
          <span className="text-white">ChartFlow</span>
          <span className="ml-[0.28em]" style={{ color: "var(--cf-brand-1, #34D399)" }}>Ai</span>
        </span>
      )}
    </span>
  )
}
