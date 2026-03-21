"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import type { NormalizedMatch } from "@/lib/use-match-data"
import { preferRicherTimeline, resolvePreferredTimeline } from "@/lib/match-timeline"

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

const normalizeText = (value?: string) => (value ?? "").trim().toLowerCase()

const getEventSemanticType = (event: MatchFeedEvent) => {
  const text = getEventCombinedText(event)
  if (text.includes("spelare aktiverad")) return "activated"
  if (text.includes("tilldömd 7-m")) return "seven_awarded"
  if (text.includes("timeout")) return "timeout"
  if (text.includes("utvisning")) return "suspension"
  if (text.includes("fulltid") || text.includes("slutresultat") || text.includes("matchen är slut")) return "fulltime"
  if (text.includes("1:a halvlek är slut") || text.includes("första halvlek slut") || text.includes("halvtid")) return "halftime"
  if (text.includes("2:a halvlek startades") || text.includes("start andra halvlek")) return "second_half_start"
  if (text.includes("start första halvlek")) return "first_half_start"
  if (text.includes("mål") || text.includes("goal")) return "goal"
  return normalizeText(event.type) || normalizeText(event.description) || "event"
}

const getEventRichnessScore = (event: MatchFeedEvent) => {
  let score = 0
  if (event.eventId !== undefined) score += 5
  if (event.player) score += 4
  if (event.playerNumber) score += 2
  if (typeof event.homeScore === "number" && typeof event.awayScore === "number") score += 3
  if (!isGenericEventLabel(event.type)) score += 1
  if (!isGenericEventLabel(event.description)) score += 1
  return score
}

const getEventDeduplicationKey = (event: MatchFeedEvent) => {
  if (event.eventId !== undefined) {
    return `id:${event.eventId}`
  }

  const semanticType = getEventSemanticType(event)
  const base = [
    normalizeText(event.time),
    event.period ?? inferPeriodFromTime(event.time),
    normalizeText(event.team),
    normalizeText(event.player),
    normalizeText(event.playerNumber),
    semanticType,
  ]

  if (semanticType === "goal") {
    base.push(String(event.homeScore ?? ""))
    base.push(String(event.awayScore ?? ""))
  }

  return base.join("|")
}

const dedupeTimelineEvents = (events: MatchFeedEvent[]) => {
  const bestByKey = new Map<string, { event: MatchFeedEvent; index: number }>()

  events.forEach((event, index) => {
    const key = getEventDeduplicationKey(event)
    const existing = bestByKey.get(key)
    if (!existing) {
      bestByKey.set(key, { event, index })
      return
    }

    if (getEventRichnessScore(event) > getEventRichnessScore(existing.event)) {
      bestByKey.set(key, { event, index: existing.index })
    }
  })

  return [...bestByKey.values()]
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.event)
}

const getEventCombinedText = (event: MatchFeedEvent) =>
  `${event.type || ""} ${event.description || ""} ${event.payload?.description || ""}`.toLowerCase()

const isLifecycleEvent = (event: MatchFeedEvent) => {
  const text = getEventCombinedText(event)
  return (
    text.includes("start första halvlek") ||
    text.includes("start andra halvlek") ||
    text.includes("2:a halvlek startades") ||
    text.includes("första halvlek slut") ||
    text.includes("halvlek är slut") ||
    text.includes("matchen är slut") ||
    text.includes("slutresultat") ||
    text.includes("fulltid") ||
    text.includes("spelare aktiverad")
  )
}

const buildTimelineIdentityKey = (event: MatchFeedEvent) =>
  [
    event.time ?? "",
    event.period ?? "",
    event.team ?? "",
    event.type ?? "",
    event.description ?? "",
    event.player ?? "",
    event.playerNumber ?? "",
    event.homeScore ?? "",
    event.awayScore ?? "",
  ].join("|")

const parseClockMinutes = (value?: string) => {
  if (!value) return 0
  const normalized = value.replace(/[^\d:+]/g, "")
  const [base = "0:0", extra = "0"] = normalized.split("+")
  const [min = "0"] = base.split(":")
  const minutes = Number.parseInt(min, 10)
  const extraMinutes = Number.parseInt(extra, 10)
  return (Number.isFinite(minutes) ? minutes : 0) + (Number.isFinite(extraMinutes) ? extraMinutes : 0)
}

const inferPeriodFromTime = (time?: string, fallbackPeriod?: number) => {
  if (typeof fallbackPeriod === "number" && fallbackPeriod > 0) {
    return fallbackPeriod
  }

  const minutes = parseClockMinutes(time)
  if (minutes <= 0) {
    return 1
  }

  return minutes > 25 ? 2 : 1
}

const getGoalLookupKey = (team?: string, time?: string, variant?: "goal" | "seven") =>
  `${team ?? ""}|${time ?? ""}|${variant ?? "goal"}`

const buildGoalLookup = (players: any[] = []) => {
  const lookup = new Map<string, { player: string; playerNumber?: string }>()

  players.forEach((player) => {
    const team = player?.teamName ? String(player.teamName) : ""
    const playerName = player?.name ? String(player.name) : ""
    const playerNumber = player?.number ? String(player.number) : undefined
    if (!team || !playerName) {
      return
    }

    const goalTimes = Array.isArray(player?.goalTimes) ? player.goalTimes : []
    goalTimes.forEach((time) => {
      const key = getGoalLookupKey(team, String(time), "goal")
      if (!lookup.has(key)) {
        lookup.set(key, { player: playerName, playerNumber })
      }
    })

    const sevenMeterTimes = Array.isArray(player?.sevenMeterTimes) ? player.sevenMeterTimes : []
    sevenMeterTimes.forEach((time) => {
      const key = getGoalLookupKey(team, String(time), "seven")
      if (!lookup.has(key)) {
        lookup.set(key, { player: playerName, playerNumber })
      }
    })
  })

  return lookup
}

const enrichTimelineWithMatchDetails = (payload: any, fallbackTimeline: MatchFeedEvent[]) => {
  const baseSource = payload?.match ?? payload
  const rawTimeline = resolvePreferredTimeline(baseSource, fallbackTimeline)
  const normalizedBase = dedupeTimelineEvents(rawTimeline.map((event: any) => normalizeTimelineEvent(event)))
  const goalLookup = buildGoalLookup(payload?.match?.playerStats?.players)

  const enhancedBase = normalizedBase.map((event) => {
    const typeText = `${event.type || ""}`.toLowerCase()
    const variant = typeText.includes("7-m") ? "seven" : "goal"
    const goalLookupEntry =
      !event.player && event.team && event.time && (typeText.includes("mål") || typeText.includes("goal"))
        ? goalLookup.get(getGoalLookupKey(event.team, event.time, variant))
        : undefined

    return {
      ...event,
      player: event.player ?? goalLookupEntry?.player,
      playerNumber: event.playerNumber ?? goalLookupEntry?.playerNumber,
    }
  })

  const existingKeys = new Set(enhancedBase.map(buildTimelineIdentityKey))
  const supplemental: MatchFeedEvent[] = []
  const pushSupplemental = (event: MatchFeedEvent) => {
    const key = buildTimelineIdentityKey(event)
    if (existingKeys.has(key)) {
      return
    }
    existingKeys.add(key)
    supplemental.push(event)
  }

  const rootTimeline = resolvePreferredTimeline(payload, []).map((event: any) => normalizeTimelineEvent(event))
  rootTimeline.forEach(pushSupplemental)

  const penaltyEvents = Array.isArray(payload?.match?.eventSummary?.penaltyEvents) ? payload.match.eventSummary.penaltyEvents : []
  penaltyEvents.forEach((event: any) => {
    pushSupplemental({
      time: event?.time ?? "",
      type: event?.description ?? "Utvisning",
      description: event?.description ?? "Utvisning",
      team: event?.team ?? undefined,
      player: event?.player ?? undefined,
      playerNumber: event?.number ? String(event.number) : undefined,
      period: inferPeriodFromTime(event?.time),
      eventTypeId: typeof event?.eventTypeId === "number" ? event.eventTypeId : undefined,
    })
  })

  const timeoutEvents = Array.isArray(payload?.match?.eventSummary?.timeoutEvents) ? payload.match.eventSummary.timeoutEvents : []
  timeoutEvents.forEach((event: any) => {
    pushSupplemental({
      time: event?.time ?? "",
      type: "Timeout",
      description: event?.team ? `Timeout ${event.team}` : "Timeout",
      team: event?.team ?? undefined,
      period: inferPeriodFromTime(event?.time, typeof event?.period === "number" ? event.period : undefined),
    })
  })

  const sevenMeterDetails = Array.isArray(payload?.match?.eventSummary?.sevenMeterDetails)
    ? payload.match.eventSummary.sevenMeterDetails
    : []
  sevenMeterDetails
    .filter((event: any) => event?.outcome === "awarded")
    .forEach((event: any) => {
      pushSupplemental({
        time: event?.time ?? "",
        type: "Straff",
        description: event?.description ?? "Tilldömd 7-m",
        team: event?.team ?? undefined,
        player: event?.player ?? undefined,
        period: inferPeriodFromTime(event?.time),
      })
    })

  const mergedTimeline = [...enhancedBase, ...supplemental]
  const hasSecondHalfStart = mergedTimeline.some((event) => {
    const text = getEventCombinedText(event)
    return text.includes("2:a halvlek startades") || text.includes("start andra halvlek")
  })
  const hasFirstHalfEnd = mergedTimeline.some((event) => {
    const text = getEventCombinedText(event)
    return text.includes("första halvlek slut") || text.includes("1:a halvlek är slut") || text.includes("halvlek är slut")
  })

  if (hasSecondHalfStart && !hasFirstHalfEnd) {
    pushSupplemental({
      time: "25:00",
      type: "Halvtid",
      description: "Första halvlek slut",
      period: 1,
    })
  }

  return dedupeTimelineEvents([...enhancedBase, ...supplemental])
}

const isLowFidelityTimeline = (timeline: MatchFeedEvent[]) => {
  if (timeline.length === 0) {
    return true
  }

  const hasNamedPlayer = timeline.some((event) => Boolean(event.player))
  const hasPenaltyOrTimeout = timeline.some((event) => {
    const text = `${event.type || ""} ${event.description || ""}`.toLowerCase()
    return text.includes("utvisning") || text.includes("timeout") || text.includes("7-m")
  })

  return !hasNamedPlayer && !hasPenaltyOrTimeout
}

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

const isMatchEndEvent = (event: MatchFeedEvent) => {
  const text = getEventCombinedText(event)
  return (
    text.includes("matchen är slut") ||
    text.includes("matchen slut") ||
    text.includes("match slut") ||
    text.includes("slutresultat") ||
    text.includes("fulltid")
  )
}

const getEventGroupKey = (event: MatchFeedEvent) => {
  if (isMatchEndEvent(event)) {
    return 3
  }
  return event.period ?? 0
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
  if (text.includes("spelare aktiverad")) return "Aktiverad"
  if (text.includes("mål") || text.includes("goal")) return "Mål"
  if (text.includes("utvisning")) return "Utvisning"
  if (text.includes("varning")) return "Varning"
  if (text.includes("timeout")) return "Timeout"
  if (text.includes("fulltid") || text.includes("matchen är slut") || text.includes("slutresultat")) return "Slut"
  if (text.includes("halvtid")) return "Halvtid"
  if (text.includes("straff")) return "Straff"
  if (text.includes("7-m")) return "Straff"
  if (text.includes("start")) return "Start"
  return event.type?.trim() || "Händelse"
}

const getPeriodLabel = (period?: number) => {
  if (period === 3) return "Matchslut"
  if (period === 1) return "Första halvlek"
  if (period === 2) return "Andra halvlek"
  return "Övriga händelser"
}

const getEventTeamLabel = (event: MatchFeedEvent) => {
  if (event.team) {
    return event.team
  }

  if (isLifecycleEvent(event)) {
    return "Match"
  }

  return "Neutral"
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
      tone: "border-slate-200 bg-white",
      dot: "bg-amber-500",
      teamClass: "text-amber-700",
      kindLabel: "UTVISNING",
      side: teamTone as "home" | "away",
    }
  }

  if (isGoal && teamTone === "home") {
    return {
      tone: "border-slate-200 bg-white",
      dot: "bg-slate-900",
      teamClass: "text-slate-900",
      kindLabel: "MÅL",
      side: "home" as const,
    }
  }

  if (isGoal && teamTone !== "home") {
    return {
      tone: "border-slate-200 bg-white",
      dot: "bg-slate-400",
      teamClass: "text-slate-500",
      kindLabel: "MÅL",
      side: "away" as const,
    }
  }

  return {
    tone: "border-slate-100 bg-white",
    dot: "bg-slate-300",
    teamClass: "text-slate-500",
    kindLabel: "HÄNDELSE",
    side: teamTone as "home" | "away",
  }
}

const getEventSide = (event: MatchFeedEvent, homeTeam: string, awayTeam: string): "home" | "away" | "center" => {
  if (isLifecycleEvent(event)) return "center"

  const text = getEventCombinedText(event)
  if (text.includes("timeout")) return "center"

  if (isHarnosandTeam(event.scoringTeam) || isHarnosandTeam(event.team)) return "home"
  if (event.scoringTeam || event.team) return "away"

  if (typeof event.isHomeGoal === "boolean") {
    if (isHarnosandTeam(homeTeam)) return event.isHomeGoal ? "home" : "away"
    if (isHarnosandTeam(awayTeam)) return event.isHomeGoal ? "away" : "home"
  }

  return "center"
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
  const [isTimelineLoading, setIsTimelineLoading] = useState(false)
  const [displayedFeed, setDisplayedFeed] = useState<MatchFeedEvent[]>([])
  const [isFeedTransitioning, setIsFeedTransitioning] = useState(false)
  const [clockTick, setClockTick] = useState(0)
  const allowAutoRefresh = matchStatus === "live" || matchStatus === "halftime"
  const canFetchDetailedTimeline = matchData?.timelineAvailable !== false || matchData?.eventsAvailable !== false
  const modalRefreshIntervalMs = matchData?.provider === "procup" ? 7_500 : 5_000
  const effectiveClockState = detailClockState ?? clockState ?? null
  const effectivePenalties = detailPenalties.length > 0 ? detailPenalties : penalties
  const shouldWaitForDetailedTimeline =
    isTimelineLoading && !detailTimeline && Boolean(matchData?.apiMatchId) && isLowFidelityTimeline(matchFeed)
  const timelineSource = shouldWaitForDetailedTimeline
    ? []
    : detailTimeline
      ? preferRicherTimeline(detailTimeline, matchFeed)
      : matchFeed
  const hasClockData = Boolean(
    effectiveClockState &&
      (typeof effectiveClockState.currentSeconds === "number" || Boolean(effectiveClockState.clock)),
  )
  const clockRunning = Boolean(effectiveClockState?.running)
  const clockReason = effectiveClockState?.reason ?? (clockRunning ? "running" : "stopped")
  const timeoutBaseSecondsLeft = Math.max(0, effectiveClockState?.timeout?.timeoutSecondsLeft ?? 0)
  const timeoutSecondsLeft = Math.max(0, timeoutBaseSecondsLeft - (clockReason === "timeout" ? clockTick : 0))
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
    setIsTimelineLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/matcher/match/${encodeURIComponent(apiMatchId)}?includeEvents=1`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      if (!response.ok) return
      const payload = await response.json()
      const normalized = enrichTimelineWithMatchDetails(payload, matchFeed)
      setDetailTimeline(normalized)
      setDetailClockState((payload?.clockState as MatchClockState) ?? null)
      setDetailPenalties(Array.isArray(payload?.penalties) ? payload.penalties : [])
      setClockTick(0)
    } finally {
      setIsTimelineLoading(false)
    }
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
    setDetailTimeline(null)
    setDetailClockState(null)
    setDetailPenalties([])
    setClockTick(0)
    if (canFetchDetailedTimeline) {
      fetchDetailData().catch(() => undefined)
    }
  }, [isOpen, matchData?.apiMatchId, canFetchDetailedTimeline])

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
      if (isGeneric && isLifecycleEvent(event)) {
        return true
      }
      return !isGeneric
    })

    return [...filtered]
      .sort((a, b) => {
      const eventA = a.event
      const eventB = b.event
      const groupA = getEventGroupKey(eventA)
      const groupB = getEventGroupKey(eventB)
      if (groupA !== groupB) return groupB - groupA
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

  const sortedFeedKey = useMemo(() => sortedFeed.map(buildTimelineIdentityKey).join("||"), [sortedFeed])
  const displayedFeedKey = useMemo(() => displayedFeed.map(buildTimelineIdentityKey).join("||"), [displayedFeed])

  useEffect(() => {
    if (!isOpen) {
      setDisplayedFeed([])
      setIsFeedTransitioning(false)
      return
    }

    if (sortedFeedKey === displayedFeedKey) {
      return
    }

    if (displayedFeed.length === 0 || sortedFeed.length === 0) {
      setDisplayedFeed(sortedFeed)
      setIsFeedTransitioning(false)
      return
    }

    setIsFeedTransitioning(true)
    const frame = requestAnimationFrame(() => {
      setDisplayedFeed(sortedFeed)
      setIsFeedTransitioning(false)
    })

    return () => cancelAnimationFrame(frame)
  }, [isOpen, sortedFeed, sortedFeedKey, displayedFeedKey, displayedFeed.length])

  const latestScore = useMemo(() => {
    const eventWithScore = displayedFeed.find(
      (event) => typeof event.homeScore === "number" && typeof event.awayScore === "number",
    )
    if (!eventWithScore) return null
    return `${eventWithScore.homeScore}-${eventWithScore.awayScore}`
  }, [displayedFeed])

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
    return displayedFeed.reduce<Record<number, MatchFeedEvent[]>>((acc, event) => {
      const key = getEventGroupKey(event)
      if (!acc[key]) acc[key] = []
      acc[key].push(event)
      return acc
    }, {})
  }, [displayedFeed])

  const emptyTimelineMessage = useMemo(() => {
    if (matchData?.timelineAvailable === false && matchData?.provider === "procup") {
      return matchStatus === "live" || matchStatus === "halftime"
        ? "Livescore uppdateras, men ProCup har ingen publik play-by-play-tidslinje för den här matchen."
        : "ProCup har ingen publik play-by-play-tidslinje för den här matchen."
    }
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
  const hasVisibleTimeline = displayedFeed.length > 0
  const showTimelineSkeleton = isTimelineLoading && !hasVisibleTimeline
  const hasTimelineUpdates = displayedFeed.length > 0
  const isNoLiveUpdatesIssue = !hasTimelineUpdates || clockReason === "no_events"
  const showTimeoutTimer = clockReason === "timeout" && timeoutSecondsLeft > 0
  const showPenaltyTimers = activePenalties.length > 0
  const showClockAndTimers = matchStatus !== "finished" && !isNoLiveUpdatesIssue && (showTimeoutTimer || showPenaltyTimers)

  const calculatedTopScorersByTeam = useMemo(() => {
    const goalEvents = displayedFeed.filter((event) => (event.type || "").toLowerCase().includes("mål") && event.player)
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
  }, [displayedFeed])

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
      if (canFetchDetailedTimeline) {
        await fetchDetailData()
      }
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
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return
      }
      refreshNow()
    }, modalRefreshIntervalMs)

    return () => {
      globalThis.clearTimeout(kickOff)
      globalThis.clearInterval(interval)
    }
  }, [isOpen, onRefresh, allowAutoRefresh, matchData?.apiMatchId, canFetchDetailedTimeline, modalRefreshIntervalMs])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="flex h-[95dvh] w-full max-w-3xl flex-col overflow-hidden border border-slate-200 bg-white sm:h-[88vh]"
      >
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-950 text-white">
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {(matchStatus === "live" || matchStatus === "halftime") && (
                  <span className="bg-white text-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shrink-0">LIVE</span>
                )}
                {matchStatus === "finished" && <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40 shrink-0">SLUT</span>}
                {matchStatus === "upcoming" && <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40 shrink-0">KOMMANDE</span>}
                <p className="text-3xl font-black tabular-nums sm:text-4xl">{scoreboard}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="border border-white/20 p-2 text-white transition hover:bg-white/10 shrink-0"
                aria-label="Stäng modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Team name columns */}
            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70 text-right truncate">{homeTeam}</p>
              <span className="text-[10px] text-white/30 px-2">–</span>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70 truncate">{awayTeam}</p>
            </div>
          </div>
        </header>

        {/* Timeout/Penalty timers */}
        {showClockAndTimers && (
          <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
            {showTimeoutTimer && (
              <div className="flex items-center justify-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Timeout</span>
                <span className="font-mono text-lg font-black tabular-nums text-slate-900">
                  {formatSecondsAsClock(timeoutSecondsLeft)}
                </span>
              </div>
            )}
            {showPenaltyTimers && (
              <div className={showTimeoutTimer ? "mt-2" : ""}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2 text-center">Utvisningar</p>
                <div className="divide-y divide-slate-100">
                  {activePenalties.map((item, index) => (
                    <div key={`${item.team || "team"}-${item.player || "player"}-${index}`} className="flex items-center justify-between gap-3 py-1.5">
                      <p className="min-w-0 truncate text-xs text-slate-600">
                        {item.team || "Lag"} — {item.player || "Spelare"}{item.playerNumber ? ` #${item.playerNumber}` : ""}
                      </p>
                      <span className="font-mono text-sm font-black tabular-nums text-slate-900">
                        {formatSecondsAsClock(item.remaining)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        {!isNoLiveUpdatesIssue && (
          <nav className="z-10 flex justify-center border-b border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest border-b-2 transition ${
                activeTab === "timeline" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"
              }`}
            >
              Tidslinje
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("scorers")}
              className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest border-b-2 transition ${
                activeTab === "scorers" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"
              }`}
            >
              Målskyttar
            </button>
          </nav>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeTab === "timeline" && (
            <div>
              {showTimelineSkeleton && (
                <div className="px-4 py-6 sm:px-6">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={`timeline-skeleton-${index}`} className="relative grid grid-cols-[1fr_auto_1fr] gap-0 py-4">
                      <div />
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-10 bg-slate-100" />
                      </div>
                      <div className="pl-4">
                        <div className="h-3 w-3/5 bg-slate-100" />
                        <div className="mt-2 h-3 w-2/5 bg-slate-50" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!showTimelineSkeleton && displayedFeed.length === 0 && (
                <p className="py-16 text-center text-sm text-slate-400">{emptyTimelineMessage}</p>
              )}
              {periodKeys.map((period) => (
                <section key={period}>
                  {/* Period header */}
                  <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100 px-4 py-2 sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center">{getPeriodLabel(period)}</p>
                  </div>
                  {/* Two-column timeline */}
                  <div className="relative">
                    {/* Center vertical line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 -translate-x-1/2" />
                    <ul>
                      {groupedByPeriod[period].map((event, index) => {
                        const style = getRowStyle(event, homeTeam, awayTeam)
                        const score = getScoreFromEvent(event)
                        const typeLabel = getEventTypeLabel(event)
                        const side = getEventSide(event, homeTeam, awayTeam)
                        const isGoal = typeLabel === "Mål"

                        return (
                          <li key={`${event.eventId ?? "idx"}-${index}`} className="relative">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-start">
                              {/* Left column (home team) */}
                              <div className={`flex justify-end py-3 pr-4 pl-2 sm:pl-4 ${side === "home" ? "" : ""}`}>
                                {side === "home" && (
                                  <div className="text-right max-w-full">
                                    {score && (
                                      <p className="text-xs font-black tabular-nums text-slate-900 mb-0.5">{score}</p>
                                    )}
                                    <p className={`text-[11px] font-bold leading-tight ${isGoal ? "text-emerald-700" : "text-slate-700"}`}>
                                      {typeLabel}
                                    </p>
                                    {event.player && (
                                      <p className="text-[11px] text-slate-500 mt-0.5">
                                        {event.playerNumber && <span className="font-semibold">{event.playerNumber} </span>}
                                        {event.player}
                                      </p>
                                    )}
                                    {!event.player && !isGoal && (
                                      <p className="text-[11px] text-slate-400 mt-0.5">{getEventDisplayText(event)}</p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Center: time + dot */}
                              <div className="flex flex-col items-center z-10 py-3">
                                <span className={`h-2.5 w-2.5 shrink-0 ${
                                  side === "center" ? "bg-slate-300" : style.dot
                                } ${isGoal ? "h-3 w-3" : ""}`} />
                                <p className="mt-1 text-[10px] font-bold tabular-nums text-slate-400">{event.time || ""}</p>
                              </div>

                              {/* Right column (away team) */}
                              <div className={`py-3 pl-4 pr-2 sm:pr-4 ${side === "away" ? "" : ""}`}>
                                {side === "away" && (
                                  <div className="max-w-full">
                                    {score && (
                                      <p className="text-xs font-black tabular-nums text-slate-900 mb-0.5">{score}</p>
                                    )}
                                    <p className={`text-[11px] font-bold leading-tight ${isGoal ? "text-emerald-700" : "text-slate-700"}`}>
                                      {typeLabel}
                                    </p>
                                    {event.player && (
                                      <p className="text-[11px] text-slate-500 mt-0.5">
                                        {event.playerNumber && <span className="font-semibold">{event.playerNumber} </span>}
                                        {event.player}
                                      </p>
                                    )}
                                    {!event.player && !isGoal && (
                                      <p className="text-[11px] text-slate-400 mt-0.5">{getEventDisplayText(event)}</p>
                                    )}
                                  </div>
                                )}
                                {side === "center" && (
                                  <div className="max-w-full">
                                    <p className="text-[11px] font-semibold text-slate-400">{getEventDisplayText(event)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </section>
              ))}
            </div>
          )}

          {activeTab === "scorers" && (
            <div className="px-4 py-6 sm:px-6">
              {Object.keys(topScorersByTeam).length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">Inga registrerade målskyttar än.</p>
              )}
              {Object.entries(topScorersByTeam).map(([team, scorers]) => (
                <section key={team} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{team}</h3>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {scorers.map((scorer, index) => (
                      <li key={`${team}-${scorer.player}-${index}`} className="flex items-center justify-between py-2.5">
                        <p className="text-sm text-slate-900">
                          <span className="font-bold">{index + 1}.</span>{" "}
                          {scorer.playerNumber && <span className="text-slate-400 font-semibold">{scorer.playerNumber} </span>}
                          {scorer.player}
                        </p>
                        <p className="text-sm font-black tabular-nums text-slate-900">{scorer.goals}</p>
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
