"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Card } from "@/components/ui/card"
import {
  fetchUpcomingMatches,
  formatCountdownLabel,
  getMatchTeams,
  TICKET_VENUES,
  type UpcomingMatch,
} from "@/lib/matches"

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
  const [match, setMatch] = useState<UpcomingMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const teamKeys = useMemo(() => {
    const labels = Array.isArray(teamLabels) ? teamLabels : [teamLabels]
    return labels.map((label) => normalizeTeamKey(label)).filter(Boolean)
  }, [teamLabels])

  useEffect(() => {
    let cancelled = false

    const loadMatch = async () => {
      if (teamKeys.length === 0) {
        setMatch(null)
        setError(false)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(false)
      try {
        const matches = await fetchUpcomingMatches({ limit: null, maxMonthsAhead: 12 })
        if (cancelled) {
          return
        }

        const nextMatch =
          matches
            .filter((item) => {
              const normalized = normalizeTeamKey(item.teamType || "")
              return normalized.length > 0 && teamKeys.includes(normalized)
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null

        setMatch(nextMatch)
      } catch (_error) {
        if (!cancelled) {
          setError(true)
          setMatch(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadMatch()

    return () => {
      cancelled = true
    }
  }, [teamKeys])

  if (loading) {
    return (
      <Card className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6 shadow-sm">
        <div className="flex h-28 items-center justify-center text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
          Laddar match...
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-900">Kunde inte hämta matchinformation just nu.</p>
        <p className="mt-2 text-sm text-emerald-800">
          Prova att uppdatera sidan eller besök lagets kalender på{" "}
          <Link
            href="https://www.laget.se/HarnosandsHF"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-700 underline"
          >
            Laget.se
          </Link>
          .
        </p>
      </Card>
    )
  }

  if (!match) {
    return (
      <Card className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-900">Inga kommande matcher</p>
        <p className="mt-2 text-sm text-emerald-700">Nästa match publiceras så snart den finns tillgänglig.</p>
      </Card>
    )
  }

  const { clubTeamName, opponentName } = getMatchTeams(match)
  const countdownLabel = formatCountdownLabel(match.date, Boolean(match.result))
  const scheduleParts = [match.fullDateText ?? match.displayDate, match.time, match.venue]
    .filter((item): item is string => Boolean(item))
    .join(" • ")

  const normalizedTeamType = match.teamType?.toLowerCase() ?? ""
  const isALagMatch = normalizedTeamType.includes("a-lag") || normalizedTeamType.includes("dam/utv")
  const venueName = match.venue?.toLowerCase() ?? ""
  const shouldShowTicket =
    Boolean(ticketUrl) && isALagMatch && TICKET_VENUES.some((keyword) => venueName.includes(keyword))

  return (
    <Card className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-white p-6 shadow-md shadow-emerald-50">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">{clubTeamName}</span>
        {match.series && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-600">{match.series}</span>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-emerald-900 sm:text-2xl">{clubTeamName}</h2>
        <p className="text-sm text-emerald-700">vs {opponentName}</p>
        {scheduleParts && <p className="text-sm text-emerald-600">{scheduleParts}</p>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-700 sm:text-right">
          {match.result ? `Resultat ${match.result}` : countdownLabel}
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
          <Link
            href={match.infoUrl ?? match.eventUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:w-auto"
          >
            Matchsida
          </Link>
        </div>
      </div>
    </Card>
  )
}
