"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"

type MatchFeedEvent = {
  time: string
  type: string
  team?: string
  player?: string
  playerNumber?: string
  playerId?: number
  description: string
  homeScore?: number
  awayScore?: number
  period?: number
  eventTypeId?: number
  teamId?: number
  isTeamEvent?: boolean
  score?: string
  scoringTeam?: string
  isHomeGoal?: boolean
}

type MatchFeedModalProps = {
  isOpen: boolean
  onClose: () => void
  matchFeed: MatchFeedEvent[]
  homeTeam: string
  awayTeam: string
  finalScore?: string
  matchStatus?: "live" | "finished" | "upcoming"
}

const getEventIcon = (type: string) => {
  const lowerType = type.toLowerCase()
  
  if (lowerType.includes("mål")) {
    return "⚽"
  }
  if (lowerType.includes("start")) {
    return "▶️"
  }
  if (lowerType.includes("slut") || lowerType.includes("avslut")) {
    return "🏁"
  }
  if (lowerType.includes("utvisning")) {
    return "🟥"
  }
  if (lowerType.includes("varning")) {
    return "🟨"
  }
  if (lowerType.includes("straff")) {
    return "🎯"
  }
  if (lowerType.includes("timeout")) {
    return "⏸️"
  }
  
  return "📝"
}

const getEventColor = (type: string) => {
  const lowerType = type.toLowerCase()
  
  if (lowerType.includes("mål")) {
    return "bg-green-100 border-green-300 text-green-800"
  }
  if (lowerType.includes("start")) {
    return "bg-blue-100 border-blue-300 text-blue-800"
  }
  if (lowerType.includes("slut") || lowerType.includes("avslut")) {
    return "bg-gray-100 border-gray-300 text-gray-800"
  }
  if (lowerType.includes("utvisning")) {
    return "bg-red-100 border-red-300 text-red-800"
  }
  if (lowerType.includes("varning")) {
    return "bg-yellow-100 border-yellow-300 text-yellow-800"
  }
  
  return "bg-gray-50 border-gray-200 text-gray-700"
}

export function MatchFeedModal({
  isOpen,
  onClose,
  matchFeed,
  homeTeam,
  awayTeam,
  finalScore,
  matchStatus,
}: MatchFeedModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.addEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Calculate top scorers for each team
  const goalEvents = matchFeed.filter((event) => 
    event.type.toLowerCase().includes("mål") && event.player
  )

  const scorersByTeam = goalEvents.reduce((acc, event) => {
    const team = event.team || "Okänt lag"
    if (!acc[team]) {
      acc[team] = {}
    }
    
    const playerKey = `${event.player}${event.playerNumber ? ` (#${event.playerNumber})` : ""}`
    if (!acc[team][playerKey]) {
      acc[team][playerKey] = {
        player: event.player!,
        playerNumber: event.playerNumber,
        goals: 0
      }
    }
    acc[team][playerKey].goals++
    
    return acc
  }, {} as Record<string, Record<string, { player: string; playerNumber?: string; goals: number }>>)

  // Get top 3 scorers for each team
  const topScorersByTeam = Object.entries(scorersByTeam).reduce((acc, [team, scorers]) => {
    acc[team] = Object.values(scorers)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 3)
    return acc
  }, {} as Record<string, Array<{ player: string; playerNumber?: string; goals: number }>>)

  // Group events by period
  const eventsByPeriod = matchFeed.reduce((acc, event) => {
    const period = event.period || 0
    if (!acc[period]) {
      acc[period] = []
    }
    acc[period].push(event)
    return acc
  }, {} as Record<number, MatchFeedEvent[]>)

  const periods = Object.keys(eventsByPeriod)
    .map(Number)
    .sort((a, b) => b - a) // Reverse order to show latest first

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {homeTeam}
                <span className="text-gray-400 mx-3">vs</span>
                {awayTeam}
              </h2>
              {matchStatus === "live" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded">
                  <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                  LIVE
                </span>
              )}
            </div>
            {finalScore && (
              <p className="text-3xl font-bold text-emerald-600">{finalScore}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {matchFeed.length} händelse{matchFeed.length !== 1 ? "r" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Stäng"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Top Scorers Section */}
        {Object.keys(topScorersByTeam).length > 0 && (
          <div className="px-6 pb-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              🏆 Målskyttar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(topScorersByTeam).map(([team, scorers]) => (
                <div key={team} className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-3 border border-emerald-200">
                  <h4 className="text-xs font-semibold text-emerald-800 mb-2 truncate" title={team}>
                    {team}
                  </h4>
                  <div className="space-y-1.5">
                    {scorers.map((scorer, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white rounded px-2.5 py-1.5 shadow-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</span>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {scorer.player}
                          </span>
                          {scorer.playerNumber && (
                            <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                              #{scorer.playerNumber}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-emerald-700 flex-shrink-0 ml-2">
                          {scorer.goals} {scorer.goals === 1 ? "mål" : "mål"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          {matchFeed.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Inga händelser att visa än</p>
            </div>
          ) : (
            <div className="space-y-6">
              {periods.map((period) => (
                <div key={period}>
                  {period > 0 && (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                        {period === 1 ? "Första halvlek" : period === 2 ? "Andra halvlek" : `Period ${period}`}
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    </div>
                  )}
                  
                  <div className="relative space-y-4">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-200 via-emerald-300 to-transparent"></div>
                    
                    {eventsByPeriod[period].map((event, idx) => (
                      <div key={idx} className="relative flex gap-4">
                        {/* Timeline dot with icon */}
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-white border-2 border-emerald-400 flex items-center justify-center text-xl shadow-md z-10">
                            {getEventIcon(event.type)}
                          </div>
                        </div>
                        
                        {/* Event card */}
                        <div className={`flex-1 rounded-lg border-2 p-4 ${getEventColor(event.type)} transition-all hover:shadow-md`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold px-2 py-0.5 bg-white/70 rounded">
                                  {event.time}
                                </span>
                                <span className="text-sm font-semibold">
                                  {event.type}
                                </span>
                              </div>
                              
                              {event.team && (
                                <p className="text-sm font-medium mb-1">{event.team}</p>
                              )}
                              
                              {event.player && (
                                <p className="text-sm font-semibold text-gray-900 mb-1">
                                  {event.player}
                                  {event.playerNumber && (
                                    <span className="ml-2 text-xs font-mono bg-white/70 px-1.5 py-0.5 rounded">
                                      #{event.playerNumber}
                                    </span>
                                  )}
                                </p>
                              )}
                              
                              {event.description && event.description !== event.type && !event.player && (
                                <p className="text-sm opacity-90">{event.description}</p>
                              )}
                            </div>
                            
                            {(event.homeScore !== undefined || event.awayScore !== undefined) && (
                              <div className="text-right">
                                <div className="text-2xl font-bold whitespace-nowrap">
                                  {event.homeScore ?? 0}–{event.awayScore ?? 0}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  )
}
