"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { isFinal4Active } from "./final4-config"

export type { Final4Match, Final4Category, Final4Data } from "./final4-data"
export { fetchFinal4Data } from "./final4-data"

import type { Final4Data } from "./final4-data"

const API_BASE = process.env.NEXT_PUBLIC_MATCH_API_BASE || "https://api.harnosandshf.se"

export function useFinal4Data(initialData?: Final4Data | null) {
  const [data, setData] = useState<Final4Data | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/matcher/final4`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fetch failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialData) fetchData()
    const pollInterval = isFinal4Active() ? 30_000 : 5 * 60_000
    intervalRef.current = setInterval(fetchData, pollInterval)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchData, initialData])

  return { data, loading, error, refetch: fetchData }
}
