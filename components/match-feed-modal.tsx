"use client"

import { useEffect, useMemo, useRef, useState, memo } from "react"
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

  useEffect(() => {
    const newFeed = initialMatchFeed ?? []
    const newScore = initialFinalScore
    
    // Only update if we have newer/more data - prevent regression
    setMatchFeed(currentFeed => {
      if (newFeed.length >= currentFeed.length || 
          (newFeed.length > 0 && JSON.stringify(newFeed) !== JSON.stringify(currentFeed))) {
        return newFeed
      }
      console.log(`🔒 Modal preserving newer timeline data: ${currentFeed.length} vs ${newFeed.length} events`)
      return currentFeed // Keep existing if it has more events
    })
    
    setFinalScore(currentScore => {
      if (newScore && newScore !== "0-0" && newScore !== "0–0" && 
          (!currentScore || currentScore === "0-0" || currentScore === "0–0")) {
        return newScore
      }
      if (!newScore || newScore === "0-0" || newScore === "0–0") {
        return currentScore // Keep existing score if new one is empty/zero
      }
      return newScore
    })
  }, [initialMatchFeed, initialFinalScore])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    document.addEventListener("mousedown", handleClickOutside)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  const matchEndedByTimeline = useMemo(
    () =>
      matchFeed.some((event) => {
        const text = `${event.type || ''} ${event.description || ''}`.toLowerCase()
        // Only consider ACTUAL match end events, NOT halftime
        return (
          text.includes("2:a halvlek är slut") ||
          text.includes("2:a halvlek slut") ||
          text.includes("andra halvlek är slut") ||
          text.includes("andra halvlek slut") ||
          text.includes("matchen är slut") ||
          text.includes("matchen slut") ||
          text.includes("match över") ||
          text.includes("slutresultat") ||
          text.includes("matchen avslutad") ||
          (text.includes("final") && !text.includes("första"))
        )
      }),
    [matchFeed],
  )

  const hasTimelineEvents = matchFeed.length > 0
  const isFinished = matchEndedByTimeline || matchStatus === "finished"
  const isLive = !isFinished && (matchStatus === "live" || matchStatus === "halftime")
  const isHalftime = matchStatus === "halftime"
  const isUpcoming = !isLive && !isFinished

  useEffect(() => {
    if (!isOpen || !onRefresh || !matchId) {
      return
    }

    let isMounted = true
    let isRefreshing = false

    const refreshData = async () => {
      if (isRefreshing || !isMounted) {
        return
      }
      
      isRefreshing = true
      setIsRefreshing(true)
      
      try {
        await onRefresh()
      } catch (error) {
        console.error('Modal refresh error:', error)
        // Continue trying even on errors
      } finally {
        isRefreshing = false
        setIsRefreshing(false)
      }
    }

    // Immediate refresh on open
    refreshData()
    
    // Ultra-responsive refresh - 300ms for live matches, 500ms for others
    const isLive = matchStatus === "live"
    const refreshInterval = isLive ? 300 : 500
    const intervalId = window.setInterval(refreshData, refreshInterval)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [isOpen, onRefresh, matchId])

  const goalEvents = useMemo(
    () => matchFeed.filter((event) => event.type?.toLowerCase().includes("mål") && event.player),
    [matchFeed],
  )

  const scorersByTeam = useMemo(() => {
    return goalEvents.reduce((acc, event) => {
      const team = event.team || "Okänt lag"
      if (!acc[team]) {
        acc[team] = {}
      }

      const playerKey = `${event.player}${event.playerNumber ? ` (#${event.playerNumber})` : ""}`
      if (!acc[team][playerKey]) {
        acc[team][playerKey] = {
          player: event.player!,
          playerNumber: event.playerNumber,
          goals: 0,
        }
      }
      acc[team][playerKey].goals += 1

      return acc
    }, {} as Record<string, Record<string, { player: string; playerNumber?: string; goals: number }>>)
  }, [goalEvents])

  const topScorersByTeam = useMemo(() => {
    return Object.entries(scorersByTeam).reduce((acc, [team, scorers]) => {
      acc[team] = Object.values(scorers)
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 3)
      return acc
    }, {} as Record<string, Array<{ player: string; playerNumber?: string; goals: number }>>)
  }, [scorersByTeam])

  const eventsByPeriod = useMemo(() => {
    const grouped: Record<number, MatchFeedEvent[]> = {}
    const parseTime = (timeStr: string) => {
      const [minutes = "0", seconds = "0"] = timeStr.split(":")
      const parsedMinutes = Number.parseInt(minutes, 10)
      const parsedSeconds = Number.parseInt(seconds, 10)
      if (Number.isNaN(parsedMinutes) || Number.isNaN(parsedSeconds)) {
        return 0
      }
      return parsedMinutes * 60 + parsedSeconds
    }

    for (const event of matchFeed) {
      const periodKey = event.period ?? 0
      if (!grouped[periodKey]) {
        grouped[periodKey] = []
      }
      grouped[periodKey].push(event)
    }

    Object.values(grouped).forEach((events) => {
      events.sort((a, b) => parseTime(b.time) - parseTime(a.time))
    })

    return grouped
  }, [matchFeed])

  const periods = useMemo(
    () =>
      Object.keys(eventsByPeriod)
        .map(Number)
        .sort((a, b) => b - a),
    [eventsByPeriod],
  )

  const hasScorers = useMemo(() => Object.keys(topScorersByTeam).length > 0, [topScorersByTeam])

  if (!isOpen) {
    return null
  }

  const formatPeriodLabel = (period: number) => {
    if (period === 1) return "Första halvlek"
    if (period === 2) return "Andra halvlek"
    if (period === 0) return "Matchstart och övrigt"
    return `Period ${period}`
  }

  const StatusBadge = ({ tone, label }: { tone: "live" | "finished" | "upcoming" | "info"; label: string }) => {
    const styles: Record<"live" | "finished" | "upcoming" | "info", string> = {
      live: "border border-rose-200 bg-rose-50 text-rose-600",
      finished: "border border-slate-200 bg-slate-100 text-slate-700",
      upcoming: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      info: "border border-slate-200 bg-slate-50 text-slate-500",
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${styles[tone]}`}>
        {tone === "live" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />}
        {label}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-2 py-4 sm:px-6">
      <div
        className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.3)] md:h-[90vh]"
        ref={modalRef}
      >
        <header className="border-b border-slate-200 px-6 py-6 sm:px-10">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Matchuppföljning</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-3xl">
                  {homeTeam} <span className="text-slate-300">vs</span> {awayTeam}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isLive && !isHalftime && <StatusBadge tone="live" label="Pågår" />}
                {isHalftime && <StatusBadge tone="live" label="Paus" />}
                {isUpcoming && <StatusBadge tone="upcoming" label="Kommande" />}
                {isFinished && <StatusBadge tone="finished" label="Avslutad" />}
                {isRefreshing && (
                  <span className="text-xs text-slate-400 animate-pulse flex items-center gap-1">
                    <span className="h-1 w-1 bg-slate-400 rounded-full animate-ping"></span>
                    Live
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-4">
              <button
                onClick={onClose}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Stäng"
              >
                <X className="h-5 w-5" />
              </button>



              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Resultat</p>
                <div className="mt-1 inline-flex min-w-[120px] items-center justify-center rounded-3xl bg-slate-900 px-6 py-4 text-3xl font-semibold text-white">
                  {finalScore ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </header>

        <nav className="grid grid-cols-2 border-b border-slate-200 bg-slate-50/70 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-6 py-4 transition ${
              activeTab === "timeline"
                ? "bg-white text-slate-900 shadow-[inset_0_-2px_0_rgba(15,23,42,0.08)]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tidslinje{hasTimelineEvents ? ` (${matchFeed.length})` : ""}
          </button>
          <button
            onClick={() => setActiveTab("scorers")}
            className={`px-6 py-4 transition ${
              activeTab === "scorers"
                ? "bg-white text-slate-900 shadow-[inset_0_-2px_0_rgba(15,23,42,0.08)]"
                : "text-slate-500 hover:text-slate-800"
            } disabled:cursor-not-allowed disabled:opacity-40`}
            disabled={!hasScorers}
          >
            Målskyttar{hasScorers ? "" : " (0)"}
          </button>
        </nav>

        <div className="flex-1 min-h-0 bg-slate-50">
          {activeTab === "timeline" && (
            <div className="relative h-full">
              <div className="absolute inset-0 overflow-y-auto px-6 pb-10 pt-8 sm:px-10">
                {matchFeed.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Inga händelser ännu.
                  </div>
                ) : (
                  <div className="space-y-12 pb-12">
                    {periods.map((period) => (
                      <section key={period} className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                            {formatPeriodLabel(period)}
                          </p>
                        </div>
                        <ul className="space-y-4 border-l border-slate-200 pl-7">
                          {eventsByPeriod[period].map((event, index) => {
                            const type = event.type?.toLowerCase() ?? ""
                            const isGoal = type.includes("mål")
                            const isWarning = type.includes("utvisning") || type.includes("varning")
                            const score =
                              event.homeScore !== undefined && event.awayScore !== undefined
                                ? `${event.homeScore}\u2013${event.awayScore}`
                                : event.score

                            const eventTeam = event.team?.toLowerCase() ?? ""
                            
                            // ENHANCED: Only Härnösand gets green, everyone else gets blue
                            const isHarnosandEvent = (
                              eventTeam.includes("härnösand") || 
                              eventTeam.includes("harnosand") || 
                              eventTeam.includes("hhf")
                            ) && !(
                              // Exclude common opponent names that might contain similar patterns
                              eventTeam.includes("sikeå") ||
                              eventTeam.includes("sikea") ||
                              eventTeam.includes("hudik") ||
                              eventTeam.includes("sundsvall") ||
                              eventTeam.includes("kramfors") ||
                              eventTeam.includes("borlänge") ||
                              eventTeam.includes("sandviken")
                            )

                            const tone = isGoal
                              ? isHarnosandEvent
                                ? "bg-emerald-50 border-emerald-100"
                                : "bg-sky-50 border-sky-100"
                              : isWarning
                                ? "bg-amber-50 border-amber-100"
                                : "bg-white/80 border-slate-100"

                            const dotTone = isGoal
                              ? isHarnosandEvent
                                ? "bg-emerald-500 ring-4 ring-emerald-100"
                                : "bg-sky-500 ring-4 ring-sky-100"
                              : isWarning
                                ? "bg-amber-500 ring-4 ring-amber-100"
                                : "bg-slate-300 ring-4 ring-slate-200/70"

                            return (
                              <li key={`${event.time}-${index}`} className="relative">
                                <span className={`absolute -left-[12px] top-5 h-3 w-3 rounded-full ${dotTone}`} />
                                <div
                                  className={`rounded-[26px] border px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${tone}`}
                                >
                                  <div className="flex flex-wrap items-start gap-4">
                                    <span className="rounded-full bg-white/70 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
                                      {event.time}
                                    </span>
                                    <div className="min-w-0 flex-1 space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-900">{event.type}</p>
                                        {event.team && (
                                          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                            {event.team}
                                          </span>
                                        )}
                                        {score && (
                                          <span className="ml-auto rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                                            {score}
                                          </span>
                                        )}
                                      </div>
                                      {event.player && (
                                        <p className="text-sm text-slate-700">
                                          {event.player}
                                          {event.playerNumber && (
                                            <span className="text-slate-500"> #{event.playerNumber}</span>
                                          )}
                                        </p>
                                      )}
                                      {event.description && (
                                        <p className="text-xs text-slate-500">{event.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "scorers" && (
            <div className="relative h-full">
              <div className="absolute inset-0 overflow-y-auto px-6 pb-10 pt-8 sm:px-10">
                {Object.keys(topScorersByTeam).length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Inga noterade målskyttar.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(topScorersByTeam).map(([team, scorers]) => (
                      <section key={team} className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{team}</h3>
                        <ul className="mt-3 space-y-2">
                          {scorers.map((scorer, index) => (
                            <li
                              key={`${scorer.player}-${index}`}
                              className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
                                <div>
                                  <p className="font-medium text-slate-900">{scorer.player}</p>
                                  {scorer.playerNumber && (
                                    <p className="text-xs text-slate-500">#{scorer.playerNumber}</p>
                                  )}
                                </div>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-900 shadow-sm">
                                {scorer.goals} mål
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders during frequent updates
export default memo(MatchFeedModal)
