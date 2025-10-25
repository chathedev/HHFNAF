"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import confetti from "canvas-confetti"

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
  const [matchFeed, setMatchFeed] = useState(initialMatchFeed)
  const [finalScore, setFinalScore] = useState(initialFinalScore)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const prevHHFGoalsRef = useRef<number>(0)

  // Update local state when props change
  useEffect(() => {
    setMatchFeed(initialMatchFeed)
    setFinalScore(initialFinalScore)
  }, [initialMatchFeed, initialFinalScore])

  // Auto-refresh for live matches
  useEffect(() => {
    if (!isOpen || matchStatus !== "live" || !matchId || !onRefresh) {
      console.log('Auto-refresh disabled:', { isOpen, matchStatus, matchId, hasOnRefresh: !!onRefresh })
      return
    }

    console.log('Auto-refresh enabled for match:', matchId)
    
    let isMounted = true
    let isCurrentlyRefreshing = false

    const refreshData = async () => {
      // Don't refresh if modal was closed or already refreshing
      if (!isMounted || isCurrentlyRefreshing) {
        return
      }
      
      isCurrentlyRefreshing = true
      setIsRefreshing(true)
      
      try {
        console.log('Refreshing match data...')
        await onRefresh()
        if (isMounted) {
          console.log('Match data refreshed successfully')
        }
      } catch (error) {
        if (isMounted) {
          console.error("Failed to refresh match data:", error)
        }
      } finally {
        isCurrentlyRefreshing = false
        if (isMounted) {
          setIsRefreshing(false)
        }
      }
    }

    // Initial refresh when modal opens
    refreshData()

    // Refresh every 3 seconds for live matches
    const interval = setInterval(refreshData, 3000)

    return () => {
      isMounted = false
      clearInterval(interval)
      console.log('Auto-refresh cleanup for match:', matchId)
    }
  }, [isOpen, matchStatus, matchId, onRefresh])

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

  // Trigger confetti when Härnösands HF scores
  useEffect(() => {
    if (!isOpen || !matchFeed || matchFeed.length === 0) {
      return
    }

    // Count HHF goals - only actual goals, not timeouts or other events
    const homeTeamLower = homeTeam?.toLowerCase() || ''
    const isHomeHHF = homeTeamLower.includes('härnösand')
    
    const hhfGoals = matchFeed.filter(event => {
      const eventType = event.type?.toLowerCase() || ''
      // Must be exactly "mål" and not contain "timeout" or other non-goal events
      if (!eventType.includes("mål") || eventType.includes("timeout") || eventType.includes("utvisning")) return false
      const eventTeamLower = event.team?.toLowerCase() || ''
      const isHomeEvent = eventTeamLower.includes(homeTeamLower.split(' ')[0]) || event.isHomeGoal
      return isHomeHHF ? isHomeEvent : !isHomeEvent
    }).length

    // Trigger confetti if goals increased
    if (hhfGoals > prevHHFGoalsRef.current && prevHHFGoalsRef.current > 0) {
      console.log('🎉 Härnösands HF scored! Triggering confetti!')
      
      // Fast burst of confetti
      const count = 200
      const defaults = {
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#ffffff', '#fbbf24']
      }

      const fire = (particleRatio: number, opts: any) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        })
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      })
      fire(0.2, {
        spread: 60,
      })
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8
      })
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2
      })
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      })
    }

    prevHHFGoalsRef.current = hhfGoals
  }, [isOpen, matchFeed, homeTeam])

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-base font-semibold text-gray-900">Matchhändelser</h2>
                {matchStatus === "live" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded">
                    <span className="w-1 h-1 bg-red-600 rounded-full animate-pulse"></span>
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
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Stäng"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-gray-100 bg-white">
          <div className="flex px-4">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-3 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "timeline"
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Tidslinje
              {activeTab === "timeline" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
              )}
            </button>
            
            {Object.keys(topScorersByTeam).length > 0 && (
              <button
                onClick={() => setActiveTab("scorers")}
                className={`px-3 py-2.5 text-sm font-medium transition-colors relative ${
                  activeTab === "scorers"
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Målskyttar
                {activeTab === "scorers" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
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
                <div className="text-center py-12 text-gray-400 text-sm">
                  Inga händelser att visa
                </div>
              ) : (
                <div className="space-y-6">
                  {periods.map((period) => (
                    <div key={period}>
                      {/* Period Header - Enhanced */}
                      <div className="relative mb-5">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-gray-900 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-full">
                            {period === 1 ? "Första halvlek" : period === 2 ? "Andra halvlek" : `Period ${period}`}
                          </span>
                        </div>
                      </div>
                      
                      {/* Events - Enhanced */}
                      <div className="space-y-2.5">
                        {eventsByPeriod[period].map((event, idx) => {
                          // Determine if this is Härnösands HF
                          const homeTeamLower = homeTeam?.toLowerCase() || ''
                          const eventTeamLower = event.team?.toLowerCase() || ''
                          const isHomeEvent = homeTeamLower && eventTeamLower && (
                            eventTeamLower.includes(homeTeamLower.split(' ')[0]) || event.isHomeGoal
                          )
                          const isHHF = homeTeamLower.includes('härnösand') ? isHomeEvent : !isHomeEvent
                          
                          const isGoal = event.type?.toLowerCase().includes("mål") && 
                                        !event.type?.toLowerCase().includes("timeout") &&
                                        !event.type?.toLowerCase().includes("utvisning")
                          
                          // GOAL CARD - Impressive & Minimalistic Design
                          if (isGoal) {
                            return (
                              <div 
                                key={idx} 
                                className={`relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
                                  isHHF 
                                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/50" 
                                    : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/50"
                                }`}
                              >
                                {/* Celebratory Confetti Pattern Background */}
                                <div className="absolute inset-0 opacity-20 pointer-events-none">
                                  <div className="absolute top-3 left-6 w-3 h-3 bg-white rounded-full"></div>
                                  <div className="absolute top-6 left-12 w-2 h-2 bg-yellow-300 rounded-full"></div>
                                  <div className="absolute top-4 right-8 w-2.5 h-2.5 bg-white rounded-full"></div>
                                  <div className="absolute top-8 right-16 w-2 h-2 bg-yellow-200 rounded-full"></div>
                                  <div className="absolute bottom-4 left-10 w-2 h-2 bg-white rounded-full"></div>
                                  <div className="absolute bottom-6 right-12 w-3 h-3 bg-yellow-300 rounded-full"></div>
                                  <div className="absolute top-1/2 left-1/3 w-1.5 h-1.5 bg-white rounded-full"></div>
                                  <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-yellow-200 rounded-full"></div>
                                </div>
                                
                                <div className="relative p-5">
                                  <div className="flex items-center gap-4">
                                    {/* TIME - Large Circle Badge */}
                                    <div className="flex-shrink-0">
                                      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex flex-col items-center justify-center shadow-xl">
                                        <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Min</span>
                                        <span className="text-2xl font-black text-white">{event.time.split(':')[0]}</span>
                                      </div>
                                    </div>
                                    
                                    {/* GOAL INFO */}
                                    <div className="flex-1 min-w-0">
                                      {/* Goal Icon + Type */}
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className="text-3xl">⚽</div>
                                        <span className="text-xl font-black text-white uppercase tracking-wide">
                                          {event.type}
                                        </span>
                                      </div>
                                      
                                      {/* Player Name */}
                                      {event.player && (
                                        <div className="flex items-center gap-3 mb-2">
                                          <span className="text-lg font-bold text-white">
                                            {event.player}
                                          </span>
                                          {event.playerNumber && (
                                            <span className="inline-flex items-center justify-center min-w-[32px] h-7 bg-white/90 text-gray-900 text-sm font-black rounded-lg px-2 shadow-md">
                                              #{event.playerNumber}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Team Badge */}
                                      <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
                                        <span className="text-xl">{isHHF ? '🟢' : '🔵'}</span>
                                        <span className="text-sm font-bold text-white">
                                          {isHHF 
                                            ? 'Härnösands HF' 
                                            : homeTeam.toLowerCase().includes('härnösand')
                                              ? awayTeam
                                              : homeTeam
                                          }
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* SCORE - Large Display */}
                                    {(event.homeScore !== undefined || event.awayScore !== undefined) && (
                                      <div className="flex-shrink-0">
                                        <div className="bg-white/95 backdrop-blur-sm px-5 py-3 rounded-2xl shadow-2xl">
                                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center mb-1">
                                            Ställning
                                          </div>
                                          <div className="text-3xl font-black text-gray-900 tabular-nums">
                                            {event.homeScore ?? 0}–{event.awayScore ?? 0}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          
                          // REGULAR EVENT CARD - Clean & Simple
                          return (
                            <div 
                              key={idx} 
                              className="relative bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm overflow-hidden"
                            >
                              {/* Team color indicator */}
                              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                isHHF ? "bg-emerald-500" : "bg-blue-500"
                              }`}></div>
                              
                              <div className="pl-4 pr-4 py-3.5">
                                <div className="flex items-center gap-4">
                                  {/* Time Badge */}
                                  <div className="flex-shrink-0">
                                    <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center">
                                      <span className="text-[10px] font-medium text-gray-500 uppercase">Min</span>
                                      <span className="text-lg font-bold text-gray-700">{event.time.split(':')[0]}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Event Details */}
                                  <div className="flex-1 min-w-0">
                                    {/* Team Badge + Event Type */}
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                                        isHHF 
                                          ? "bg-emerald-100 text-emerald-700" 
                                          : "bg-blue-100 text-blue-700"
                                      }`}>
                                        {isHHF ? '🟢' : '🔵'} 
                                        {isHHF 
                                          ? 'HHF' 
                                          : homeTeam.toLowerCase().includes('härnösand')
                                            ? awayTeam.split(' ')[0]
                                            : homeTeam.split(' ')[0]
                                        }
                                      </span>
                                      <span className="text-sm font-medium text-gray-900">
                                        {event.type}
                                      </span>
                                    </div>
                                    
                                    {/* Player Info */}
                                    {event.player && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-700">{event.player}</span>
                                        {event.playerNumber && (
                                          <span className="inline-flex items-center justify-center min-w-[22px] h-5 bg-gray-700 text-white text-xs font-bold rounded px-1.5">
                                            #{event.playerNumber}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Score Display */}
                                  {(event.homeScore !== undefined || event.awayScore !== undefined) && (
                                    <div className="flex-shrink-0">
                                      <div className="bg-gray-900 text-white px-3 py-1.5 rounded-lg">
                                        <span className="text-sm font-bold tabular-nums">
                                          {event.homeScore ?? 0}–{event.awayScore ?? 0}
                                        </span>
                                      </div>
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
              {Object.entries(topScorersByTeam).map(([team, scorers]) => (
                <div key={team} className="bg-white rounded-lg border border-gray-200 p-3">
                  <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">{team}</h4>
                  <div className="space-y-1.5">
                    {scorers.map((scorer, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-base flex-shrink-0">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{scorer.player}</p>
                            {scorer.playerNumber && (
                              <p className="text-xs text-gray-400">#{scorer.playerNumber}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-base font-bold text-gray-900">{scorer.goals}</span>
                          <span className="text-xs text-gray-500">mål</span>
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
        <div className="flex-shrink-0 p-3 border-t border-gray-100 bg-white">
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
