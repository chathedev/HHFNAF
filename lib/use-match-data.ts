"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { matchStateManager } from "./match-state-manager"

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
  date: string // ISO string
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
  opponent: string // "Opponent (hemma)" or "Opponent (borta)"
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

type DataType = "current" | "old" | "both" | "enhanced"

const getDataEndpoint = (type: DataType) => {
  switch (type) {
    case "current":
      return `${API_BASE_URL}/matcher/data/current`
    case "old":
      return `${API_BASE_URL}/matcher/data/old`
    case "enhanced":
      return `${API_BASE_URL}/matcher/data/enhanced`
    case "both":
    default:
      return `${API_BASE_URL}/matcher/data`
  }
}

const createNormalizedTeamKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")

const formatDisplayDate = (date: Date) =>
  new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(date)
const normalizeStatusValue = (
  value?: string | null,
): NormalizedMatch["matchStatus"] | undefined => {
  if (!value) {
    return undefined
  }

  const normalized = value.toString().trim().toLowerCase()

  if (["live", "finished", "upcoming"].includes(normalized)) {
    return normalized as NormalizedMatch["matchStatus"]
  }

  if (["playing", "inprogress", "in-progress", "ongoing", "started"].includes(normalized)) {
    return "live"
  }

  if (["complete", "completed", "done", "slut", "final", "closed"].includes(normalized)) {
    return "finished"
  }

  if (["scheduled", "notstarted", "not-started", "pending", "future", "upcoming"].includes(normalized)) {
    return "upcoming"
  }

  return undefined
}

const toDate = (dateString?: string | null, timeString?: string | null) => {
  if (!dateString) {
    return null
  }
  const timePart = timeString && timeString.trim().length > 0 ? timeString.trim() : "00:00"
  const parsed = new Date(`${dateString}T${timePart}`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

const normalizeMatch = (match: ApiMatch): NormalizedMatch | null => {
  const teamType = match.teamType?.trim()
  const opponent = match.opponent?.trim()
  const parsedDate = toDate(match.date, match.time)

  if (!teamType || !opponent || !parsedDate) {
    return null
  }

  const normalizedTeam = createNormalizedTeamKey(teamType)
  const id = [normalizedTeam, match.date, match.time ?? "", opponent, match.series ?? ""].join("|")

  let derivedIsHome = typeof match.isHome === "boolean" ? match.isHome : undefined
  const homeAwaySuffix = opponent.match(/\((hemma|borta)\)\s*$/i)
  if (homeAwaySuffix) {
    derivedIsHome = homeAwaySuffix[1].toLowerCase() === "hemma"
  }

  const timeline = match.matchFeed ?? []
  const hasTimelineEvents = timeline.some((event) => Boolean(event?.type || event?.description))
  const timelineEnded = timeline.some((event) => {
    const type = event.type?.toLowerCase() ?? ""
    const description = event.description?.toLowerCase() ?? ""
    return (
      type.includes("slut") ||
      type.includes("avslut") ||
      type.includes("final") ||
      description.includes("slut") ||
      description.includes("avslut") ||
      description.includes("final")
    )
  })

  let derivedStatus: NormalizedMatch["matchStatus"] | undefined = normalizeStatusValue(match.matchStatus)

  if (timelineEnded) {
    derivedStatus = "finished"
  } else if (!derivedStatus) {
    derivedStatus = hasTimelineEvents ? "live" : "upcoming"
  }

  return {
    id,
    homeTeam: match.home,
    awayTeam: match.away,
    teamType,
    opponent,
    normalizedTeam,
    date: parsedDate,
    displayDate: formatDisplayDate(parsedDate),
    time: match.time ?? undefined,
    venue: match.venue ?? undefined,
    series: match.series ?? undefined,
    infoUrl: match.infoUrl ?? undefined,
    result: match.result ?? undefined,
    isHome: derivedIsHome,
    playUrl: match.playUrl && match.playUrl !== "null" ? match.playUrl : undefined,
    matchStatus: derivedStatus,
    matchFeed: match.matchFeed ?? undefined,
    gameClock: match.gameClock ?? undefined,
  }
}

const normalizeMatches = (matches: ApiMatch[]) =>
  matches
    .map(normalizeMatch)
    .filter((match): match is NormalizedMatch => Boolean(match))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Add memory cache for ultra-fast responses
const memoryCache = new Map<string, { data: EnhancedMatchData; timestamp: number }>()
const CACHE_DURATION = 200 // Cache for 200ms to reduce API calls while maintaining freshness

const fetchFromApi = async (dataType: DataType = "both", bypassCache = false): Promise<EnhancedMatchData> => {
  const endpoint = getDataEndpoint(dataType)
  const cacheKey = `${dataType}-${endpoint}`
  
  // Check memory cache first (unless bypassed)
  if (!bypassCache) {
    const cached = memoryCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
  }

  let attempt = 0
  let delay = 500 // Even faster initial delay

  while (attempt < 2) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000) // Even faster timeout

      const response = await fetch(endpoint, { 
        cache: "no-store",
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, must-revalidate',
          'Pragma': 'no-cache',
        }
      })
      
      clearTimeout(timeoutId)
      
      if (response.status === 503) {
        attempt += 1
        await sleep(delay)
        delay = Math.min(delay * 1.1, 1500) // Much faster max delay
        continue
      }

      if (!response.ok) {
        throw new Error(`Kunde inte hämta matcher (HTTP ${response.status})`)
      }

      const payload = await response.json()
      
      // Handle different response structures based on endpoint
      let matches: ApiMatch[] = []
      let metadata = undefined
      let grouped = undefined
      
      if (dataType === "enhanced") {
        // /matcher/data/enhanced returns { matches: [...], metadata: {...}, grouped: {...} }
        matches = Array.isArray(payload.matches) ? payload.matches : []
        metadata = payload.metadata
        
        // If grouped data exists, normalize the matches in it
        if (payload.grouped) {
          grouped = {
            byTeam: payload.grouped.byTeam || {},
            byStatus: {
              live: normalizeMatches(payload.grouped.byStatus?.live || []),
              upcoming: normalizeMatches(payload.grouped.byStatus?.upcoming || []),
              finished: normalizeMatches(payload.grouped.byStatus?.finished || []),
            },
            bySeries: payload.grouped.bySeries || {},
          }
        }
      } else if (dataType === "current" && payload.current) {
        // /matcher/data/current returns { current: [...] }
        matches = Array.isArray(payload.current) ? payload.current : []
      } else if (dataType === "old" && payload.old) {
        // /matcher/data/old returns { old: [...] }
        matches = Array.isArray(payload.old) ? payload.old : []
      } else if (dataType === "both") {
        // /matcher/data returns { current: [...], old: [...] }
        const current = Array.isArray(payload.current) ? payload.current : []
        const old = Array.isArray(payload.old) ? payload.old : []
        
        // Prioritize live matches for instant display
        const liveMatches = [...current, ...old].filter(m => m.matchStatus === "live")
        const otherMatches = [...current, ...old].filter(m => m.matchStatus !== "live")
        
        matches = [...liveMatches, ...otherMatches] // Live matches first
      } else {
        // Fallback: check if payload itself is an array
        matches = Array.isArray(payload) ? payload : []
      }
      
      const normalizedMatches = normalizeMatches(matches)

      const statusBuckets: NonNullable<EnhancedMatchData['grouped']>['byStatus'] = {
        live: [],
        upcoming: [],
        finished: [],
      }

      normalizedMatches.forEach((normalizedMatch) => {
        const status = normalizedMatch.matchStatus
        if (status === "live") {
          statusBuckets.live.push(normalizedMatch)
        } else if (status === "finished") {
          statusBuckets.finished.push(normalizedMatch)
        } else {
          statusBuckets.upcoming.push(normalizedMatch)
        }
      })

      statusBuckets.live.sort((a, b) => a.date.getTime() - b.date.getTime())
      statusBuckets.upcoming.sort((a, b) => a.date.getTime() - b.date.getTime())
      statusBuckets.finished.sort((a, b) => b.date.getTime() - a.date.getTime())

      const normalizedGrouped: EnhancedMatchData['grouped'] | undefined = {
        byTeam: grouped?.byTeam ?? {},
        byStatus: statusBuckets,
        bySeries: grouped?.bySeries ?? {},
      }

      const result = {
        matches: normalizedMatches,
        metadata,
        grouped: normalizedGrouped,
      }

      // Cache the result for ultra-fast subsequent calls
      memoryCache.set(cacheKey, { data: result, timestamp: Date.now() })
      
      return result
    } catch (error) {
      if (attempt < 1) { // Only 1 retry for speed
        attempt += 1
        await sleep(delay)
        delay = Math.min(delay * 1.2, 1000) // Much faster retry
        continue
      }
      
      // Return cached data on error if available
      const cached = memoryCache.get(cacheKey)
      if (cached) {
        console.warn('API failed, returning cached data:', error)
        return cached.data
      }
      
      throw error
    }
  }

  throw new Error("Matchdata är inte tillgänglig just nu")
}

// Smart preloading system
const preloadData = async () => {
  try {
    // Preload both current and old data in parallel
    const [currentData, oldData] = await Promise.all([
      fetchFromApi("current", true),
      fetchFromApi("old", true)
    ])
    
    // This populates the cache for instant access
    console.log('🚀 Preloaded data:', {
      current: currentData.matches.length,
      old: oldData.matches.length
    })
  } catch (error) {
    console.warn('Preload failed:', error)
  }
}

// Preload data immediately when module loads
if (typeof window !== "undefined") {
  preloadData()
  
  // Preload again every 30 seconds to keep cache fresh
  setInterval(preloadData, 30000)
}

export const useMatchData = (options?: { refreshIntervalMs?: number; dataType?: DataType }) => {
  const baseRefreshInterval = options?.refreshIntervalMs ?? 1_000
  const dataType = options?.dataType ?? "both"

  const [matches, setMatches] = useState<NormalizedMatch[]>([])
  const [metadata, setMetadata] = useState<EnhancedMatchData['metadata']>()
  const [grouped, setGrouped] = useState<EnhancedMatchData['grouped']>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasLiveMatches, setHasLiveMatches] = useState(false)

  // Dynamic refresh interval based on live matches
  const refreshIntervalMs = hasLiveMatches ? Math.min(baseRefreshInterval, 500) : baseRefreshInterval

  const refresh = useCallback(async (bypassCache = false) => {
    try {
      setIsRefreshing(true)
      const data = await fetchFromApi(dataType, bypassCache)
      
      // Queue updates through state manager for smooth transitions
      data.matches.forEach(match => {
        matchStateManager.queueUpdate(match.id, {
          ...match,
          lastUpdated: Date.now()
        })
      })
      
      // Always update immediately - no delays
      setMatches(data.matches)
      if (data.metadata) {
        setMetadata(data.metadata)
      }
      if (data.grouped) {
        setGrouped(data.grouped)
      }
      
      // Check for live matches to adjust refresh rate
      const liveMatches = data.matches.filter(m => m.matchStatus === "live")
      setHasLiveMatches(liveMatches.length > 0)
      
      setError(null)
      setLoading(false)
      return data
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Kunde inte hämta matchdata just nu. Försök igen om en liten stund."
      setError(message)
      setLoading(false)
      throw caught
    } finally {
      setIsRefreshing(false)
    }
  }, [dataType])

  useEffect(() => {
    let isMounted = true
    const run = async () => {
      setLoading(true)
      try {
        const data = await fetchFromApi(dataType)
        if (!isMounted) {
          return
        }
        setMatches(data.matches)
        setMetadata(data.metadata)
        setGrouped(data.grouped)
        setError(null)
      } catch (caught) {
        if (!isMounted) {
          return
        }
        const message =
          caught instanceof Error ? caught.message : "Kunde inte hämta matchdata just nu. Försök igen om en liten stund."
        setError(message)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      isMounted = false
    }
  }, [dataType])

  useEffect(() => {
    if (!refreshIntervalMs || refreshIntervalMs <= 0) {
      return
    }

    let intervalId: NodeJS.Timeout
    
    const startInterval = (interval: number) => {
      if (intervalId) clearInterval(intervalId)
      
      intervalId = setInterval(async () => {
        try {
          // Bypass cache every few calls for live matches
          const shouldBypassCache = hasLiveMatches && Math.random() > 0.7
          const data = await fetchFromApi(dataType, shouldBypassCache)
          
          setMatches(data.matches)
          if (data.metadata) {
            setMetadata(data.metadata)
          }
          if (data.grouped) {
            setGrouped(data.grouped)
          }
          setError(null)
          
          // Update live match status
          const liveMatches = data.matches.filter(m => m.matchStatus === "live")
          const newHasLiveMatches = liveMatches.length > 0
          
          if (newHasLiveMatches !== hasLiveMatches) {
            setHasLiveMatches(newHasLiveMatches)
          }
          
          // Performance and debug logging
          performanceMonitor.recordUpdate()
          
          if (liveMatches.length > 0) {
            console.log(`🔴 Live matches updated (${interval}ms):`, liveMatches.map(m => ({ 
              id: m.id, 
              result: m.result, 
              feedLength: m.matchFeed?.length || 0,
              lastEvent: m.matchFeed?.[0]?.type || 'none'
            })))
          }
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Kunde inte hämta matchdata just nu."
          setError(message)
        }
      }, interval)
    }

    startInterval(refreshIntervalMs)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [refreshIntervalMs, dataType])

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        // Always bypass cache when window becomes visible
        await refresh(true)
      }
    }

    const handleFocus = async () => {
      // Always bypass cache when window gets focus
      await refresh(true)
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [dataType])

  // Performance monitoring
  const performanceMonitor = {
    lastUpdateTime: Date.now(),
    updateTimes: [] as number[],
    
    recordUpdate() {
      const now = Date.now()
      const timeSinceLastUpdate = now - this.lastUpdateTime
      this.updateTimes.push(timeSinceLastUpdate)
      
      // Keep only last 20 measurements
      if (this.updateTimes.length > 20) {
        this.updateTimes.shift()
      }
      
      this.lastUpdateTime = now
      
      // Log performance stats every 10 updates
      if (this.updateTimes.length % 10 === 0) {
        const avgTime = this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length
        console.log(`📊 Update performance: ${avgTime.toFixed(0)}ms avg interval`)
      }
    }
  }

  return {
    matches,
    metadata,
    grouped,
    loading,
    error,
    refresh,
    isRefreshing,
  }
}
