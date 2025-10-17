"use client"

import { Calendar, Trophy, Zap, Clock } from "lucide-react"
import { useEffect, useState } from "react"

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

const API_BASE_URL = "https://api.tivly.se/matcher"

export default function MatchCards() {
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(`${API_BASE_URL}/data/current`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        // Handle response structure: { current: [...] } or just [...]
        let matches: Match[] = []
        if (data.current && Array.isArray(data.current)) {
          matches = data.current
        } else if (Array.isArray(data)) {
          matches = data
        }
        
        setUpcomingMatches(matches.slice(0, 3))
        setError(null)
      } catch (error) {
        console.error("Error fetching matches:", error)
        if (error instanceof Error && error.name === "AbortError") {
          setError("Timeout - kunde inte ladda matcher")
        } else {
          setError("Kunde inte ladda matcher just nu")
        }
        setUpcomingMatches([]) // Ensure we have an empty array
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [])

  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toLocaleDateString("sv-SE", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    } catch {
      return dateString
    }
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Kommande Matcher */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 flex flex-col items-center text-center">
              <Calendar className="w-12 h-12 text-orange-500 mb-4" />
              <h3 className="text-xl font-bold text-orange-500 mb-4">KOMMANDE MATCHER</h3>

              {loading ? (
                <p className="text-gray-600 text-sm">Laddar matcher...</p>
              ) : error ? (
                <p className="text-red-600 text-sm">{error}</p>
              ) : upcomingMatches.length > 0 ? (
                <div className="space-y-2 w-full">
                  {upcomingMatches.map((match, index) => (
                    <div key={index} className="border-l-4 border-orange-500 pl-3 text-left py-2">
                      <div className="font-semibold text-sm text-gray-800 leading-tight">{match.opponent || 'TBA'}</div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDate(match.date)} {match.time || ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {match.playUrl && match.playUrl !== "null" && (
                            <a
                              href={match.playUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                              title="Se matchen live på handbollplay.se"
                            >
                              <img
                                src="/handbollplay_mini.png"
                                alt="Handboll Play"
                                className="w-4 h-4 object-contain"
                              />
                              <span className="text-[10px] font-medium text-blue-600">Live</span>
                            </a>
                          )}
                          {match.isHome !== undefined && (
                            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-500">
                              {match.isHome ? "Hemma" : "Borta"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">Inga kommande matcher hittades</p>
              )}
            </div>
          </div>

          {/* Handbollsligan Dam */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 flex flex-col items-center text-center">
              <Trophy className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-green-600 mb-2">HANDBOLLSLIGAN DAM</h3>
              <p className="text-gray-600 text-sm">Följ vårt A-lag Dam i Handbollsligan</p>
            </div>
          </div>

          {/* Svenska Cupen */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 flex flex-col items-center text-center">
              <Zap className="w-12 h-12 text-orange-500 mb-4" />
              <h3 className="text-xl font-bold text-orange-500 mb-2">SVENSKA CUPEN 25/26</h3>
              <p className="text-gray-600 text-sm">Följ vårt A-lag herr i Svenska Cupen</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
