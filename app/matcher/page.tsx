"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import Link from "next/link"
import confetti from "canvas-confetti"

import { useMatchData, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchFeedModal } from "@/components/match-feed-modal"
import { TICKET_VENUES } from "@/lib/matches"

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
  
  // Don't show 0-0 as "Oavgjort" for live matches (match hasn't finished yet)
  if (status === "live" && homeScore === 0 && awayScore === 0) {
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
  if (match.matchStatus) {
    return match.matchStatus
  }
  
  const now = Date.now()
  const kickoff = match.date.getTime()
  const liveWindowEnd = kickoff + 1000 * 60 * 60 * 2.5
  
  if (now >= kickoff && now <= liveWindowEnd) {
    return "live"
  }
  
  if (match.result && match.result !== "Inte publicerat") {
    return "finished"
  }

  return "upcoming"
}

export default function MatcherPage() {
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [selectedMatch, setSelectedMatch] = useState<NormalizedMatch | null>(null)
  
  // Use "old" endpoint when viewing only finished matches, otherwise use "current"
  const dataType: "current" | "old" | "both" = statusFilter === "finished" ? "old" : "current"
  
  const { matches, loading, error } = useMatchData({ 
    refreshIntervalMs: 1_000,
    dataType
  })

  const teamOptions = useMemo(() => {
    const unique = new Map<string, string>()
    matches.forEach((match) => {
      const label = match.teamType.trim()
      if (!unique.has(match.normalizedTeam)) {
        unique.set(match.normalizedTeam, label)
      }
    })
    return Array.from(unique.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "sv-SE"))
  }, [matches])

  const filteredMatches = useMemo(() => {
    const now = Date.now()
    const threeHoursAgo = now - (1000 * 60 * 60 * 3)
    
    return matches.filter((match) => {
      if (selectedTeam !== "all" && match.normalizedTeam !== selectedTeam) {
        return false
      }
      
      const status = getMatchStatus(match)
      
      if (statusFilter !== "all" && status !== statusFilter) {
        return false
      }
      
      // Only apply 3-hour window when showing "all" matches
      // When explicitly filtering for "finished", show all finished matches
      const kickoff = match.date.getTime()
      if (status === "finished" && statusFilter === "all" && kickoff < threeHoursAgo) {
        return false
      }
      
      return true
    })
  }, [matches, selectedTeam, statusFilter])

  // Group matches by status
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
    
    // Sort each group
    live.sort((a, b) => a.date.getTime() - b.date.getTime())
    upcoming.sort((a, b) => a.date.getTime() - b.date.getTime())
    finished.sort((a, b) => b.date.getTime() - a.date.getTime()) // Most recent first
    
    return { live, upcoming, finished }
  }, [filteredMatches])

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
    
    // Ticket button logic: only for home matches, A-lag herr and dam/utv, upcoming matches, and eligible venues
    const normalizedTeamType = match.teamType.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const isALagHerrOrDam = normalizedTeamType.includes("a lag") && (normalizedTeamType.includes("herr") || normalizedTeamType.includes("dam") || normalizedTeamType.includes("utv"))
    const venueName = match.venue?.toLowerCase() ?? ""
    const showTicket = status === "upcoming" && isHome && isALagHerrOrDam && TICKET_VENUES.some((keyword) => venueName.includes(keyword))
    
    return (
      <article
        key={match.id}
        className={`bg-white rounded-lg border border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all p-6 group relative ${
          canOpenTimeline ? "cursor-pointer" : ""
        }`}
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
        {/* Click hint badge - only show if timeline is clickable */}
        {canOpenTimeline && (
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Se matchhändelser
            </span>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
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
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
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

        {/* Result or Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {hasValidResult ? (
              status === "finished" ? (
                <div className="flex items-center gap-3">
                  {outcomeInfo?.label && outcomeInfo.label !== "Ej publicerat" && (
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded ${
                        outcomeInfo.label === "Vinst"
                          ? "bg-green-100 text-green-800"
                          : outcomeInfo.label === "Förlust"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {outcomeInfo.label}
                    </span>
                  )}
                  <span className="text-2xl font-bold text-gray-900">
                    {match.result}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-gray-900">{match.result}</span>
              )
            ) : status === "finished" ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900">0–0</span>
                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Resultat ej publicerat</span>
                </div>
              </div>
            ) : null}

            {match.playUrl && match.playUrl !== "null" && (
              <a
                href={match.playUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
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
          </div>

          {showTicket && (
            <Link
              href={TICKET_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              Köp biljett
            </Link>
          )}
        </div>
      </article>
    )
  }

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
            Följ alla våra lag live och se resultat från senaste matcherna
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                Filtrera lag
              </label>
              <select
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
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                Matchstatus
              </label>
              <select
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
        {selectedMatch && (
          <MatchFeedModal
            isOpen={true}
            onClose={() => setSelectedMatch(null)}
            matchFeed={selectedMatch.matchFeed || []}
            homeTeam={selectedMatch.homeTeam}
            awayTeam={selectedMatch.awayTeam}
            finalScore={selectedMatch.result}
            matchStatus={selectedMatch.matchStatus}
          />
        )}
      </div>
    </main>
  )
}
