"use client"

import { useEffect, useRef, useState, useCallback } from "react"
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
  matchStatus?: "live" | "finished" | "upcoming" | "halftime"
  matchId?: string
  onRefresh?: () => Promise<void>
}

export function MatchFeedModal({
  isOpen,
  onClose,
  matchFeed: initialMatchFeed,
  homeTeam,
  awayTeam,
  finalScore: initialFinalScore,
  matchStatus,
  matchId,
  onRefresh,
}: MatchFeedModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<"timeline" | "scorers">("timeline")
  const [matchFeed, setMatchFeed] = useState<MatchFeedEvent[]>(initialMatchFeed ?? [])
  const [finalScore, setFinalScore] = useState(initialFinalScore)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshCallbackRef = useRef(onRefresh)
  const isMountedRef = useRef(true)

  useEffect(() => {
    refreshCallbackRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const triggerRefresh = useCallback(async () => {
    const handler = refreshCallbackRef.current
    if (!handler) {
      return
    }

    if (isMountedRef.current) {
      setIsRefreshing(true)
    }
    try {
      await handler()
    } catch (error) {
      console.error("Modal refresh error:", error)
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [])

  // Update local state but preserve newer data - prevent regression
  useEffect(() => {
    const newFeed = initialMatchFeed ?? []
    const newScore = initialFinalScore
    
    setMatchFeed(currentFeed => {
      if (newFeed.length >= currentFeed.length || 
          (newFeed.length > 0 && JSON.stringify(newFeed) !== JSON.stringify(currentFeed))) {
        return newFeed
      }
      console.log(`🔒 New Modal preserving newer timeline: ${currentFeed.length} vs ${newFeed.length} events`)
      return currentFeed
    })
    
    setFinalScore(currentScore => {
      // Always prefer non-zero scores over zero scores
      if (newScore && newScore !== "0-0" && newScore !== "0–0") {
        return newScore
      }
      if (currentScore && currentScore !== "0-0" && currentScore !== "0–0") {
        return currentScore // Keep existing non-zero score
      }
      return newScore
    })
  }, [initialMatchFeed, initialFinalScore])

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
                {matchStatus === "halftime" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    PAUS
                  </span>
                )}
                {isRefreshing && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-spin"></span>
                    Uppdaterar
                  </span>
                )}
                {onRefresh && (
                  <button
                    type="button"
                    onClick={triggerRefresh}
                    disabled={isRefreshing}
                    className="text-[11px] font-semibold uppercase tracking-[0.3em] border border-white/70 px-3 py-1 rounded-full hover:border-white transition disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isRefreshing ? "Uppdaterar..." : "Uppdatera"}
                  </button>
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
                  {periods.map((period) => (
                    <div key={period}>
                      {/* Period Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-gray-300"></div>
                        <span className="text-xs font-bold text-gray-600 uppercase px-3 py-1 bg-white rounded-full border border-gray-300">
                          {period === 1 ? "Första halvlek" : period === 2 ? "Andra halvlek" : `Period ${period}`}
                        </span>
                        <div className="h-px flex-1 bg-gray-300"></div>
                      </div>

                      {/* Team Legend - Härnösand always green */}
                      <div className="flex items-center justify-center gap-4 mb-4 text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                          <span className="text-gray-700">
                            {homeTeam.toLowerCase().includes("härnösand") ? homeTeam : 
                             awayTeam.toLowerCase().includes("härnösand") ? awayTeam : 
                             "Härnösands HF"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                          <span className="text-gray-700">
                            {homeTeam.toLowerCase().includes("härnösand") ? awayTeam : homeTeam}
                          </span>
                        </div>
                      </div>
                      
                      {/* Events */}
                      <div className="space-y-2">
                        {eventsByPeriod[period].map((event, idx) => {
                          // Determine if event is for home or away team
                          const eventTeamLower = event.team?.toLowerCase() || ''
                          
                          // ENHANCED: Only Härnösand gets green, everyone else gets blue
                          const isHarnosandEvent = (
                            eventTeamLower.includes("härnösand") || 
                            eventTeamLower.includes("harnosand") || 
                            eventTeamLower.includes("hhf")
                          ) && !(
                            // Exclude common opponent names that might contain similar patterns
                            eventTeamLower.includes("sikeå") ||
                            eventTeamLower.includes("sikea") ||
                            eventTeamLower.includes("hudik") ||
                            eventTeamLower.includes("sundsvall") ||
                            eventTeamLower.includes("kramfors") ||
                            eventTeamLower.includes("borlänge") ||
                            eventTeamLower.includes("sandviken")
                          )
                          const isGoal = event.type?.toLowerCase().includes("mål")
                          const isCard = event.type?.toLowerCase().includes("utvisning") || event.type?.toLowerCase().includes("varning")
                          
                          return (
                            <div 
                              key={idx} 
                              className={`bg-white rounded-lg p-3 border-l-4 transition-all hover:shadow-md ${
                                isGoal 
                                  ? isHarnosandEvent 
                                    ? "border-emerald-500 bg-emerald-50/30" 
                                    : "border-blue-500 bg-blue-50/30"
                                  : isCard
                                    ? "border-red-500 bg-red-50/30"
                                    : "border-gray-300"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Time */}
                                <div className="flex-shrink-0">
                                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xs ${
                                    isGoal 
                                      ? isHarnosandEvent 
                                        ? "bg-emerald-100 text-emerald-700" 
                                        : "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}>
                                    {event.time}
                                  </div>
                                </div>
                                
                                {/* Event Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                        isHarnosandEvent 
                                          ? "bg-emerald-100 text-emerald-700" 
                                          : "bg-blue-100 text-blue-700"
                                      }`}>
                                        {isHarnosandEvent ? "Härnösand" : (event.team || "Motståndare")}
                                      </span>
                                      <span className="text-sm font-semibold text-gray-900">{event.type}</span>
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
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="font-bold text-gray-900">{event.player}</span>
                                      {event.playerNumber && (
                                        <span className="text-xs font-mono text-gray-500">#{event.playerNumber}</span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Description (if different from type and no player) */}
                                  {event.description && event.description !== event.type && !event.player && (
                                    <p className="text-xs text-gray-600 mt-1">{event.description}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  
                  {/* End of Match Marker */}
                  {matchFeed.length > 0 && (
                    <div className="flex justify-center py-6">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg mb-2">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-lg font-bold text-gray-900">Slut</p>
                        {finalScore && (
                          <p className="text-xs text-gray-500 mt-1">Slutresultat: {finalScore}</p>
                        )}
                      </div>
                    </div>
                  )}
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
