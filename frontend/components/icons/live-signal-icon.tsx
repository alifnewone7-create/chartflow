export function LiveSignalIcon({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M6 3v3M6 15v3" />
      <rect x="4" y="6" width="4" height="9" rx="1" fill="currentColor" fillOpacity="0.25" />
      <path d="M13 8v2M13 17v3" />
      <rect x="11" y="10" width="4" height="7" rx="1" />
      <path d="M18.5 5.5a4 4 0 0 1 0 5.6M20.6 3.4a7 7 0 0 1 0 9.8" />
      <circle cx="18" cy="8.3" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}
