"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { Card } from "@/components/ui/card"
import { useMatchData, type NormalizedMatch } from "@/lib/use-match-data"

const TICKET_URL = "https://clubs.clubmate.se/harnosandshf/overview/"

type StatusFilter = "all" | "upcoming" | "live" | "result"

type MatchOutcome = {
  text: string
  label: "Vinst" | "Förlust" | "Oavgjort" | "Ej publicerat"
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

const getMatchStatus = (match: NormalizedMatch): StatusFilter => {
  if (match.result) {
    return "result"
  }
  const now = Date.now()
  const kickoff = match.date.getTime()
  const liveWindowEnd = kickoff + 1000 * 60 * 60 * 2.5

  if (now >= kickoff && now <= liveWindowEnd) {
    return "live"
  }

  return "upcoming"
}

export default function MatcherPage() {
  const { matches, loading, error, refresh } = useMatchData({ refreshIntervalMs: 60_000 })
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("upcoming")

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
      const status = getMatchStatus(match)
      if (statusFilter !== "all" && status !== statusFilter) {
        return false
      }
      return true
    })
  }, [matches, selectedTeam, statusFilter])

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
          <div className="mt-3 text-sm text-emerald-600">
            <button
              type="button"
              onClick={() => {
                void refresh()
              }}
              className="font-semibold underline underline-offset-4"
            >
              Uppdatera matcherna manuellt
            </button>
            <span className="mx-2">·</span>
            <span>Uppdateras automatiskt varje minut</span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mb-10 grid gap-4 md:grid-cols-3">
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

          <div className="md:col-span-2">
            <div className="flex flex-wrap gap-2">
              {(["all", "upcoming", "live", "result"] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                    statusFilter === status
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {status === "all"
                    ? "Alla"
                    : status === "upcoming"
                      ? "Kommande"
                      : status === "live"
                        ? "Live"
                        : "Resultat"}
                </button>
              ))}
            </div>
          </div>
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
            const scheduleLine = [match.displayDate, match.time, match.venue].filter(Boolean).join(" • ")
            const status = getMatchStatus(match)
            const statusClasses =
              status === "live"
                ? statusBadgeStyles.live
                : status === "result"
                  ? statusBadgeStyles.result
                  : statusBadgeStyles.upcoming

            const trimmedResult = typeof match.result === "string" ? match.result.trim() : null
            let outcomeInfo = getMatchOutcome(trimmedResult ?? undefined, match.isHome)
            const isPastMatch = match.date.getTime() < Date.now()
            if (!outcomeInfo && isPastMatch && status === "result") {
              if (trimmedResult === "0-0" || !trimmedResult) {
                outcomeInfo = {
                  label: "Ej publicerat",
                  text: "Resultat ej publicerat",
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
              <Card key={match.id} className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                      {match.teamType}
                    </span>
                    {match.series && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-600">
                        {match.series}
                      </span>
                    )}
                    <span className={`rounded-full border px-3 py-1 ${statusClasses}`}>
                      {status === "live" ? "Live" : status === "result" ? "Slut" : "Kommande"}
                    </span>
                  </div>

                  {match.infoUrl && (
                    <Link
                      href={match.infoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Matchsida
                    </Link>
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-emerald-900 sm:text-3xl">{match.teamType}</h2>
                  <p className="text-base text-emerald-700 sm:text-lg">vs {match.opponent}</p>
                  {scheduleLine && <p className="text-sm text-emerald-600">{scheduleLine}</p>}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {outcomeInfo && (
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                          outcomeInfo.label === "Vinst"
                            ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                            : outcomeInfo.label === "Förlust"
                              ? "border-red-200 bg-red-100 text-red-700"
                              : outcomeInfo.label === "Ej publicerat"
                                ? "border-slate-200 bg-slate-100 text-slate-700"
                                : "border-amber-200 bg-amber-100 text-amber-700"
                        }`}
                      >
                        {outcomeInfo.label}
                      </span>
                      <span
                        className={
                          outcomeInfo.label === "Ej publicerat"
                            ? "text-sm font-semibold text-emerald-700"
                            : "text-3xl font-bold text-emerald-900 sm:text-4xl"
                        }
                      >
                        {outcomeInfo.text}
                      </span>
                    </div>
                  )}

                  {isTicketEligible && (
                    <Link
                      href={TICKET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-orange-600 sm:w-auto"
                    >
                      Köp biljett
                    </Link>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </main>
  )
}
