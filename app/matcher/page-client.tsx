"use client"

import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"

import {
  buildMatchScheduleLabel,
  canOpenMatchTimeline,
  getMatchupLabel,
  getSimplifiedMatchStatus,
  shouldShowFinishedZeroZeroIssue,
  shouldShowProfixioTechnicalIssue,
} from "@/lib/match-card-utils"
import { getMatchEndTime, useMatchData, forceMatchDataPoll, type NormalizedMatch } from "@/lib/use-match-data"
import { AnimatedScore } from "@/components/animated-score"
import { MatchCardCTA } from "@/components/match-card-cta"
import { MatchFeedModal, type MatchClockState, type MatchFeedEvent, type MatchPenalty } from "@/components/match-feed-modal"
import { normalizeMatchKey } from "@/lib/matches"
import { extendTeamDisplayName, createTeamMatchKeySet } from "@/lib/team-display"
import { compareMatchesByDateAscStable, compareMatchesByDateDescStable } from "@/lib/match-sort"
import { Ticket } from "lucide-react"
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

type StandingsTeam = {
  team: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

type StandingsSeries = {
  series: string
  teams: StandingsTeam[]
}

const STANDINGS_REFRESH_MS = 90_000

function StandingsSection({ selectedTeam }: { selectedTeam: string }) {
  const [standings, setStandings] = useState<StandingsSeries[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = (silent: boolean) => {
      const params = new URLSearchParams({ meta: "1" })
      if (selectedTeam && selectedTeam !== "all") {
        params.set("team", selectedTeam)
      }
      if (!silent) setLoading(true)
      fetch(`${API_BASE_URL}/matcher/standings?${params}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject("Failed")))
        .then((data) => {
          if (cancelled) return
          // With meta=1: { updatedAt, standings: { seriesName: [...] } }.
          // Fall back to the bare { seriesName: [...] } shape.
          const tables = data && typeof data === "object" && "standings" in data ? data.standings : data
          if (data && typeof data === "object" && "updatedAt" in data) {
            setUpdatedAt(data.updatedAt ?? null)
          }
          const parsed: StandingsSeries[] = Object.entries(tables ?? {})
            .filter(([, teams]) => Array.isArray(teams) && (teams as any[]).length > 0)
            .map(([series, teams]) => ({
              series,
              teams: (teams as any[]).map((t) => ({
                team: t.team ?? "",
                played: t.M ?? 0,
                wins: t.W ?? 0,
                draws: t.D ?? 0,
                losses: t.L ?? 0,
                goalsFor: t.GF ?? 0,
                goalsAgainst: t.GA ?? 0,
                goalDifference: t.GD ?? 0,
                points: t.P ?? 0,
              })),
            }))
            .sort((a, b) => b.teams.length - a.teams.length)
          setStandings(parsed)
          setExpandedSeries((prev) => prev ?? (parsed.length > 0 ? parsed[0].series : null))
        })
        .catch(() => {
          // Keep last-known tables on silent refresh failures.
          if (!silent && !cancelled) setStandings([])
        })
        .finally(() => {
          if (!silent && !cancelled) setLoading(false)
        })
    }

    load(false)
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      load(true)
    }, STANDINGS_REFRESH_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [selectedTeam])

  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })
    : null

  if (loading) {
    return (
      <section className="mt-8">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-6 w-48 animate-pulse rounded bg-slate-100" />
          <div className="mt-5 space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-50" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (standings.length === 0) {
    return (
      <section id="tabeller" className="mt-8 scroll-mt-8">
        <div className="rounded-[26px] border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Tabeller</p>
          <p className="mt-2 text-sm text-slate-500">Serietabellerna uppdateras just nu — titta tillbaka om en liten stund.</p>
        </div>
      </section>
    )
  }

  return (
    <section id="tabeller" className="mt-8 scroll-mt-8">
      <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.95),rgba(255,255,255,0.95))] px-5 py-5 sm:px-6">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Tabeller</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Serieställning</h2>
              <p className="mt-1 text-sm text-slate-500">Officiella serietabeller från Profixio.</p>
            </div>
            {updatedLabel && (
              <span className="shrink-0 text-xs text-slate-400">Uppdaterad {updatedLabel}</span>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100 p-4 sm:p-5">
          {standings.map((s) => {
            const isExpanded = expandedSeries === s.series
            return (
              <div key={s.series} className="py-3 first:pt-0 last:pb-0">
                <button
                  onClick={() => setExpandedSeries(isExpanded ? null : s.series)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-slate-50"
                >
                  <span className="text-sm font-semibold text-slate-900">{s.series}</span>
                  <span className="text-xs text-slate-400">{isExpanded ? "−" : "+"}</span>
                </button>
                {isExpanded && (
                  <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2.5">#</th>
                          <th className="px-3 py-2.5">Lag</th>
                          <th className="px-3 py-2.5 text-center">M</th>
                          <th className="px-3 py-2.5 text-center">V</th>
                          <th className="px-3 py-2.5 text-center">O</th>
                          <th className="px-3 py-2.5 text-center">F</th>
                          <th className="px-3 py-2.5 text-center hidden sm:table-cell">GM</th>
                          <th className="px-3 py-2.5 text-center hidden sm:table-cell">IM</th>
                          <th className="px-3 py-2.5 text-center">+/−</th>
                          <th className="px-3 py-2.5 text-center font-bold">P</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {s.teams.map((team, idx) => {
                          const isHHF = team.team.toLowerCase().includes("härnösand") || team.team.toLowerCase().includes("harnosand")
                          return (
                            <tr key={team.team} className={`${isHHF ? "bg-emerald-50/60 font-medium" : ""} hover:bg-slate-50/80 transition`}>
                              <td className="px-3 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                              <td className="px-3 py-2.5 text-slate-900 whitespace-nowrap max-w-[180px] truncate">
                                {isHHF && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle" />}
                                {team.team}
                              </td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{team.played}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{team.wins}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{team.draws}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{team.losses}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600 hidden sm:table-cell">{team.goalsFor}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600 hidden sm:table-cell">{team.goalsAgainst}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`text-xs font-medium ${team.goalDifference > 0 ? "text-emerald-600" : team.goalDifference < 0 ? "text-rose-500" : "text-slate-400"}`}>
                                  {team.goalDifference > 0 ? "+" : ""}{team.goalDifference}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900">{team.points}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
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
    statusFilter === "finished"
      ? oldLoading || !hasOldPayload
      : statusFilter === "current"
        ? liveLoading || !hasLivePayload
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

  const allMatches = useMemo(() => [...liveUpcomingMatches, ...oldMatches], [liveUpcomingMatches, oldMatches])
  const selectedMatch = useMemo(
    () => allMatches.find((match) => match.id === selectedMatchId) ?? null,
    [allMatches, selectedMatchId],
  )

  const fetchMatchTimeline = useCallback(async (match: NormalizedMatch, force = false) => {
    const lastFetchedAt = timelineFetchedAtRef.current[match.id] ?? 0
    const shouldRefresh = force || match.matchStatus === "live" || Date.now() - lastFetchedAt > 5000
    if (!shouldRefresh && Object.prototype.hasOwnProperty.call(timelineByMatchId, match.id)) {
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
  }, [timelineByMatchId])

  const openMatchModal = useCallback(
    (match: NormalizedMatch) => {
      setSelectedMatchId(match.id)
      fetchMatchTimeline(match, true).catch((error) => {
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

  useEffect(() => {
    if (!selectedMatch) return
    if (selectedMatch.matchStatus !== "live") return

    const interval = window.setInterval(() => {
      fetchMatchTimeline(selectedMatch, true).catch(() => undefined)
    }, 3000)

    return () => window.clearInterval(interval)
  }, [selectedMatch, fetchMatchTimeline])

  const teamOptions = TEAM_OPTIONS

  const selectedTeamKeys = useMemo(() => {
    if (selectedTeam === "all") {
      return null
    }
    return TEAM_MATCH_KEY_MAP[selectedTeam] ?? buildTeamKeys(selectedTeam)
  }, [selectedTeam])

  const matchesForFilter = useMemo(() => {
    // The live endpoint also returns finished matches, but includes unpublished
    // ones ("Inte publicerat"). The /data/old source is the clean, published,
    // correctly-ordered authority for results. So from the live source we keep
    // only live/upcoming plus finished matches that actually have a published
    // result — otherwise unpublished archive matches flicker into "Resultat"
    // and the list shows a different order on each load.
    const liveSourceFiltered = liveUpcomingMatches.filter((match) => {
      if (getMatchStatus(match) !== "finished") return true
      const result = typeof match.result === "string" ? match.result.trim().toLowerCase() : ""
      return result !== "" && result !== "inte publicerat"
    })

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

  const renderMatchCard = (match: NormalizedMatch) => {
    const status = getSimplifiedMatchStatus(match)
    const canOpenTimeline = canOpenMatchTimeline(match)
    const scheduleLabel = buildMatchScheduleLabel(match)
    const matchupLabel = getMatchupLabel(match)
    const showProfixioWarning = shouldShowProfixioTechnicalIssue(match)
    const showFinishedZeroZeroIssue = hasClientMatchData && shouldShowFinishedZeroZeroIssue(match)
    const teamTypeRaw = match.teamType?.trim() || ""
    const teamTypeLabel = extendTeamDisplayName(teamTypeRaw) || teamTypeRaw || "Härnösands HF"
    const cleanedResult = match.result?.trim()
    const isUnconfirmedZero = !hasClientMatchData && (status === "live" || status === "finished") && cleanedResult != null && /^0\s*[-–—]\s*0$/.test(cleanedResult)
    const scoreValue =
      status === "upcoming" || match.resultState === "not_started" || match.resultState === "live_pending" || isUnconfirmedZero
        ? null
        : cleanedResult && cleanedResult.length > 0
          ? cleanedResult
          : status === "finished"
            ? "Resultat inväntas"
            : null
    const showLivePendingScore = status === "live" && (match.resultState === "live_pending" || isUnconfirmedZero)

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
        className={`relative rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 active:scale-[0.99] ${
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
        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">{teamTypeLabel}</p>
            </div>
            <h3 className="mt-2 text-base font-semibold leading-tight text-slate-950 sm:text-lg">
              {matchupLabel}
            </h3>
            {scheduleLabel && <p className="mt-1 text-sm leading-6 text-slate-500 break-words">{scheduleLabel}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {match.series && <span className="rounded-full bg-slate-100 px-2.5 py-1">{match.series}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <span className={`inline-flex w-fit items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusBadge.tone} ${status === "live" ? "live-badge" : ""}`}>
                {statusBadge.label}
              </span>
              {scoreValue && (
                <AnimatedScore value={scoreValue} className="text-lg font-black text-slate-950 sm:text-2xl" />
              )}
            </div>
            <div className="w-full xl:w-auto flex flex-wrap items-center gap-2">
              <MatchCardCTA match={match} status={status} />
            </div>
          </div>
        </div>
        {showLivePendingScore && (
          <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
            Matchen är live men poängen har ännu inte publicerats.
          </p>
        )}
        {showProfixioWarning && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Liveuppdateringen har tekniska problem för den här matchen just nu.
          </p>
        )}
        {showFinishedZeroZeroIssue && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Misstänkt resultatfel: matchen är avslutad men står som 0–0. Kontrollera matchrapporten.
          </p>
        )}
      </article>
    )
  }

  const statusPanels = useMemo(() => {
    const allPanels = [
      {
        key: "live" as const,
        label: "Live",
        title: "Pågår nu",
        description: "Matcher som just nu är igång.",
        matches: groupedMatches.live,
      },
      {
        key: "upcoming" as const,
        label: "Kommande",
        title: "Närmast framåt",
        description: "Det som står på tur i matchkalendern.",
        matches: groupedMatches.upcoming,
      },
      {
        key: "finished" as const,
        label: "Resultat",
        title: "Nyss klara",
        description: "Senaste resultaten.",
        matches: groupedMatches.finished,
      },
    ]

    if (statusFilter === "current") {
      return allPanels
    }

    return allPanels.filter((panel) => panel.key === statusFilter)
  }, [groupedMatches, statusFilter])

  const focusCards = useMemo(() => {
    const nextUpcoming = groupedMatches.upcoming[0] ?? null
    const nextLive = groupedMatches.live[0] ?? null
    const latestFinished = groupedMatches.finished[0] ?? null

    const cleanScore = (m: NormalizedMatch | null) => {
      const raw = typeof m?.result === "string" ? m.result.trim() : ""
      return raw && raw.toLowerCase() !== "inte publicerat" ? raw : ""
    }
    const liveScore = cleanScore(nextLive)
    const finishedScore = cleanScore(latestFinished)

    return [
      {
        label: "Live nu",
        value: liveScore || groupedMatches.live.length.toString(),
        text: nextLive ? getMatchupLabel(nextLive) : "Ingen match pågår just nu.",
        tone: "border-rose-200 bg-rose-50/70 text-rose-700",
      },
      {
        label: "Närmast framåt",
        value: groupedMatches.upcoming.length.toString(),
        text: nextUpcoming ? buildMatchScheduleLabel(nextUpcoming) : "Inget nytt schema just nu.",
        tone: "border-sky-200 bg-sky-50/70 text-sky-700",
      },
      {
        label: "Senaste resultat",
        value: finishedScore || "–",
        text: latestFinished ? getMatchupLabel(latestFinished) : "Inga färska resultat just nu.",
        tone: "border-slate-200 bg-slate-100/90 text-slate-700",
      },
    ]
  }, [groupedMatches])

  const renderStatusPanel = (panel: (typeof statusPanels)[number]) => {
    // In the overview, an empty section collapses to a slim one-line row so
    // off-season empties don't push real content down. When the user explicitly
    // filters to that view, keep the full empty state with guidance.
    if (panel.matches.length === 0 && statusFilter === "current") {
      return (
        <section
          key={panel.key}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5"
        >
          <div className="flex items-baseline gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">{panel.label}</p>
            <p className="text-sm text-slate-400">{panel.description}</p>
          </div>
          <span className="text-xs font-medium text-slate-400">Inga just nu</span>
        </section>
      )
    }

    return (
      <section key={panel.key} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.95),rgba(255,255,255,0.95))] px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">{panel.label}</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{panel.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{panel.description}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {panel.matches.length}
            </span>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {panel.matches.length > 0 ? (
            <div className="space-y-3">{panel.matches.map(renderMatchCard)}</div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Inga matcher i den här vyn just nu.
            </div>
          )}
        </div>
      </section>
    )
  }
  useEffect(() => {
    // Remove ?team filtering from URL, only set selectedTeam from dropdown
    // This disables auto-select from URL and fixes jumping back to 'Alla lag'
    // User can only select team from dropdown
    // eslint-disable-next-line
  }, [teamOptions])

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_32%,#f8fafc_100%)] py-8 sm:py-10">
      <div className="container mx-auto max-w-7xl px-4">
        <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96),rgba(236,253,245,0.82))] px-5 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition hover:text-emerald-900"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Till startsidan
                </Link>
                <div className="mt-4 flex items-center gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-600">Matchcenter</p>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">Matcher</h1>
                <p className="mt-2 max-w-xl text-sm text-slate-500">
                  Live, kommande och resultat – uppdateras automatiskt.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[28rem]">
                {focusCards.map((card) => (
                  <div key={card.label} className={`rounded-2xl border px-4 py-3 ${card.tone}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em]">{card.label}</p>
                    <p className="mt-1 text-xl font-black tabular-nums">{card.value}</p>
                    <p className="mt-1 truncate text-xs leading-4 opacity-80" title={card.text}>{card.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Toolbar: view toggle + team filter + result count, all on one line */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100/80 p-1">
              {STATUS_OPTIONS.map((option) => {
                const isActive = statusFilter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setStatusFilter(option.value)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition sm:text-sm ${
                      isActive ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                {filteredMatches.length} matcher
              </span>
              <select
                id="team-filter"
                aria-label="Filtrera lag"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 transition focus:border-emerald-400 focus:outline-none lg:w-auto"
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
              <Link
                href="/tabeller"
                className="hidden shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 sm:inline-flex"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
                </svg>
                Tabeller
              </Link>
            </div>
          </div>
        </section>

        {/* Tabeller link — mobile only (desktop has it in the toolbar) */}
        <div className="mt-5 flex justify-center sm:hidden">
          <Link
            href="/tabeller"
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
            </svg>
            Se alla tabeller
          </Link>
        </div>

        <div className="mt-8 space-y-6">
          {activeError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-red-800">{activeError}</p>
              </div>
            </div>
          )}

          {(isLoading || (!activeError && !hasLoadedAnyMatches)) && filteredMatches.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
              <p className="mt-4 text-sm font-medium text-slate-600">Hämtar matcher...</p>
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

          {!isLoading && filteredMatches.length > 0 && <div className="space-y-5">{statusPanels.map(renderStatusPanel)}</div>}
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
