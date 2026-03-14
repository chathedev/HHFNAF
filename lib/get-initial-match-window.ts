import type { EnhancedMatchData, NormalizedMatch } from "@/lib/use-match-data"
import { compareMatchesByDateAscStable, compareMatchesByDateDescStable } from "@/lib/match-sort"
import { resolvePreferredTimeline } from "@/lib/match-timeline"
import { mapVenueIdToName } from "@/lib/venue-mapper"

type MatchProvider = "profixio" | "procup"

type ApiMatchLike = {
  id?: string | number
  matchId?: string | number
  home?: string
  away?: string
  homeTeam?: string
  awayTeam?: string
  date?: string
  time?: string
  result?: string | null
  venue?: string | null
  arena?: string | null
  series?: string | null
  playUrl?: string | null
  infoUrl?: string | null
  matchStatus?: string | null
  matchFeed?: any[]
  timeline?: any[]
  events?: any[]
  scoreTimeline?: any[]
  teamType?: string
  opponent?: string
  isHome?: boolean
  provider?: MatchProvider
  providerType?: "league" | "cup" | string
  startTimestamp?: number
  timelineAvailable?: boolean
  eventsAvailable?: boolean
  liveEventFeed?: boolean
  scoreUpdateAvailable?: boolean
  liveScoreAvailable?: boolean
  timelineMode?: "full" | "score_only" | string
  timelineUnavailableReason?: string | null
  hasStream?: boolean
  streamProvider?: string | null
  statusLabel?: string
  resultState?: "available" | "not_started" | "live_pending" | "pending"
  display?: {
    dateShort?: string
    dateFull?: string
    dateWithYear?: string
    dateCard?: string
    time?: string
    showYearInDate?: boolean
    statusLabel?: string
  }
  presentation?: {
    layoutHint?: "default" | "cup_compact" | string
    groupBy?: string[]
    primaryGroupKey?: string
    secondaryGroupKey?: string
    tertiaryGroupKey?: string
    primaryGroupLabel?: string
    secondaryGroupLabel?: string
    tertiaryGroupLabel?: string
    preferCompactBadges?: boolean
    preferDenseSchedule?: boolean
    isArchivedSource?: boolean
  }
  dataAvailability?: {
    timeline?: boolean
    events?: boolean
    liveEventFeed?: boolean
    scoreUpdates?: boolean
    stream?: boolean
    streamProvider?: string | null
    infoPage?: boolean
    detailPage?: boolean
    lineups?: boolean
    playerStats?: boolean
    teamStats?: boolean
    result?: boolean
    resultState?: "available" | "not_started" | "live_pending" | "pending"
  }
  homeScore?: number
  awayScore?: number
}

const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "")) ||
  "https://api.harnosandshf.se"

const MATCH_DATA_ENDPOINT = `${API_BASE_URL}/matcher/data`

const STOCKHOLM_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const getStockholmToday = () => STOCKHOLM_DATE_FORMATTER.format(new Date())

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

const normalizeTimeForIso = (timeString?: string | null) => {
  const raw = timeString?.trim()
  if (!raw) {
    return "00:00:00"
  }

  const cleaned = raw.replace(/[^\d:]/g, "")
  if (!cleaned) {
    return "00:00:00"
  }

  const parts = cleaned.split(":").filter(Boolean)
  const hour = Number.parseInt(parts[0] ?? "0", 10)
  const minute = Number.parseInt(parts[1] ?? "0", 10)
  const second = Number.parseInt(parts[2] ?? "0", 10)

  return `${String(Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 0).padStart(2, "0")}:${String(
    Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  ).padStart(2, "0")}:${String(Number.isFinite(second) ? Math.min(59, Math.max(0, second)) : 0).padStart(2, "0")}`
}

const toDate = (dateString?: string | null, timeString?: string | null) => {
  if (!dateString) {
    return null
  }
  const parsed = new Date(`${dateString}T${normalizeTimeForIso(timeString)}`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

const buildStatusLabel = (status?: NormalizedMatch["matchStatus"]) => {
  if (status === "live" || status === "halftime") return "LIVE"
  if (status === "finished") return "SLUT"
  return "KOMMANDE"
}

const normalizeStatusValue = (value?: string | null): NormalizedMatch["matchStatus"] | undefined => {
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
  if (["scheduled", "notstarted", "not-started", "pending", "future"].includes(normalized)) {
    return "upcoming"
  }
  if (["break", "pause", "halvlek", "paus", "vila"].includes(normalized)) {
    return "halftime"
  }

  return undefined
}

const normalizeIncomingMatch = (match: any): ApiMatchLike => ({
  ...match,
  id: match?.id ?? match?.matchId,
  matchId: match?.matchId ?? match?.id,
  home: match?.home ?? match?.homeTeam ?? "",
  away: match?.away ?? match?.awayTeam ?? "",
  matchFeed: resolvePreferredTimeline(match),
})

const normalizeList = (input: unknown): ApiMatchLike[] =>
  Array.isArray(input) ? input.map((match) => normalizeIncomingMatch(match)) : []

const dedupeApiMatches = (matches: ApiMatchLike[]) => {
  const seen = new Set<string>()
  return matches.filter((match) => {
    const key = match.id ?? match.matchId
    if (key === undefined || key === null) {
      return true
    }
    const normalizedKey = String(key)
    if (seen.has(normalizedKey)) {
      return false
    }
    seen.add(normalizedKey)
    return true
  })
}

const resolveCurrentMatchPayload = (payload: any): ApiMatchLike[] => {
  if (!payload) return []
  if (Array.isArray(payload.current)) return normalizeList(payload.current)
  if (Array.isArray(payload.currentMatches)) return normalizeList(payload.currentMatches)
  if (payload.grouped && (Array.isArray(payload.grouped.live) || Array.isArray(payload.grouped.upcoming) || Array.isArray(payload.grouped.finished))) {
    return dedupeApiMatches([
      ...normalizeList(payload.grouped.live),
      ...normalizeList(payload.grouped.upcoming),
      ...normalizeList(payload.grouped.finished),
    ])
  }
  if (Array.isArray(payload.liveUpcoming)) return normalizeList(payload.liveUpcoming)
  if (Array.isArray(payload.live)) return normalizeList(payload.live)
  if (Array.isArray(payload.matches)) {
    return normalizeList(payload.matches).filter((match) => normalizeStatusValue(match.matchStatus) !== "finished")
  }
  if (Array.isArray(payload)) return normalizeList(payload)
  return []
}

const resolveOldMatchPayload = (payload: any): ApiMatchLike[] => {
  if (!payload) return []
  if (Array.isArray(payload.old)) return dedupeApiMatches(normalizeList(payload.old))
  if (Array.isArray(payload.matches)) {
    return normalizeList(payload.matches).filter((match) => normalizeStatusValue(match.matchStatus) === "finished")
  }
  return []
}

const resolveRecentResultsPayload = (payload: any): ApiMatchLike[] => {
  if (Array.isArray(payload?.recentResults)) return dedupeApiMatches(normalizeList(payload.recentResults))
  if (Array.isArray(payload?.recentFinished)) return dedupeApiMatches(normalizeList(payload.recentFinished))
  return []
}

const normalizeMatch = (match: ApiMatchLike): NormalizedMatch | null => {
  const teamType = match.teamType?.trim()
  const opponent = match.opponent?.trim()
  const parsedDate =
    typeof match.startTimestamp === "number" && Number.isFinite(match.startTimestamp)
      ? new Date(match.startTimestamp)
      : toDate(match.date, match.time)
  const apiId = match.id ?? match.matchId

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

  let derivedStatus = normalizeStatusValue(match.matchStatus)
  const timeline = match.matchFeed ?? []
  const latestEventText =
    [...timeline]
      .filter((event) => event?.time && (event?.type || event?.description))
      .sort((a, b) => {
        const aMinutes = Number.parseInt(String(a?.time ?? "0").replace(/[^\d].*$/, ""), 10) || 0
        const bMinutes = Number.parseInt(String(b?.time ?? "0").replace(/[^\d].*$/, ""), 10) || 0
        return bMinutes - aMinutes
      })[0]
      ? `${timeline[0]?.type || ""} ${timeline[0]?.description || ""}`.toLowerCase()
      : ""

  const matchActuallyEnded = timeline.some((event) => {
    const text = `${event?.type || ""} ${event?.description || ""}`.toLowerCase()
    return (
      text.includes("2:a halvlek är slut") ||
      text.includes("andra halvlek är slut") ||
      text.includes("matchen är slut") ||
      text.includes("slutresultat") ||
      (text.includes("final") && !text.includes("första"))
    )
  })
  const secondHalfStarted = timeline.some((event) => {
    const text = `${event?.type || ""} ${event?.description || ""}`.toLowerCase()
    return text.includes("2:a halvlek startades") || text.includes("andra halvlek startades")
  })
  const isHalftimeBreak =
    latestEventText.includes("1:a halvlek är slut") ||
    latestEventText.includes("första halvlek är slut") ||
    latestEventText.includes("första halvlek slut")

  if (matchActuallyEnded) {
    derivedStatus = "finished"
  } else if (isHalftimeBreak && !secondHalfStarted) {
    derivedStatus = "halftime"
  } else if (secondHalfStarted) {
    derivedStatus = "live"
  } else if (!derivedStatus) {
    derivedStatus = timeline.length > 0 ? "live" : "upcoming"
  }

  return {
    id,
    homeTeam: match.home ?? "",
    awayTeam: match.away ?? "",
    teamType,
    opponent,
    normalizedTeam,
    date: parsedDate,
    displayDate: match.display?.dateCard ?? formatDisplayDate(parsedDate),
    time: match.display?.time ?? match.time ?? undefined,
    venue: mapVenueIdToName(match.venue ?? match.arena),
    series: match.series ?? undefined,
    infoUrl: match.infoUrl ?? undefined,
    result: match.result ?? undefined,
    isHome: derivedIsHome,
    playUrl: match.playUrl && match.playUrl !== "null" ? match.playUrl : undefined,
    matchStatus: derivedStatus,
    matchFeed: match.matchFeed ?? undefined,
    isHalftime: derivedStatus === "halftime",
    apiMatchId: apiId ? String(apiId) : undefined,
    provider: match.provider,
    providerType: match.providerType === "cup" || match.providerType === "league" ? match.providerType : undefined,
    startTimestamp: typeof match.startTimestamp === "number" ? match.startTimestamp : parsedDate.getTime(),
    timelineAvailable: match.timelineAvailable ?? match.dataAvailability?.timeline,
    eventsAvailable: match.eventsAvailable ?? match.dataAvailability?.events,
    liveEventFeed: match.liveEventFeed ?? match.dataAvailability?.liveEventFeed,
    scoreUpdateAvailable: match.scoreUpdateAvailable ?? match.dataAvailability?.scoreUpdates,
    liveScoreAvailable: match.liveScoreAvailable,
    timelineMode: match.timelineMode,
    timelineUnavailableReason: match.timelineUnavailableReason ?? null,
    hasStream: match.hasStream ?? match.dataAvailability?.stream ?? Boolean(match.playUrl),
    streamProvider: match.streamProvider ?? match.dataAvailability?.streamProvider ?? null,
    statusLabel: match.statusLabel ?? match.display?.statusLabel ?? buildStatusLabel(derivedStatus),
    resultState: match.resultState ?? match.dataAvailability?.resultState,
    display: match.display,
    presentation: match.presentation,
    dataAvailability: match.dataAvailability,
    homeScore: typeof match.homeScore === "number" ? match.homeScore : undefined,
    awayScore: typeof match.awayScore === "number" ? match.awayScore : undefined,
  }
}

const normalizeMatches = (matches: ApiMatchLike[]) =>
  matches.map(normalizeMatch).filter((match): match is NormalizedMatch => Boolean(match))

const dedupeMatches = (matches: NormalizedMatch[]) => {
  const seen = new Set<string>()
  return matches.filter((match) => {
    if (seen.has(match.id)) return false
    seen.add(match.id)
    return true
  })
}

const buildGroupedFeed = (matches: NormalizedMatch[]) => ({
  live: dedupeMatches(matches.filter((match) => match.matchStatus === "live" || match.matchStatus === "halftime")).sort(compareMatchesByDateAscStable),
  upcoming: dedupeMatches(matches.filter((match) => match.matchStatus === "upcoming")).sort(compareMatchesByDateAscStable),
  finished: dedupeMatches(matches.filter((match) => match.matchStatus === "finished")).sort(compareMatchesByDateDescStable),
})

const buildEnhancedMatchDataFromPayload = (payload: any): EnhancedMatchData => {
  const matches = dedupeMatches(normalizeMatches(resolveCurrentMatchPayload(payload))).sort(compareMatchesByDateAscStable)
  const recentResults = dedupeMatches(normalizeMatches(resolveRecentResultsPayload(payload))).sort(compareMatchesByDateDescStable)

  return {
    matches,
    recentResults,
    groupedFeed: buildGroupedFeed(matches),
    sources: payload?.sources,
    window: payload?.window,
  }
}

const mergeMatchWindows = (windows: EnhancedMatchData[]): EnhancedMatchData | undefined => {
  if (windows.length === 0) {
    return undefined
  }

  const matches = dedupeMatches(windows.flatMap((window) => window.matches ?? [])).sort(compareMatchesByDateAscStable)
  const recentResults = dedupeMatches(windows.flatMap((window) => window.recentResults ?? [])).sort(compareMatchesByDateDescStable)
  const firstWindow = windows[0]?.window
  const lastWindow = windows[windows.length - 1]?.window
  const mergedDateKeys = Array.from(
    new Set(
      windows.flatMap((window) => window.window?.dateKeys ?? []).filter(Boolean),
    ),
  )
  const mergedWindow =
    firstWindow?.enabled
      ? {
          ...firstWindow,
          from: firstWindow.from ?? firstWindow.cursorDate,
          to: lastWindow?.to ?? lastWindow?.cursorDate ?? firstWindow.to ?? firstWindow.cursorDate,
          days: windows.length,
          chunkDays: windows.length,
          cursorDate: firstWindow.cursorDate ?? firstWindow.from ?? mergedDateKeys[0],
          containsToday: windows.some((window) => window.window?.containsToday === true),
          priority: windows.some((window) => window.window?.priority === "live")
            ? "live"
            : windows.some((window) => window.window?.priority === "today")
              ? "today"
              : firstWindow.priority,
          refreshIntervalMs: Math.min(
            ...windows
              .map((window) => window.window?.refreshIntervalMs)
              .filter((value): value is number => typeof value === "number" && value > 0),
            firstWindow.refreshIntervalMs ?? 60_000,
          ),
          nextCursorDate: lastWindow?.nextCursorDate ?? null,
          previousCursorDate: firstWindow.previousCursorDate ?? null,
          dateKeys: mergedDateKeys.length > 0 ? mergedDateKeys : firstWindow.dateKeys,
        }
      : firstWindow

  return {
    matches,
    recentResults,
    groupedFeed: buildGroupedFeed(matches),
    sources: windows.at(-1)?.sources,
    window: mergedWindow,
  }
}

type InitialMatchWindowOptions = {
  minMatches?: number
  maxDays?: number
  requireUpcomingProviders?: MatchProvider[]
}

const fetchMatchWindow = async (cursorDate: string) => {
  const url = new URL(MATCH_DATA_ENDPOINT)
  url.searchParams.set("cursorDate", cursorDate)
  url.searchParams.set("chunkDays", "1")

  const response = await fetch(url.toString(), {
    next: { revalidate: 15 },
    headers: {
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Kunde inte hämta initial matcherwindow (HTTP ${response.status})`)
  }

  const payload = await response.json()
  return {
    data: buildEnhancedMatchDataFromPayload(payload),
    nextCursorDate: payload?.window?.nextCursorDate ?? null,
  }
}

export async function getInitialMatchWindow(options?: InitialMatchWindowOptions): Promise<EnhancedMatchData | undefined> {
  const minMatches = options?.minMatches ?? 8
  const maxDays = options?.maxDays ?? 3
  const requireUpcomingProviders = options?.requireUpcomingProviders ?? []

  try {
    const windows: EnhancedMatchData[] = []
    let nextCursorDate: string | null = getStockholmToday()
    let daysLoaded = 0

    while (nextCursorDate && daysLoaded < maxDays) {
      const { data, nextCursorDate: upcomingCursor } = await fetchMatchWindow(nextCursorDate)
      windows.push(data)
      daysLoaded += 1

      const merged = mergeMatchWindows(windows)
      const matchCount = merged?.matches.length ?? 0
      const recentCount = merged?.recentResults?.length ?? 0
      const upcomingProviders = new Set((merged?.groupedFeed?.upcoming ?? []).map((match) => match.provider).filter(Boolean))
      const hasRequiredProviders = requireUpcomingProviders.every((provider) => upcomingProviders.has(provider))

      if ((matchCount >= minMatches || recentCount >= 4) && hasRequiredProviders) {
        return merged
      }

      nextCursorDate = upcomingCursor
    }

    return mergeMatchWindows(windows)
  } catch (error) {
    console.warn("Failed to load initial matcher window", error)
    return undefined
  }
}
