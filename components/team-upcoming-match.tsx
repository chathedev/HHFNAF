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

const getMatchOutcome = (rawResult?: string, isHome?: boolean): MatchOutcome | null => {
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

type TeamUpcomingMatchProps = {
  teamLabels: string | string[]
  ticketUrl?: string
}

export function TeamUpcomingMatch({ teamLabels, ticketUrl }: TeamUpcomingMatchProps) {
  const { matches, loading, error } = useMatchData({ 
    refreshIntervalMs: 60_000,
    dataType: "current"
  })

  const teamKeys = useMemo(() => {
    const labels = Array.isArray(teamLabels) ? teamLabels : [teamLabels]
    return labels.map((label) => normalizeTeamKey(label)).filter(Boolean)
  }, [teamLabels])

  const upcomingMatches = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    return matches.filter((match) => match.date.getTime() >= startOfToday.getTime())
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

  const isALagMatch =
    nextMatch.normalizedTeam.includes("alag") || nextMatch.normalizedTeam.includes("damutv")
  const venueName = nextMatch.venue?.toLowerCase() ?? ""
  const isTicketEligibleBase =
    Boolean(ticketUrl) && isALagMatch && TICKET_VENUES.some((keyword) => venueName.includes(keyword))
  const outcomeInfo = getMatchOutcome(nextMatch.result, nextMatch.isHome)
  const isFutureOrLive = nextMatch.date.getTime() >= Date.now()
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
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            vs {nextMatch.opponent}
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
          {outcomeInfo && (
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
                {outcomeInfo.text}
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
