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

export type MatchClockState = {
  running?: boolean
  reason?: "running" | "timeout" | "stopped" | "no_events" | string
  period?: number
  currentSeconds?: number
  clock?: string
  timeout?: {
    timeoutStartsAt?: number
    timeoutEndsAt?: number
    timeoutSecondsLeft?: number
  }
  source?: {
    startedAt?: string
    latestEventAt?: string
    latestEventTime?: number
    usedEventTime?: boolean
    driftSeconds?: number
  }
}

export type MatchPenalty = {
  team?: string
  player?: string
  playerNumber?: string
  period?: number
  startSeconds?: number
  endSeconds?: number
  durationSeconds?: number
  remainingSeconds?: number
  active?: boolean
}

type MatchFeedModalProps = {
  isOpen: boolean
  onClose: () => void
  matchFeed: MatchFeedEvent[]
  clockState?: MatchClockState | null
  penalties?: MatchPenalty[]
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

const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "")) ||
  "https://api.harnosandshf.se"

const harnosandPattern = /(härnösand|harnosand|\bhhf\b)/i

const isHarnosandTeam = (name?: string) => harnosandPattern.test(name ?? "")
const isZeroScore = (value?: string) => {
  const normalized = (value || "").replace(/\s/g, "").replace("–", "-")
  return normalized === "0-0"
}

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

const formatSecondsAsClock = (totalSeconds: number) => {
  const safe = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

const parseClockToSeconds = (value?: string) => {
  const clean = (value || "").trim()
  if (!clean) return 0
  const parts = clean.split(":")
  if (parts.length !== 2) return 0
  const mm = Number.parseInt(parts[0], 10)
  const ss = Number.parseInt(parts[1], 10)
  if (!Number.isFinite(mm) || !Number.isFinite(ss)) return 0
  return Math.max(0, mm * 60 + ss)
}

const normalizeTimelineEvent = (event: any): MatchFeedEvent => ({
  time: event?.time ?? "",
  type:
    event?.type ??
    event?.eventType ??
    event?.payload?.type ??
    event?.payload?.eventType ??
    event?.payload?.eventTypeName ??
    "Händelse",
  team: event?.team ?? event?.payload?.team,
  player: event?.player ?? event?.payload?.player,
  playerNumber: event?.playerNumber ?? event?.payload?.playerNumber,
  description:
    event?.payload?.description?.toString().trim() ||
    event?.description?.toString().trim() ||
    event?.payload?.eventText?.toString().trim() ||
    event?.type?.toString().trim() ||
    "Händelse",
  homeScore: typeof event?.homeScore === "number" ? event.homeScore : undefined,
  awayScore: typeof event?.awayScore === "number" ? event.awayScore : undefined,
  period: typeof event?.period === "number" ? event.period : undefined,
  score: event?.score,
  eventId: event?.eventId ?? event?.eventIndex,
  eventTypeId: typeof event?.eventTypeId === "number" ? event.eventTypeId : undefined,
  payload: event?.payload,
})

const dedupeTimelineEvents = (events: MatchFeedEvent[]) => {
  const seen = new Set<string>()
  return events.filter((event) => {
    const key =
      event.eventId !== undefined
        ? `id:${event.eventId}`
        : `${event.time}|${event.type}|${event.description}|${event.homeScore ?? ""}-${event.awayScore ?? ""}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const getEventCombinedText = (event: MatchFeedEvent) =>
  `${event.type || ""} ${event.description || ""} ${event.payload?.description || ""}`.toLowerCase()

const isGoalEvent = (event: MatchFeedEvent) => {
  const text = getEventCombinedText(event)
  if (text.includes("mål") || text.includes("goal")) return true
  return typeof event.homeScore === "number" && typeof event.awayScore === "number"
}

const isPeriodOrMatchEndEvent = (event: MatchFeedEvent) => {
  const text = getEventCombinedText(event)
  return (
    text.includes("halvlek är slut") ||
    text.includes("halvlek slut") ||
    text.includes("matchen är slut") ||
    text.includes("matchen slut") ||
    text.includes("match slut")
  )
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

const buildSemanticKey = (event: MatchFeedEvent) =>
  [
    event.time ?? "",
    event.period ?? "",
    (event.team ?? "").toLowerCase(),
    (event.player ?? "").toLowerCase(),
    event.homeScore ?? "",
    event.awayScore ?? "",
  ].join("|")

const isGenericEventLabel = (value?: string) => {
  const text = (value ?? "").trim().toLowerCase()
  return text === "" || text === "händelse"
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
  return "Övriga händelser"
}

const getScoreFromEvent = (event: MatchFeedEvent) => {
  if (typeof event.homeScore === "number" && typeof event.awayScore === "number") {
    return `${event.homeScore}-${event.awayScore}`
  }
  return event.score?.toString().trim() || null
}

const isTechnicalPlaceholderEvent = (event: MatchFeedEvent) => {
  const typeText = `${event.type || ""}`.trim().toLowerCase()
  const descriptionText = `${event.description || ""}`.trim().toLowerCase()
  const payloadText = `${event.payload?.description || ""}`.trim().toLowerCase()
  const combined = `${typeText} ${descriptionText} ${payloadText}`

  if (
    combined.includes("timeline unavailable") ||
    combined.includes("no timeline") ||
    combined.includes("match update") ||
    combined.includes("status update")
  ) {
    return true
  }

  const period = event.period ?? 0
  const hasNoConcreteInfo =
    !event.player &&
    !event.team &&
    typeof event.homeScore !== "number" &&
    typeof event.awayScore !== "number" &&
    isGenericEventLabel(typeText) &&
    isGenericEventLabel(descriptionText)

  if (period <= 0 && hasNoConcreteInfo) {
    return true
  }

  return false
}

const getRowStyle = (event: MatchFeedEvent, homeTeam: string, awayTeam: string) => {
  const type = (event.type || "").toLowerCase()
  const isGoal = type.includes("mål") || type.includes("goal")
  const isPenalty = type.includes("utvisning") || type.includes("varning")
  const isHomeGoalByFlag = typeof event.isHomeGoal === "boolean" ? event.isHomeGoal : null

  const teamTone = (() => {
    if (isHarnosandTeam(event.scoringTeam) || isHarnosandTeam(event.team)) {
      return "home"
    }
    if (event.scoringTeam || event.team) {
      return "away"
    }

    // Fallback when backend only gives isHomeGoal without team strings.
    if (isGoal && isHomeGoalByFlag !== null) {
      if (isHarnosandTeam(homeTeam)) return isHomeGoalByFlag ? "home" : "away"
      if (isHarnosandTeam(awayTeam)) return isHomeGoalByFlag ? "away" : "home"
    }

    return "away"
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

  if (isGoal && teamTone !== "home") {
    return {
      tone: "border-indigo-200 bg-indigo-50",
      dot: "bg-indigo-500",
      teamClass: "text-indigo-700",
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
  clockState,
  penalties = [],
  homeTeam,
  awayTeam,
  finalScore,
  matchStatus,
  matchData,
  onRefresh,
  topScorers = [],
}: MatchFeedModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<"timeline" | "scorers">("timeline")
  const refreshInFlightRef = useRef(false)
  const [detailTimeline, setDetailTimeline] = useState<MatchFeedEvent[] | null>(null)
  const [detailClockState, setDetailClockState] = useState<MatchClockState | null>(null)
  const [detailPenalties, setDetailPenalties] = useState<MatchPenalty[]>([])
  const [clockTick, setClockTick] = useState(0)
  const allowAutoRefresh = matchStatus === "live" || matchStatus === "halftime"
  const effectiveClockState = detailClockState ?? clockState ?? null
  const effectivePenalties = detailPenalties.length > 0 ? detailPenalties : penalties
  const timelineSource = detailTimeline ?? matchFeed
  const hasClockData = Boolean(
    effectiveClockState &&
      (typeof effectiveClockState.currentSeconds === "number" || Boolean(effectiveClockState.clock)),
  )
  const clockBaseSeconds = effectiveClockState?.currentSeconds ?? parseClockToSeconds(effectiveClockState?.clock)
  const clockRunning = Boolean(effectiveClockState?.running)
  const clockReason = effectiveClockState?.reason ?? (clockRunning ? "running" : "stopped")
  const timeoutBaseSecondsLeft = Math.max(0, effectiveClockState?.timeout?.timeoutSecondsLeft ?? 0)
  const clockDisplay = hasClockData ? formatSecondsAsClock(clockBaseSeconds + (clockRunning ? clockTick : 0)) : "--:--"
  const timeoutSecondsLeft = Math.max(0, timeoutBaseSecondsLeft - (clockReason === "timeout" ? clockTick : 0))
  const clockSourceLabel = effectiveClockState?.source
    ? effectiveClockState.source.usedEventTime
      ? "Källa: händelsetid"
      : `Källa: extrapolerad (${effectiveClockState.source.driftSeconds ?? 0}s drift)`
    : null
  const activePenalties = useMemo(() => {
    const currentPeriod = effectiveClockState?.period
    return effectivePenalties
      .filter((item) => item.active)
      .filter((item) => (typeof currentPeriod === "number" ? item.period === currentPeriod : true))
      .map((item) => ({
        ...item,
        remaining: Math.max(0, (item.remainingSeconds ?? 0) - (clockRunning ? clockTick : 0)),
      }))
      .filter((item) => item.remaining > 0)
  }, [effectivePenalties, effectiveClockState?.period, clockRunning, clockTick])

  const fetchDetailData = async () => {
    const apiMatchId = matchData?.apiMatchId
    if (!apiMatchId) return
    const response = await fetch(`${API_BASE_URL}/matcher/match/${encodeURIComponent(apiMatchId)}?includeEvents=1`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!response.ok) return
    const payload = await response.json()
    const rawTimeline = Array.isArray(payload?.events)
      ? payload.events
      : Array.isArray(payload?.timeline)
        ? payload.timeline
        : Array.isArray(payload?.matchFeed)
          ? payload.matchFeed
          : []
    const normalized = dedupeTimelineEvents(rawTimeline.map((event: any) => normalizeTimelineEvent(event)))
    setDetailTimeline(normalized)
    setDetailClockState((payload?.clockState as MatchClockState) ?? null)
    setDetailPenalties(Array.isArray(payload?.penalties) ? payload.penalties : [])
    setClockTick(0)
  }

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

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyTouchAction = document.body.style.touchAction
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior

    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    document.body.style.touchAction = "none"
    document.documentElement.style.overscrollBehavior = "none"
    document.addEventListener("keydown", handleEscape)
    document.addEventListener("mousedown", handleOutsideClick)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.touchAction = previousBodyTouchAction
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    setClockTick(0)
    fetchDetailData().catch(() => undefined)
  }, [isOpen, matchData?.apiMatchId])

  useEffect(() => {
    if (!isOpen) return
    if (!clockRunning && clockReason !== "timeout") return
    const timer = globalThis.setInterval(() => {
      setClockTick((prev) => prev + 1)
    }, 1_000)
    return () => globalThis.clearInterval(timer)
  }, [isOpen, clockRunning, clockReason])

  const sortedFeed = useMemo(() => {
    const feed = timelineSource ?? []
    const indexedFeed = feed.map((event, index) => ({ event, index }))

    const hasSpecificForKey = new Set<string>()
    indexedFeed.forEach(({ event }) => {
      const typeText = `${event.type || ""}`.trim()
      const descriptionText = `${event.description || ""}`.trim()
      const specific =
        !isGenericEventLabel(typeText) ||
        !isGenericEventLabel(descriptionText) ||
        Boolean(event.player) ||
        Boolean(event.eventTypeId)
      if (specific) {
        hasSpecificForKey.add(buildSemanticKey(event))
      }
    })

    const filtered = indexedFeed.filter(({ event }) => {
      if (isTechnicalPlaceholderEvent(event)) {
        return false
      }
      const typeText = `${event.type || ""}`.trim().toLowerCase()
      const descriptionText = `${event.description || ""}`.trim().toLowerCase()
      const isGeneric =
        isGenericEventLabel(typeText) &&
        isGenericEventLabel(descriptionText) &&
        !event.player &&
        !event.eventTypeId
      if (isGeneric && hasSpecificForKey.has(buildSemanticKey(event))) {
        return false
      }
      return !isGeneric
    })

    return [...filtered]
      .sort((a, b) => {
      const eventA = a.event
      const eventB = b.event
      const periodA = eventA.period ?? 0
      const periodB = eventB.period ?? 0
      if (periodA !== periodB) return periodB - periodA
      const timeDiff = parseEventTimeToSeconds(eventB.time) - parseEventTimeToSeconds(eventA.time)
      if (timeDiff !== 0) return timeDiff

      // Same period + same time: goal first, end-events last, then keep backend order.
      const priorityA = isGoalEvent(eventA) ? 0 : isPeriodOrMatchEndEvent(eventA) ? 2 : 1
      const priorityB = isGoalEvent(eventB) ? 0 : isPeriodOrMatchEndEvent(eventB) ? 2 : 1
      if (priorityA !== priorityB) return priorityA - priorityB
      return a.index - b.index
    })
      .map(({ event }) => event)
  }, [timelineSource])

  const latestScore = useMemo(() => {
    const eventWithScore = sortedFeed.find(
      (event) => typeof event.homeScore === "number" && typeof event.awayScore === "number",
    )
    if (!eventWithScore) return null
    return `${eventWithScore.homeScore}-${eventWithScore.awayScore}`
  }, [sortedFeed])

  const scoreboard = useMemo(() => {
    if (matchStatus === "upcoming") {
      return "-"
    }
    if (latestScore) {
      return latestScore
    }
    if (finalScore && !isZeroScore(finalScore)) {
      return finalScore
    }
    if (finalScore && (matchStatus === "live" || matchStatus === "halftime" || matchStatus === "finished")) {
      return finalScore
    }
    return "-"
  }, [finalScore, latestScore, matchStatus])

  const groupedByPeriod = useMemo(() => {
    return sortedFeed.reduce<Record<number, MatchFeedEvent[]>>((acc, event) => {
      const key = event.period ?? 0
      if (!acc[key]) acc[key] = []
      acc[key].push(event)
      return acc
    }, {})
  }, [sortedFeed])

  const emptyTimelineMessage = useMemo(() => {
    if (matchStatus === "upcoming") {
      return "Matchen har inte startat ännu."
    }
    if (matchStatus === "live" || matchStatus === "halftime") {
      return "Väntar på att matchhändelser ska komma in."
    }
    return "Ingen tidslinje är tillgänglig för den här matchen."
  }, [matchStatus])

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
    if (refreshInFlightRef.current) return
    try {
      refreshInFlightRef.current = true
      if (onRefresh) {
        await onRefresh()
      }
      await fetchDetailData()
    } finally {
      refreshInFlightRef.current = false
    }
  }

  useEffect(() => {
    if (!isOpen || !allowAutoRefresh) {
      return
    }

    const kickOff = globalThis.setTimeout(() => {
      refreshNow()
    }, 450)

    const interval = globalThis.setInterval(() => {
      refreshNow()
    }, 8_000)

    return () => {
      globalThis.clearTimeout(kickOff)
      globalThis.clearInterval(interval)
    }
  }, [isOpen, onRefresh, allowAutoRefresh, matchData?.apiMatchId])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 backdrop-blur-[2px] p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="flex h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:h-[78vh] sm:rounded-[18px]"
      >
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-900 px-3 py-3 text-white sm:px-5 sm:py-4">
          <div className="mb-2 flex justify-center sm:hidden">
            <span className="h-1.5 w-12 rounded-full bg-white/40" />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">Matchtimeline</p>
              <h2 className="mt-1 text-base font-bold sm:text-2xl">
                {homeTeam} <span className="text-slate-400">vs</span> {awayTeam}
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

            <div className="flex items-start gap-2 sm:gap-3">
              <div className="rounded-xl bg-white/10 px-3 py-2 text-center sm:px-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300">Score</p>
                <p className="whitespace-nowrap text-xl font-black leading-none tabular-nums sm:text-2xl">{scoreboard}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/40 p-2.5 text-white transition hover:bg-white/10"
                aria-label="Stäng modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-white px-3 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
              <span className={`h-2 w-2 rounded-full ${clockRunning ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`} />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">Matchklocka</span>
              <span className="font-mono text-base font-black tabular-nums text-emerald-900">{clockDisplay}</span>
            </div>
            {clockReason === "timeout" && (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Timeout</span>
                <span className="font-mono text-base font-black tabular-nums text-amber-900">
                  {formatSecondsAsClock(timeoutSecondsLeft)}
                </span>
              </div>
            )}
            {clockReason === "stopped" && (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                Klocka stoppad
              </span>
            )}
          </div>
          {clockSourceLabel && (
            <p className="mt-2 text-[11px] font-medium text-slate-500">{clockSourceLabel}</p>
          )}

          {activePenalties.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">Utvisningar pågår</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {activePenalties.map((item, index) => (
                  <div key={`${item.team || "team"}-${item.player || "player"}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-xs font-semibold text-amber-900">
                        {item.team || "Lag"} • {item.player || "Spelare"}{item.playerNumber ? ` #${item.playerNumber}` : ""}
                      </p>
                      <span className="font-mono text-sm font-black tabular-nums text-amber-900">
                        {formatSecondsAsClock(item.remaining)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <nav className="z-10 grid grid-cols-2 border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`px-3 py-3 text-sm font-semibold sm:px-4 ${
              activeTab === "timeline" ? "bg-white text-slate-900" : "text-slate-600"
            }`}
          >
            Tidslinje ({sortedFeed.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("scorers")}
            className={`px-3 py-3 text-sm font-semibold sm:px-4 ${activeTab === "scorers" ? "bg-white text-slate-900" : "text-slate-600"}`}
          >
            Top 3 målskyttar
          </button>
        </nav>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-8 sm:py-6">
          {activeTab === "timeline" && (
            <div className="space-y-6 sm:space-y-8">
              {sortedFeed.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
                  <p className="text-base font-semibold text-slate-700">{emptyTimelineMessage}</p>
                </div>
              )}
              {periodKeys.map((period) => (
                <section key={period} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{getPeriodLabel(period)}</h3>
                  <ul className="space-y-2.5 sm:space-y-3">
                    {groupedByPeriod[period].map((event, index) => {
                      const style = getRowStyle(event, homeTeam, awayTeam)
                      const score = getScoreFromEvent(event)
                      const typeLabel = getEventTypeLabel(event)
                      return (
                        <li key={`${event.eventId ?? "idx"}-${index}`}>
                          <div className={`w-full rounded-2xl border px-3 py-3 sm:px-4 ${style.tone}`}>
                          <div className="flex items-start gap-2.5 sm:gap-3">
                            <div className="w-14 shrink-0 sm:w-20">
                              <p className="text-xs font-bold text-slate-700">{event.time || "--:--"}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-slate-500">
                                {typeof event.period === "number" && event.period > 0 ? `P${event.period}` : "Match"}
                              </p>
                            </div>
                            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
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
