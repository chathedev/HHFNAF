"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Filter, RefreshCcw } from "lucide-react"

import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ErrorBoundary } from "@/components/error-boundary"
import {
  fetchUpcomingMatches,
  formatCountdownLabel,
  getMatchTeams,
  MATCH_TYPES_WITH_TICKETS,
  refreshMatchResult,
  TICKET_VENUES,
  type UpcomingMatch,
} from "@/lib/matches"

const CLUBMATE_TICKET_URL = "https://clubs.clubmate.se/harnosandshf/overview/"

type StatusFilter = "alla" | "kommande" | "live" | "resultat"

const getMatchStatus = (match: UpcomingMatch): StatusFilter => {
  if (match.result) {
    return "resultat"
  }

  const now = Date.now()
  const kickoff = match.date.getTime()
  const liveWindowEnd = kickoff + 1000 * 60 * 60 * 2.5

  if (now >= kickoff && now <= liveWindowEnd) {
    return "live"
  }

  return "kommande"
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<UpcomingMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState("")
  const [teamFilter, setTeamFilter] = useState("alla")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alla")

  useEffect(() => {
    let cancelled = false

    const loadMatches = async () => {
      setLoading(true)
      setError(false)

      try {
        const upcoming = await fetchUpcomingMatches({ limit: 20, maxMonthsAhead: 8 })
        if (!cancelled) {
          setMatches(upcoming)
        }
      } catch (_error) {
        if (!cancelled) {
          setError(true)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadMatches()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || matches.length === 0) {
      return undefined
    }

    let cancelled = false
    let intervalId: number | undefined

    const pollLiveMatches = async () => {
      const now = Date.now()
      const liveCandidates = matches.filter((match) => {
        if (match.result || !match.infoUrl) {
          return false
        }
        const kickoff = match.date.getTime()
        return kickoff - now <= 1000 * 60 * 60 * 12 && kickoff >= now - 1000 * 60 * 60 * 4
      })

      if (liveCandidates.length === 0) {
        return
      }

      const refreshed = await Promise.all(liveCandidates.map((match) => refreshMatchResult(match)))
      if (cancelled) {
        return
      }

      setMatches((previous) => {
        if (previous.length === 0) {
          return previous
        }

        let changed = false
        const next = previous.map((match) => {
          const updated =
            refreshed.find((item) => item.infoUrl && match.infoUrl && item.infoUrl === match.infoUrl) ??
            refreshed.find((item) => item.eventUrl === match.eventUrl)

          if (!updated) {
            return match
          }

          const hasDiff =
            match.result !== updated.result ||
            match.venue !== updated.venue ||
            match.time !== updated.time ||
            match.fullDateText !== updated.fullDateText

          if (!hasDiff) {
            return match
          }

          changed = true
          return {
            ...match,
            ...updated,
          }
        })

        return changed ? next : previous
      })
    }

    void pollLiveMatches()

    const shouldPoll = matches.some((match) => {
      if (match.result || !match.infoUrl) {
        return false
      }
      const now = Date.now()
      const kickoff = match.date.getTime()
      return kickoff - now <= 1000 * 60 * 60 * 12 && kickoff >= now - 1000 * 60 * 60 * 4
    })

    if (shouldPoll) {
      intervalId = window.setInterval(() => {
        void pollLiveMatches()
      }, 10_000)
    }

    return () => {
      cancelled = true
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [matches])

  const uniqueTeamTypes = useMemo(() => {
    const types = new Set<string>()
    matches.forEach((match) => {
      if (match.teamType) {
        types.add(match.teamType)
      }
    })
    return Array.from(types).sort((a, b) => a.localeCompare(b))
  }, [matches])

  const filteredMatches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return matches.filter((match) => {
      const status = getMatchStatus(match)
      if (statusFilter !== "alla" && status !== statusFilter) {
        return false
      }

      if (teamFilter !== "alla" && match.teamType !== teamFilter) {
        return false
      }

      if (normalizedSearch.length > 0) {
        const teams = getMatchTeams(match)
        const haystack = [
          match.teamType,
          match.opponent,
          teams.clubTeamName,
          teams.opponentName,
          match.venue,
          match.series,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        if (!haystack.includes(normalizedSearch)) {
          return false
        }
      }

      return true
    })
  }, [matches, teamFilter, statusFilter, search])

  const statusLabelMap: Record<StatusFilter, string> = {
    alla: "Alla",
    kommande: "Kommande",
    live: "Live",
    resultat: "Slut",
  }

  const getStatusBadge = (match: UpcomingMatch) => {
    const status = getMatchStatus(match)
    if (status === "live") {
      return <span className="rounded-full bg-orange-500/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]">Live</span>
    }
    if (status === "resultat") {
      return (
        <span className="rounded-full bg-emerald-600/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
          Slut
        </span>
      )
    }
    return (
      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
        Kommande
      </span>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-28 pb-16">
          <section className="pb-12">
            <div className="container mx-auto px-4">
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-600 via-emerald-500 to-orange-400 px-6 py-12 text-white shadow-lg shadow-emerald-500/25 md:px-10 md:py-16">
                <div className="max-w-3xl space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/70">Matcher</p>
                  <h1 className="text-3xl font-black md:text-4xl">Härnösands HF – matchkalender</h1>
                  <p className="text-sm md:text-base text-white/85">
                    Håll koll på kommande matcher, liveuppdateringar och resultat för föreningens lag. Filtrera efter lag
                    eller status och hitta rätt match för dig.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="container mx-auto px-4">
              <Card className="rounded-3xl border border-emerald-100 bg-white shadow-md shadow-emerald-200/30">
                <div className="flex flex-col gap-4 border-b border-emerald-100/70 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">
                    <Filter className="h-4 w-4" />
                    Filtrera matcher
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Sök motståndare eller lag"
                      className="h-10 w-full min-w-[220px] md:w-56"
                    />
                    <select
                      value={teamFilter}
                      onChange={(event) => setTeamFilter(event.target.value)}
                      className="h-10 rounded-full border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 outline-none transition focus:border-emerald-400"
                    >
                      <option value="alla">Alla lag</option>
                      {uniqueTeamTypes.map((team) => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                      className="h-10 rounded-full border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 outline-none transition focus:border-emerald-400"
                    >
                      {Object.entries(statusLabelMap).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-emerald-700 hover:bg-emerald-100"
                      onClick={() => {
                        setSearch("")
                        setTeamFilter("alla")
                        setStatusFilter("alla")
                      }}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Nollställ
                    </Button>
                  </div>
                </div>

                <div className="px-6 py-6">
                  {loading && (
                    <div className="space-y-3">
                      <div className="h-20 rounded-2xl bg-emerald-50/70 animate-pulse" />
                      <div className="h-20 rounded-2xl bg-emerald-50/60 animate-pulse" />
                      <div className="h-20 rounded-2xl bg-emerald-50/50 animate-pulse" />
                    </div>
                  )}

                  {!loading && error && (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-6 text-center text-sm text-orange-700">
                      Vi kunde inte hämta matcherna just nu. Försök igen senare.
                    </div>
                  )}

                  {!loading && !error && filteredMatches.length === 0 && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-6 text-center text-sm text-emerald-700">
                      Inga matcher matchade dina filter. Justera sökningen eller försök igen senare.
                    </div>
                  )}

                  {!loading && !error && filteredMatches.length > 0 && (
                    <div className="space-y-4">
                      {filteredMatches.map((match) => {
                        const teams = getMatchTeams(match)
                        const countdown = formatCountdownLabel(match.date, Boolean(match.result))
                        const venueName = match.venue?.toLowerCase() ?? ""
                        const isTicketEligible =
                          TICKET_VENUES.some((keyword) => venueName.includes(keyword)) &&
                          MATCH_TYPES_WITH_TICKETS.some((keyword) => match.teamType?.toLowerCase().includes(keyword))
                        const status = getMatchStatus(match)

                        return (
                          <div
                            key={match.eventUrl}
                            className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white via-white to-emerald-50/40 px-6 py-6 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-3">
                                  {getStatusBadge(match)}
                                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                                    {match.teamType || "Härnösands HF"}
                                  </span>
                                  {match.series && (
                                    <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                                      {match.series}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <h2 className="text-2xl font-bold text-emerald-900 md:text-3xl">{teams.clubTeamName}</h2>
                                  <p className="text-base text-emerald-700 md:text-lg">vs {teams.opponentName}</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-800">
                                  <span>{match.fullDateText ?? match.displayDate}</span>
                                  <span className="text-emerald-400">•</span>
                                  <span>{match.time}</span>
                                  {match.venue && (
                                    <>
                                      <span className="text-emerald-400">•</span>
                                      <span>{match.venue}</span>
                                    </>
                                  )}
                                  {status !== "resultat" && (
                                    <>
                                      <span className="text-emerald-400">•</span>
                                      <span>{countdown}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex w-full flex-col items-stretch gap-3 md:w-auto md:items-end">
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  {isTicketEligible && (
                                    <Link
                                      href={CLUBMATE_TICKET_URL}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
                                    >
                                      Köp biljett
                                    </Link>
                                  )}
                                  <Link
                                    href={match.infoUrl ?? match.eventUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-800"
                                  >
                                    Matchsida
                                  </Link>
                                </div>

                                {match.result && (
                                  <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-right">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-500">
                                      Slutsignal
                                    </p>
                                    <p className="text-3xl font-black text-emerald-700 md:text-4xl">{match.result}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  )
}
