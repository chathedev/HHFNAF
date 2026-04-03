"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { isFinal4Active } from "./final4-config"

const API_BASE = process.env.NEXT_PUBLIC_MATCH_API_BASE || "https://api.harnosandshf.se"

export interface Final4Match {
  matchId: number
  date: string
  time: string
  homeName: string
  awayName: string
  homeScore: number | null
  awayScore: number | null
  matchStatus: "live" | "upcoming" | "finished"
  result: string | null
  round: string
  category: string
  categoryLabel: string
  venue: string | null
  series: string | null
  detailUrl: string | null
  playUrl: string | null
  infoUrl: string | null
}

export interface Final4Category {
  id: string
  label: string
  shortLabel: string
  matchCount: number
}

export interface Final4Data {
  matches: Final4Match[]
  categories: Final4Category[]
  tournament: {
    name: string
    leagueId: string
    startDate: string
    endDate: string
    venue: string
    profixioUrl: string
  }
  lastUpdated: string
}

/** Server-side fetch for SSR initial data */
export async function fetchFinal4Data(): Promise<Final4Data | null> {
  try {
    const res = await fetch(`${API_BASE}/matcher/final4`, { cache: "no-store" })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

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
