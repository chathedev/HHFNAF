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
    <Card className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-white p-6 shadow-md shadow-emerald-50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">{nextMatch.teamType}</span>
          {nextMatch.series && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-600">{nextMatch.series}</span>
          )}
        </div>

        {nextMatch.infoUrl && (
          <Link
            href={nextMatch.infoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Matchsida
          </Link>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-emerald-900 sm:text-2xl">{nextMatch.teamType}</h2>
        <p className="text-sm text-emerald-700">vs {nextMatch.opponent}</p>
        {scheduleParts && <p className="text-sm text-emerald-600">{scheduleParts}</p>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {outcomeInfo && (
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                  outcomeInfo.label === "Vinst"
                    ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                    : outcomeInfo.label === "Förlust"
                      ? "border-red-200 bg-red-100 text-red-700"
                      : "border-amber-200 bg-amber-100 text-amber-700"
                }`}
              >
                {outcomeInfo.label}
              </span>
              <span className="text-3xl font-bold text-emerald-900 sm:text-4xl">{outcomeInfo.text}</span>
            </div>
          )}

          {nextMatch.playUrl && nextMatch.playUrl !== "null" && (
            <a
              href={nextMatch.playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              title="Se matchen live på handbollplay.se"
            >
              <img
                src="/handbollplay_mini.png"
                alt="Handboll Play"
                className="h-5 w-5 object-contain"
              />
              <span>Se live</span>
            </a>
          )}
        </div>

        {showTicket && (
          <Link
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-orange-600 sm:w-auto"
          >
            Köp biljett
          </Link>
        )}
      </div>
    </Card>
  )
}
