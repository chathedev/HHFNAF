"use client"

import { useEffect, useRef, useState } from "react"
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
  const [activeTab, setActiveTab] = useState<"timeline" | "scorers">("timeline")

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-b from-white to-gray-50">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">
                  <span className="block sm:inline">{homeTeam}</span>
                  <span className="text-gray-400 mx-2 hidden sm:inline">vs</span>
                  <span className="block sm:inline text-gray-400 sm:hidden text-sm">vs</span>
                  <span className="block sm:inline">{awayTeam}</span>
                </h2>
              </div>
              {matchStatus === "live" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-red-100 text-red-700 text-xs sm:text-sm font-bold rounded-full flex-shrink-0">
                  <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-red-600 rounded-full animate-pulse"></span>
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {finalScore && (
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{finalScore}</p>
              )}
              <p className="text-xs sm:text-sm text-gray-500">
                {matchFeed.length} händelse{matchFeed.length !== 1 ? "r" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-2 sm:ml-4 p-2 sm:p-2.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Stäng"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b-2 border-gray-200 bg-white">
          <div className="flex">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-bold transition-all relative ${
                activeTab === "timeline"
                  ? "text-emerald-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-lg sm:text-xl">📋</span>
                Tidslinje
                <span className="text-xs sm:text-sm font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                  {matchFeed.length}
                </span>
              </span>
              {activeTab === "timeline" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600"></div>
              )}
            </button>
            
            {Object.keys(topScorersByTeam).length > 0 && (
              <button
                onClick={() => setActiveTab("scorers")}
                className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-bold transition-all relative ${
                  activeTab === "scorers"
                    ? "text-emerald-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="text-lg sm:text-xl">🏆</span>
                  Målskyttar
                  <span className="text-xs sm:text-sm font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {Object.values(topScorersByTeam).reduce((sum, scorers) => sum + scorers.length, 0)}
                  </span>
                </span>
                {activeTab === "scorers" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600"></div>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-6">
          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <>
              {matchFeed.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-500 text-sm">Inga händelser att visa än</p>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {periods.map((period) => (
                <div key={period}>
                  {period > 0 && (
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      <span className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider px-2 py-1 bg-gray-100 rounded-full">
                        {period === 1 ? "Första halvlek" : period === 2 ? "Andra halvlek" : `Period ${period}`}
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    </div>
                  )}
                  
                  <div className="relative space-y-4 sm:space-y-5">
                    {/* Timeline line */}
                    <div className="absolute left-5 sm:left-7 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 via-emerald-400 to-transparent"></div>
                    
                    {eventsByPeriod[period].map((event, idx) => (
                      <div key={idx} className="relative flex gap-3 sm:gap-4">
                        {/* Timeline dot with icon */}
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white border-2 sm:border-3 border-emerald-400 flex items-center justify-center text-lg sm:text-2xl shadow-lg z-10">
                            {getEventIcon(event.type)}
                          </div>
                        </div>
                        
                        {/* Event card */}
                        <div className={`flex-1 rounded-xl border-2 p-3 sm:p-4 ${getEventColor(event.type)} transition-all active:scale-98 min-w-0`}>
                          <div className="flex items-start justify-between gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-xs sm:text-sm font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 bg-white/80 rounded-md shadow-sm">
                                  {event.time}
                                </span>
                                <span className="text-xs sm:text-sm font-bold">
                                  {event.type}
                                </span>
                              </div>
                              
                              {event.team && (
                                <p className="text-xs sm:text-sm font-semibold mb-1 truncate" title={event.team}>
                                  {event.team}
                                </p>
                              )}
                              
                              {event.player && (
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm sm:text-base font-bold text-gray-900 truncate" title={event.player}>
                                    {event.player}
                                  </p>
                                  {event.playerNumber && (
                                    <span className="text-xs sm:text-sm font-mono bg-white/80 px-1.5 sm:px-2 py-0.5 rounded shadow-sm flex-shrink-0">
                                      #{event.playerNumber}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {event.description && event.description !== event.type && !event.player && (
                                <p className="text-xs sm:text-sm opacity-90 mt-1">{event.description}</p>
                              )}
                            </div>
                            
                            {(event.homeScore !== undefined || event.awayScore !== undefined) && (
                              <div className="text-right flex-shrink-0">
                                <div className="text-xl sm:text-2xl font-bold whitespace-nowrap">
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
            </>
          )}

          {/* Top Scorers Tab */}
          {activeTab === "scorers" && Object.keys(topScorersByTeam).length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center mb-6">
                <div className="text-4xl sm:text-5xl mb-2">🏆</div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Målskyttar</h3>
                <p className="text-sm text-gray-500 mt-1">Topp 3 målgörare per lag</p>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                {Object.entries(topScorersByTeam).map(([team, scorers]) => (
                  <div key={team} className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 sm:p-6 border-2 border-emerald-200 shadow-lg">
                    <h4 className="text-base sm:text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl">⚽</span>
                      {team}
                    </h4>
                    <div className="space-y-3 sm:space-y-4">
                      {scorers.map((scorer, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white rounded-xl px-4 sm:px-5 py-3 sm:py-4 shadow-md hover:shadow-lg transition-shadow">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <span className="text-2xl sm:text-3xl flex-shrink-0">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm sm:text-lg font-bold text-gray-900 truncate" title={scorer.player}>
                                {scorer.player}
                              </p>
                              {scorer.playerNumber && (
                                <p className="text-xs sm:text-sm text-gray-500 font-mono mt-0.5">
                                  Tröja #{scorer.playerNumber}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                              {scorer.goals}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">
                              {scorer.goals === 1 ? "mål" : "mål"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-t-2 border-gray-200 bg-gradient-to-t from-gray-50 to-white">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-base sm:text-lg font-bold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-98"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  )
}
