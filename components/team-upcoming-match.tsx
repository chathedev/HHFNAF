"use client"

import { useMemo } from "react"
import Link from "next/link"

import { Card } from "@/components/ui/card"
import { formatCountdownLabel, TICKET_VENUES } from "@/lib/matches"
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

export function TeamUpcomingMatch({ teamLabels, ticketUrl }: TeamUpcomingMatchProps) {
  const { matches, loading, error } = useMatchData({ refreshIntervalMs: 60_000 })

  const teamKeys = useMemo(() => {
    const labels = Array.isArray(teamLabels) ? teamLabels : [teamLabels]
    return labels.map((label) => normalizeTeamKey(label)).filter(Boolean)
  }, [teamLabels])

  const nextMatch = useMemo(() => {
    if (teamKeys.length === 0) {
      return null
    }
    return (
      matches
        .filter((match) => teamKeys.includes(match.normalizedTeam))
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null
    )
  }, [matches, teamKeys])

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
  const shouldShowTicket =
    Boolean(ticketUrl) && isALagMatch && TICKET_VENUES.some((keyword) => venueName.includes(keyword))

  return (
    <Card className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-white p-6 shadow-md shadow-emerald-50">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">{nextMatch.teamType}</span>
        {nextMatch.series && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-600">{nextMatch.series}</span>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-emerald-900 sm:text-2xl">{nextMatch.teamType}</h2>
        <p className="text-sm text-emerald-700">vs {nextMatch.opponent}</p>
        {scheduleParts && <p className="text-sm text-emerald-600">{scheduleParts}</p>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-700 sm:text-right">
          {nextMatch.result ? `Resultat ${nextMatch.result}` : ""}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {shouldShowTicket && (
            <Link
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-orange-600 sm:w-auto"
            >
              Köp biljett
            </Link>
          )}
          {nextMatch.infoUrl && (
            <Link
              href={nextMatch.infoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:w-auto"
            >
              Matchsida
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}
