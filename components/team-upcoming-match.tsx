"use client"

import { useMemo } from "react"
import Link from "next/link"

import { Card } from "@/components/ui/card"
import { TICKET_VENUES } from "@/lib/matches"
import { useMatchData } from "@/lib/use-match-data"

const normalizeTeamKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")

type MatchOutcome = {
  text: string
  label: "Vinst" | "Förlust" | "Oavgjort"
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
  // If we're home, our score is homeScore (first)
  // If we're away, our score is awayScore (second), so reverse
  if (isHome === false) {
    return `${awayScore}\u2013${homeScore}`
  }
  
  // For home matches, show as is (our score first)
  return `${homeScore}\u2013${awayScore}`
}

type TeamUpcomingMatchProps = {
  teamLabels: string | string[]
  ticketUrl?: string
}

export function TeamUpcomingMatch({ teamLabels, ticketUrl }: TeamUpcomingMatchProps) {
  const { matches, loading, error } = useMatchData({ 
    refreshIntervalMs: 10_000,
    dataType: "current"
  })

  const teamKeys = useMemo(() => {
    const labels = Array.isArray(teamLabels) ? teamLabels : [teamLabels]
    return labels.map((label) => normalizeTeamKey(label)).filter(Boolean)
  }, [teamLabels])

  const upcomingMatches = useMemo(() => {
    const now = Date.now()
    // Show upcoming matches and live matches
    return matches.filter((match) => {
      const kickoff = match.date.getTime()
      const minutesSinceKickoff = (now - kickoff) / (1000 * 60)
      const trimmedResult = typeof match.result === "string" ? match.result.trim() : null
      const normalizedResult = trimmedResult?.replace(/[–-]/g, '-').toLowerCase()
      const isZeroZero = normalizedResult === "0-0" || normalizedResult === "00" || trimmedResult === "0-0" || trimmedResult === "0–0"
      
      // Exclude matches that started more than 60 minutes ago with stale 0-0 (likely finished but no score)
      if (isZeroZero && minutesSinceKickoff > 60) {
        return false
      }
      
      // Include future matches
      if (kickoff > now) {
        return true
      }
      
      // Include live matches (within 2.5 hours of kickoff)
      const liveWindowEnd = kickoff + 1000 * 60 * 60 * 2.5
      if (now >= kickoff && now <= liveWindowEnd) {
        return true
      }
      
      return false
    })
  }, [matches])

  const nextMatch = useMemo(() => {
    if (teamKeys.length === 0) {
      return null
    }
    return (
      upcomingMatches
        .filter((match) => teamKeys.includes(match.normalizedTeam))
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null
    )
  }, [upcomingMatches, teamKeys])

  if (!loading && !nextMatch) {
    return null
  }

  if (error) {
    return null
  }

  if (!nextMatch) {
    return null
  }

  const scheduleParts = [nextMatch.displayDate, nextMatch.time, nextMatch.venue]
    .filter((item): item is string => Boolean(item))
    .join(" • ")
    
  const now = Date.now()
  const kickoff = nextMatch.date.getTime()
  const liveWindowEnd = kickoff + 1000 * 60 * 60 * 2.5
  const status = now >= kickoff && now <= liveWindowEnd ? "live" : nextMatch.result ? "result" : "upcoming"
  
  // Extract opponent name without (hemma)/(borta) suffix for display
  const opponentName = nextMatch.opponent.replace(/\s*\((hemma|borta)\)\s*$/i, '').trim()
  const homeAwayLabel = nextMatch.isHome === false ? 'borta' : 'hemma'
  const isHome = nextMatch.isHome !== false
  
  const isALagMatch =
    nextMatch.normalizedTeam.includes("alag") || nextMatch.normalizedTeam.includes("damutv")
  const venueName = nextMatch.venue?.toLowerCase() ?? ""
  const isTicketEligibleBase =
    Boolean(ticketUrl) && isALagMatch && TICKET_VENUES.some((keyword) => venueName.includes(keyword))
  const outcomeInfo = getMatchOutcome(nextMatch.result, nextMatch.isHome, status)
  const displayScore = getDisplayScore(nextMatch.result, nextMatch.isHome)
  
  // Check if result is stale (0-0 shown when match should be live)
  const minutesSinceKickoff = (now - kickoff) / (1000 * 60)
  const trimmedResult = typeof nextMatch.result === "string" ? nextMatch.result.trim() : null
  
  // Normalize the result to check for any variation of 0-0
  const normalizedResult = trimmedResult?.replace(/[–-]/g, '-').toLowerCase()
  const isZeroZero = normalizedResult === "0-0" || normalizedResult === "00" || trimmedResult === "0-0" || trimmedResult === "0–0"
  const isStaleZeroResult = isZeroZero && minutesSinceKickoff > 3 && status === "live"
  
  // Don't show LIVE badge if match has been 0-0 for more than 60 minutes (likely stale data)
  const shouldShowLive = status === "live" && !(isZeroZero && minutesSinceKickoff > 60)
  
  const isFutureOrLive = nextMatch.date.getTime() >= Date.now() || status === "live"
  const showTicket = isTicketEligibleBase && !outcomeInfo && isFutureOrLive

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-semibold text-emerald-700">
              {nextMatch.teamType}
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
          {scheduleParts && (
            <p className="text-sm text-gray-600">{scheduleParts}</p>
          )}
          {nextMatch.series && (
            <p className="text-xs text-gray-500 mt-1">{nextMatch.series}</p>
          )}
        </div>
        
        {nextMatch.infoUrl && (
          <Link
            href={nextMatch.infoUrl}
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
              <span className={`text-xs font-semibold px-2.5 py-1 rounded ${
                outcomeInfo.label === "Vinst"
                  ? "bg-green-100 text-green-800"
                  : outcomeInfo.label === "Förlust"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
              }`}>
                {outcomeInfo.label}
              </span>
              <span className="text-2xl font-bold text-gray-900">
                {displayScore}
              </span>
            </div>
          )}

          {nextMatch.playUrl && nextMatch.playUrl !== "null" && (
            <a
              href={nextMatch.playUrl}
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

        {showTicket && (
          <Link
            href={ticketUrl}
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
}
