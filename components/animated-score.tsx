"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Score display that pulses green when the value changes, so live
 * WebSocket updates are visible the moment they land.
 */
export function AnimatedScore({ value, className }: { value: string; className?: string }) {
  const prevValueRef = useRef<string | null>(null)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const previous = prevValueRef.current
    prevValueRef.current = value
    if (previous !== null && previous !== value) {
      setAnimating(true)
      const timer = setTimeout(() => setAnimating(false), 700)
      return () => clearTimeout(timer)
    }
  }, [value])

  return (
    <span className={`${className ?? ""} ${animating ? "score-updated" : ""}`.trim()} data-score-value="true">
      {value}
    </span>
  )
}
