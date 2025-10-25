"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
    setMatchFeed(initialMatchFeed ?? [])
    setFinalScore(initialFinalScore)
  }, [initialMatchFeed, initialFinalScore, matchStatus, matchId])

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
        const type = event.type?.toLowerCase() ?? ""
        const description = event.description?.toLowerCase() ?? ""
        return type.includes("slut") || description.includes("slut") || type.includes("matchen avslutad")
      }),
    [matchFeed],
  )

  const hasTimelineEvents = matchFeed.length > 0
  const isLive = !matchEndedByTimeline && (matchStatus === "live" || hasTimelineEvents)
  const isFinished = matchEndedByTimeline || matchStatus === "finished"
  const isUpcoming = !isLive && !isFinished

  useEffect(() => {
    if (!isOpen || !onRefresh || !matchId || isFinished) {
      return
    }

    let isMounted = true
    let pending = false

    const refreshData = async () => {
      if (pending || !isMounted) {
        return
      }
      pending = true
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        if (isMounted) {
          setIsRefreshing(false)
        }
        pending = false
      }
    }

    void refreshData()
    const intervalId = window.setInterval(() => {
      void refreshData()
    }, 1500)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [isOpen, onRefresh, matchId, isFinished])

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

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/55 px-4 py-6 sm:items-center">
      <div
        className="relative flex h-full w-full max-h-[90vh] max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-auto sm:max-h-[85vh]"
        ref={modalRef}
      >
        <header className="flex flex-col gap-4 border-b border-gray-200 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Matchuppföljning</p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900">
                {homeTeam} <span className="text-gray-300">vs</span> {awayTeam}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Stäng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                Pågår
              </span>
            )}
            {isFinished && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                Avslutad
              </span>
            )}
            {isUpcoming && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Kommande
              </span>
            )}
            {isRefreshing && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-gray-400" />
                Uppdaterar…
              </span>
            )}
            {finalScore && (
              <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-gray-900 px-3 py-1 text-base font-semibold text-white">
                {finalScore}
              </span>
            )}
          </div>
        </header>

        <nav className="grid grid-cols-2 border-b border-gray-100 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-3 transition-colors ${
              activeTab === "timeline" ? "bg-gray-50 text-gray-900" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Tidslinje {hasTimelineEvents ? `(${matchFeed.length})` : ""}
          </button>
          <button
            onClick={() => setActiveTab("scorers")}
            className={`px-4 py-3 transition-colors ${
              activeTab === "scorers" ? "bg-gray-50 text-gray-900" : "text-gray-500 hover:text-gray-800"
            } disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:text-gray-400`}
            disabled={!hasScorers}
          >
            Målskyttar {hasScorers ? "" : "(0)"}
          </button>
        </nav>

        <div className="flex-1 min-h-0 bg-gray-50">
          {activeTab === "timeline" && (
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                {matchFeed.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Inga händelser ännu.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {periods.map((period) => (
                      <section key={period} className="space-y-4">
                        <div className="sticky top-0 z-10 flex items-center gap-3 bg-gray-50/95 py-1 backdrop-blur">
                          <div className="h-px flex-1 bg-gray-200" />
                          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            {formatPeriodLabel(period)}
                          </h3>
                          <div className="h-px flex-1 bg-gray-200" />
                        </div>
                        <ul className="relative space-y-4">
                          <span className="absolute left-[14px] top-1 bottom-1 w-px bg-gray-200" aria-hidden="true" />
                          {eventsByPeriod[period].map((event, index) => {
                            const type = event.type?.toLowerCase() ?? ""
                            const isGoal = type.includes("mål")
                            const isWarning = type.includes("utvisning") || type.includes("varning")
                            const score =
                              event.homeScore !== undefined && event.awayScore !== undefined
                                ? `${event.homeScore}\u2013${event.awayScore}`
                                : event.score

                            return (
                              <li key={`${event.time}-${index}`} className="relative pl-10">
                                <span
                                  className={`absolute left-[10px] top-5 h-2.5 w-2.5 rounded-full ${
                                    isGoal
                                      ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]"
                                      : isWarning
                                        ? "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.15)]"
                                        : "bg-gray-300"
                                  }`}
                                />
                                <div
                                  className={`rounded-2xl border bg-white px-4 py-4 shadow-sm transition hover:shadow ${
                                    isGoal
                                      ? "border-emerald-100"
                                      : isWarning
                                        ? "border-amber-100"
                                        : "border-gray-100"
                                  }`}
                                >
                                  <div className="flex flex-wrap items-start gap-4">
                                    <span className="rounded-full bg-gray-100 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                                      {event.time}
                                    </span>
                                    <div className="min-w-0 flex-1 space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-gray-900">{event.type}</p>
                                        {event.team && (
                                          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                                            {event.team}
                                          </span>
                                        )}
                                        {score && (
                                          <span className="ml-auto rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
                                            {score}
                                          </span>
                                        )}
                                      </div>
                                      {event.player && (
                                        <p className="text-sm text-gray-700">
                                          {event.player}
                                          {event.playerNumber && (
                                            <span className="text-gray-500"> #{event.playerNumber}</span>
                                          )}
                                        </p>
                                      )}
                                      {event.description && (
                                        <p className="text-xs text-gray-500">{event.description}</p>
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
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                {Object.keys(topScorersByTeam).length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Inga noterade målskyttar.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(topScorersByTeam).map(([team, scorers]) => (
                      <section key={team} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{team}</h3>
                        <ul className="mt-3 space-y-2">
                          {scorers.map((scorer, index) => (
                            <li key={`${scorer.player}-${index}`} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
                                <div>
                                  <p className="font-medium text-gray-900">{scorer.player}</p>
                                  {scorer.playerNumber && (
                                    <p className="text-xs text-gray-500">#{scorer.playerNumber}</p>
                                  )}
                                </div>
                              </div>
                              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-900 shadow-sm">
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

        <footer className="border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
          <button
            onClick={onClose}
            className="w-full rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Stäng
          </button>
        </footer>
      </div>
    </div>
  )
}
