"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { matchStateManager } from "./match-state-manager"
import { dataFreshnessMonitor } from "./data-freshness-monitor"

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
  matchStatus?: "live" | "finished" | "upcoming" | "halftime"
  matchFeed?: MatchFeedEvent[]
  gameClock?: GameClock
  isHalftime?: boolean // Special flag for halftime breaks
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

  if (["live", "finished", "upcoming", "halftime"].includes(normalized)) {
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

  if (["break", "pause", "halvlek", "paus", "vila"].includes(normalized)) {
    return "halftime"
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

// Enhanced helper to determine when finished matches should stop being displayed
const getMatchEndTime = (match: { date: Date; matchFeed?: MatchFeedEvent[]; matchStatus?: string; result?: string }) => {
  // Only calculate end time for finished matches
  if (match.matchStatus !== "finished") {
    return null
  }
  
  const matchStart = match.date.getTime()
  const timeline = match.matchFeed ?? []
  
  // PRIORITY 1: Look for actual match end events with time played
  const endEvent = timeline.find((event) => {
    const text = `${event.type || ''} ${event.description || ''}`.toLowerCase()
    return (
      text.includes("2:a halvlek är slut") ||
      text.includes("2:a halvlek slut") ||
      text.includes("andra halvlek är slut") ||
      text.includes("andra halvlek slut") ||
      text.includes("matchen är slut") ||
      text.includes("matchen slut") ||
      text.includes("match över") ||
      text.includes("slutresultat") ||
      text.includes("matchen avslutad") ||
      (text.includes("final") && !text.includes("första"))
    )
  })
  
  if (endEvent?.time) {
    try {
      const timeStr = endEvent.time.replace(/[^\d:+]/g, '')
      if (timeStr) {
        const parts = timeStr.split('+')
        const baseMinutes = parseInt(parts[0].split(':')[0]) || 0
        const overtimeMinutes = parts[1] ? parseInt(parts[1]) : 0
        const totalMinutes = baseMinutes + overtimeMinutes
        
        if (totalMinutes > 0) {
          // Return actual match end: start time + time played
          return new Date(matchStart + totalMinutes * 60 * 1000)
        }
      }
    } catch (e) {
      // Continue to next method
    }
  }
  
  // PRIORITY 2: Use the last meaningful timeline event with actual time played
  if (timeline.length > 0) {
    // Sort timeline events by time to get the actual last event
    const sortedEvents = timeline
      .filter(event => event.time && event.time.match(/\d+:\d+/))
      .sort((a, b) => {
        const aTime = a.time?.replace(/[^\d:+]/g, '') || '0:0'
        const bTime = b.time?.replace(/[^\d:+]/g, '') || '0:0'
        const aMinutes = parseInt(aTime.split(':')[0]) || 0
        const bMinutes = parseInt(bTime.split(':')[0]) || 0
        return bMinutes - aMinutes // Latest time first
      })
    
    const lastEvent = sortedEvents[0]
    if (lastEvent?.time) {
      try {
        const timeStr = lastEvent.time.replace(/[^\d:+]/g, '')
        if (timeStr) {
          const parts = timeStr.split('+')
          const baseMinutes = parseInt(parts[0].split(':')[0]) || 0
          const overtimeMinutes = parts[1] ? parseInt(parts[1]) : 0
          const totalMinutes = baseMinutes + overtimeMinutes
          
          // Use actual time played from timeline
          if (totalMinutes > 0) {
            return new Date(matchStart + totalMinutes * 60 * 1000)
          }
        }
      } catch (e) {
        // Continue to fallback
      }
    }
  }
  
  // PRIORITY 3: Fallback - assume match just ended if no timeline data
  // Return current time as best guess for match end
  return new Date()
}

// ENHANCED: Helper to check if a finished match should still be displayed
const shouldShowFinishedMatch = (match: { date: Date; matchFeed?: MatchFeedEvent[]; matchStatus?: string; result?: string }, retentionHours: number) => {
  if (match.matchStatus !== "finished") {
    return false // Not finished, handled elsewhere
  }
  
  // Check if result is meaningful (not 0-0 or empty)
  const hasValidResult = match.result && 
    match.result !== "0-0" && 
    match.result !== "0–0" && 
    match.result.trim() !== "" &&
    match.result.toLowerCase() !== "inte publicerat"
  
  if (!hasValidResult) {
    return false // Don't show matches without meaningful results
  }
  
  const now = Date.now()
  
  // ENHANCED LOGIC: start time + time played + retention hours
  const matchEndTime = getMatchEndTime(match)
  
  if (matchEndTime) {
    // Perfect: start time + actual time played + retention period
    const retentionWindowEnd = matchEndTime.getTime() + (retentionHours * 60 * 60 * 1000)
    return now <= retentionWindowEnd
  }
  
  // Fallback: If we can't determine match end time, be generous and show it
  // This ensures newly finished matches are never hidden incorrectly
  return true
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

  // TRUST BACKEND STATUS FULLY - Only analyze timeline if backend has no status
  let derivedStatus: NormalizedMatch["matchStatus"] | undefined = normalizeStatusValue(match.matchStatus)
  
  // Only derive status from timeline if backend didn't provide one
  if (!derivedStatus) {
    const timeline = match.matchFeed ?? []
    const hasTimelineEvents = timeline.some((event) => Boolean(event?.type || event?.description))
    
    // Enhanced timeline analysis for proper match state detection
    const timelineText = timeline.map(event => {
      return `${event.type || ''} ${event.description || ''}`.toLowerCase()
    }).join(' ')
    
    // Check for ACTUAL match end (2:a halvlek är slut means really finished)
    const matchActuallyEnded = timeline.some((event) => {
      const text = `${event.type || ''} ${event.description || ''}`.toLowerCase()
      return (
        text.includes("2:a halvlek är slut") ||
        text.includes("2:a halvlek slut") ||
        text.includes("andra halvlek är slut") ||
        text.includes("andra halvlek slut") ||
        text.includes("matchen är slut") ||
        text.includes("matchen slut") ||
        text.includes("match över") ||
        text.includes("slutresultat") ||
        text.includes("final") && !text.includes("första")
      )
    })
    
    // Check for halftime break (1:a halvlek är slut means break, NOT finished)
    const isHalftimeBreak = timeline.some((event) => {
      const text = `${event.type || ''} ${event.description || ''}`.toLowerCase()
      return (
        (text.includes("1:a halvlek är slut") ||
         text.includes("1:a halvlek slut") ||
         text.includes("första halvlek är slut") ||
         text.includes("första halvlek slut")) &&
        !text.includes("2:a halvlek") // Make sure it's not about second half
      )
    })
    
    // Check for second half starting (means live again after break)
    const secondHalfStarted = timeline.some((event) => {
      const text = `${event.type || ''} ${event.description || ''}`.toLowerCase()
      return (
        text.includes("2:a halvlek startades") ||
        text.includes("2:a halvlek") && text.includes("start") ||
        text.includes("andra halvlek startades") ||
        text.includes("andra halvlek") && text.includes("start")
      )
    })
    
    if (matchActuallyEnded) {
      derivedStatus = "finished"
    } else if (isHalftimeBreak && !secondHalfStarted) {
      // Proper halftime status - match is ongoing but in break
      derivedStatus = "halftime" 
    } else if (secondHalfStarted || hasTimelineEvents) {
      derivedStatus = "live"
    } else {
      derivedStatus = "upcoming"
    }
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
    isHalftime: derivedStatus === "halftime",
  }
}

const normalizeMatches = (matches: ApiMatch[]) =>
  matches
    .map(normalizeMatch)
    .filter((match): match is NormalizedMatch => Boolean(match))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Ultra-fast cache system with match preservation
const memoryCache = new Map<string, { data: EnhancedMatchData; timestamp: number; version: number }>()
const CACHE_DURATION = 50 // Ultra-fast 50ms for maximum responsiveness

// Global match registry to ensure NO matches ever disappear
const globalMatchRegistry = new Map<string, NormalizedMatch>()
const lastSeenMatches = new Set<string>()

// Track latest match states to prevent regression
const latestMatchStates = new Map<string, { 
  result: string | undefined
  feedLength: number
  lastEventTime: string
  timestamp: number
}>()

// Version counter for cache entries
let cacheVersion = 0

const fetchFromApi = async (dataType: DataType = "both", bypassCache = false): Promise<EnhancedMatchData> => {
  const endpoint = getDataEndpoint(dataType)
  const cacheKey = `${dataType}-${endpoint}`
  
  // Check memory cache first (unless bypassed) but verify data freshness
  if (!bypassCache) {
    const cached = memoryCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      // Verify cached data isn't stale by checking if any match has regressed
      const hasRegression = cached.data.matches.some(match => {
        const latest = latestMatchStates.get(match.id)
        if (!latest) return false
        
        const currentFeedLength = match.matchFeed?.length || 0
        const currentResult = match.result || ""
        
        // Don't use cached data if it has fewer events or older result
        return currentFeedLength < latest.feedLength || 
               (currentResult !== latest.result && latest.timestamp > cached.timestamp)
      })
      
      if (!hasRegression) {
        return cached.data
      }
    }
  }

  let attempt = 0
  let delay = 500 // Even faster initial delay

  while (attempt < 2) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Aborting request to ${endpoint} after 3s timeout`)
        controller.abort()
      }, 3000) // Slightly longer timeout to prevent unnecessary aborts

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
        if (status === "live" || status === "halftime") {
          // Both live and halftime go to live bucket (halftime is just a break in live match)
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

      // BULLETPROOF: Register ALL matches and NEVER let them disappear
      normalizedMatches.forEach(match => {
        globalMatchRegistry.set(match.id, match) // Always update with latest data
        lastSeenMatches.add(match.id)
      })

      // GUARANTEE: Always return ALL known matches, NEVER let any disappear
      const allKnownMatches = Array.from(globalMatchRegistry.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
      
      // Emergency fallback: If we somehow have fewer matches than before, keep the old ones
      if (normalizedMatches.length > 0 && allKnownMatches.length < lastSeenMatches.size) {
        console.warn('🚨 Match count dropped, preserving registry integrity')
        // Keep all matches we've seen before
        lastSeenMatches.forEach(matchId => {
          if (!globalMatchRegistry.has(matchId)) {
            console.warn(`🔄 Restoring missing match: ${matchId}`)
          }
        })
      }

      const result = {
        matches: allKnownMatches, // Always show ALL matches
        metadata,
        grouped: normalizedGrouped,
      }

      // Update latest match states
      allKnownMatches.forEach(match => {
        const currentState = latestMatchStates.get(match.id)
        const newFeedLength = match.matchFeed?.length || 0
        const newResult = match.result || ""
        const newLastEventTime = match.matchFeed?.[0]?.time || ""
        
        if (!currentState || 
            newFeedLength >= currentState.feedLength ||
            (newResult !== currentState.result && newResult !== "0-0" && newResult !== "0–0")) {
          
          latestMatchStates.set(match.id, {
            result: newResult,
            feedLength: newFeedLength,
            lastEventTime: newLastEventTime,
            timestamp: Date.now()
          })
        }
      })
      
      // Cache the result with version for ultra-fast subsequent calls
      cacheVersion++
      memoryCache.set(cacheKey, { 
        data: result, 
        timestamp: Date.now(),
        version: cacheVersion
      })
      
      return result
    } catch (error) {
      if (attempt < 1) { // Only 1 retry for speed
        attempt += 1
        await sleep(delay)
        delay = Math.min(delay * 1.2, 1000) // Much faster retry
        continue
      }
      
      // Return cached data on error if available AND it's not stale
      const cached = memoryCache.get(cacheKey)
      if (cached) {
        // Only return cached data if it's not regressed
        const hasRegression = cached.data.matches.some(match => {
          const latest = latestMatchStates.get(match.id)
          if (!latest) return false
          
          const cachedFeedLength = match.matchFeed?.length || 0
          return cachedFeedLength < latest.feedLength
        })
        
        if (!hasRegression) {
          console.warn('API failed, returning cached data (verified fresh):', error)
          return cached.data
        } else {
          console.warn('API failed and cached data is stale, throwing error:', error)
        }
      }
      
      throw error
    }
  }

  throw new Error("Matchdata är inte tillgänglig just nu")
}

// Smart preloading system with proper abort handling
const preloadData = async () => {
  try {
    // Create a fresh AbortController for each preload to avoid signal conflicts
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    // Preload both current and old data in parallel
    const [currentData, oldData] = await Promise.allSettled([
      fetchFromApi("current", true),
      fetchFromApi("old", true)
    ])
    
    clearTimeout(timeoutId)
    
    const successCount = [currentData, oldData].filter(result => result.status === 'fulfilled').length
    console.log('🚀 Preloaded data successfully:', successCount, 'of 2 endpoints')
  } catch (error) {
    // Silently handle preload failures to avoid console spam
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.warn('Preload failed:', error)
    }
  }
}

// Preload data immediately when module loads
if (typeof window !== "undefined") {
  preloadData()
  
  // Preload again every 30 seconds to keep cache fresh
  setInterval(preloadData, 30000)
}

// Cleanup old match states every 5 minutes to prevent memory leaks
if (typeof window !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    
    latestMatchStates.forEach((state, matchId) => {
      if (now - state.timestamp > maxAge) {
        latestMatchStates.delete(matchId)
      }
    })
    
    // Also cleanup old cache entries
    memoryCache.forEach((cacheEntry, key) => {
      if (now - cacheEntry.timestamp > maxAge) {
        memoryCache.delete(key)
      }
    })
  }, 5 * 60 * 1000)
}

// Export helper functions for other components
export { getMatchEndTime, shouldShowFinishedMatch }

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
      
      // TRUST BACKEND FULLY: Always use fresh data, no second-guessing
      setMatches(data.matches)      // Queue updates through state manager for smooth transitions
      data.matches.forEach(match => {
        matchStateManager.queueUpdate(match.id, {
          ...match,
          lastUpdated: Date.now()
        })
      })
      
      if (data.metadata) {
        setMetadata(data.metadata)
      }
      if (data.grouped) {
        setGrouped(data.grouped)
      }
      
      // Check for live matches to adjust refresh rate (include halftime)
      const liveMatches = data.matches.filter(m => m.matchStatus === "live" || m.matchStatus === "halftime")
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
          const shouldBypassCache = hasLiveMatches && Math.random() > 0.8 // More frequent bypass
          const data = await fetchFromApi(dataType, shouldBypassCache)
          
          // TRUST BACKEND: Use fresh data directly, backend knows best
          setMatches(data.matches)
          
          if (data.metadata) {
            setMetadata(data.metadata)
          }
          if (data.grouped) {
            setGrouped(data.grouped)
          }
          setError(null)
          
          // Update live match status (include halftime as live)
          const liveMatches = data.matches.filter(m => m.matchStatus === "live" || m.matchStatus === "halftime")
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
