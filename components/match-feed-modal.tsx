"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import type { NormalizedMatch } from "@/lib/use-match-data"

export type MatchFeedEvent = {
  time?: string
  type?: string
  team?: string
  player?: string
  playerNumber?: string
  playerId?: number
  description?: string
  homeScore?: number
  awayScore?: number
  period?: number
  eventTypeId?: number
  teamId?: number
  isTeamEvent?: boolean
  score?: string
  scoringTeam?: string
  isHomeGoal?: boolean
  eventId?: string | number
  payload?: {
    description?: string
    [key: string]: unknown
  }
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
  matchData?: NormalizedMatch
  topScorers?: Array<{
    team: string
    player: string
    playerNumber?: string
    goals: number
  }>
}

const harnosandPattern = /(härnösand|harnosand|\bhhf\b)/i

const isHarnosandTeam = (name?: string) => harnosandPattern.test(name ?? "")

const parseEventTimeToSeconds = (value?: string) => {
  if (!value) return 0
  const normalized = value.replace(/[^\d:+]/g, "")
  const [base = "0:0", extra = "0"] = normalized.split("+")
  const [min = "0", sec = "0"] = base.split(":")
  const minutes = Number.parseInt(min, 10)
  const seconds = Number.parseInt(sec, 10)
  const extraMinutes = Number.parseInt(extra, 10)
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0
  const safeExtra = Number.isFinite(extraMinutes) ? extraMinutes : 0
  return (safeMinutes + safeExtra) * 60 + safeSeconds
}

const getEventDisplayText = (event: MatchFeedEvent) => {
  const payloadDescription = event.payload?.description?.toString().trim()
  if (payloadDescription) return payloadDescription
  const description = event.description?.toString().trim()
  if (description) return description
  const eventType = event.type?.toString().trim() || "Händelse"
  const score = event.score?.toString().trim()
  return score ? `${eventType} (${score})` : eventType
}

const getEventTypeLabel = (event: MatchFeedEvent) => {
  const text = `${event.type || ""} ${event.description || ""} ${event.payload?.description || ""}`.toLowerCase()
  if (text.includes("mål") || text.includes("goal")) return "Mål"
  if (text.includes("utvisning")) return "Utvisning"
  if (text.includes("varning")) return "Varning"
  if (text.includes("straff")) return "Straff"
  return event.type?.trim() || "Händelse"
}

const getPeriodLabel = (period?: number) => {
  if (period === 1) return "Första halvlek"
  if (period === 2) return "Andra halvlek"
  return "Matchhändelser"
}

const getScoreFromEvent = (event: MatchFeedEvent) => {
  if (typeof event.homeScore === "number" && typeof event.awayScore === "number") {
    return `${event.homeScore}-${event.awayScore}`
  }
  return event.score?.toString().trim() || null
}

const getRowStyle = (event: MatchFeedEvent, homeTeam: string, awayTeam: string) => {
  const type = (event.type || "").toLowerCase()
  const isGoal = type.includes("mål") || type.includes("goal")
  const isPenalty = type.includes("utvisning") || type.includes("varning")
  const eventTeam = event.team || ""
  const eventTeamLower = eventTeam.toLowerCase()
  const homeLower = homeTeam.toLowerCase()
  const awayLower = awayTeam.toLowerCase()

  const teamTone = (() => {
    if (eventTeamLower && (eventTeamLower === homeLower || eventTeamLower.includes(homeLower))) {
      return isHarnosandTeam(homeTeam) ? "home" : "neutral"
    }
    if (eventTeamLower && (eventTeamLower === awayLower || eventTeamLower.includes(awayLower))) {
      return isHarnosandTeam(awayTeam) ? "home" : "away"
    }
    if (isHarnosandTeam(eventTeam)) {
      return "home"
    }
    return "neutral"
  })()

  if (isPenalty) {
    return {
      tone: "border-amber-200 bg-amber-50",
      dot: "bg-amber-500",
      teamClass: "text-amber-700",
      kindLabel: "UTVISNING",
    }
  }

  if (isGoal && teamTone === "home") {
    return {
      tone: "border-emerald-200 bg-emerald-50",
      dot: "bg-emerald-500",
      teamClass: "text-emerald-700",
      kindLabel: "MÅL",
    }
  }

  if (isGoal && teamTone === "away") {
    return {
      tone: "border-sky-200 bg-sky-50",
      dot: "bg-sky-500",
      teamClass: "text-sky-700",
      kindLabel: "MÅL",
    }
  }

  return {
    tone: "border-slate-200 bg-white",
    dot: "bg-slate-400",
    teamClass: "text-slate-600",
    kindLabel: "HÄNDELSE",
  }
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
  topScorers = [],
}: MatchFeedModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<"timeline" | "scorers">("timeline")
  const refreshInFlightRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", handleEscape)
    document.addEventListener("mousedown", handleOutsideClick)

    return () => {
      document.body.style.overflow = ""
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [isOpen, onClose])

  const sortedFeed = useMemo(() => {
    const filtered = (matchFeed ?? []).filter((event) => {
      const typeText = `${event.type || ""} ${event.description || ""}`.toLowerCase()
      return !typeText.includes("spelare aktiverad")
    })

    return [...filtered].sort((a, b) => {
      const periodA = a.period ?? 0
      const periodB = b.period ?? 0
      if (periodA !== periodB) return periodB - periodA
      return parseEventTimeToSeconds(b.time) - parseEventTimeToSeconds(a.time)
    })
  }, [matchFeed])

  const latestScore = useMemo(() => {
    const eventWithScore = sortedFeed.find(
      (event) => typeof event.homeScore === "number" && typeof event.awayScore === "number",
    )
    if (!eventWithScore) return null
    return `${eventWithScore.homeScore}-${eventWithScore.awayScore}`
  }, [sortedFeed])

  const scoreboard = latestScore || finalScore || "-"

  const groupedByPeriod = useMemo(() => {
    return sortedFeed.reduce<Record<number, MatchFeedEvent[]>>((acc, event) => {
      const key = event.period ?? 0
      if (!acc[key]) acc[key] = []
      acc[key].push(event)
      return acc
    }, {})
  }, [sortedFeed])

  const periodKeys = useMemo(() => {
    return Object.keys(groupedByPeriod)
      .map(Number)
      .sort((a, b) => b - a)
  }, [groupedByPeriod])

  const calculatedTopScorersByTeam = useMemo(() => {
    const goalEvents = sortedFeed.filter((event) => (event.type || "").toLowerCase().includes("mål") && event.player)
    const grouped = goalEvents.reduce<Record<string, Record<string, { player: string; playerNumber?: string; goals: number }>>>(
      (acc, event) => {
        const team = event.team || "Okänt lag"
        const scorerKey = `${event.player}|${event.playerNumber || ""}`
        if (!acc[team]) acc[team] = {}
        if (!acc[team][scorerKey]) {
          acc[team][scorerKey] = {
            player: event.player || "Okänd",
            playerNumber: event.playerNumber,
            goals: 0,
          }
        }
        acc[team][scorerKey].goals += 1
        return acc
      },
      {},
    )

    return Object.entries(grouped).reduce<Record<string, Array<{ player: string; playerNumber?: string; goals: number }>>>(
      (acc, [team, scorers]) => {
        acc[team] = Object.values(scorers)
          .sort((a, b) => b.goals - a.goals)
          .slice(0, 3)
        return acc
      },
      {},
    )
  }, [sortedFeed])

  const topScorersByTeam = useMemo(() => {
    if (!topScorers.length) {
      return calculatedTopScorersByTeam
    }

    const grouped = topScorers.reduce<Record<string, Array<{ player: string; playerNumber?: string; goals: number }>>>(
      (acc, scorer) => {
        if (!acc[scorer.team]) {
          acc[scorer.team] = []
        }
        acc[scorer.team].push({
          player: scorer.player,
          playerNumber: scorer.playerNumber,
          goals: scorer.goals,
        })
        return acc
      },
      {},
    )
    Object.keys(grouped).forEach((team) => {
      grouped[team] = grouped[team].sort((a, b) => b.goals - a.goals).slice(0, 3)
    })
    return grouped
  }, [topScorers, calculatedTopScorersByTeam])

  const refreshNow = async () => {
    if (!onRefresh || refreshInFlightRef.current) return
    try {
      refreshInFlightRef.current = true
      await onRefresh()
    } finally {
      refreshInFlightRef.current = false
    }
  }

  useEffect(() => {
    if (!isOpen || !onRefresh) {
      return
    }

    refreshNow()

    const interval = globalThis.setInterval(() => {
      refreshNow()
    }, 3_000)

    return () => {
      globalThis.clearInterval(interval)
    }
  }, [isOpen, onRefresh])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-2 sm:items-center sm:p-6">
      <div
        ref={modalRef}
        className="flex h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl"
      >
        <header className="border-b border-slate-200 bg-gradient-to-r from-emerald-700 to-emerald-600 px-5 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">Matchtimeline</p>
              <h2 className="mt-2 text-xl font-bold sm:text-3xl">
                {homeTeam} <span className="text-emerald-100">vs</span> {awayTeam}
              </h2>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
                {(matchStatus === "live" || matchStatus === "halftime") && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-white">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> LIVE
                  </span>
                )}
                {matchStatus === "finished" && <span className="rounded-full bg-slate-900/25 px-3 py-1">SLUT</span>}
                {matchStatus === "upcoming" && <span className="rounded-full bg-slate-900/25 px-3 py-1">KOMMANDE</span>}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-black/20 px-5 py-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-100">Live score</p>
                <p className="text-3xl font-black leading-none">{scoreboard}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/40 p-2 text-white transition hover:bg-white/10"
                aria-label="Stäng modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <nav className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-3 text-sm font-semibold ${
              activeTab === "timeline" ? "bg-white text-slate-900" : "text-slate-600"
            }`}
          >
            Tidslinje ({sortedFeed.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("scorers")}
            className={`px-4 py-3 text-sm font-semibold ${activeTab === "scorers" ? "bg-white text-slate-900" : "text-slate-600"}`}
          >
            Top 3 målskyttar
          </button>
        </nav>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6 sm:px-8">
          {activeTab === "timeline" && (
            <div className="space-y-8">
              {sortedFeed.length === 0 && <p className="text-center text-sm text-slate-500">Inga händelser än.</p>}
              {periodKeys.map((period) => (
                <section key={period} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{getPeriodLabel(period)}</h3>
                  <ul className="space-y-3">
                    {groupedByPeriod[period].map((event, index) => {
                      const style = getRowStyle(event, homeTeam, awayTeam)
                      const score = getScoreFromEvent(event)
                      const typeLabel = getEventTypeLabel(event)
                      return (
                        <li key={`${event.eventId ?? "idx"}-${index}`}>
                          <div className={`w-full rounded-2xl border px-4 py-3 ${style.tone}`}>
                          <div className="flex items-start gap-3">
                            <div className="w-20 shrink-0">
                              <p className="text-xs font-bold text-slate-700">{event.time || "--:--"}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-slate-500">P{event.period ?? 0}</p>
                            </div>
                            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-900">{getEventDisplayText(event)}</p>
                                {score && <p className="shrink-0 text-sm font-black text-slate-900">{score}</p>}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <span className={`font-bold uppercase tracking-[0.15em] ${style.teamClass}`}>
                                  {event.team || "Neutral"}
                                </span>
                                <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold text-slate-500">{typeLabel}</span>
                                {event.player && (
                                  <span className="text-slate-700">
                                    {event.player}
                                    {event.playerNumber ? ` #${event.playerNumber}` : ""}
                                  </span>
                                )}
                              </div>
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

          {activeTab === "scorers" && (
            <div className="space-y-4">
              {Object.keys(topScorersByTeam).length === 0 && (
                <p className="text-center text-sm text-slate-500">Inga registrerade målskyttar än.</p>
              )}
              {Object.entries(topScorersByTeam).map(([team, scorers]) => (
                <section key={team} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600">{team}</h3>
                  <ul className="mt-3 space-y-2">
                    {scorers.map((scorer, index) => (
                      <li key={`${team}-${scorer.player}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {index + 1}. {scorer.player}
                          {scorer.playerNumber ? ` #${scorer.playerNumber}` : ""}
                        </p>
                        <p className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-700">{scorer.goals} mål</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(MatchFeedModal)
