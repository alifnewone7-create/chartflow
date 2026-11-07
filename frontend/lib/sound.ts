"use client"

/** Short synthesized "signal ready" chime — no audio asset needed. */
export function playSignalChime() {
  if (typeof window === "undefined") return
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return
  try {
    const ctx = new Ctx()
    const master = ctx.createGain()
    master.gain.value = 0.0001
    master.connect(ctx.destination)
    const t0 = ctx.currentTime
    master.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02)
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1)

    const notes: Array<[number, number]> = [
      [784, 0],
      [1046.5, 0.12],
      [1568, 0.24],
    ]
    for (const [freq, at] of notes) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      g.gain.setValueAtTime(0.0001, t0 + at)
      g.gain.exponentialRampToValueAtTime(0.9, t0 + at + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.7)
      osc.connect(g)
      g.connect(master)
      osc.start(t0 + at)
      osc.stop(t0 + at + 0.75)
    }
    window.setTimeout(() => void ctx.close().catch(() => {}), 1500)
  } catch {
    /* audio blocked — silent fallback */
  }
}
