"use client"

import { startTransition, useState, useEffect, useCallback, useRef } from "react"
import { isFinal4Active } from "./final4-config"

export type { Final4Match, Final4Category, Final4Data } from "./final4-data"
export { fetchFinal4Data } from "./final4-data"

import type { Final4Data } from "./final4-data"

const API_BASE = process.env.NEXT_PUBLIC_MATCH_API_BASE || "https://api.harnosandshf.se"
const FINAL4_ACTIVE_POLL_INTERVAL_MS = 5_000
const FINAL4_IDLE_POLL_INTERVAL_MS = 5 * 60_000
const final4RefreshListeners = new Set<() => Promise<void> | void>()

const hasFinal4PayloadChanged = (previous: Final4Data | null, next: Final4Data) => {
  if (!previous) return true
  if (previous.matches.length !== next.matches.length) return true
  if (previous.categories.length !== next.categories.length) return true

  for (let index = 0; index < previous.categories.length; index += 1) {
    const prev = previous.categories[index]
    const curr = next.categories[index]
    if (!prev || !curr) return true
    if (prev.id !== curr.id || prev.label !== curr.label || prev.shortLabel !== curr.shortLabel || prev.matchCount !== curr.matchCount) {
      return true
    }
  }

  for (let index = 0; index < previous.matches.length; index += 1) {
    const prev = previous.matches[index]
    const curr = next.matches[index]
    if (!prev || !curr) return true
    if (
      prev.matchId !== curr.matchId ||
      prev.date !== curr.date ||
      prev.time !== curr.time ||
      prev.homeName !== curr.homeName ||
      prev.awayName !== curr.awayName ||
      prev.homeScore !== curr.homeScore ||
      prev.awayScore !== curr.awayScore ||
      prev.matchStatus !== curr.matchStatus ||
      prev.result !== curr.result ||
      prev.round !== curr.round ||
      prev.category !== curr.category ||
      prev.categoryLabel !== curr.categoryLabel ||
      prev.venue !== curr.venue ||
      prev.series !== curr.series ||
      prev.detailUrl !== curr.detailUrl ||
      prev.playUrl !== curr.playUrl ||
      prev.infoUrl !== curr.infoUrl
    ) {
      return true
    }
  }

  return false
}

export const forceFinal4Poll = async () => {
  await Promise.all([...final4RefreshListeners].map((listener) => Promise.resolve(listener())))
}

export function useFinal4Data(initialData?: Final4Data | null) {
  const [data, setData] = useState<Final4Data | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchInFlightRef = useRef<Promise<void> | null>(null)

  const fetchData = useCallback(async () => {
    if (fetchInFlightRef.current) {
      return fetchInFlightRef.current
    }

    const request = (async () => {
    try {
      const res = await fetch(`${API_BASE}/matcher/final4`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as Final4Data
      startTransition(() => {
        setData((previous) => (hasFinal4PayloadChanged(previous, json) ? json : previous ?? json))
        setError(null)
        setLoading(false)
      })
    } catch (err: unknown) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : "Fetch failed")
        setLoading(false)
      })
    }
    })()

    fetchInFlightRef.current = request
    try {
      await request
    } finally {
      if (fetchInFlightRef.current === request) {
        fetchInFlightRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!initialData) fetchData()
    const pollInterval = isFinal4Active() ? FINAL4_ACTIVE_POLL_INTERVAL_MS : FINAL4_IDLE_POLL_INTERVAL_MS
    intervalRef.current = setInterval(fetchData, pollInterval)

    const handleVisibilityRefresh = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return
      fetchData().catch(() => undefined)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleVisibilityRefresh)
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityRefresh)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityRefresh)
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityRefresh)
      }
    }
  }, [fetchData, initialData])

  useEffect(() => {
    const listener = () => fetchData()
    final4RefreshListeners.add(listener)
    return () => {
      final4RefreshListeners.delete(listener)
    }
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
