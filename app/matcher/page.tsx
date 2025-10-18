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
    
    // Only allow clicking timeline for live or finished matches
    const canOpenTimeline = status === "live" || status === "finished"
    
    // Ticket button logic: only for home matches, A-lag herr and dam/utv, upcoming matches
    const normalizedTeamType = match.teamType.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const isALagHerrOrDam = normalizedTeamType.includes("a lag") && (normalizedTeamType.includes("herr") || normalizedTeamType.includes("dam") || normalizedTeamType.includes("utv"))
    const showTicket = status === "upcoming" && isHome && isALagHerrOrDam
    
    return (
      <article
        key={match.id}
        className={`bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200/60 hover:border-emerald-400/50 hover:shadow-xl transition-all duration-300 p-6 group relative overflow-hidden backdrop-blur-sm ${
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
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] via-transparent to-blue-500/[0.02] pointer-events-none" />
        
        {/* Status badge */}
        <div className="absolute top-4 right-4 z-10">
          {status === "live" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-black rounded-full shadow-lg shadow-red-500/30 animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full"></span>
              LIVE
            </span>
          )}
          {status === "finished" && hasValidResult && (
            <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white text-xs font-bold rounded-full shadow-md">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              AVSLUTAD
            </span>
          )}
          {status === "upcoming" && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-md shadow-emerald-500/20">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              KOMMANDE
            </span>
          )}
        </div>

        {/* Team name badge */}
        <div className="mb-4 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-emerald-100/80 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200/50 shadow-sm">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
            </svg>
            {match.teamType}
          </span>
        </div>

        {/* Match info */}
        <div className="relative z-10">
          <h3 className="text-xl font-black text-gray-900 mb-3 leading-tight">
            {isHome ? (
              <>
                <span className="text-emerald-600">Härnösands HF</span> 
                <span className="text-gray-300 font-normal mx-2">vs</span> 
                <span className="text-gray-700">{opponentName}</span>
              </>
            ) : (
              <>
                <span className="text-gray-700">{opponentName}</span>
                <span className="text-gray-300 font-normal mx-2">vs</span>
                <span className="text-emerald-600">Härnösands HF</span>
              </>
            )}
          </h3>
          
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded ${
              isHome 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-blue-100 text-blue-700"
            }`}>
              {isHome ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                  Hemmamatch
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                  </svg>
                  Bortamatch
                </>
              )}
            </span>
          </div>

          {scheduleLine && (
            <p className="text-sm text-gray-600 mb-1 flex items-center gap-2 font-medium">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {scheduleLine}
            </p>
          )}

          {match.series && (
            <p className="text-xs text-gray-500 font-semibold mb-4 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
              </svg>
              {match.series}
            </p>
          )}
        </div>

        {/* Result or Status */}
        <div className="pt-4 mt-4 border-t border-gray-200/60 space-y-3 relative z-10">
          {/* Score/Status Row */}
          <div className="flex items-center justify-between">
            {hasValidResult ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {match.result}
                  </span>
                  {canOpenTimeline && match.matchFeed && match.matchFeed.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                      {match.matchFeed.length} händelser
                    </span>
                  )}
                </div>
              </>
            ) : status === "finished" ? (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-bold">Resultat publiceras snart</span>
              </div>
            ) : status === "live" ? (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                <span className="text-lg font-black">Pågår nu!</span>
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          {(match.playUrl && match.playUrl !== "null") || showTicket ? (
            <div className="flex items-center gap-2">
              {/* Play URL Button */}
              {match.playUrl && match.playUrl !== "null" && (
                <a
                  href={match.playUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 group/btn inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 hover:from-blue-700 hover:via-blue-800 hover:to-blue-700 text-white text-sm font-black rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Se live
                </a>
              )}
              
              {/* Ticket Button - Only for home matches, A-lag herr/dam */}
              {showTicket && (
                <Link
                  href={TICKET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 group/btn inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 hover:from-orange-600 hover:via-orange-700 hover:to-orange-600 text-white text-sm font-black rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  Köp biljett
                </Link>
              )}
            </div>
          ) : null}
        </div>

        {/* Hover hint - only show if timeline is clickable */}
        {canOpenTimeline && (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-2xl pointer-events-none" />
        )}
        
        {/* Click indicator */}
        {canOpenTimeline && (
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-md">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Klicka för detaljer
            </span>
          </div>
        )}
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
