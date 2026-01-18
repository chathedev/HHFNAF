"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { matchStateManager } from "./match-state-manager"
import { dataFreshnessMonitor } from "./data-freshness-monitor"
import { mapVenueIdToName } from "./venue-mapper"

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

type DataType = "liveUpcoming" | "live" | "old"
type QueryParams = Record<string, string | number | boolean | undefined>

const buildQueryMeta = (params?: QueryParams) => {
  const entries = Object.entries(params ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b))

  if (entries.length === 0) {
    return { queryString: "", signature: "" }
  }

  const searchParams = new URLSearchParams()
  entries.forEach(([key, value]) => searchParams.append(key, value))
  const serialized = searchParams.toString()

  return {
    queryString: `?${serialized}`,
    signature: serialized,
  }
}

const getDataEndpoint = (type: DataType) => {
  switch (type) {
    case "liveUpcoming":
      return `${API_BASE_URL}/matcher/data/live-upcoming`
    case "old":
      return `${API_BASE_URL}/matcher/data/old`
    case "live":
      return `${API_BASE_URL}/matcher/data/live`
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

// ENHANCED: Helper to check if a finished match should still be displayed (for home/matcher pages - only > 0-0)
const shouldShowFinishedMatch = (match: { date: Date; matchFeed?: MatchFeedEvent[]; matchStatus?: string; result?: string }, retentionHours: number) => {
  if (match.matchStatus !== "finished") {
    return false // Not finished, handled elsewhere
  }

  // Enhanced logic: Only show finished matches with REAL results (greater than 0-0)
  const result = match.result?.trim() || ""

  if (!result || result.toLowerCase() === "inte publicerat") {
    return false // No result or not published
  }

  // Parse score to check if it's greater than 0-0
  const scoreMatch = result.match(/(\d+)[-–](\d+)/)
  if (!scoreMatch) {
    return false // Invalid score format
  }

  const homeScore = parseInt(scoreMatch[1])
  const awayScore = parseInt(scoreMatch[2])

  // Must have at least one goal scored (not 0-0)
  if (homeScore === 0 && awayScore === 0) {
    return false // Don't show 0-0 results
  }

  // Valid result with actual goals scored - now check time window
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

// TEAM PAGES: Helper for team pages that shows ALL finished matches (including 0-0)
const shouldShowFinishedMatchForTeam = (match: { date: Date; matchFeed?: MatchFeedEvent[]; matchStatus?: string; result?: string }, retentionHours: number) => {
  if (match.matchStatus !== "finished") {
    return false // Not finished, handled elsewhere
  }

  // Team pages show ALL finished matches regardless of result (including 0-0)
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

  // Start with backend status, but ALWAYS check timeline for halftime override
  let derivedStatus: NormalizedMatch["matchStatus"] | undefined = normalizeStatusValue(match.matchStatus)

  // ALWAYS analyze timeline for halftime detection (override backend status if needed)
  {
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

    // Check for halftime break - look at the LATEST event to determine current state
    const sortedTimeline = timeline
      .filter(event => event.time && (event.type || event.description))
      .sort((a, b) => {
        // Sort by time to get the latest event
        const aTime = a.time?.replace(/[^\d:]/g, '') || '0:0'
        const bTime = b.time?.replace(/[^\d:]/g, '') || '0:0'
        const aMinutes = parseInt(aTime.split(':')[0]) || 0
        const bMinutes = parseInt(bTime.split(':')[0]) || 0
        return bMinutes - aMinutes // Latest first
      })

    const latestEvent = sortedTimeline[0]
    const latestEventText = latestEvent
      ? `${latestEvent.type || ''} ${latestEvent.description || ''}`.toLowerCase()
      : ''

    // Check if the LATEST event is halftime
    const isHalftimeBreak = latestEventText.includes("1:a halvlek är slut") ||
      latestEventText.includes("1:a halvlek slut") ||
      latestEventText.includes("första halvlek är slut") ||
      latestEventText.includes("första halvlek slut")

    // Check if second half has started (means no longer in break)
    const secondHalfStarted = timeline.some((event) => {
      const text = `${event.type || ''} ${event.description || ''}`.toLowerCase()
      return (
        text.includes("2:a halvlek startades") ||
        text.includes("2:a halvlek") && text.includes("start") ||
        text.includes("andra halvlek startades") ||
        text.includes("andra halvlek") && text.includes("start")
      )
    })

    // PRIORITY OVERRIDE: Timeline-based status always wins for halftime/finished detection
    if (matchActuallyEnded) {
      derivedStatus = "finished"
    } else if (isHalftimeBreak && !secondHalfStarted) {
      // OVERRIDE: Always show halftime when detected, regardless of backend status
      derivedStatus = "halftime"
    } else if (secondHalfStarted) {
      // OVERRIDE: Force live when second half starts
      derivedStatus = "live"
    } else if (!derivedStatus) {
      // Fallback to timeline-based detection if backend provided no status
      if (hasTimelineEvents) {
        derivedStatus = "live"
      } else {
        derivedStatus = "upcoming"
      }
    }
    // If backend provided status and no timeline override needed, keep backend status
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
    venue: mapVenueIdToName(match.venue),
    series: match.series ?? undefined,
    infoUrl: match.infoUrl ?? undefined,
    result: match.result ?? undefined,
    isHome: derivedIsHome,
    playUrl: match.playUrl && match.playUrl !== "null" ? match.playUrl : undefined,
    matchStatus: derivedStatus,
    matchFeed: match.matchFeed ?? undefined,
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

// Track latest match states to prevent regression
const latestMatchStates = new Map<string, {
  result: string | undefined
  feedLength: number
  lastEventTime: string
  timestamp: number
}>()

// Version counter for cache entries
let cacheVersion = 0

export const getMatchData = async (
  dataType: DataType = "liveUpcoming",
  bypassCache = false,
  params?: QueryParams,
): Promise<EnhancedMatchData> => {
  const { queryString } = buildQueryMeta(params)
  const endpoint = `${getDataEndpoint(dataType)}${queryString}`
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
        // console.log(`⏰ Aborting request to ${endpoint} after 5s timeout`) // Reduced log spam
        controller.abort()
      }, 5000) // Increased timeout to 5s for slower connections

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

      if (dataType === "liveUpcoming") {
        if (Array.isArray(payload.matches)) {
          matches = payload.matches
        } else if (Array.isArray(payload.liveUpcoming)) {
          matches = payload.liveUpcoming
        } else if (Array.isArray(payload.current)) {
          matches = payload.current
        } else if (Array.isArray(payload)) {
          matches = payload
        }
      } else if (dataType === "live") {
        if (Array.isArray(payload.live)) {
          matches = payload.live
        } else if (Array.isArray(payload.matches)) {
          matches = payload.matches
        } else if (Array.isArray(payload.current)) {
          matches = payload.current.filter((match) => {
            const status = normalizeStatusValue(match.matchStatus)
            return status === "live" || status === "halftime"
          })
        } else if (Array.isArray(payload.liveUpcoming)) {
          matches = payload.liveUpcoming.filter((match) => {
            const status = normalizeStatusValue(match.matchStatus)
            return status === "live" || status === "halftime"
          })
        } else if (Array.isArray(payload)) {
          matches = payload
        }
      } else if (dataType === "old") {
        if (Array.isArray(payload.old)) {
          matches = payload.old
        } else if (Array.isArray(payload.matches)) {
          matches = payload.matches
        } else if (Array.isArray(payload)) {
          matches = payload
        }
      }

      const normalizedMatches = normalizeMatches(matches)

      const finalMatches = normalizedMatches
      const result: EnhancedMatchData = {
        matches: finalMatches,
      }

      // Update latest match states
      finalMatches.forEach(match => {
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

      // Catch abort errors specifically and try to return cache
      if (error instanceof DOMException && error.name === 'AbortError') {
        const cached = memoryCache.get(cacheKey)
        if (cached) {
          console.log('Timeout reached, using cached data')
          return cached.data
        }
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

  // Graceful fallback if everything fails
  const cached = memoryCache.get(cacheKey)
  if (cached) {
    return cached.data
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
      getMatchData("liveUpcoming", true),
      getMatchData("old", true)
    ])

    clearTimeout(timeoutId)

    const successCount = [currentData, oldData].filter(result => result.status === 'fulfilled').length
    console.log('🚀 Preloaded data successfully:', successCount, 'of 2 endpoints')
  } catch (error) {
    // Silently handle preload failures
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
export { getMatchEndTime, shouldShowFinishedMatch, shouldShowFinishedMatchForTeam }

export const useMatchData = (options?: {
  refreshIntervalMs?: number
  dataType?: DataType
  initialData?: EnhancedMatchData
  params?: QueryParams
  enabled?: boolean
}) => {
  const baseRefreshInterval = options?.refreshIntervalMs ?? 1_000
  const dataType = options?.dataType ?? "liveUpcoming"
  const paramsSignature = useMemo(() => buildQueryMeta(options?.params).signature, [options?.params])
  const enabled = options?.enabled ?? true

  const [matches, setMatches] = useState<NormalizedMatch[]>(options?.initialData?.matches ?? [])
  const [loading, setLoading] = useState(!options?.initialData && enabled)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasLiveMatches, setHasLiveMatches] = useState(false)

  const refreshIntervalMs = hasLiveMatches ? Math.min(baseRefreshInterval, 500) : baseRefreshInterval

  const refresh = useCallback(async (bypassCache = false) => {
    if (!enabled) {
      return null
    }

    try {
      setIsRefreshing(true)
      const data = await getMatchData(dataType, bypassCache, options?.params)

      setMatches(data.matches)
      data.matches.forEach(match => {
        matchStateManager.queueUpdate(match.id, {
          ...match,
          lastUpdated: Date.now()
        })
      })

      const liveMatches = data.matches.filter((match) => match.matchStatus === "live" || match.matchStatus === "halftime")
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
  }, [dataType, paramsSignature, enabled])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let isMounted = true
    const run = async () => {
      if (matches.length === 0) {
        setLoading(true)
      }

      try {
        const data = await getMatchData(dataType, false, options?.params)
        if (!isMounted) {
          return
        }
        setMatches(data.matches)
        setError(null)
      } catch (caught) {
        if (!isMounted) {
          return
        }
        if (matches.length === 0) {
          const message =
            caught instanceof Error ? caught.message : "Kunde inte hämta matchdata just nu. Försök igen om en liten stund."
          setError(message)
        } else {
          console.warn("Background refresh failed:", caught)
        }
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
  }, [dataType, paramsSignature, enabled])

  useEffect(() => {
    if (!enabled || !refreshIntervalMs || refreshIntervalMs <= 0) {
      return
    }

    let intervalId: NodeJS.Timeout

    const startInterval = (interval: number) => {
      if (intervalId) clearInterval(intervalId)

      intervalId = setInterval(async () => {
        try {
          const shouldBypassCache = hasLiveMatches && Math.random() > 0.8
          const data = await getMatchData(dataType, shouldBypassCache, options?.params)

          setMatches(data.matches)
          const liveMatches = data.matches.filter((match) => match.matchStatus === "live" || match.matchStatus === "halftime")
          const newHasLiveMatches = liveMatches.length > 0

          if (newHasLiveMatches !== hasLiveMatches) {
            setHasLiveMatches(newHasLiveMatches)
          }

          setError(null)
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
  }, [refreshIntervalMs, dataType, paramsSignature, enabled])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await refresh(true)
      }
    }

    const handleFocus = async () => {
      await refresh(true)
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [dataType, paramsSignature, refresh, enabled])

  return {
    matches,
    loading,
    error,
    refresh,
    isRefreshing,
  }
}
