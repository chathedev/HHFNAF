"use client"

import { useMemo, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import Link from "next/link"

import { getSimplifiedMatchStatus } from "@/lib/match-card-utils"
import { getMatchEndTime, useMatchData, forceMatchDataPoll, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchCard } from "@/components/matcher/match-card"
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
  goalTimes?: string[]
  sevenMeterGoals?: number
}

type StatusFilter = "current" | "live" | "upcoming" | "finished"

const getMatchStatus = (match: NormalizedMatch): StatusFilter => {
  const simplifiedStatus = getSimplifiedMatchStatus(match)
  if (simplifiedStatus === "live") return "live"
  if (simplifiedStatus === "finished") return "finished"
  return "upcoming"
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
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Kommande" },
  { value: "finished", label: "Resultat" },
]

const FINISHED_PAGE_SIZE = 12

const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "")) ||
  "https://api.harnosandshf.se"

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  weekday: "long",
  day: "numeric",
  month: "long",
})

type DayGroup = { key: string; label: string; matches: NormalizedMatch[] }

const groupMatchesByDay = (matches: NormalizedMatch[]): DayGroup[] => {
  const groups: DayGroup[] = []
  let current: DayGroup | null = null
  for (const match of matches) {
    const date = match.date
    const valid = date instanceof Date && !Number.isNaN(date.getTime())
    const key = valid ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : "unknown"
    if (!current || current.key !== key) {
      current = {
        key,
        label: valid ? DAY_LABEL_FORMATTER.format(date) : match.displayDate || "Datum meddelas senare",
        matches: [],
      }
      groups.push(current)
    }
    current.matches.push(match)
  }
  return groups
}

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
      goalTimes: Array.isArray(scorer?.goalTimes)
        ? scorer.goalTimes.filter((t: unknown) => typeof t === "string" && t.trim().length > 0)
        : undefined,
      sevenMeterGoals: Number.isFinite(Number(scorer?.sevenMeterGoals))
        ? Number(scorer.sevenMeterGoals)
        : undefined,
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

function SectionHeader({
  label,
  count,
  live = false,
  children,
}: {
  label: string
  count?: number
  live?: boolean
  children?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {live && <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden />}
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-950">{label}</h2>
        {typeof count === "number" && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-500">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function DayGroupList({
  groups,
  renderMatch,
}: {
  groups: DayGroup[]
  renderMatch: (match: NormalizedMatch, showDate: boolean) => ReactNode
}) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="mb-2 pl-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 first-letter:uppercase">
            {group.label}
          </p>
          <div className="space-y-2.5">{group.matches.map((match) => renderMatch(match, false))}</div>
        </div>
      ))}
    </div>
  )
}

export function MatcherPageClient({ initialData }: { initialData?: EnhancedMatchData }) {
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("current")
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [finishedLimit, setFinishedLimit] = useState(FINISHED_PAGE_SIZE)
  const [timelineByMatchId, setTimelineByMatchId] = useState<Record<string, MatchFeedEvent[]>>({})
  const [topScorersByMatchId, setTopScorersByMatchId] = useState<Record<string, MatchTopScorer[]>>({})
  const [clockStateByMatchId, setClockStateByMatchId] = useState<Record<string, MatchClockState>>({})
  const [penaltiesByMatchId, setPenaltiesByMatchId] = useState<Record<string, MatchPenalty[]>>({})
  const timelineFetchInFlightRef = useRef<Record<string, Promise<void>>>({})
  const timelineFetchedAtRef = useRef<Record<string, number>>({})
  const [hasResolvedLiveData, setHasResolvedLiveData] = useState(false)
  const [hasResolvedOldData, setHasResolvedOldData] = useState(false)
  const [hasAttemptedLiveFetch, setHasAttemptedLiveFetch] = useState(false)
  const [hasAttemptedOldFetch, setHasAttemptedOldFetch] = useState(false)

  const {
    matches: liveUpcomingMatches,
    loading: liveLoading,
    error: liveError,
    hasPayload: hasLivePayload,
    hasClientData: hasClientMatchData,
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
    statusFilter === "finished" ? oldLoading || !hasOldPayload : liveLoading || !hasLivePayload
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

  useEffect(() => {
    setFinishedLimit(FINISHED_PAGE_SIZE)
  }, [selectedTeam, statusFilter])

  const allMatches = useMemo(() => [...liveUpcomingMatches, ...oldMatches], [liveUpcomingMatches, oldMatches])
  const selectedMatch = useMemo(
    () => allMatches.find((match) => match.id === selectedMatchId) ?? null,
    [allMatches, selectedMatchId],
  )

  const fetchMatchTimeline = useCallback(async (match: NormalizedMatch, force = false) => {
    const lastFetchedAt = timelineFetchedAtRef.current[match.id] ?? 0
    const shouldRefresh = force || match.matchStatus === "live" || Date.now() - lastFetchedAt > 5000
    if (!shouldRefresh && lastFetchedAt > 0) {
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
      const fetchTimelinePayload = async (url: string) => {
        const response = await fetch(url, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        })
        if (!response.ok) {
          return null
        }
        return response.json()
      }

      const payload = await fetchTimelinePayload(`${API_BASE_URL}/matcher/match/${encodeURIComponent(apiMatchId)}?includeEvents=1`)
      const rawTimeline = resolvePreferredTimeline(payload ?? {}, match.matchFeed ?? [])

      if (!payload) {
        throw new Error("Could not load timeline")
      }

      const normalized = dedupeTimelineEvents(rawTimeline.map((event: any) => mapTimelineEvent(event)))
      setTimelineByMatchId((prev) => ({ ...prev, [match.id]: normalized }))
      timelineFetchedAtRef.current[match.id] = Date.now()
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
  }, [])

  const openMatchModal = useCallback(
    (match: NormalizedMatch) => {
      setSelectedMatchId(match.id)
      fetchMatchTimeline(match, true).catch((error) => {
        console.warn("Failed to hydrate match timeline", error)
      })
    },
    [fetchMatchTimeline],
  )

  const prefetchMatchTimeline = useCallback(
    (match: NormalizedMatch) => {
      fetchMatchTimeline(match).catch(() => undefined)
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

  useEffect(() => {
    if (!selectedMatch) return
    if (selectedMatch.matchStatus !== "live") return

    const interval = window.setInterval(() => {
      fetchMatchTimeline(selectedMatch, true).catch(() => undefined)
    }, 3000)

    return () => window.clearInterval(interval)
  }, [selectedMatch, fetchMatchTimeline])

  const selectedTeamKeys = useMemo(() => {
    if (selectedTeam === "all") {
      return null
    }
    return TEAM_MATCH_KEY_MAP[selectedTeam] ?? buildTeamKeys(selectedTeam)
  }, [selectedTeam])

  const matchesForFilter = useMemo(() => {
    // Finished matches come ONLY from the /data/old source: it is the single
    // authoritative, always-published, correctly-ordered set. The live endpoint
    // also returns finished matches, but a different (and unpublished-polluted)
    // subset — mixing them made "Resultat" show a different list/order and count
    // on every load and re-render. Live/upcoming still come from the live source.
    const liveSourceFiltered = liveUpcomingMatches.filter(
      (match) => getMatchStatus(match) !== "finished",
    )

    // oldMatches first so its (always-published) copy wins any dedup tie.
    const seenIds = new Set<string>()
    const mergedMatches = [...oldMatches, ...liveSourceFiltered].filter((match) => {
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
      const tsA = typeof a.startTimestamp === "number" ? a.startTimestamp : new Date(a.date).getTime()
      const tsB = typeof b.startTimestamp === "number" ? b.startTimestamp : new Date(b.date).getTime()
      const endA = getMatchEndTime(a)?.getTime() ?? (tsA + 90 * 60 * 1000)
      const endB = getMatchEndTime(b)?.getTime() ?? (tsB + 90 * 60 * 1000)
      if (endA !== endB) {
        return endB - endA
      }
      return compareMatchesByDateDescStable(a, b)
    })

    return { live, upcoming, finished }
  }, [filteredMatches])

  const liveCount = groupedMatches.live.length
  const visibleFinished = groupedMatches.finished.slice(0, finishedLimit)
  const hiddenFinishedCount = groupedMatches.finished.length - visibleFinished.length

  const upcomingGroups = useMemo(() => groupMatchesByDay(groupedMatches.upcoming), [groupedMatches.upcoming])
  const finishedGroups = useMemo(() => groupMatchesByDay(visibleFinished), [visibleFinished])

  const renderMatch = useCallback(
    (match: NormalizedMatch, showDate: boolean) => (
      <MatchCard
        key={match.id}
        match={match}
        hasClientMatchData={hasClientMatchData}
        showDate={showDate}
        onOpen={openMatchModal}
        onPrefetch={prefetchMatchTimeline}
      />
    ),
    [hasClientMatchData, openMatchModal, prefetchMatchTimeline],
  )

  const emptySlimRow = (label: string, description: string) => (
    <section className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-baseline gap-3">
        <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">{label}</p>
        <p className="truncate text-sm text-slate-400">{description}</p>
      </div>
      <span className="shrink-0 text-xs font-medium text-slate-400">Inga just nu</span>
    </section>
  )

  const showMoreButton = hiddenFinishedCount > 0 && (
    <div className="mt-4 flex justify-center">
      <button
        type="button"
        onClick={() => setFinishedLimit((prev) => prev + FINISHED_PAGE_SIZE)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
      >
        Visa fler resultat
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-500">
          {hiddenFinishedCount}
        </span>
      </button>
    </div>
  )

  const liveSection =
    liveCount > 0 ? (
      <section>
        <SectionHeader label="Live nu" count={liveCount} live />
        <div className="space-y-2.5">{groupedMatches.live.map((match) => renderMatch(match, true))}</div>
      </section>
    ) : null

  const upcomingSection =
    groupedMatches.upcoming.length > 0 ? (
      <section>
        <SectionHeader label="Kommande matcher" count={groupedMatches.upcoming.length} />
        <DayGroupList groups={upcomingGroups} renderMatch={renderMatch} />
      </section>
    ) : null

  const finishedSection =
    groupedMatches.finished.length > 0 ? (
      <section>
        <SectionHeader label="Senaste resultaten" count={groupedMatches.finished.length} />
        <DayGroupList groups={finishedGroups} renderMatch={renderMatch} />
        {showMoreButton}
      </section>
    ) : null

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_36%,#f8fafc_100%)] pb-16">
      <div className="h-24" />
      <div className="container mx-auto max-w-4xl px-4">
        <header className="pt-4 sm:pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-emerald-600">Matchcenter</p>
              <h1 className="mt-1.5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Matcher</h1>
              <p className="mt-1.5 text-sm text-slate-500">Live, kommande matcher och resultat. Uppdateras automatiskt.</p>
            </div>
            {liveCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter("live")}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden />
                {liveCount === 1 ? "1 match live" : `${liveCount} matcher live`}
              </button>
            )}
          </div>
        </header>

        <div className="sticky top-16 z-30 mt-5 sm:top-[72px]">
          <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-2.5 shadow-[0_8px_28px_rgba(15,23,42,0.06)] backdrop-blur-md">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div
                role="tablist"
                aria-label="Filtrera matchvy"
                className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100/80 p-1"
              >
                {STATUS_OPTIONS.map((option) => {
                  const isActive = statusFilter === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setStatusFilter(option.value)}
                      className={`relative rounded-lg px-2 py-1.5 text-xs font-semibold transition sm:px-3 sm:text-sm ${
                        isActive ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      {option.label}
                      {option.value === "live" && liveCount > 0 && (
                        <span
                          className={`absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full ${
                            isActive ? "bg-rose-400" : "bg-rose-500"
                          }`}
                          aria-hidden
                        />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-2">
                <select
                  id="team-filter"
                  aria-label="Filtrera lag"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition focus:border-emerald-400 focus:outline-none lg:w-52 lg:flex-none"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                >
                  <option value="all">Alla lag</option>
                  {TEAM_OPTIONS.map((team) => (
                    <option key={team.value} value={team.value}>
                      {team.label}
                    </option>
                  ))}
                </select>
                <Link
                  href="/tabeller"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
                  </svg>
                  Tabeller
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-7">
          {activeError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-red-800">{activeError}</p>
              </div>
            </div>
          )}

          {(isLoading || (!activeError && !hasLoadedAnyMatches)) && filteredMatches.length === 0 && (
            <div className="space-y-2.5" aria-label="Hämtar matcher" role="status">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          )}

          {!isLoading &&
            filteredMatches.length === 0 &&
            !activeError &&
            hasCurrentPayload &&
            hasResolvedActiveData &&
            hasLoadedAnyMatches &&
            (statusFilter === "finished" ? hasAttemptedOldFetch : hasAttemptedLiveFetch) && (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
              <svg className="mx-auto h-14 w-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="mt-4 text-xl font-semibold text-slate-950">Inga matcher hittades</h2>
              <p className="mt-2 text-sm text-slate-500">Ändra lag eller byt vy för att se fler matcher.</p>
              <button
                onClick={() => {
                  setSelectedTeam("all")
                  setStatusFilter("current")
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Återställ filter
              </button>
            </div>
          )}

          {!isLoading && filteredMatches.length > 0 && statusFilter === "current" && (
            <>
              {liveSection ?? emptySlimRow("Live", "Matcher som just nu är igång.")}
              {upcomingSection ?? emptySlimRow("Kommande", "Det som står på tur i matchkalendern.")}
              {finishedSection ?? emptySlimRow("Resultat", "Senaste resultaten.")}
            </>
          )}

          {!isLoading && filteredMatches.length > 0 && statusFilter === "live" && liveSection}
          {!isLoading && filteredMatches.length > 0 && statusFilter === "upcoming" && upcomingSection}
          {!isLoading && filteredMatches.length > 0 && statusFilter === "finished" && finishedSection}
        </div>
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
            await forceMatchDataPoll().catch(() => undefined)
            await fetchMatchTimeline(selectedMatch, true).catch(() => undefined)
          }}
        />
      )}
    </main>
  )
}
