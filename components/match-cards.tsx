"use client"

import { Calendar, Trophy, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { extendTeamDisplayName } from "@/lib/team-display"

interface Match {
  teamType?: string
  opponent?: string
  date?: string
  time?: string
  venue?: string
  series?: string
  infoUrl?: string
  result?: string
  isHome?: boolean
  playUrl?: string
}

const API_BASE_URL = "https://api.harnosandshf.se/matcher"

const removeHomeAwaySuffix = (value?: string) => {
  if (!value) return ""
  return value.replace(/\s*\((hemma|borta)\)\s*$/i, "").trim()
}

const InfoCard = ({ icon, title, description }: { icon: ReactNode; title: string; description: string }) => (
  <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
    <div className="flex items-start gap-4">
      <div className="rounded-2xl bg-gray-100 p-2 text-gray-600">{icon}</div>
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
    </div>
  </div>
)

export default function MatchCards() {
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), 5000)

        const response = await fetch(`${API_BASE_URL}/data/current`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        })

        window.clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        let matches: Match[] = []
        if (data.current && Array.isArray(data.current)) {
          matches = data.current
        } else if (Array.isArray(data)) {
          matches = data
        }

        const now = Date.now()
        const lookBackMs = 1000 * 60 * 60 * 6 // keep matches that started within the last 6h

        const toDate = (match: Match) => {
          if (!match.date) return null
          const timePart = match.time && match.time.trim().length > 0 ? match.time.trim() : "00:00"
          const parsed = new Date(`${match.date}T${timePart}`)
          return Number.isNaN(parsed.getTime()) ? null : parsed
        }

        const upcomingOnly = matches
          .map((match) => ({
            match,
            kickoff: toDate(match),
          }))
          .filter(({ kickoff }) => {
            if (!kickoff) return false
            const kickoffTime = kickoff.getTime()
            return kickoffTime >= now - lookBackMs
          })
          .sort((a, b) => {
            const aTime = a.kickoff ? a.kickoff.getTime() : Infinity
            const bTime = b.kickoff ? b.kickoff.getTime() : Infinity
            return aTime - bTime
          })
          .map(({ match }) => match)
          .slice(0, 3)

        setUpcomingMatches(upcomingOnly)
        setError(null)
      } catch (caught) {
        console.error("Error fetching matches:", caught)
        if (caught instanceof Error && caught.name === "AbortError") {
          setError("Timeout - kunde inte ladda matcher")
        } else {
          setError("Kunde inte ladda matcher just nu")
        }
        setUpcomingMatches([])
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [])

  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
      return dateString
    }
    return date.toLocaleDateString("sv-SE", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Kommande matcher</p>
                <h3 className="mt-1 text-2xl font-semibold text-gray-900">Härnösands HF</h3>
              </div>
              <span className="rounded-full bg-orange-100 p-2 text-orange-600">
                <Calendar className="h-6 w-6" />
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="text-sm text-gray-500">Laddar matcher…</p>
              ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : upcomingMatches.length === 0 ? (
                <p className="text-sm text-gray-500">Inga kommande matcher publicerade just nu.</p>
              ) : (
                upcomingMatches.map((match, index) => {
                  const opponent = removeHomeAwaySuffix(match.opponent) || "Motståndare meddelas"
                  const teamLabel = extendTeamDisplayName(match.teamType)
                  const scheduleBits = [formatDate(match.date), match.time, match.venue].filter(Boolean)

                  return (
                    <div
                      key={`${match.teamType}-${match.date}-${index}`}
                      className="rounded-2xl border border-gray-200 bg-white/90 px-4 py-4 shadow-sm transition-colors hover:border-gray-300"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {teamLabel && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                {teamLabel}
                              </span>
                            )}
                            {match.isHome !== undefined && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  match.isHome ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {match.isHome ? "Hemma" : "Borta"}
                              </span>
                            )}
                          </div>

                          <h4 className="text-lg font-semibold text-gray-900">
                            {match.isHome === false
                              ? `${opponent} vs Härnösands HF`
                              : `Härnösands HF vs ${opponent}`}
                          </h4>

                          {scheduleBits.length > 0 && (
                            <p className="text-sm text-gray-600">{scheduleBits.join(" • ")}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-start gap-2 md:items-end">
                          {match.playUrl && match.playUrl !== "null" && (
                            <a
                              href={match.playUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                            >
                              Se live
                            </a>
                          )}
                          {match.infoUrl && match.infoUrl !== "null" && (
                            <a
                              href={match.infoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:text-gray-700 hover:underline"
                            >
                              Matchinfo
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="space-y-4">
            <InfoCard
              icon={<Trophy className="h-6 w-6 text-emerald-600" />}
              title="Handbollsligan Dam"
              description="Följ vårt A-lag Dam i Handbollsligan."
            />
            <InfoCard
              icon={<Zap className="h-6 w-6 text-orange-500" />}
              title="Svenska Cupen 25/26"
              description="Följ vårt A-lag Herr i Svenska Cupen."
            />
          </div>
        </div>
      </div>
    </section>
  )
}
