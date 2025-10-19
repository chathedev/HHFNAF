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
  matchId?: string
  onRefresh?: () => Promise<void>
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
  onRefresh,
}: MatchFeedModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<"timeline" | "scorers">("timeline")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // The modal displays data that's already being refreshed by parent components
  // (useMatchData refreshes every 1 second). This indicator just shows when data changes.
  useEffect(() => {
    if (!isOpen) return
    
    // Show refresh indicator briefly when match feed updates
    setIsRefreshing(true)
    const timer = setTimeout(() => setIsRefreshing(false), 500)
    return () => clearTimeout(timer)
  }, [matchFeed.length, isOpen])

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
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Matchhändelser
                </h2>
                {matchStatus === "live" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-red-100 text-red-700 text-xs sm:text-sm font-bold rounded-full">
                    <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-red-600 rounded-full animate-pulse"></span>
                    LIVE
                  </span>
                )}
                {isRefreshing && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uppdaterar
                  </span>
                )}
              </div>
              
              {/* Team Names and Score */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  {finalScore && (
                    <div className="text-3xl sm:text-4xl font-black text-emerald-600">{finalScore}</div>
                  )}
                  <div className="text-sm text-gray-500">
                    {matchFeed.length} händelse{matchFeed.length !== 1 ? "r" : ""}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-sm sm:text-base font-bold text-gray-900 text-right">{homeTeam}</div>
                  <div className="text-xs text-gray-400">vs</div>
                  <div className="text-sm sm:text-base font-bold text-gray-900 text-right">{awayTeam}</div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Stäng"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
            </button>
          </div>
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
                      <span className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider px-3 py-1.5 bg-gray-100 rounded-full">
                        {period === 1 ? "Första halvlek" : period === 2 ? "Andra halvlek" : `Period ${period}`}
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    </div>
                  )}
                  
                  <div className="relative space-y-3">
                    {eventsByPeriod[period].map((event, idx) => {
                      // Determine if event is for home or away team
                      const isHomeEvent = event.team?.toLowerCase().includes(homeTeam.toLowerCase().split(' ')[0]) || event.isHomeGoal
                      const isGoal = event.type.toLowerCase().includes("mål")
                      
                      return (
                        <div key={idx} className="relative">
                          {/* Desktop: Side-by-side layout */}
                          <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-4 items-center">
                            {/* Home team event (left side) */}
                            {isHomeEvent ? (
                              <div className={`rounded-xl border-2 p-4 ${getEventColor(event.type)} transition-all hover:shadow-lg`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    {event.player && (
                                      <div className="flex items-center gap-2 mb-2">
                                        <p className="text-base font-bold text-gray-900">{event.player}</p>
                                        {event.playerNumber && (
                                          <span className="text-sm font-mono bg-white/80 px-2 py-0.5 rounded">
                                            #{event.playerNumber}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    <span className="text-sm font-bold">{event.type}</span>
                                    {event.description && event.description !== event.type && !event.player && (
                                      <p className="text-sm opacity-90 mt-1">{event.description}</p>
                                    )}
                                  </div>
                                  <span className="text-2xl">{getEventIcon(event.type)}</span>
                                </div>
                              </div>
                            ) : (
                              <div></div>
                            )}
                            
                            {/* Center timeline */}
                            <div className="flex flex-col items-center">
                              <div className="w-16 h-16 rounded-full bg-white border-3 border-emerald-400 flex items-center justify-center shadow-lg">
                                <span className="text-sm font-bold text-emerald-700">{event.time}</span>
                              </div>
                              {idx < eventsByPeriod[period].length - 1 && (
                                <div className="w-0.5 h-8 bg-emerald-300"></div>
                              )}
                            </div>
                            
                            {/* Away team event (right side) */}
                            {!isHomeEvent ? (
                              <div className={`rounded-xl border-2 p-4 ${getEventColor(event.type)} transition-all hover:shadow-lg`}>
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-2xl">{getEventIcon(event.type)}</span>
                                  <div className="flex-1 text-right">
                                    {event.player && (
                                      <div className="flex items-center justify-end gap-2 mb-2">
                                        {event.playerNumber && (
                                          <span className="text-sm font-mono bg-white/80 px-2 py-0.5 rounded">
                                            #{event.playerNumber}
                                          </span>
                                        )}
                                        <p className="text-base font-bold text-gray-900">{event.player}</p>
                                      </div>
                                    )}
                                    <span className="text-sm font-bold">{event.type}</span>
                                    {event.description && event.description !== event.type && !event.player && (
                                      <p className="text-sm opacity-90 mt-1">{event.description}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div></div>
                            )}
                          </div>
                          
                          {/* Mobile: Single column with team indicator */}
                          <div className="sm:hidden flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-12 h-12 rounded-full bg-white border-2 border-emerald-400 flex items-center justify-center shadow-lg">
                                <span className="text-xs font-bold text-emerald-700">{event.time}</span>
                              </div>
                              {idx < eventsByPeriod[period].length - 1 && (
                                <div className="w-0.5 flex-1 min-h-[20px] bg-emerald-300"></div>
                              )}
                            </div>
                            
                            <div className={`flex-1 rounded-xl border-2 p-3 ${getEventColor(event.type)}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold px-2 py-0.5 bg-white/80 rounded">
                                      {isHomeEvent ? homeTeam.split(' ')[0] : awayTeam.split(' ')[0]}
                                    </span>
                                    <span className="text-sm font-bold">{event.type}</span>
                                  </div>
                                  {event.player && (
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-bold text-gray-900">{event.player}</p>
                                      {event.playerNumber && (
                                        <span className="text-xs font-mono bg-white/80 px-1.5 py-0.5 rounded">
                                          #{event.playerNumber}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xl">{getEventIcon(event.type)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Score display */}
                          {(event.homeScore !== undefined || event.awayScore !== undefined) && (
                            <div className="text-center mt-2">
                              <div className="inline-block px-4 py-1 bg-gray-100 rounded-full">
                                <span className="text-lg font-bold text-gray-900">
                                  {event.homeScore ?? 0}–{event.awayScore ?? 0}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
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
