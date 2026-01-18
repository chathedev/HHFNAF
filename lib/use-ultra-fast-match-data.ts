/**
 * Real-time Match Data Hook - Ultra-responsive version
 * This version eliminates all potential sources of buffering and delays
 */

"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { normalizeStatusValue } from "./use-match-data"

export type GameClock = {
  minutes: number
  seconds: number
  display: string
  totalSeconds: number
  serverTimestamp: number
  isLive: boolean
  source?: string
}

export type MatchFeedEvent = {
  time: string
  type: string
  team?: string
  player?: string
  playerNumber?: string
  playerId?: number
  description: string
  homeScore?: number
  awayScore?: number
  period?: number
  eventTypeId?: number
  teamId?: number
  isTeamEvent?: boolean
  score?: string
  scoringTeam?: string
  isHomeGoal?: boolean
}

type ApiMatch = {
  id: string
  home: string
  away: string
  date: string
  time?: string
  homeImg?: string | null
  awayImg?: string | null
  result?: string | null
  venue?: string | null
  series?: string | null
  playUrl?: string | null
  infoUrl?: string | null
  matchStatus?: "live" | "finished" | "upcoming" | null
  matchFeed?: MatchFeedEvent[]
  gameClock?: GameClock
  teamType?: string
  opponent?: string
  isHome?: boolean
}

export type NormalizedMatch = {
  id: string
  homeTeam: string
  awayTeam: string
  opponent: string
  isHome?: boolean
  normalizedTeam: string
  date: Date
  displayDate: string
  time?: string
  venue?: string
  series?: string
  result?: string
  playUrl?: string
  infoUrl?: string
  teamType: string
  matchStatus?: "live" | "finished" | "upcoming"
  matchFeed?: MatchFeedEvent[]
  gameClock?: GameClock
}

export type EnhancedMatchData = {
  matches: NormalizedMatch[]
  metadata?: {
    totalMatches: number
    liveMatches: number
    upcomingMatches: number
    finishedMatches: number
    lastUpdated: string
  }
  grouped?: {
    byTeam: Record<string, NormalizedMatch[]>
    byStatus: {
      live: NormalizedMatch[]
      upcoming: NormalizedMatch[]
      finished: NormalizedMatch[]
    }
    bySeries: Record<string, NormalizedMatch[]>
  }
}

const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "")) ||
  "https://api.harnosandshf.se"

type DataType = "liveUpcoming" | "live" | "old"

const getDataEndpoint = () => `${API_BASE_URL}/matcher/data`

const resolveCurrentMatchPayload = (payload: any): ApiMatch[] => {
  if (!payload) {
    return []
  }

  if (Array.isArray(payload.current)) {
    return payload.current
  }
  if (Array.isArray(payload.liveUpcoming)) {
    return payload.liveUpcoming
  }
  if (Array.isArray(payload.matches)) {
    return payload.matches.filter((match) => normalizeStatusValue(match.matchStatus) !== "finished")
  }
  if (Array.isArray(payload)) {
    return payload
  }

  return []
}

const resolveOldMatchPayload = (payload: any): ApiMatch[] => {
  if (!payload) {
    return []
  }

  if (Array.isArray(payload.old)) {
    return payload.old
  }
  if (Array.isArray(payload.matches)) {
    return payload.matches.filter((match) => normalizeStatusValue(match.matchStatus) === "finished")
  }

  return []
}

const filterLiveMatches = (matches: ApiMatch[]) =>
  matches.filter((match) => {
    const status = normalizeStatusValue(match.matchStatus)
    return status === "live" || status === "halftime"
  })

// Fast API fetch with minimal retry and timeout
const fetchFromApiUltraFast = async (dataType: DataType = "liveUpcoming"): Promise<ApiMatch[]> => {
  const endpoint = getDataEndpoint()
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 2000) // Super fast timeout
  
  try {
    const response = await fetch(endpoint, { 
      cache: "no-store",
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const payload = await response.json()
    const currentPayload = resolveCurrentMatchPayload(payload)
    const oldPayload = resolveOldMatchPayload(payload)

    if (dataType === "old") {
      return oldPayload
    }

    if (dataType === "live") {
      return filterLiveMatches(currentPayload)
    }

    return currentPayload
  } finally {
    clearTimeout(timeoutId)
  }
}

// Ultra-fast match data hook with minimal processing
export const useUltraFastMatchData = (options?: { 
  refreshIntervalMs?: number 
  dataType?: DataType 
  enabled?: boolean 
}) => {
  const refreshIntervalMs = options?.refreshIntervalMs ?? 500 // Ultra-fast updates
  const dataType = options?.dataType ?? "liveUpcoming"
  const enabled = options?.enabled ?? true
  
  const [matches, setMatches] = useState<ApiMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const fetchData = useCallback(async () => {
    if (!enabled) return
    
    try {
      const data = await fetchFromApiUltraFast(dataType)
      setMatches(data) // Direct update - no processing delays
      setError(null)
      setLoading(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network error")
      setLoading(false)
    }
  }, [dataType, enabled])
  
  // Start fetching immediately
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // Ultra-fast refresh interval
  useEffect(() => {
    if (!enabled || !refreshIntervalMs || refreshIntervalMs <= 0) {
      return
    }
    
    intervalRef.current = setInterval(fetchData, refreshIntervalMs)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchData, refreshIntervalMs, enabled])
  
  // Immediate refresh on focus/visibility
  useEffect(() => {
    const handleFocus = () => enabled && fetchData()
    const handleVisibility = () => {
      if (enabled && document.visibilityState === "visible") {
        fetchData()
      }
    }
    
    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibility)
    
    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [fetchData, enabled])
  
  return {
    matches,
    loading,
    error,
    refresh: fetchData,
  }
}
