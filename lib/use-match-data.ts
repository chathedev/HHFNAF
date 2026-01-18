"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { matchStateManager } from "./match-state-manager"
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

type SharedMatchCacheEntry = {
  current: NormalizedMatch[]
  old: NormalizedMatch[]
  lastUpdated: string | null
  timestamp: number
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

const getDataEndpoint = () => `${API_BASE_URL}/matcher/data`

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

const sharedMatchCache = new Map<string, SharedMatchCacheEntry>()
const sharedFetchPromises = new Map<string, Promise<SharedMatchCacheEntry>>()

const isLiveMatch = (match: NormalizedMatch) =>
  match.matchStatus === "live" || match.matchStatus === "halftime"

const buildEnhancedMatchData = (entry: SharedMatchCacheEntry, dataType: DataType): EnhancedMatchData => {
  const matches =
    dataType === "old"
      ? entry.old
      : dataType === "live"
        ? entry.current.filter(isLiveMatch)
        : entry.current

  return {
    matches,
  }
}

const recordLatestMatchState = (match: NormalizedMatch) => {
  const currentState = latestMatchStates.get(match.id)
  const newFeedLength = match.matchFeed?.length || 0
  const newResult = match.result || ""
  const newLastEventTime = match.matchFeed?.[0]?.time || ""

  if (
    !currentState ||
    newFeedLength >= currentState.feedLength ||
    (newResult !== currentState.result && newResult !== "0-0" && newResult !== "0–0")
  ) {
    latestMatchStates.set(match.id, {
      result: newResult,
      feedLength: newFeedLength,
      lastEventTime: newLastEventTime,
      timestamp: Date.now(),
    })
  }
}

const updateLatestMatchStates = (matches: NormalizedMatch[]) => {
  matches.forEach(recordLatestMatchState)
}

// Version counter for cache entries
let cacheVersion = 0

const applyEntryToCaches = (entry: SharedMatchCacheEntry, endpoints: string[] = [getDataEndpoint()]) => {
  updateLatestMatchStates([...entry.current, ...entry.old])
  const version = ++cacheVersion
  endpoints.forEach((endpoint) => {
    sharedMatchCache.set(endpoint, entry)
    ;(["liveUpcoming", "live", "old"] as DataType[]).forEach((dataType) => {
      const cacheKey = `${dataType}-${endpoint}`
      memoryCache.set(cacheKey, {
        data: buildEnhancedMatchData(entry, dataType),
        timestamp: Date.now(),
        version,
      })
    })
  })
}

const resolveCurrentMatchPayload = (payload: any): ApiMatch[] => {
  if (!payload) {
    return []
  }

  if (Array.isArray(payload.current)) {
    return payload.current
  }
  if (Array.isArray(payload.currentMatches)) {
    return payload.currentMatches
  }
  if (Array.isArray(payload.liveUpcoming)) {
    return payload.liveUpcoming
  }
  if (Array.isArray(payload.live)) {
    return payload.live
  }
  if (Array.isArray(payload.matches)) {
    return payload.matches.filter((match) => {
      const status = normalizeStatusValue(match.matchStatus)
      return status !== "finished"
    })
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

const MATCH_WS_URL = "wss://api.harnosandshf.se/matcher/ws"
const CHANNEL_ENDPOINT = getDataEndpoint()
type MatchChannelPayload = {
  current: NormalizedMatch[]
  old: NormalizedMatch[]
  lastUpdated: string | null
}

type ConnectionState = {
  isConnected: boolean
  hasData: boolean
}

const createMatchDataChannel = () => {
  const isBrowser = typeof window !== "undefined"
  let socket: WebSocket | null = null
  let reconnectDelay = 1000
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let latestEntry: SharedMatchCacheEntry | null = sharedMatchCache.get(CHANNEL_ENDPOINT) ?? null
  let latestPayload: MatchChannelPayload | null = latestEntry
    ? { current: latestEntry.current, old: latestEntry.old, lastUpdated: latestEntry.lastUpdated }
    : null
  let isConnected = false
  let hasData = Boolean(latestPayload)

  const subscribers = new Set<(payload: MatchChannelPayload) => void>()
  const connectionListeners = new Set<(state: ConnectionState) => void>()

  const notifySubscribers = () => {
    if (!latestPayload) {
      return
    }
    subscribers.forEach((subscriber) => subscriber(latestPayload!))
  }

  const notifyConnectionState = () => {
    const state = { isConnected, hasData }
    connectionListeners.forEach((listener) => listener(state))
  }

  const updateConnectionState = (changes: Partial<ConnectionState>) => {
    let changed = false
    if (typeof changes.isConnected === "boolean" && changes.isConnected !== isConnected) {
      isConnected = changes.isConnected
      changed = true
    }
    if (typeof changes.hasData === "boolean" && changes.hasData !== hasData) {
      hasData = changes.hasData
      changed = true
    }
    if (changed) {
      notifyConnectionState()
    }
  }

  const scheduleReconnect = () => {
    if (!isBrowser || reconnectTimer) {
      return
    }
    reconnectTimer = globalThis.setTimeout(() => {
      reconnectTimer = null
      connect()
    }, reconnectDelay)
    reconnectDelay = Math.min(30_000, reconnectDelay * 1.5)
  }

  const connect = () => {
    if (!isBrowser) {
      return
    }
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return
    }
    if (socket) {
      socket.close()
      socket = null
    }
    if (reconnectTimer) {
      globalThis.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    try {
      socket = new WebSocket(MATCH_WS_URL)
    } catch (error) {
      console.warn("Unable to open match data socket", error)
      scheduleReconnect()
      return
    }

    updateConnectionState({ isConnected: false })

    socket.addEventListener("open", () => {
      reconnectDelay = 1000
      updateConnectionState({ isConnected: true })
    })

    socket.addEventListener("message", (event) => {
      try {
        const raw = JSON.parse(event.data)
        const entry: SharedMatchCacheEntry = {
          current: normalizeMatches(resolveCurrentMatchPayload(raw)),
          old: normalizeMatches(resolveOldMatchPayload(raw)),
          lastUpdated: typeof raw?.lastUpdated === "string" ? raw.lastUpdated : null,
          timestamp: Date.now(),
        }

        applyEntryToCaches(entry, [CHANNEL_ENDPOINT])
        latestEntry = entry
        latestPayload = { current: entry.current, old: entry.old, lastUpdated: entry.lastUpdated }
        updateConnectionState({ hasData: true })
        notifySubscribers()
      } catch (error) {
        console.warn("Failed to parse match websocket payload", error)
      }
    })

    socket.addEventListener("close", () => {
      socket = null
      updateConnectionState({ isConnected: false })
      scheduleReconnect()
    })

    socket.addEventListener("error", () => {
      socket?.close()
    })
  }

  const subscribe = (listener: (payload: MatchChannelPayload) => void) => {
    subscribers.add(listener)
    if (latestPayload) {
      listener(latestPayload)
    }
    connect()
    return () => {
      subscribers.delete(listener)
    }
  }

  const subscribeConnection = (listener: (state: ConnectionState) => void) => {
    connectionListeners.add(listener)
    listener({ isConnected, hasData })
    return () => connectionListeners.delete(listener)
  }

  const waitForConnection = () => {
    connect()
    if (isConnected) {
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      const unsubscribe = subscribeConnection((state) => {
        if (state.isConnected) {
          unsubscribe()
          resolve()
        }
      })
    })
  }

  const broadcastEntry = (entry: SharedMatchCacheEntry) => {
    latestEntry = entry
    latestPayload = { current: entry.current, old: entry.old, lastUpdated: entry.lastUpdated }
    updateConnectionState({ hasData: true })
    notifySubscribers()
  }

  return {
    subscribe,
    subscribeConnection,
    waitForConnection,
    getConnectionState: () => ({ isConnected, hasData }),
    getLatest: () => latestPayload,
    broadcastEntry,
  }
}

const matchDataChannel = createMatchDataChannel()

export const getMatchData = async (
  dataType: DataType = "liveUpcoming",
  bypassCache = false,
  params?: QueryParams,
): Promise<EnhancedMatchData> => {
  const { queryString } = buildQueryMeta(params)
  const baseEndpoint = getDataEndpoint()
  const endpoint = `${baseEndpoint}${queryString}`
  const cacheKey = `${dataType}-${endpoint}`
  const baseCacheKey = `${dataType}-${baseEndpoint}`
  const applyParamsToResult = (result: EnhancedMatchData) => {
    const limitParam = typeof params?.limit === "number" && params.limit >= 0 ? params.limit : undefined
    if (limitParam !== undefined) {
      return {
        ...result,
        matches: result.matches.slice(0, limitParam),
      }
    }
    return result
  }
  const sharedKey = endpoint

  if (!bypassCache) {
    const sharedCached = sharedMatchCache.get(sharedKey) ?? sharedMatchCache.get(baseEndpoint)
    if (sharedCached) {
      return applyParamsToResult(buildEnhancedMatchData(sharedCached, dataType))
    }
  }

  if (!bypassCache) {
    const cached = memoryCache.get(cacheKey) ?? memoryCache.get(baseCacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      const hasRegression = cached.data.matches.some((match) => {
        const latest = latestMatchStates.get(match.id)
        if (!latest) {
          return false
        }

        const currentFeedLength = match.matchFeed?.length || 0
        const currentResult = match.result || ""

        return (
          currentFeedLength < latest.feedLength ||
          (currentResult !== latest.result && latest.timestamp > cached.timestamp)
        )
      })

      if (!hasRegression) {
        return applyParamsToResult(cached.data)
      }
    }
  }

  const existingFetch = sharedFetchPromises.get(sharedKey)
  if (existingFetch) {
    try {
      await existingFetch
    } catch {
      // ignore
    }
    if (!bypassCache) {
      const sharedCached = sharedMatchCache.get(sharedKey) ?? sharedMatchCache.get(baseEndpoint)
      if (sharedCached) {
        return applyParamsToResult(buildEnhancedMatchData(sharedCached, dataType))
      }
    }
  }

  const fetchRunner = async (): Promise<SharedMatchCacheEntry> => {
    let attempt = 0
    let delay = 500

    while (attempt < 2) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache, must-revalidate",
            Pragma: "no-cache",
          },
        })

        if (response.status === 503) {
          attempt += 1
          await sleep(delay)
          delay = Math.min(delay * 1.1, 1500)
          continue
        }

        if (!response.ok) {
          throw new Error(`Kunde inte hämta matcher (HTTP ${response.status})`)
        }

        const payload = await response.json()

        const currentPayload = resolveCurrentMatchPayload(payload)
        const oldPayload = resolveOldMatchPayload(payload)

        const normalizedCurrent = normalizeMatches(currentPayload)
        const normalizedOld = normalizeMatches(oldPayload)

        const entry: SharedMatchCacheEntry = {
          current: normalizedCurrent,
          old: normalizedOld,
          lastUpdated: typeof payload.lastUpdated === "string" ? payload.lastUpdated : null,
          timestamp: Date.now(),
        }

        applyEntryToCaches(entry, [endpoint, baseEndpoint])
        matchDataChannel.broadcastEntry(entry)

        return entry
      } catch (error) {
        if (attempt < 1) {
          attempt += 1
          await sleep(delay)
          delay = Math.min(delay * 1.2, 1000)
          continue
        }

        throw error
      } finally {
        clearTimeout(timeoutId)
      }
    }

    throw new Error("Matchdata är inte tillgänglig just nu")
  }

  const fetchPromise = fetchRunner()
  sharedFetchPromises.set(sharedKey, fetchPromise)

  try {
    const sharedEntry = await fetchPromise
    return applyParamsToResult(buildEnhancedMatchData(sharedEntry, dataType))
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      const cached = memoryCache.get(cacheKey) ?? memoryCache.get(baseCacheKey)
      if (cached) {
        console.log("Timeout reached, using cached data")
        return applyParamsToResult(cached.data)
      }
    }

    const sharedCached = sharedMatchCache.get(sharedKey) ?? sharedMatchCache.get(baseEndpoint)
    if (sharedCached) {
      const fallback = buildEnhancedMatchData(sharedCached, dataType)
      console.warn("API failed, returning cached shared data:", error)
      return applyParamsToResult(fallback)
    }

    const cached = memoryCache.get(cacheKey) ?? memoryCache.get(baseCacheKey)
    if (cached) {
      const hasRegression = cached.data.matches.some((match) => {
        const latest = latestMatchStates.get(match.id)
        if (!latest) {
          return false
        }

        const cachedFeedLength = match.matchFeed?.length || 0
        return cachedFeedLength < latest.feedLength
      })

      if (!hasRegression) {
        console.warn("API failed, returning cached data (verified fresh):", error)
        return applyParamsToResult(cached.data)
      }
      console.warn("API failed and cached data is stale, throwing error:", error)
    }

    throw error
  } finally {
    if (sharedFetchPromises.get(sharedKey) === fetchPromise) {
      sharedFetchPromises.delete(sharedKey)
    }
  }
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
export { getMatchEndTime, shouldShowFinishedMatch, shouldShowFinishedMatchForTeam, normalizeStatusValue }

export const useMatchData = (options?: {
  refreshIntervalMs?: number
  dataType?: DataType
  initialData?: EnhancedMatchData
  params?: QueryParams
  enabled?: boolean
}) => {
  const dataType = options?.dataType ?? "liveUpcoming"
  const paramsSignature = useMemo(() => buildQueryMeta(options?.params).signature, [options?.params])
  const params = options?.params
  const enabled = options?.enabled ?? true
  const paramsLimit = typeof params?.limit === "number" && params.limit >= 0 ? params.limit : undefined

  const initialConnectionState = matchDataChannel.getConnectionState()
  const initialHasData = initialConnectionState.hasData || Boolean(options?.initialData?.matches?.length)
  const [matches, setMatches] = useState<NormalizedMatch[]>(options?.initialData?.matches ?? [])
  const [loading, setLoading] = useState(!initialHasData && enabled)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isConnected, setIsConnected] = useState(initialConnectionState.isConnected)
  const [hasData, setHasData] = useState(initialHasData)

  const selectMatchesFromPayload = useCallback(
    (payload: MatchChannelPayload) => {
      let selectedMatches =
        dataType === "old"
          ? payload.old
          : dataType === "live"
            ? payload.current.filter(isLiveMatch)
            : payload.current

      if (paramsLimit !== undefined) {
        selectedMatches = selectedMatches.slice(0, paramsLimit)
      }

      return selectedMatches
    },
    [dataType, paramsLimit],
  )

  const applyPayload = useCallback(
    (payload: MatchChannelPayload) => {
      const selectedMatches = selectMatchesFromPayload(payload)
      setMatches(selectedMatches)
      selectedMatches.forEach((match) => {
        matchStateManager.queueUpdate(match.id, {
          ...match,
          lastUpdated: Date.now(),
        })
      })
      setHasData(true)
      setError(null)
      setLoading(false)
      return selectedMatches
    },
    [selectMatchesFromPayload],
  )

  useEffect(() => {
    if (!enabled) {
      return
    }

    const unsubscribe = matchDataChannel.subscribe(applyPayload)
    return () => unsubscribe()
  }, [enabled, applyPayload, paramsSignature])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const unsubscribe = matchDataChannel.subscribeConnection(({ isConnected, hasData: payloadHasData }) => {
      setIsConnected(isConnected)
      setHasData((prev) => prev || payloadHasData)
    })

    return unsubscribe
  }, [enabled])

  useEffect(() => {
    if (isConnected && !hasData) {
      setLoading(true)
    }
  }, [isConnected, hasData])

  const refresh = useCallback(
    async (bypassCache = false) => {
      if (!enabled) {
        return null
      }

      setIsRefreshing(true)
      try {
        await matchDataChannel.waitForConnection()
        const payload = matchDataChannel.getLatest()

        if (!payload) {
          setLoading(true)
          setError(null)
          return { matches: [] }
        }

        const selectedMatches = applyPayload(payload)
        setError(null)
        setLoading(false)
        return {
          matches: selectedMatches,
        }
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Kunde inte hämta matchdata just nu. Försök igen om en liten stund."
        setError(message)
        setLoading(false)
        throw caught
      } finally {
        setIsRefreshing(false)
      }
    },
    [enabled, applyPayload],
  )

  return {
    matches,
    loading,
    error,
    refresh,
    isRefreshing,
  }
}
