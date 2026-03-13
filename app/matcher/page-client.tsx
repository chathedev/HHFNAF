"use client"

import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"

import {
  buildMatchScheduleLabel,
  canOpenMatchTimeline,
  getMatchProviderBadge,
  getProviderHelperText,
  getMatchupLabel,
  getSimplifiedMatchStatus,
  shouldShowFinishedZeroZeroIssue,
  shouldShowProfixioTechnicalIssue,
} from "@/lib/match-card-utils"
import { getMatchEndTime, useMatchData, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchCardCTA } from "@/components/match-card-cta"
import { CompactCupSchedule } from "@/components/compact-cup-schedule"
import { MatchFeedModal, type MatchClockState, type MatchFeedEvent, type MatchPenalty } from "@/components/match-feed-modal"
import { normalizeMatchKey } from "@/lib/matches"
import { extendTeamDisplayName, createTeamMatchKeySet } from "@/lib/team-display"
import { compareMatchesByDateAscStable, compareMatchesByDateDescStable } from "@/lib/match-sort"
import { resolvePreferredTimeline } from "@/lib/match-timeline"
import type { EnhancedMatchData } from "@/lib/use-match-data"
type MatchTopScorer = {
  team: string
  player: string
  playerNumber?: string
  goals: number
}

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
  { value: "current", label: "Översikt" },
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
  })

  const {
    matches: oldMatches,
    loading: oldLoading,
    error: oldError,
    hasPayload: hasOldPayload,
  } = useMatchData({
    dataType: "old",
  })

  const hasCurrentPayload =
    statusFilter === "finished" ? hasOldPayload : hasLivePayload && (statusFilter !== "current" || hasOldPayload)
  const isLoading =
    statusFilter === "finished"
      ? oldLoading || !hasOldPayload
      : statusFilter === "current"
        ? liveLoading || oldLoading || !hasLivePayload || !hasOldPayload
        : liveLoading || !hasLivePayload
  const activeError =
    statusFilter === "finished"
      ? oldError
      : statusFilter === "current"
        ? liveError ?? oldError
        : liveError
  const hasResolvedActiveData =
    statusFilter === "finished"
      ? hasResolvedOldData
      : statusFilter === "current"
        ? hasResolvedLiveData && hasResolvedOldData
        : hasResolvedLiveData
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

  const finishedMatchesCount = useMemo(
    () => [...liveUpcomingMatches, ...oldMatches].filter((match) => getMatchStatus(match) === "finished").length,
    [liveUpcomingMatches, oldMatches],
  )

  const matchStats = useMemo(
    () => ({
      totalMatches: liveUpcomingMatches.length + oldMatches.length,
      liveMatches: liveMatchesCount,
      upcomingMatches: upcomingMatchesCount,
      finishedMatches: finishedMatchesCount,
    }),
    [liveUpcomingMatches.length, liveMatchesCount, upcomingMatchesCount, oldMatches.length, finishedMatchesCount],
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
      const rawTimeline = resolvePreferredTimeline(payload, match.matchFeed ?? [])

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
    const seenIds = new Set<string>()
    const mergedMatches = [...liveUpcomingMatches, ...oldMatches].filter((match) => {
      if (seenIds.has(match.id)) {
        return false
      }
      seenIds.add(match.id)
      return true
    })

    if (statusFilter === "finished") {
      return mergedMatches.filter((match) => getMatchStatus(match) === "finished")
    }

    return mergedMatches
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

    live.sort(compareMatchesByDateAscStable)
    upcoming.sort(compareMatchesByDateAscStable)
    finished.sort((a, b) => {
      const endA = getMatchEndTime(a)?.getTime() ?? (a.date.getTime() + 90 * 60 * 1000)
      const endB = getMatchEndTime(b)?.getTime() ?? (b.date.getTime() + 90 * 60 * 1000)
      if (endA !== endB) {
        return endB - endA
      }
      return compareMatchesByDateDescStable(a, b)
    })

    return { live, upcoming, finished }
  }, [filteredMatches])

  const splitProviderMatches = useCallback((matches: NormalizedMatch[]) => {
    const cup: NormalizedMatch[] = []
    const standard: NormalizedMatch[] = []

    matches.forEach((match) => {
      if (match.provider === "procup" || match.presentation?.layoutHint === "cup_compact" || match.providerType === "cup") {
        cup.push(match)
        return
      }
      standard.push(match)
    })

    return { cup, standard }
  }, [])

  const renderMatchCard = (match: NormalizedMatch) => {
    const status = getSimplifiedMatchStatus(match)
    const canOpenTimeline = canOpenMatchTimeline(match)
    const scheduleLabel = buildMatchScheduleLabel(match)
    const matchupLabel = getMatchupLabel(match)
    const showProfixioWarning = shouldShowProfixioTechnicalIssue(match)
    const showFinishedZeroZeroIssue = shouldShowFinishedZeroZeroIssue(match)
    const providerBadge = getMatchProviderBadge(match)
    const providerHelperText = getProviderHelperText(match)
    const teamTypeRaw = match.teamType?.trim() || ""
    const teamTypeLabel = extendTeamDisplayName(teamTypeRaw) || teamTypeRaw || "Härnösands HF"
    const cleanedResult = match.result?.trim()
    const scoreValue =
      status === "upcoming" || match.resultState === "not_started" || match.resultState === "live_pending"
        ? null
        : cleanedResult && cleanedResult.length > 0
          ? cleanedResult
          : status === "finished"
            ? "Resultat inväntas"
            : null

    const statusBadge = (() => {
      if (status === "live") {
        return { label: match.statusLabel ?? "LIVE", tone: "bg-rose-50 text-rose-600" }
      }
      if (status === "finished") {
        return { label: match.statusLabel ?? "SLUT", tone: "bg-gray-100 text-gray-600" }
      }
      return { label: match.statusLabel ?? "KOMMANDE", tone: "bg-blue-50 text-blue-600" }
    })()

    return (
      <article
        key={match.id}
        id={`match-card-${match.id}`}
        className={`relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 active:scale-[0.99] sm:gap-4 sm:p-5 ${
          canOpenTimeline ? "cursor-pointer hover:border-emerald-400 hover:shadow-lg" : ""
        }`}
        onMouseEnter={() => {
          if (canOpenTimeline) {
            fetchMatchTimeline(match).catch(() => undefined)
          }
        }}
        onTouchStart={() => {
          if (canOpenTimeline) {
            fetchMatchTimeline(match).catch(() => undefined)
          }
        }}
        onClick={(event) => {
          if (!canOpenTimeline) {
            return
          }
          const target = event.target as HTMLElement
          if (target.closest("a,button")) {
            return
          }
          openMatchModal(match)
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-emerald-700">{teamTypeLabel}</p>
              {providerBadge && (
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${providerBadge.tone}`}>
                  {providerBadge.label}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold leading-tight text-gray-900 sm:text-xl">
              {matchupLabel}
            </h3>
            {scheduleLabel && <p className="text-sm leading-6 text-gray-500 break-words">{scheduleLabel}</p>}
          </div>
          <span className={`inline-flex w-fit items-center justify-center rounded px-2.5 py-0.5 text-xs font-semibold ${statusBadge.tone}`}>
            {statusBadge.label}
          </span>
        </div>

        {scoreValue && (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
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
        {providerHelperText && (
          <p className="text-xs font-medium text-sky-700">{providerHelperText}</p>
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

  const renderProviderBlocks = (
    matches: NormalizedMatch[],
    options: {
      standardTitle: string
      standardDescription: string
      cupTitle: string
      cupDescription: string
      defaultOpenDates?: number
      previewTimeBucketsPerDate?: number
      previewMatchesPerTimeBucket?: number
    },
  ) => {
    const { cup, standard } = splitProviderMatches(matches)

    return (
      <div className={`grid gap-4 ${standard.length > 0 && cup.length > 0 ? "xl:grid-cols-2" : ""}`}>
        {standard.length > 0 && (
          <section className="rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Profixio</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">{options.standardTitle}</h3>
                <p className="mt-1 text-sm text-slate-500">{options.standardDescription}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {standard.length}
              </span>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {standard.map(renderMatchCard)}
            </div>
          </section>
        )}

        {cup.length > 0 && (
          <CompactCupSchedule
            matches={cup}
            title={options.cupTitle}
            description={options.cupDescription}
            defaultOpenDates={options.defaultOpenDates ?? 1}
            previewTimeBucketsPerDate={options.previewTimeBucketsPerDate}
            previewMatchesPerTimeBucket={options.previewMatchesPerTimeBucket}
            className="rounded-2xl border-sky-200 bg-white"
          />
        )}
      </div>
    )
  }
  useEffect(() => {
    // Remove ?team filtering from URL, only set selectedTeam from dropdown
    // This disables auto-select from URL and fixes jumping back to 'Alla lag'
    // User can only select team from dropdown
    // eslint-disable-next-line
  }, [teamOptions])

  return (
    <main className="min-h-screen bg-slate-50 py-10 sm:py-14">
      <div className="container mx-auto max-w-7xl px-4">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-5 border-b border-slate-200 px-5 py-5 sm:px-8 sm:py-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] xl:items-end">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition hover:text-emerald-900"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Till startsidan
              </Link>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-600">Matcher</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Allt matchläge i ett flöde.</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
                En gemensam matcher-yta för Profixio och ProCup. Följ live, skanna cupdagar snabbare och öppna detaljer först när du behöver dem.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:justify-self-end">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Live</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{matchStats.liveMatches}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Kommande</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{matchStats.upcomingMatches}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Resultat</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{matchStats.finishedMatches}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-slate-200 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
            <section className="bg-white p-4 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Filter</p>
              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="team-filter"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Lag
                  </label>
                  <p className="mb-2 text-xs text-slate-500">Välj ett lag för att fokusera matchlistan.</p>
                  <select
                    id="team-filter"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition focus:border-emerald-400 focus:outline-none"
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                  >
                    <option value="all">Alla lag</option>
                    {teamOptions.map((team) => (
                      <option key={team.value} value={team.value}>
                        {team.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="block text-sm font-semibold text-slate-900">Status</p>
                  <p className="mb-2 text-xs text-slate-500">Byt snabbt mellan översikt, live, kommande och avslutade.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map((option) => {
                      const isActive = statusFilter === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setStatusFilter(option.value)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                            isActive
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-400 hover:bg-white"
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-slate-950 px-4 py-4 text-white sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">Överblick</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Nu</p>
                  <p className="mt-1 text-sm font-medium text-white/90">Livescore och timeline där backend säger att det finns.</p>
                </div>
                <div className="rounded-xl bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Profixio</p>
                  <p className="mt-1 text-sm font-medium text-white/90">Seriespel och vanliga matchkort med detaljvisning.</p>
                </div>
                <div className="rounded-xl bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">ProCup</p>
                  <p className="mt-1 text-sm font-medium text-white/90">Kompakta cupdagar utan att trycka ned resten av sidan.</p>
                </div>
              </div>
            </section>
          </div>
        </section>

        <div className="mt-8">

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
          <div className="space-y-8">
            {/* Live matches */}
            {groupedMatches.live.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-red-600"></div>
                  <h2 className="text-xl font-black text-slate-950 sm:text-2xl">Live nu</h2>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                    {groupedMatches.live.length}
                  </span>
                  <p className="text-sm text-slate-500">Det som pågår just nu, uppdelat i Profixio och ProCup direkt i samma vy.</p>
                </div>
                {renderProviderBlocks(
                  groupedMatches.live,
                  {
                    standardTitle: "Live i Profixio",
                    standardDescription: "Seriespel och matcher med timeline/detaljkort där backend stödjer det.",
                    cupTitle: "Live i ProCup",
                    cupDescription: "Livescore först. Cupmatcher grupperas kompakt per dag och starttid.",
                    defaultOpenDates: 1,
                    previewTimeBucketsPerDate: 4,
                    previewMatchesPerTimeBucket: 5,
                  },
                )}
              </section>
            )}

            {/* Upcoming matches */}
            {groupedMatches.upcoming.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 01-2 2z" />
                  </svg>
                  <h2 className="text-xl font-black text-slate-950 sm:text-2xl">Kommande matcher</h2>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                    {groupedMatches.upcoming.length}
                  </span>
                  <p className="text-sm text-slate-500">Snabb struktur för både seriespel och cupdagar utan att cupdelen skjuts längst ner.</p>
                </div>
                {renderProviderBlocks(
                  groupedMatches.upcoming,
                  {
                    standardTitle: "Profixio nästa",
                    standardDescription: "Vanliga kommande matcher som egna kort, lätta att skanna och öppna.",
                    cupTitle: "ProCup nästa",
                    cupDescription: "Cupdagar i kompakta tidsblock så fler matcher får plats direkt.",
                    defaultOpenDates: 1,
                    previewTimeBucketsPerDate: 5,
                    previewMatchesPerTimeBucket: 4,
                  },
                )}
              </section>
            )}

            {/* Finished matches */}
            {groupedMatches.finished.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-xl font-black text-slate-950 sm:text-2xl">Senaste resultat</h2>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-bold text-slate-700">
                    {groupedMatches.finished.length}
                  </span>
                  <p className="text-sm text-slate-500">Resultatspåret håller ihop både seriespel och cuputfall i samma struktur.</p>
                </div>
                {renderProviderBlocks(
                  groupedMatches.finished,
                  {
                    standardTitle: "Profixio resultat",
                    standardDescription: "Vanliga resultatkort för avslutade matcher och återblick.",
                    cupTitle: "ProCup resultat",
                    cupDescription: "Cupresultat grupperade per dag när många matcher avslutas samtidigt.",
                    defaultOpenDates: 1,
                    previewTimeBucketsPerDate: 5,
                    previewMatchesPerTimeBucket: 5,
                  },
                )}
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
