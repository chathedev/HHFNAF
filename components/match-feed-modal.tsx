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

  // Group events by period and sort events within each period by time
  const eventsByPeriod = matchFeed.reduce((acc, event) => {
    const period = event.period || 0
    if (!acc[period]) {
      acc[period] = []
    }
    acc[period].push(event)
    return acc
  }, {} as Record<number, MatchFeedEvent[]>)

  // Sort events within each period by time (descending - most recent first)
  Object.keys(eventsByPeriod).forEach((periodKey) => {
    const period = Number(periodKey)
    eventsByPeriod[period].sort((a, b) => {
      // Parse time strings (format: "MM:SS" or "M:SS")
      const parseTime = (timeStr: string) => {
        const parts = timeStr.split(':')
        return parseInt(parts[0]) * 60 + parseInt(parts[1])
      }
      return parseTime(b.time) - parseTime(a.time) // Reverse: 60:00 → 0:00
    })
  })

  const periods = Object.keys(eventsByPeriod)
    .map(Number)
    .filter(p => p > 0) // Only show actual periods (not period 0)
    .sort((a, b) => b - a) // Reverse order: Period 2 first, then Period 1

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-white w-full sm:max-w-2xl sm:rounded-xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg sm:text-xl font-bold">Matchhändelser</h2>
                {matchStatus === "live" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    LIVE
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="font-semibold">{homeTeam} vs {awayTeam}</div>
                {finalScore && (
                  <div className="text-2xl font-black">{finalScore}</div>
                )}
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Stäng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white">
          <div className="flex">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors relative ${
                activeTab === "timeline"
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Tidslinje ({matchFeed.length})
              {activeTab === "timeline" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"></div>
              )}
            </button>
            
            {Object.keys(topScorersByTeam).length > 0 && (
              <button
                onClick={() => setActiveTab("scorers")}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors relative ${
                  activeTab === "scorers"
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Målskyttar ({Object.values(topScorersByTeam).reduce((sum, scorers) => sum + scorers.length, 0)})
                {activeTab === "scorers" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"></div>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="p-4">
              {matchFeed.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Inga händelser att visa
                </div>
              ) : (
                <div className="space-y-6">
                  {/* End of Match Marker - at the top */}
                  {matchFeed.length > 0 && (
                    <div className="flex justify-center py-6 animate-in fade-in duration-500">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-200 blur-xl opacity-50 animate-pulse"></div>
                        <div className="relative bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 text-white px-8 py-4 rounded-2xl shadow-xl">
                          <div className="flex items-center justify-center gap-3">
                            <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <div>
                              <p className="text-xl font-black uppercase tracking-wide">Matchen Slut</p>
                              {finalScore && (
                                <p className="text-sm opacity-90 mt-0.5">Slutresultat: {finalScore}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {periods.map((period) => (
                    <div key={period}>
                      {/* Period Header */}
                      <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t-2 border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-gradient-to-r from-gray-900 to-gray-700 text-white px-6 py-2 text-sm font-bold uppercase tracking-widest rounded-full shadow-lg">
                            {period === 1 ? "Första halvlek" : period === 2 ? "Andra halvlek" : `Period ${period}`}
                          </span>
                        </div>
                      </div>

                      {/* Team Legend */}
                      <div className="flex items-center justify-center gap-6 mb-6">
                        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-lg shadow-md">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                          <span className="text-sm font-bold">{homeTeam}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg shadow-md">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                          <span className="text-sm font-bold">{awayTeam}</span>
                        </div>
                      </div>
                      
                      {/* Events */}
                      <div className="space-y-3">
                        {eventsByPeriod[period].map((event, idx) => {
                          // Determine if event is for home or away team
                          const homeTeamFirstWord = homeTeam?.toLowerCase().split(' ')[0] || ''
                          const eventTeamLower = event.team?.toLowerCase() || ''
                          const isHomeEvent = (homeTeamFirstWord && eventTeamLower.includes(homeTeamFirstWord)) || event.isHomeGoal
                          
                          // Determine if this is Härnösands HF
                          const isHHF = homeTeam.toLowerCase().includes('härnösand') ? isHomeEvent : !isHomeEvent
                          
                          const isGoal = event.type?.toLowerCase().includes("mål")
                          const isCard = event.type?.toLowerCase().includes("utvisning") || event.type?.toLowerCase().includes("varning")
                          
                          return (
                            <div 
                              key={idx} 
                              className={`relative overflow-hidden rounded-xl shadow-md transition-all hover:shadow-xl ${
                                isGoal 
                                  ? isHHF 
                                    ? "bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-400" 
                                    : "bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-400"
                                  : isCard
                                    ? "bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-400"
                                    : "bg-white border-2 border-gray-200"
                              }`}
                            >
                              {/* Colored accent bar */}
                              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                                isHHF ? "bg-emerald-500" : "bg-orange-500"
                              }`}></div>
                              
                              <div className="pl-5 pr-4 py-3">
                                <div className="flex items-start gap-4">
                                  {/* Time Badge */}
                                  <div className="flex-shrink-0">
                                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-black shadow-md ${
                                      isGoal 
                                        ? isHHF 
                                          ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white" 
                                          : "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
                                        : isCard
                                          ? "bg-gradient-to-br from-red-500 to-red-600 text-white"
                                          : "bg-gradient-to-br from-gray-700 to-gray-800 text-white"
                                    }`}>
                                      <span className="text-xs opacity-75">MIN</span>
                                      <span className="text-base">{event.time.split(':')[0]}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Event Details */}
                                  <div className="flex-1 min-w-0">
                                    {/* Header Row */}
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full shadow-sm ${
                                          isHHF 
                                            ? "bg-emerald-500 text-white" 
                                            : "bg-orange-500 text-white"
                                        }`}>
                                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                          {isHHF ? 'HHF' : awayTeam.split(' ').slice(0, 2).join(' ')}
                                        </span>
                                        <span className={`text-sm font-bold ${
                                          isGoal ? "text-gray-900" : "text-gray-700"
                                        }`}>
                                          {event.type}
                                        </span>
                                      </div>
                                      
                                      {/* Score Display */}
                                      {(event.homeScore !== undefined || event.awayScore !== undefined) && (
                                        <div className="flex-shrink-0">
                                          <div className="bg-gray-900 text-white px-3 py-1 rounded-lg shadow-md">
                                            <span className="text-base font-black tabular-nums">
                                              {event.homeScore ?? 0}–{event.awayScore ?? 0}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Player Info */}
                                    {event.player && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-base font-bold text-gray-900">{event.player}</span>
                                        {event.playerNumber && (
                                          <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-800 text-white text-xs font-bold rounded-md">
                                            {event.playerNumber}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Description */}
                                    {event.description && event.description !== event.type && !event.player && (
                                      <p className="text-xs text-gray-600 mt-1 italic">{event.description}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Top Scorers Tab */}
          {activeTab === "scorers" && Object.keys(topScorersByTeam).length > 0 && (
            <div className="p-4 space-y-4">
              {Object.entries(topScorersByTeam).map(([team, scorers]) => (
                <div key={team} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">{team}</h4>
                  <div className="space-y-2">
                    {scorers.map((scorer, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-lg flex-shrink-0">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{scorer.player}</p>
                            {scorer.playerNumber && (
                              <p className="text-xs text-gray-500 font-mono">#{scorer.playerNumber}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xl font-black text-emerald-600">{scorer.goals}</span>
                          <span className="text-xs text-gray-600">mål</span>
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
        <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  )
}
