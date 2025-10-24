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

  // Determine if Härnösands HF is home or away team
  const isHHFHome = homeTeam.toLowerCase().includes('härnösand')
  const hhfTeam = isHHFHome ? homeTeam : awayTeam
  const opponentTeam = isHHFHome ? awayTeam : homeTeam

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-white w-full sm:max-w-2xl sm:rounded-xl shadow-lg max-h-[95vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-gray-900">Matchhändelser</h2>
                {matchStatus === "live" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    LIVE
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">{homeTeam} vs {awayTeam}</div>
                {finalScore && (
                  <div className="text-xl font-bold text-gray-900">{finalScore}</div>
                )}
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              aria-label="Stäng"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white">
          <div className="flex">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "timeline"
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Tidslinje ({matchFeed.length})
            </button>
            
            {Object.keys(topScorersByTeam).length > 0 && (
              <button
                onClick={() => setActiveTab("scorers")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "scorers"
                    ? "text-gray-900 border-b-2 border-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Målskyttar
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
                <div className="text-center py-12 text-gray-500 text-sm">
                  Inga händelser att visa
                </div>
              ) : (
                <div className="space-y-4">
                  {periods.map((period) => (
                    <div key={period}>
                      {/* Period Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-gray-200"></div>
                        <span className="text-xs font-semibold text-gray-500 uppercase px-2">
                          {period === 1 ? "1:a halvlek" : period === 2 ? "2:a halvlek" : `Period ${period}`}
                        </span>
                        <div className="h-px flex-1 bg-gray-200"></div>
                      </div>
                      
                      {/* Events */}
                      <div className="space-y-2">
                        {eventsByPeriod[period].map((event, idx) => {
                          // Determine if event is for Härnösands HF or opponent
                          const homeTeamFirstWord = homeTeam?.toLowerCase().split(' ')[0] || ''
                          const eventTeamLower = event.team?.toLowerCase() || ''
                          const isHomeEvent = (homeTeamFirstWord && eventTeamLower.includes(homeTeamFirstWord)) || event.isHomeGoal
                          const isHHFEvent = isHHFHome ? isHomeEvent : !isHomeEvent
                          
                          const isGoal = event.type?.toLowerCase().includes("mål")
                          
                          return (
                            <div 
                              key={idx} 
                              className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                {/* Time */}
                                <div className="flex-shrink-0">
                                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <span className="text-sm font-bold text-gray-700">{event.time}</span>
                                  </div>
                                </div>
                                
                                {/* Event Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                        isHHFEvent 
                                          ? "bg-green-100 text-green-700" 
                                          : "bg-blue-100 text-blue-700"
                                      }`}>
                                        {isHHFEvent ? 'HHF' : opponentTeam.split(' ')[0]}
                                      </span>
                                      <span className="text-sm font-medium text-gray-900">{event.type}</span>
                                    </div>
                                    
                                    {/* Score */}
                                    {(event.homeScore !== undefined || event.awayScore !== undefined) && (
                                      <span className="text-sm font-bold text-gray-900">
                                        {event.homeScore ?? 0}–{event.awayScore ?? 0}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Player Info */}
                                  {event.player && (
                                    <div className="text-sm text-gray-700">
                                      {event.player}
                                      {event.playerNumber && (
                                        <span className="text-xs text-gray-500 ml-1">#{event.playerNumber}</span>
                                      )}
                                    </div>
                                  )}
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
            <div className="p-4 space-y-3">
              {Object.entries(topScorersByTeam).map(([team, scorers]) => {
                const isHHFTeam = team.toLowerCase().includes('härnösand')
                return (
                  <div key={team} className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{team}</h4>
                    <div className="space-y-2">
                      {scorers.map((scorer, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              isHHFTeam ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{scorer.player}</p>
                              {scorer.playerNumber && (
                                <p className="text-xs text-gray-500">#{scorer.playerNumber}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-gray-900 flex-shrink-0">
                            {scorer.goals} mål
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  )
}
