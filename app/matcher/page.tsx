"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { useMatchData, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchFeedModal } from "@/components/match-feed-modal"
import { canShowTicketForMatch } from "@/lib/matches"

const TICKET_URL = "https://clubs.clubmate.se/harnosandshf/overview/"

type StatusFilter = "all" | "upcoming" | "live" | "finished"
type DataTypeFilter = "both" | "current" | "old"

type MatchOutcome = {
  text: string
  label: "Vinst" | "Förlust" | "Oavgjort" | "Ej publicerat"
}

const getMatchOutcome = (rawResult?: string, isHome?: boolean, status?: string): MatchOutcome | null => {
  if (!rawResult) {
    return null
  }
  const scoreboardMatch = rawResult.match(/(\d+)\s*[–-]\s*(\d+)/)
  if (!scoreboardMatch) {
    return null
  }
  const homeScore = Number.parseInt(scoreboardMatch[1], 10)
  const awayScore = Number.parseInt(scoreboardMatch[2], 10)
  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return null
  }
  
  // Don't show outcome badges for live matches - only show for finished matches
  if (status === "live") {
    return null
  }
  
  const isAway = isHome === false
  const ourScore = isAway ? awayScore : homeScore
  const opponentScore = isAway ? homeScore : awayScore

  let label: MatchOutcome["label"] = "Oavgjort"
  if (ourScore > opponentScore) {
    label = "Vinst"
  } else if (ourScore < opponentScore) {
    label = "Förlust"
  }

  return {
    text: `${ourScore}\u2013${opponentScore}`,
    label,
  }
}

const getMatchStatus = (match: NormalizedMatch): StatusFilter => {
  // Respect backend/timeline signals so live matches show even if kickoff shifts
  return match.matchStatus ?? "upcoming"
}

export default function MatcherPage() {
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [selectedMatch, setSelectedMatch] = useState<NormalizedMatch | null>(null)
  
  // Track previous scores to highlight live updates
  const prevScoresRef = useRef<Map<string, { home: number; away: number }>>(new Map())
  
  // Use "both" endpoint to get current + old matches (unified endpoint)
  const dataType: "current" | "old" | "both" | "enhanced" = "both"
  
  const { matches, metadata, grouped, loading, error, refresh } = useMatchData({ 
    refreshIntervalMs: 1_000,
    dataType
  })

  // Team options with A-lag teams at the top
  const teamOptions = [
    { value: "Dam/utv", label: "Dam/utv" },
    { value: "A-lag Herrar", label: "A-lag Herrar" },
    { value: "Fritids-Teknikskola", label: "Fritids-Teknikskola" },
    { value: "F19-Senior", label: "F19-Senior" },
    { value: "F16 (2009)", label: "F16 (2009)" },
    { value: "F15 (2010)", label: "F15 (2010)" },
    { value: "F14 (2011)", label: "F14 (2011)" },
    { value: "F13 (2012)", label: "F13 (2012)" },
    { value: "F12 (2013)", label: "F12 (2013)" },
    { value: "F11 (2014)", label: "F11 (2014)" },
    { value: "F10 (2015)", label: "F10 (2015)" },
    { value: "F9 (2016)", label: "F9 (2016)" },
    { value: "F8 (2017)", label: "F8 (2017)" },
    { value: "F7 (2018)", label: "F7 (2018)" },
    { value: "F6 (2019)", label: "F6 (2019)" },
    { value: "P16 (2009/2010)", label: "P16 (2009/2010)" },
    { value: "P14 (2011)", label: "P14 (2011)" },
    { value: "P13 (2012)", label: "P13 (2012)" },
    { value: "P12 (2013/2014)", label: "P12 (2013/2014)" },
    { value: "P10 (2015)", label: "P10 (2015)" },
    { value: "P9 (2016)", label: "P9 (2016)" },
    { value: "P8 (2017)", label: "P8 (2017)" },
    { value: "P7 (2018)", label: "P7 (2018)" }
  ]

  // Enhanced filtering: combine legacy and new keys for each team
  const teamKeyMap = {
    "Dam/utv": ["Dam/utv", "Dam", "A-lag Dam", "Dam-utv"],
    "A-lag Herrar": ["A-lag Herrar", "Herr", "A-lag Herrar", "Herr-utv"],
    // Add more mappings if needed for other teams
  };

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      if (selectedTeam !== "all") {
        const keys = teamKeyMap[selectedTeam] || [selectedTeam];
        if (!keys.includes(match.normalizedTeam)) {
          return false;
        }
      }
      const status = getMatchStatus(match);
      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [matches, selectedTeam, statusFilter])

  // Group matches by status - use server-provided grouped data when available
  const groupedMatches = useMemo(() => {
    // If we have pre-grouped data from the enhanced endpoint, use it and filter
    if (grouped?.byStatus && statusFilter === "all" && selectedTeam === "all") {
      return {
        live: grouped.byStatus.live,
        upcoming: grouped.byStatus.upcoming,
        finished: grouped.byStatus.finished,
      }
    }
    
    // Otherwise, group client-side
    const live: NormalizedMatch[] = []
    const upcoming: NormalizedMatch[] = []
    const finished: NormalizedMatch[] = []
    
    filteredMatches.forEach((match) => {
      const status = getMatchStatus(match)
      if (status === "live") live.push(match)
      else if (status === "upcoming") upcoming.push(match)
      else finished.push(match)
    })
    
    // Sort each group
    live.sort((a, b) => a.date.getTime() - b.date.getTime())
    upcoming.sort((a, b) => a.date.getTime() - b.date.getTime())
    finished.sort((a, b) => b.date.getTime() - a.date.getTime()) // Most recent first
    
    return { live, upcoming, finished }
  }, [filteredMatches, grouped, statusFilter, selectedTeam])

  useEffect(() => {
    groupedMatches.live.forEach((match) => {
      const status = getMatchStatus(match)
      const scoreMatch = match.result?.match(/(\d+)\s*[–-]\s*(\d+)/)
      if (!scoreMatch) {
        prevScoresRef.current.set(match.id, { home: 0, away: 0 })
        return
      }

      const currentHomeScore = Number.parseInt(scoreScoreMatch[1], 10)
      const currentAwayScore = Number.parseInt(scoreScoreMatch[2], 10)
      if (Number.isNaN(currentHomeScore) || Number.isNaN(currentAwayScore)) {
        return
      }

      const previousScore = prevScoresRef.current.get(match.id)
      const currentSnapshot = { home: currentHomeScore, away: currentAwayScore }

      if (!previousScore) {
        prevScoresRef.current.set(match.id, currentSnapshot)
        return
      }

      let hhfScored = false
      if (match.isHome !== false) {
        hhfScored = currentHomeScore > previousScore.home
      } else {
        hhfScored = currentAwayScore > previousScore.away
      }

      if (status === "live" && hhfScored) {
        const card = document.getElementById("match-card-" + match.id)
        if (card && typeof card.animate === "function") {
          card.animate(
            [
              { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(16,185,129,0)" },
              { transform: "scale(1.015)", boxShadow: "0 0 0 6px rgba(16,185,129,0.25)" },
              { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(16,185,129,0)" },
            ],
            { duration: 600, easing: "ease-out" },
          )
        }

        if (card) {
          const scoreElement = card.querySelector('[data-score-value="true"]')
          if (scoreElement && typeof scoreElement.animate === "function") {
            scoreElement.animate(
              [
                { transform: "scale(1)", color: "inherit" },
                { transform: "scale(1.15)", color: "rgb(16, 185, 129)" },
                { transform: "scale(1)", color: "inherit" },
              ],
              { duration: 450, easing: "ease-out" },
            )
          }
          if (scoreElement) {
            scoreElement.classList.add('score-updated')
            window.setTimeout(() => scoreElement.classList.remove('score-updated'), 600)
          }
        }
      }

      prevScoresRef.current.set(match.id, currentSnapshot)
    })
  }, [groupedMatches.live])

  const renderMatchCard = (match: NormalizedMatch) => {
    const opponentName = match.opponent.replace(/\s*\((hemma|borta)\)\s*$/i, '').trim()
    const homeAwayLabel = match.isHome === false ? 'borta' : 'hemma'
    const isHome = match.isHome !== false
    const scheduleLine = [match.displayDate, match.time, match.venue].filter(Boolean).join(" • ")
    const status = getMatchStatus(match)
    
    const hasValidResult = match.result && match.result !== "Inte publicerat" && match.result !== "0-0" && match.result.trim() !== ""
    const outcomeInfo = getMatchOutcome(match.result, match.isHome, status)
    
    // Only allow clicking timeline for live or finished matches
    const canOpenTimeline = status === "live" || status === "finished"
    
    // Ticket button logic: shared eligibility + upcoming/live guard
    const showTicket = status !== "finished" && canShowTicketForMatch(match)

    const showResultCard = status === "live" || status === "finished" || hasValidResult

    let scoreValue: string | null = null
    let scoreSupportingText: string | null = null

    if (hasValidResult) {
      scoreValue = match.result
      if (status === "finished" && outcomeInfo?.label === "Ej publicerat") {
        scoreSupportingText = "Resultat ej publicerat"
      }
    } else if (status === "finished") {
      scoreValue = "0–0"
      scoreSupportingText = "Resultat ej publicerat"
    } else if (status === "live") {
      const trimmed = match.result?.trim()
      scoreValue = trimmed && trimmed.length > 0 ? trimmed : "0–0"
      if (!trimmed || trimmed === "0-0" || trimmed === "0–0") {
        scoreSupportingText = "Ingen uppdatering ännu"
      }
    }

    if (!scoreValue && showResultCard) {
      scoreValue = "—"
    }

    const resultBoxTone = (() => {
      if (status === "live") {
        return "border-rose-200 bg-rose-50"
      }
      if (status === "finished") {
        if (outcomeInfo?.label === "Vinst") {
          return "border-emerald-200 bg-emerald-50"
        }
        if (outcomeInfo?.label === "Förlust") {
          return "border-red-200 bg-red-50"
        }
        return "border-slate-200 bg-slate-50"
      }
      return "border-gray-200 bg-gray-50"
    })()

    const resultLabelClass = status === "live" ? "text-rose-600" : status === "finished" ? "text-slate-600" : "text-slate-500"
    const resultLabelText = status === "finished" ? "Slutresultat" : status === "live" ? "Ställning just nu" : "Resultat"
    // --- REDESIGN START ---
    // Layout: Score/result area is more prominent, buttons below, clear separation
    return (
      <article
        key={match.id}
        id={`match-card-${match.id}`}
        className={`bg-white rounded-lg border border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all p-6 group relative flex flex-col gap-6`}
        onClick={() => canOpenTimeline && setSelectedMatch(match)}
        role={canOpenTimeline ? "button" : undefined}
        tabIndex={canOpenTimeline ? 0 : undefined}
        onKeyDown={(e) => {
          if (canOpenTimeline && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            setSelectedMatch(match)
          }
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-semibold text-emerald-700">
                {match.teamType}
              </span>
              {status === "live" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                  LIVE
                </span>
              )}
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              {isHome ? (
                <>Härnösands HF <span className="text-gray-400">vs</span> {opponentName} ({homeAwayLabel})</>
              ) : (
                <>{opponentName} <span className="text-gray-400">vs</span> Härnösands HF ({homeAwayLabel})</>
              )}
            </h3>
            {scheduleLine && (
              <p className="text-sm text-gray-600">{scheduleLine}</p>
            )}
            {match.series && (
              <p className="text-xs text-gray-500 mt-1">{match.series}</p>
            )}
          </div>
          {match.infoUrl && (
            <Link
              href={match.infoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:text-emerald-700 transition-colors"
              title="Matchsida"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          )}
        </div>

        {/* Score/Result Area - prominent, separated */}
        {showResultCard && scoreValue !== null && (
          <div className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-6 py-5 ${resultBoxTone} shadow-sm`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${resultLabelClass} mb-1`}>{resultLabelText}</p>
            <div className="flex items-end gap-3">
              <span className="text-4xl md:text-5xl font-extrabold text-slate-900" data-score-value="true">
                {scoreValue}
              </span>
              {scoreSupportingText && (
                <span className="text-xs text-slate-500">{scoreSupportingText}</span>
              )}
            </div>
            {status === "live" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-rose-600 mt-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                Pågår
              </span>
            )}
            {status === "finished" && outcomeInfo?.label && outcomeInfo.label !== "Ej publicerat" && (
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full mt-2 ${
                  outcomeInfo.label === "Vinst"
                    ? "bg-emerald-100 text-emerald-800"
                    : outcomeInfo.label === "Förlust"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-200 text-slate-700"
                }`}
              >
                {outcomeInfo.label}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons - moved below score/result, spaced out */}
        {(match.playUrl && match.playUrl !== "null") || showTicket ? (
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            {match.playUrl && match.playUrl !== "null" && (
              <a
                href={match.playUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 shadow"
                title={status === "finished" ? "Se repris" : "Se matchen live"}
              >
                <img
                  src="/handbollplay_mini.png"
                  alt=""
                  className="h-4 w-4 brightness-0 invert"
                />
                {status === "finished" ? "Se repris" : "Se live"}
              </a>
            )}
            {showTicket && (
              <Link
                href={TICKET_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 shadow"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                Köp biljett
              </Link>
            )}
          </div>
        ) : null}
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
        {metadata && (
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border-2 border-emerald-200">
              <div className="text-sm font-semibold text-emerald-700 mb-1">Totalt</div>
              <div className="text-2xl font-black text-emerald-900">{metadata.totalMatches}</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border-2 border-red-200">
              <div className="text-sm font-semibold text-red-700 mb-1">Live nu</div>
              <div className="text-2xl font-black text-red-900">{metadata.liveMatches}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="text-sm font-semibold text-blue-700 mb-1">Kommande</div>
              <div className="text-2xl font-black text-blue-900">{metadata.upcomingMatches}</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border-2 border-gray-200">
              <div className="text-sm font-semibold text-gray-700 mb-1">Avslutade</div>
              <div className="text-2xl font-black text-gray-900">{metadata.finishedMatches}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="team-filter"
                className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider"
              >
                Filtrera lag
              </label>
              <select
                id="team-filter"
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 font-medium focus:border-emerald-400 focus:outline-none transition-colors"
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
            <div>
              <label
                htmlFor="status-filter"
                className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider"
              >
                Matchstatus
              </label>
              <select
                id="status-filter"
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 font-medium focus:border-emerald-400 focus:outline-none transition-colors"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">📋 Alla matcher</option>
                <option value="live">🔴 Live nu</option>
                <option value="upcoming">📅 Kommande</option>
                <option value="finished">✅ Avslutade</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-8 rounded-2xl border-2 border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && filteredMatches.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-emerald-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Hämtar matcher...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredMatches.length === 0 && !error && (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-gray-100">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Inga matcher hittades</h3>
            <p className="text-gray-600 mb-6">Prova att ändra dina filter</p>
            <button
              onClick={() => {
                setSelectedTeam("all")
                setStatusFilter("all")
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
            >
              Återställ filter
            </button>
          </div>
        )}

        {/* Match sections */}
        {!loading && filteredMatches.length > 0 && (
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
              onClose={() => setSelectedMatch(null)}
              matchFeed={selectedMatch.matchFeed || []}
              homeTeam={displayHomeTeam}
              awayTeam={displayAwayTeam}
              finalScore={selectedMatch.result}
              matchStatus={selectedMatch.matchStatus}
              matchId={selectedMatch.id}
              onRefresh={async () => {
                console.log('🔄 Matcher page: Starting refresh...')
                await refresh()
                console.log('🔄 Matcher page: Refresh complete, updating selectedMatch...')
                // Only update selectedMatch if modal is still open (selectedMatch is not null)
                setSelectedMatch(prevMatch => {
                  if (!prevMatch) {
                    console.log('🔄 Matcher page: Modal closed, skipping update')
                    return null
                  }
                  const updatedMatch = matches.find(m => m.id === prevMatch.id)
                  if (updatedMatch) {
                    console.log('🔄 Matcher page: Found updated match:', {
                      matchFeedLength: updatedMatch.matchFeed?.length || 0,
                      result: updatedMatch.result,
                      status: updatedMatch.matchStatus
                    })
                  } else {
                    console.log('⚠️ Matcher page: Match not found in matches array')
                  }
                  return updatedMatch || prevMatch
                })
              }}
            />
          )
        })()}
      </div>
    </main>
  )
}
