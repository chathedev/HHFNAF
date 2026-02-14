"use client"

import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import {
  buildMatchScheduleLabel,
  getMatchupLabel,
  getSimplifiedMatchStatus,
  shouldShowFinishedZeroZeroIssue,
  shouldShowProfixioTechnicalIssue,
} from "@/lib/match-card-utils"
import { getMatchEndTime, useMatchData, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchCardCTA } from "@/components/match-card-cta"
import { MatchFeedModal, type MatchClockState, type MatchFeedEvent, type MatchPenalty } from "@/components/match-feed-modal"
import { normalizeMatchKey } from "@/lib/matches"
import { extendTeamDisplayName, createTeamMatchKeySet } from "@/lib/team-display"
import type { EnhancedMatchData } from "@/lib/use-match-data"
type MatchTopScorer = {
  team: string
  player: string
  playerNumber?: string
  goals: number
}

const TICKET_URL = "https://clubs.clubmate.se/harnosandshf/overview/"

type StatusFilter = "current" | "live" | "upcoming" | "finished"

const getMatchStatus = (match: NormalizedMatch): StatusFilter => {
  // TRUST BACKEND COMPLETELY - it knows the real match status
  return match.matchStatus === "halftime" ? "live" : (match.matchStatus ?? "upcoming")
}

const TEAM_OPTION_VALUES = [
  "Dam/utv",
  "A-lag Herrar",
  "Fritids-Teknikskola",
  "F19-Senior",
  "F16 (2009)",
  "F15 (2010)",
  "F14 (2011)",
  "F13 (2012)",
  "F12 (2013)",
  "F11 (2014)",
  "F10 (2015)",
  "F9 (2016)",
  "F8 (2017)",
  "F7 (2018)",
  "F6 (2019)",
  "P16 (2009/2010)",
  "P14 (2011)",
  "P13 (2012)",
  "P12 (2013/2014)",
  "P10 (2015)",
  "P9 (2016)",
  "P8 (2017)",
  "P7 (2018)",
] as const

const buildTeamKeys = (...values: string[]) => {
  const set = createTeamMatchKeySet(...values)
  values.forEach((value) => {
    const extended = extendTeamDisplayName(value)
    if (extended && extended !== value) {
      createTeamMatchKeySet(extended).forEach((key) => set.add(key))
    }
  })
  return set
}

const TEAM_MATCH_KEY_MAP: Record<string, Set<string>> = {
  "Dam/utv": buildTeamKeys("Dam/utv", "Dam", "A-lag Dam", "Dam-utv"),
  "A-lag Herrar": buildTeamKeys("A-lag Herrar", "Herr", "Herr-utv"),
}

TEAM_OPTION_VALUES.forEach((value) => {
  if (!TEAM_MATCH_KEY_MAP[value]) {
    TEAM_MATCH_KEY_MAP[value] = buildTeamKeys(value)
  }
})

const TEAM_OPTIONS = TEAM_OPTION_VALUES.map((value) => ({
  value,
  label: extendTeamDisplayName(value),
}))

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "current", label: "Live + Kommande" },
  { value: "live", label: "Live nu" },
  { value: "upcoming", label: "Kommande" },
  { value: "finished", label: "Avslutade" },
]

const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "")) ||
  "https://api.harnosandshf.se"

const mapTimelineEvent = (event: any): MatchFeedEvent => ({
  time: event?.time ?? "",
  type:
    event?.type ??
    event?.eventType ??
    event?.payload?.type ??
    event?.payload?.eventType ??
    event?.payload?.eventTypeName ??
    "Händelse",
  team: event?.team ?? event?.payload?.team,
  player: event?.player ?? event?.payload?.player,
  playerNumber: event?.playerNumber ?? event?.payload?.playerNumber,
  description:
    event?.payload?.description?.toString().trim() ||
    event?.description?.toString().trim() ||
    event?.payload?.eventText?.toString().trim() ||
    event?.type?.toString().trim() ||
    "Händelse",
  homeScore: typeof event?.homeScore === "number" ? event.homeScore : undefined,
  awayScore: typeof event?.awayScore === "number" ? event.awayScore : undefined,
  period: typeof event?.period === "number" ? event.period : undefined,
  score: event?.score,
  eventId: event?.eventId ?? event?.eventIndex,
  eventTypeId: typeof event?.eventTypeId === "number" ? event.eventTypeId : undefined,
  payload: event?.payload,
})

const extractTopScorers = (payload: any): MatchTopScorer[] => {
  const source = payload?.match?.playerStats?.topScorers ?? payload?.playerStats?.topScorers
  if (!Array.isArray(source)) {
    return []
  }
  return source
    .filter((scorer) => scorer?.name && Number.isFinite(Number(scorer?.goals)))
    .map((scorer) => ({
      team: scorer?.teamName ?? scorer?.team ?? "Okänt lag",
      player: String(scorer?.name),
      playerNumber: scorer?.number ? String(scorer.number) : undefined,
      goals: Number(scorer?.goals) || 0,
    }))
}

const dedupeTimelineEvents = (events: MatchFeedEvent[]) => {
  const seen = new Set<string>()
  return events.filter((event) => {
    const key =
      event.eventId !== undefined
        ? `id:${event.eventId}`
        : `${event.time}|${event.type}|${event.description}|${event.homeScore ?? ""}-${event.awayScore ?? ""}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function MatcherPageClient({ initialData }: { initialData?: EnhancedMatchData }) {
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("current")
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [timelineByMatchId, setTimelineByMatchId] = useState<Record<string, MatchFeedEvent[]>>({})
  const [topScorersByMatchId, setTopScorersByMatchId] = useState<Record<string, MatchTopScorer[]>>({})
  const [clockStateByMatchId, setClockStateByMatchId] = useState<Record<string, MatchClockState>>({})
  const [penaltiesByMatchId, setPenaltiesByMatchId] = useState<Record<string, MatchPenalty[]>>({})
  const timelineFetchInFlightRef = useRef<Record<string, Promise<void>>>({})
  const [hasResolvedLiveData, setHasResolvedLiveData] = useState(false)
  const [hasResolvedOldData, setHasResolvedOldData] = useState(false)
  const [hasAttemptedLiveFetch, setHasAttemptedLiveFetch] = useState(false)
  const [hasAttemptedOldFetch, setHasAttemptedOldFetch] = useState(false)

  const {
    matches: liveUpcomingMatches,
    loading: liveLoading,
    error: liveError,
    hasPayload: hasLivePayload,
  } = useMatchData({
    dataType: "liveUpcoming",
    initialData,
    params: { limit: 80 },
  })

  const {
    matches: oldMatches,
    loading: oldLoading,
    error: oldError,
    hasPayload: hasOldPayload,
  } = useMatchData({
    dataType: "old",
  })

  const hasCurrentPayload = statusFilter === "finished" ? hasOldPayload : hasLivePayload
  const isLoading = statusFilter === "finished" ? oldLoading || !hasOldPayload : liveLoading || !hasLivePayload
  const activeError = statusFilter === "finished" ? oldError : liveError
  const hasResolvedActiveData = statusFilter === "finished" ? hasResolvedOldData : hasResolvedLiveData
  const hasLoadedAnyMatches = liveUpcomingMatches.length > 0 || oldMatches.length > 0

  useEffect(() => {
    if (!hasAttemptedLiveFetch && !liveLoading) {
      setHasAttemptedLiveFetch(true)
    }
    if (!hasResolvedLiveData && hasLivePayload && !liveLoading) {
      setHasResolvedLiveData(true)
    }
  }, [hasAttemptedLiveFetch, hasResolvedLiveData, hasLivePayload, liveLoading])

  useEffect(() => {
    if (!hasAttemptedOldFetch && !oldLoading) {
      setHasAttemptedOldFetch(true)
    }
    if (!hasResolvedOldData && hasOldPayload && !oldLoading) {
      setHasResolvedOldData(true)
    }
  }, [hasAttemptedOldFetch, hasResolvedOldData, hasOldPayload, oldLoading])

  const liveMatchesCount = useMemo(
    () => liveUpcomingMatches.filter((match) => getMatchStatus(match) === "live").length,
    [liveUpcomingMatches],
  )

  const upcomingMatchesCount = useMemo(
    () => liveUpcomingMatches.filter((match) => getMatchStatus(match) === "upcoming").length,
    [liveUpcomingMatches],
  )

  const matchStats = useMemo(
    () => ({
      totalMatches: liveUpcomingMatches.length + oldMatches.length,
      liveMatches: liveMatchesCount,
      upcomingMatches: upcomingMatchesCount,
      finishedMatches: oldMatches.length,
    }),
    [liveUpcomingMatches.length, liveMatchesCount, upcomingMatchesCount, oldMatches.length],
  )

  const allMatches = useMemo(() => [...liveUpcomingMatches, ...oldMatches], [liveUpcomingMatches, oldMatches])
  const selectedMatch = useMemo(
    () => allMatches.find((match) => match.id === selectedMatchId) ?? null,
    [allMatches, selectedMatchId],
  )

  const fetchMatchTimeline = useCallback(async (match: NormalizedMatch, force = false) => {
    if (!force && Object.prototype.hasOwnProperty.call(timelineByMatchId, match.id)) {
      return
    }
    const inFlight = timelineFetchInFlightRef.current[match.id]
    if (inFlight) {
      return inFlight
    }

    const apiMatchId = match.apiMatchId
    if (!apiMatchId) {
      return
    }

    const request = (async () => {
      const response = await fetch(`${API_BASE_URL}/matcher/match/${encodeURIComponent(apiMatchId)}?includeEvents=1`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      if (!response.ok) {
        throw new Error(`Could not load timeline (${response.status})`)
      }

      const payload = await response.json()
      const rawTimeline = Array.isArray(payload?.events)
        ? payload.events
        : Array.isArray(payload?.timeline)
          ? payload.timeline
          : Array.isArray(payload?.matchFeed)
            ? payload.matchFeed
            : []

      const normalized = dedupeTimelineEvents(rawTimeline.map((event: any) => mapTimelineEvent(event)))
      setTimelineByMatchId((prev) => ({ ...prev, [match.id]: normalized }))
      if (payload?.clockState) {
        setClockStateByMatchId((prev) => ({ ...prev, [match.id]: payload.clockState as MatchClockState }))
      }
      if (Array.isArray(payload?.penalties)) {
        setPenaltiesByMatchId((prev) => ({ ...prev, [match.id]: payload.penalties as MatchPenalty[] }))
      }
      const topScorers = extractTopScorers(payload)
      if (topScorers.length > 0) {
        setTopScorersByMatchId((prev) => ({ ...prev, [match.id]: topScorers }))
      }
    })()

    timelineFetchInFlightRef.current[match.id] = request
    try {
      await request
    } finally {
      delete timelineFetchInFlightRef.current[match.id]
    }
  }, [timelineByMatchId])

  const openMatchModal = useCallback(
    (match: NormalizedMatch) => {
      setSelectedMatchId(match.id)
      fetchMatchTimeline(match).catch((error) => {
        console.warn("Failed to hydrate match timeline", error)
      })
    },
    [fetchMatchTimeline],
  )

  const getMergedTimeline = useCallback(
    (match: NormalizedMatch) => {
      const hydrated = timelineByMatchId[match.id]
      if (Object.prototype.hasOwnProperty.call(timelineByMatchId, match.id)) {
        return hydrated
      }
      return dedupeTimelineEvents((match.matchFeed ?? []).map((event) => mapTimelineEvent(event)))
    },
    [timelineByMatchId],
  )

  const teamOptions = TEAM_OPTIONS

  const selectedTeamKeys = useMemo(() => {
    if (selectedTeam === "all") {
      return null
    }
    return TEAM_MATCH_KEY_MAP[selectedTeam] ?? buildTeamKeys(selectedTeam)
  }, [selectedTeam])

  const matchesForFilter = useMemo(() => {
    if (statusFilter !== "finished") {
      return liveUpcomingMatches
    }

    // Keep finished matches stable by merging old feed + any newly finished from liveUpcoming feed.
    const finishedFromCurrent = liveUpcomingMatches.filter((match) => getMatchStatus(match) === "finished")
    const seenIds = new Set<string>()
    return [...finishedFromCurrent, ...oldMatches].filter((match) => {
      if (seenIds.has(match.id)) {
        return false
      }
      seenIds.add(match.id)
      return true
    })
  }, [statusFilter, liveUpcomingMatches, oldMatches])

  const filteredMatches = useMemo(() => {
    return matchesForFilter.filter((match) => {
      if (selectedTeamKeys) {
        const normalizedKey = match.normalizedTeam
        if (!selectedTeamKeys.has(normalizedKey)) {
          const fallbackKey = match.teamType ? normalizeMatchKey(match.teamType) : ""
          if (!fallbackKey || !selectedTeamKeys.has(fallbackKey)) {
            return false
          }
        }
      }

      const status = getMatchStatus(match)

      if (statusFilter === "live" && status !== "live") {
        return false
      }

      if (statusFilter === "upcoming" && status !== "upcoming") {
        return false
      }

      if (statusFilter === "current" && status !== "live" && status !== "upcoming") {
        return false
      }

      if (statusFilter === "finished") {
        return status === "finished"
      }

      return true
    })
  }, [matchesForFilter, selectedTeamKeys, statusFilter])

  const groupedMatches = useMemo(() => {
    const live: NormalizedMatch[] = []
    const upcoming: NormalizedMatch[] = []
    const finished: NormalizedMatch[] = []

    filteredMatches.forEach((match) => {
      const status = getMatchStatus(match)
      if (status === "live") live.push(match)
      else if (status === "upcoming") upcoming.push(match)
      else finished.push(match)
    })

    live.sort((a, b) => a.date.getTime() - b.date.getTime())
    upcoming.sort((a, b) => a.date.getTime() - b.date.getTime())
    finished.sort((a, b) => {
      const endA = getMatchEndTime(a)?.getTime() ?? (a.date.getTime() + 90 * 60 * 1000)
      const endB = getMatchEndTime(b)?.getTime() ?? (b.date.getTime() + 90 * 60 * 1000)
      return endB - endA
    })

    return { live, upcoming, finished }
  }, [filteredMatches])

  const renderMatchCard = (match: NormalizedMatch) => {
    const status = getSimplifiedMatchStatus(match)
    const scheduleLabel = buildMatchScheduleLabel(match)
    const matchupLabel = getMatchupLabel(match)
    const showProfixioWarning = shouldShowProfixioTechnicalIssue(match)
    const showFinishedZeroZeroIssue = shouldShowFinishedZeroZeroIssue(match)
    const teamTypeRaw = match.teamType?.trim() || ""
    const teamTypeLabel = extendTeamDisplayName(teamTypeRaw) || teamTypeRaw || "Härnösands HF"
    const cleanedResult = match.result?.trim()
    const scoreValue =
      status === "upcoming"
        ? null
        : cleanedResult && cleanedResult.length > 0
          ? cleanedResult
          : status === "live"
            ? "0-0"
            : "—"

    const statusBadge = (() => {
      if (status === "live") {
        return { label: "LIVE", tone: "bg-rose-50 text-rose-600" }
      }
      if (status === "finished") {
        return { label: "SLUT", tone: "bg-gray-100 text-gray-600" }
      }
      return { label: "KOMMANDE", tone: "bg-blue-50 text-blue-600" }
    })()

    return (
      <article
        key={match.id}
        id={`match-card-${match.id}`}
        className="relative flex cursor-pointer flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 active:scale-[0.99] hover:border-emerald-400 hover:shadow-lg sm:gap-4 sm:p-6"
        onMouseEnter={() => {
          fetchMatchTimeline(match).catch(() => undefined)
        }}
        onTouchStart={() => {
          fetchMatchTimeline(match).catch(() => undefined)
        }}
        onClick={(event) => {
          const target = event.target as HTMLElement
          if (target.closest("a,button")) {
            return
          }
          openMatchModal(match)
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-700">
              {teamTypeLabel}
            </p>
            <h3 className="text-base font-bold leading-tight text-gray-900 sm:text-xl">
              {matchupLabel}
            </h3>
            {scheduleLabel && <p className="text-sm text-gray-500">{scheduleLabel}</p>}
          </div>
          <span className={`inline-flex items-center justify-center rounded px-2.5 py-0.5 text-xs font-semibold ${statusBadge.tone}`}>
            {statusBadge.label}
          </span>
        </div>

        {scoreValue && (
          <div className="flex items-end justify-between">
            <span className="text-2xl font-extrabold text-gray-900 sm:text-3xl" data-score-value="true">
              {scoreValue}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
              {status === "live" ? "Pågår" : "Resultat"}
            </span>
          </div>
        )}

        {match.series && (
          <p className="text-xs text-slate-400">{match.series}</p>
        )}
        {showProfixioWarning && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Profixio har tekniska problem med liveuppdateringen för den här matchen just nu.
          </p>
        )}
        {showFinishedZeroZeroIssue && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Misstänkt resultatfel från Profixio: matchen är avslutad men står som 0–0. Kontrollera matchrapporten.
          </p>
        )}
        <MatchCardCTA match={match} status={status} />
      </article>
    )
  }
  useEffect(() => {
    // Remove ?team filtering from URL, only set selectedTeam from dropdown
    // This disables auto-select from URL and fixes jumping back to 'Alla lag'
    // User can only select team from dropdown
    // eslint-disable-next-line
  }, [teamOptions])

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16 sm:py-24">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tillbaka
          </Link>
          <h1 className="mb-3 text-3xl font-black text-gray-900 sm:mb-4 sm:text-5xl">Matcher</h1>
          <p className="max-w-2xl text-base text-gray-600 sm:text-xl">
            Följ alla våra lag live och se resultat från senaste matcherna. Välj lag nedan:
          </p>
        </div>

        {/* Minimal Stats Row */}
        <div className="-mx-1 mb-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 text-sm font-semibold text-gray-600 sm:flex-wrap sm:overflow-visible">
          <div className="min-w-[138px] shrink-0 snap-start flex items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-4 py-2 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            <span className="uppercase tracking-[0.3em] text-[10px] text-gray-500">Live</span>
            <span className="text-lg font-bold text-gray-900">{matchStats.liveMatches}</span>
          </div>
          <div className="min-w-[138px] shrink-0 snap-start flex items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-4 py-2 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="uppercase tracking-[0.3em] text-[10px] text-gray-500">Kommande</span>
            <span className="text-lg font-bold text-gray-900">{matchStats.upcomingMatches}</span>
          </div>
          <div className="min-w-[138px] shrink-0 snap-start flex items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-4 py-2 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-slate-500"></span>
            <span className="uppercase tracking-[0.3em] text-[10px] text-gray-500">Avslutade</span>
            <span className="text-lg font-bold text-gray-900">{matchStats.finishedMatches}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <label
                htmlFor="team-filter"
                className="block text-sm font-semibold text-gray-700 uppercase tracking-wide"
              >
                Filtrera lag
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Välj ett lag för att zooma in på deras matcher.
              </p>
              <select
                id="team-filter"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:border-emerald-400 focus:outline-none transition-colors"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="all">🏐 Alla lag</option>
                {teamOptions.map((team) => (
                  <option key={team.value} value={team.value}>
                    {team.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:w-[320px]">
              <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Matchstatus
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Visa matcher baserat på status – live, kommande eller avslutade.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {STATUS_OPTIONS.map((option) => {
                  const isActive = statusFilter === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setStatusFilter(option.value)}
                      className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition sm:px-4 sm:py-2 ${
                        isActive
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-lg"
                          : "bg-white border-gray-200 text-gray-700 hover:border-emerald-400"
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Error state */}
        {activeError && (
          <div className="mb-8 rounded-2xl border-2 border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 font-medium">{activeError}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {(isLoading || (!activeError && !hasLoadedAnyMatches)) && filteredMatches.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-emerald-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Hämtar matcher...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading &&
          filteredMatches.length === 0 &&
          !activeError &&
          hasCurrentPayload &&
          hasResolvedActiveData &&
          hasLoadedAnyMatches &&
          (statusFilter === "finished" ? hasAttemptedOldFetch : hasAttemptedLiveFetch) && (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-gray-100">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Inga matcher hittades</h3>
            <p className="text-gray-600 mb-6">Prova att ändra dina filter</p>
            <button
              onClick={() => {
                setSelectedTeam("all")
                setStatusFilter("current")
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
            >
              Återställ filter
            </button>
          </div>
        )}

        {/* Match sections */}
        {!isLoading && filteredMatches.length > 0 && (
          <div className="space-y-12">
            {/* Live matches */}
            {groupedMatches.live.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <h2 className="text-xl font-black text-gray-900 sm:text-2xl">Live nu</h2>
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-bold rounded-full">
                    {groupedMatches.live.length}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 sm:gap-6">
                  {groupedMatches.live.map(renderMatchCard)}
                </div>
              </section>
            )}

            {/* Upcoming matches */}
            {groupedMatches.upcoming.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 01-2 2z" />
                  </svg>
                  <h2 className="text-xl font-black text-gray-900 sm:text-2xl">Kommande matcher</h2>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full">
                    {groupedMatches.upcoming.length}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 sm:gap-6">
                  {groupedMatches.upcoming.map(renderMatchCard)}
                </div>
              </section>
            )}

            {/* Finished matches */}
            {groupedMatches.finished.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-xl font-black text-gray-900 sm:text-2xl">Senaste resultaten</h2>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-bold rounded-full">
                    {groupedMatches.finished.length}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 sm:gap-6">
                  {groupedMatches.finished.map(renderMatchCard)}
                </div>
              </section>
            )}
          </div>
        )}

      </div>
      {selectedMatch && (
        <MatchFeedModal
          isOpen={true}
          onClose={() => setSelectedMatchId(null)}
          matchFeed={getMergedTimeline(selectedMatch)}
          homeTeam={selectedMatch.homeTeam}
          awayTeam={selectedMatch.awayTeam}
          finalScore={selectedMatch.result}
          matchStatus={selectedMatch.matchStatus}
          matchId={selectedMatch.id}
          matchData={selectedMatch}
          clockState={clockStateByMatchId[selectedMatch.id] ?? null}
          penalties={penaltiesByMatchId[selectedMatch.id] ?? []}
          topScorers={topScorersByMatchId[selectedMatch.id] ?? []}
          onRefresh={async () => {
            await fetchMatchTimeline(selectedMatch, true).catch(() => undefined)
          }}
        />
      )}
    </main>
  )
}
