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
  venue: string | null
  series: string | null
  detailUrl: string | null
  playUrl: string | null
  infoUrl: string | null
}

export interface Final4Data {
  matches: Final4Match[]
  tournament: {
    name: string
    startDate: string
    endDate: string
  }
  lastUpdated: string
}

export function useFinal4Data() {
  const [data, setData] = useState<Final4Data | null>(null)
  const [loading, setLoading] = useState(true)
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
    fetchData()
    const pollInterval = isFinal4Active() ? 30_000 : 5 * 60_000
    intervalRef.current = setInterval(fetchData, pollInterval)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
