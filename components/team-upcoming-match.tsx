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

type TeamUpcomingMatchProps = {
  teamLabels: string | string[]
  ticketUrl?: string
}

const formatTeamResult = (rawResult?: string, isHome?: boolean) => {
  if (!rawResult) {
    return null
  }
  const scoreboardMatch = rawResult.match(/(\d+)\s*[–-]\s*(\d+)/)
  if (!scoreboardMatch) {
    return rawResult.trim()
  }
  const homeScore = Number.parseInt(scoreboardMatch[1], 10)
  const awayScore = Number.parseInt(scoreboardMatch[2], 10)
  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return rawResult.trim()
  }
  const ourScore = isHome === false ? awayScore : homeScore
  const opponentScore = isHome === false ? homeScore : awayScore
  return `${ourScore}\u2013${opponentScore}`
}

export function TeamUpcomingMatch({ teamLabels, ticketUrl }: TeamUpcomingMatchProps) {
  const { matches, loading, error } = useMatchData({ refreshIntervalMs: 60_000 })

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
  const formattedResult = formatTeamResult(nextMatch.result, nextMatch.isHome)
  const isFutureOrLive = nextMatch.date.getTime() >= Date.now()
  const showTicket = isTicketEligibleBase && !formattedResult && isFutureOrLive

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
        {formattedResult && (
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600">Slutresultat</span>
            <span className="text-3xl font-bold text-emerald-900 sm:text-4xl">{formattedResult}</span>
          </div>
        )}

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
