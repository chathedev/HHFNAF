"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"

import { Card } from "@/components/ui/card"
import { useMatchData, type NormalizedMatch } from "@/lib/use-match-data"

const TICKET_URL = "https://clubs.clubmate.se/harnosandshf/overview/"

type StatusFilter = "all" | "upcoming" | "live" | "result"
type DataTypeFilter = "both" | "current" | "old"

type MatchOutcome = {
  text: string
  label: "Vinst" | "Förlust" | "Oavgjort" | "Ej publicerat"
}

const getMatchOutcome = (rawResult?: string, isHome?: boolean, status?: StatusFilter): MatchOutcome | null => {
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

// Helper to get score in correct display order (always Härnösands HF score first)
const getDisplayScore = (rawResult?: string, isHome?: boolean): string | null => {
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
  
  // Always show Härnösands HF score first
  if (isHome === false) {
    return `${awayScore}\u2013${homeScore}`
  }
  
  return `${homeScore}\u2013${awayScore}`
}

const getMatchStatus = (match: NormalizedMatch): StatusFilter => {
  const now = Date.now()
  const kickoff = match.date.getTime()
  const liveWindowEnd = kickoff + 1000 * 60 * 60 * 2.5
  
  // Check if match is currently in the live window (regardless of result)
  if (now >= kickoff && now <= liveWindowEnd) {
    return "live"
  }
  
  if (match.result) {
    return "result"
  }

  return "upcoming"
}

export default function MatcherPage() {
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [dataTypeFilter, setDataTypeFilter] = useState<DataTypeFilter>("current")
  
  const { matches, loading, error, refresh } = useMatchData({ 
    refreshIntervalMs: 10_000,
    dataType: dataTypeFilter
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
    return matches.filter((match) => {
      if (selectedTeam !== "all" && match.normalizedTeam !== selectedTeam) {
        return false
      }
      return true
    })
  }, [matches, selectedTeam])

  const statusBadgeStyles: Record<StatusFilter, string> = {
    all: "",
    upcoming: "bg-emerald-50 text-emerald-700 border-emerald-200",
    live: "bg-orange-500/10 text-orange-600 border-orange-200",
    result: "bg-emerald-100 text-emerald-900 border-emerald-200",
  }

  return (
    <main className="min-h-screen bg-white py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto mb-12 text-center space-y-4">
          <div className="flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              ← Tillbaka till startsidan
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-emerald-900 md:text-5xl">Matcher</h1>
          <p className="mt-3 text-base text-emerald-700 md:text-lg">
            Här hittar du de senaste uppdateringarna direkt från vår matchtjänst. Filtrera efter lag och status för att
            hitta det du söker.
          </p>
        </div>

        <div className="max-w-5xl mx-auto mb-10 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">
            Lag
            <select
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 focus:border-emerald-400 focus:outline-none"
              value={selectedTeam}
              onChange={(event) => setSelectedTeam(event.target.value)}
            >
              <option value="all">Alla lag</option>
              {teamOptions.map((team) => (
                <option key={team.value} value={team.value}>
                  {team.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">
            Tidsperiod
            <select
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 focus:border-emerald-400 focus:outline-none"
              value={dataTypeFilter}
              onChange={(event) => setDataTypeFilter(event.target.value as DataTypeFilter)}
            >
              <option value="current">Aktuella & kommande</option>
              <option value="both">Alla matcher</option>
              <option value="old">Gamla matcher</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="max-w-4xl mx-auto mb-10 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && filteredMatches.length === 0 && (
          <div className="max-w-4xl mx-auto mb-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Hämtar matcher...
          </div>
        )}

        {!loading && filteredMatches.length === 0 && !error && (
          <div className="max-w-4xl mx-auto mb-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Inga matcher matchar dina filter just nu.
          </div>
        )}

        <div className="max-w-5xl mx-auto space-y-4">
          {filteredMatches.map((match) => {
            const opponentName = match.opponent.replace(/\s*\((hemma|borta)\)\s*$/i, '').trim()
            const homeAwayLabel = match.isHome === false ? 'borta' : 'hemma'
            const isHome = match.isHome !== false
            const scheduleLine = [match.displayDate, match.time, match.venue].filter(Boolean).join(" • ")
            const status = getMatchStatus(match)
            const statusClasses =
              status === "live"
                ? statusBadgeStyles.live
                : status === "result"
                  ? statusBadgeStyles.result
                  : statusBadgeStyles.upcoming

            const trimmedResult = typeof match.result === "string" ? match.result.trim() : null
            let outcomeInfo = getMatchOutcome(trimmedResult ?? undefined, match.isHome, status)
            const displayScore = getDisplayScore(trimmedResult ?? undefined, match.isHome)
            const isPastMatch = match.date.getTime() < Date.now()
            
            // Check if result is stale (0-0 shown long after match has been ongoing)
            // Matches are typically 60 minutes, show warning if 0-0 persists after 3 minutes
            const now = Date.now()
            const minutesSinceKickoff = (now - match.date.getTime()) / (1000 * 60)
            
            // Normalize the result to check for any variation of 0-0
            const normalizedResult = trimmedResult?.replace(/[–-]/g, '-').toLowerCase()
            const isZeroZero = normalizedResult === "0-0" || normalizedResult === "00" || trimmedResult === "0-0" || trimmedResult === "0–0"
            const isStaleZeroResult = isZeroZero && minutesSinceKickoff > 3 && status === "live"
            
            // Don't show LIVE badge if match has been 0-0 for more than 60 minutes (likely stale data)
            const shouldShowLive = status === "live" && !(isZeroZero && minutesSinceKickoff > 60)
            
            if (!outcomeInfo && isPastMatch && status !== "live") {
              if (!trimmedResult || trimmedResult === "0-0" || trimmedResult === "00") {
                outcomeInfo = {
                  label: "Ej publicerat",
                  text: "Resultat ej publicerat",
                }
              } else if (trimmedResult?.toLowerCase() === "inte publicerat" || trimmedResult?.toLowerCase() === "intepublicerat") {
                outcomeInfo = {
                  label: "Ej publicerat",
                  text: "Resultat inte publicerat",
                }
              }
            }
            const isFutureOrLive = match.date.getTime() >= Date.now() || status === "live"
            const isTicketEligible =
              !outcomeInfo &&
              isFutureOrLive &&
              (match.normalizedTeam.includes("alag") || match.normalizedTeam.includes("damutv")) &&
              Boolean(match.venue && match.venue.toLowerCase().includes("öbacka sc"))

            return (
              <div key={match.id} className="bg-white rounded-lg border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-emerald-700">
                        {match.teamType}
                      </span>
                      {shouldShowLive && (
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
                    {/* Show live scores - just the score, no badges */}
                    {status === "live" && outcomeInfo && displayScore && (
                      <span className="text-2xl font-bold text-gray-900">{displayScore}</span>
                    )}
                    
                    {/* Show 0-0 for live matches with warning if stale */}
                    {status === "live" && !outcomeInfo && isZeroZero && (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-gray-900">0–0</span>
                        {isStaleZeroResult && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Resultat ej tillgängligt</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Show results with outcome badge only for finished matches */}
                    {status !== "live" && outcomeInfo && displayScore && (
                      <div className="flex items-center gap-3">
                        {outcomeInfo.label !== "Ej publicerat" && (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${
                            outcomeInfo.label === "Vinst"
                              ? "bg-green-100 text-green-800"
                              : outcomeInfo.label === "Förlust"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }`}>
                            {outcomeInfo.label}
                          </span>
                        )}
                        <span className={outcomeInfo.label === "Ej publicerat" ? "text-sm text-gray-600" : "text-2xl font-bold text-gray-900"}>
                          {displayScore}
                        </span>
                      </div>
                    )}

                    {match.playUrl && (
                      <a
                        href={match.playUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                        title="Se matchen live"
                      >
                        <img
                          src="/handbollplay_mini.png"
                          alt=""
                          className="h-4 w-4 brightness-0 invert"
                        />
                        Se live
                      </a>
                    )}
                  </div>

                  {isTicketEligible && (
                    <Link
                      href={TICKET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      Köp biljett
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
