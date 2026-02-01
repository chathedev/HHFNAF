"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { buildMatchScheduleLabel, getMatchupLabel, canOpenMatchTimeline, getSimplifiedMatchStatus } from "@/lib/match-card-utils"
import { useMatchData, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchFeedModal } from "@/components/match-feed-modal"
import { normalizeMatchKey } from "@/lib/matches"
import { extendTeamDisplayName, createTeamMatchKeySet } from "@/lib/team-display"
import type { EnhancedMatchData } from "@/lib/use-match-data"

const TICKET_URL = "https://clubs.clubmate.se/harnosandshf/overview/"

type StatusFilter = "current" | "live" | "upcoming" | "finished"

const getMatchStatus = (match: NormalizedMatch): StatusFilter => {
  // TRUST BACKEND COMPLETELY - it knows the real match status
  return match.matchStatus === "halftime" ? "live" : (match.matchStatus ?? "upcoming")
}

const hasPublishedResult = (match: NormalizedMatch) => {
  const result = match.result?.trim()
  if (!result) {
    return false
  }
  if (result.toLowerCase() === "inte publicerat") {
    return false
  }

  const scoreMatch = result.match(/(\d+)[-–](\d+)/)
  if (!scoreMatch) {
    return false
  }

  const homeScore = Number.parseInt(scoreMatch[1], 10)
  const awayScore = Number.parseInt(scoreMatch[2], 10)
  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return false
  }

  return homeScore > 0 || awayScore > 0
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

export function MatcherPageClient({ initialData }: { initialData?: EnhancedMatchData }) {
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("current")
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  const {
    matches: liveUpcomingMatches,
    loading: liveLoading,
    error: liveError,
    refresh,
    isRefreshing,
  } = useMatchData({
    refreshIntervalMs: 1_000,
    dataType: "liveUpcoming",
    initialData,
    params: { limit: 80 },
  })

  const {
    matches: oldMatches,
    loading: oldLoading,
    error: oldError,
  } = useMatchData({
    refreshIntervalMs: 60_000,
    dataType: "old",
    params: { limit: 60 },
  })

  const isLoading = statusFilter === "finished" ? oldLoading : liveLoading
  const activeError = statusFilter === "finished" ? oldError : liveError

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

  const selectedMatch = useMemo(() => {
    if (!selectedMatchId) {
      return null
    }
    return (
      allMatches.find((match) => match.id === selectedMatchId) ??
      null
    )
  }, [selectedMatchId, allMatches])

  useEffect(() => {
    if (!selectedMatchId || isLoading) {
      return
    }
    if (!selectedMatch) {
      setSelectedMatchId(null)
    }
  }, [selectedMatchId, selectedMatch, isLoading])

  const teamOptions = TEAM_OPTIONS

  const selectedTeamKeys = useMemo(() => {
    if (selectedTeam === "all") {
      return null
    }
    return TEAM_MATCH_KEY_MAP[selectedTeam] ?? buildTeamKeys(selectedTeam)
  }, [selectedTeam])

  const matchesForFilter = useMemo(() => {
    return statusFilter === "finished" ? oldMatches : liveUpcomingMatches
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
        return status === "finished" && hasPublishedResult(match)
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
    finished.sort((a, b) => b.date.getTime() - a.date.getTime())

    return { live, upcoming, finished }
  }, [filteredMatches])

  const renderMatchCard = (match: NormalizedMatch) => {
    const status = getSimplifiedMatchStatus(match)
    const canOpenTimeline = canOpenMatchTimeline(match)
    const scheduleLabel = buildMatchScheduleLabel(match)
    const matchupLabel = getMatchupLabel(match)
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
        className={`relative flex flex-col gap-3 rounded-3xl border bg-white px-5 py-6 transition-all ${canOpenTimeline ? "cursor-pointer border-gray-200 hover:border-emerald-300 hover:shadow-xl" : "border-gray-100"}`}
        onClick={() => canOpenTimeline && setSelectedMatchId(match.id)}
        role={canOpenTimeline ? "button" : undefined}
        tabIndex={canOpenTimeline ? 0 : undefined}
        onKeyDown={(event) => {
          if (canOpenTimeline && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault()
            setSelectedMatchId(match.id)
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">
              {teamTypeLabel}
            </p>
            <h3 className="text-2xl font-semibold text-gray-900 leading-tight">
              {matchupLabel}
            </h3>
            {scheduleLabel && <p className="text-sm text-gray-500">{scheduleLabel}</p>}
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${statusBadge.tone}`}>
            {statusBadge.label}
          </span>
        </div>

        {scoreValue && (
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-gray-900" data-score-value="true">
              {scoreValue}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
              {status === "live" ? "Pågår" : "Resultat"}
            </span>
          </div>
        )}

        {match.series && (
          <p className="text-xs text-slate-400">{match.series}</p>
        )}
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
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-24">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tillbaka
          </Link>
          <h1 className="text-5xl font-black text-gray-900 mb-4">Matcher</h1>
          <p className="text-xl text-gray-600 max-w-2xl">
            Följ alla våra lag live och se resultat från senaste matcherna. Välj lag nedan:
          </p>
        </div>

        {/* Metadata Stats */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border-2 border-emerald-200">
            <div className="text-sm font-semibold text-emerald-700 mb-1">Totalt</div>
            <div className="text-2xl font-black text-emerald-900">{matchStats.totalMatches}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border-2 border-red-200">
            <div className="text-sm font-semibold text-red-700 mb-1">Live nu</div>
            <div className="text-2xl font-black text-red-900">{matchStats.liveMatches}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="text-sm font-semibold text-blue-700 mb-1">Kommande</div>
            <div className="text-2xl font-black text-blue-900">{matchStats.upcomingMatches}</div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border-2 border-gray-200">
            <div className="text-sm font-semibold text-gray-700 mb-1">Avslutade</div>
            <div className="text-2xl font-black text-gray-900">{matchStats.finishedMatches}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => {
                  const isActive = statusFilter === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setStatusFilter(option.value)}
                      className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
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
        {isLoading && filteredMatches.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-emerald-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Hämtar matcher...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredMatches.length === 0 && !activeError && (
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
                  <h2 className="text-2xl font-black text-gray-900">Live nu</h2>
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-bold rounded-full">
                    {groupedMatches.live.length}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <h2 className="text-2xl font-black text-gray-900">Kommande matcher</h2>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full">
                    {groupedMatches.upcoming.length}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <h2 className="text-2xl font-black text-gray-900">Senaste resultaten</h2>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-bold rounded-full">
                    {groupedMatches.finished.length}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedMatches.finished.map(renderMatchCard)}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Match Feed Modal */}
        {selectedMatch && (() => {
          // Use the actual display names from the match card
          const displayOpponentName = selectedMatch.opponent.replace(/\s*\((hemma|borta)\)\s*$/i, '').trim()
          const displayHomeTeam = selectedMatch.isHome !== false ? "Härnösands HF" : displayOpponentName
          const displayAwayTeam = selectedMatch.isHome !== false ? displayOpponentName : "Härnösands HF"

          return (
            <MatchFeedModal
              isOpen={true}
              onClose={() => setSelectedMatchId(null)}
              matchFeed={selectedMatch.matchFeed || []}
              homeTeam={displayHomeTeam}
              awayTeam={displayAwayTeam}
              finalScore={selectedMatch.result}
              matchStatus={selectedMatch.matchStatus}
              matchId={selectedMatch.id}
              onRefresh={async () => {
                console.log('🔄 Matcher page: Starting refresh...')
                let refreshedMatches: NormalizedMatch[] | undefined
                try {
                  const refreshedData = await refresh()
                  refreshedMatches = refreshedData?.matches
                  console.log('🔄 Matcher page: Refresh complete, updating selectedMatch...')
                } catch (refreshError) {
                  console.warn('⚠️ Matcher page: Refresh failed', refreshError)
                }

                setSelectedMatchId((prevMatchId) => {
                  if (!prevMatchId) {
                    console.log('🔄 Matcher page: Modal closed, skipping update')
                    return null
                  }
                  const searchSpace = refreshedMatches ?? allMatches
                  const updatedMatch = searchSpace.find((match) => match.id === prevMatchId)
                  if (updatedMatch) {
                    console.log('🔄 Matcher page: Found updated match:', {
                      matchFeedLength: updatedMatch.matchFeed?.length || 0,
                      result: updatedMatch.result,
                      status: updatedMatch.matchStatus,
                    })
                    return updatedMatch.id
                  }
                  console.log('⚠️ Matcher page: Match not found after refresh')
                  return prevMatchId
                })
              }}
            />
          )
        })()}
      </div>
    </main>
  )
}
