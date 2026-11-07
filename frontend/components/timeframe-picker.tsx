"use client"

import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"

export const TIMEFRAMES: { label: string; seconds: number }[] = [
  { label: "5s", seconds: 5 },
  { label: "15s", seconds: 15 },
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "15m", seconds: 900 },
  { label: "1h", seconds: 3600 },
]

type Props = {
  value: number
  onChange: (seconds: number) => void
}

export function TimeframePicker({ value, onChange }: Props) {
  return (
    <ButtonGroup aria-label="Select timeframe">
      {TIMEFRAMES.map((tf) => {
        const active = tf.seconds === value
        return (
          <Button
            key={tf.seconds}
            variant={active ? "default" : "outline"}
            size="sm"
            className="font-mono"
            onClick={() => onChange(tf.seconds)}
            aria-pressed={active}
          >
            {tf.label}
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
