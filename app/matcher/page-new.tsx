"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import Link from "next/link"
import confetti from "canvas-confetti"

import { useMatchData, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchFeedModal } from "@/components/match-feed-modal"

const TICKET_URL = "https://clubs.clubmate.se/harnosandshf/overview/"

type StatusFilter = "all" | "upcoming" | "live" | "finished"
type DataTypeFilter = "both" | "current" | "old"

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
  
  const { matches, loading, error } = useMatchData({ 
    refreshIntervalMs: 1_000,
    dataType: "current"
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
      
      const kickoff = match.date.getTime()
      if (status === "finished" && kickoff < threeHoursAgo) {
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
    
    return (
      <div
        key={match.id}
        className="bg-white rounded-xl border-2 border-gray-100 hover:border-emerald-300 hover:shadow-lg transition-all p-6 cursor-pointer group relative"
        onClick={() => setSelectedMatch(match)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setSelectedMatch(match)
          }
        }}
      >
        {/* Status badge */}
        <div className="absolute top-4 right-4">
          {status === "live" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
              LIVE
            </span>
          )}
          {status === "finished" && hasValidResult && (
            <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
              AVSLUTAD
            </span>
          )}
        </div>

        {/* Team name badge */}
        <div className="mb-3">
          <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
            {match.teamType}
          </span>
        </div>

        {/* Match info */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {isHome ? (
            <>{opponentName} <span className="text-emerald-600">({homeAwayLabel})</span></>
          ) : (
            <>{opponentName} <span className="text-emerald-600">({homeAwayLabel})</span></>
          )}
        </h3>

        {scheduleLine && (
          <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {scheduleLine}
          </p>
        )}

        {match.series && (
          <p className="text-xs text-gray-500 mb-4">{match.series}</p>
        )}

        {/* Result or Status */}
        <div className="pt-4 border-t border-gray-100">
          {hasValidResult ? (
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gray-900">{match.result}</span>
              {match.matchFeed && match.matchFeed.length > 0 && (
                <span className="text-xs text-emerald-600 font-medium">
                  {match.matchFeed.length} händelser →
                </span>
              )}
            </div>
          ) : status === "finished" ? (
            <div className="flex items-center gap-2 text-amber-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Resultat publiceras snart</span>
            </div>
          ) : status === "live" ? (
            <div className="flex items-center gap-2 text-red-600">
              <span className="text-lg font-bold">Pågår nu</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">Kommande match</span>
            </div>
          )}
        </div>

        {/* Hover hint */}
        <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-10 transition-opacity rounded-xl pointer-events-none"></div>
      </div>
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
