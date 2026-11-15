"use client"

import { useSyncExternalStore } from "react"

// "om 12 min", "om 2 h 14 min", "i morgon", "om 3 dagar": time until a kickoff, by Stockholm
// calendar days (tomorrow at 20:00 is "i morgon" even 37 hours ahead). Null once it has started.
export function formatCountdown(startMs: number, nowMs: number): string | null {
  if (!Number.isFinite(startMs)) return null
  const minutes = Math.round((startMs - nowMs) / 60_000)
  if (minutes <= 0) return null
  if (minutes < 60) return `om ${minutes} min`
  const day = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" })
  const days = Math.round((Date.parse(day(startMs)) - Date.parse(day(nowMs))) / 86_400_000)
  if (days <= 0) return `om ${Math.floor(minutes / 60)} h ${minutes % 60} min`
  return days === 1 ? "i morgon" : `om ${days} dagar`
}

// One shared 30-second clock for every countdown on the page (one timer, not one per row).
let now = Date.now()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null
function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    now = Date.now()
    timer = setInterval(() => {
      now = Date.now()
      listeners.forEach((l) => l())
    }, 30_000)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

export function useNow() {
  return useSyncExternalStore(subscribe, () => now, () => now)
}
