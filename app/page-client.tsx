"use client"

import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  ArrowRight,
  Heart,
  TrendingUp,
  Users,
  Star,
  Trophy,
  Award,
  History,
  Facebook,
  Instagram,
  ShoppingBag,
  Ticket,
  Zap,
  Calendar,
} from "lucide-react"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { ErrorBoundary } from "@/components/error-boundary"
import { defaultContent } from "@/lib/default-content"
import type { FullContent, Partner } from "@/lib/content-types"
import { deriveSiteVariant, type SiteVariant, getThemeVariant, getHeroImages, type ThemeVariant } from "@/lib/site-variant"
import { extendTeamDisplayName } from "@/lib/team-display"
import { canShowTicketForMatch } from "@/lib/matches"
import { resolvePreferredTimeline } from "@/lib/match-timeline"
import {
  buildMatchScheduleLabel,
  canOpenMatchTimeline,
  getMatchWatchLabel,
  getMatchupLabel,
  getSimplifiedMatchStatus,
  shouldShowFinishedZeroZeroIssue,
  shouldShowProfixioTechnicalIssue,
} from "@/lib/match-card-utils"
import { useMatchData, forceMatchDataPoll, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchCardCTA } from "@/components/match-card-cta"
import { InstagramFeed } from "@/components/instagram-feed"
import { MatchFeedModal, type MatchClockState, type MatchFeedEvent, type MatchPenalty } from "@/components/match-feed-modal"
import { SHOP_URL, useShopStatus } from "@/components/shop-status-provider"
import { useFinal4Data, type Final4Data } from "@/lib/use-final4-data"
import { Final4MatchRow } from "@/components/final4-match-card"
import { getFinal4DerivedStatus, getFinal4DisplayScore, getFinal4VenueLabel, isFinal4TimelineAvailable } from "@/lib/final4-utils"
import type { EnhancedMatchData } from "@/lib/use-match-data"
type MatchTopScorer = {
  team: string
  player: string
  playerNumber?: string
  goals: number
}

const TICKET_URL = "https://clubs.clubmate.se/harnosandshf/overview/"
const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "")) ||
  "https://api.harnosandshf.se"


const getInitialVariant = (): SiteVariant => {
  // Always return a stable default for SSR — client resolves on mount via useEffect
  return "production"
}

const mapTimelineEvent = (event: any): MatchFeedEvent => ({
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

const extractTopScorers = (payload: any): MatchTopScorer[] => {
  const source = payload?.match?.playerStats?.topScorers ?? payload?.playerStats?.topScorers
  if (!Array.isArray(source)) {
    return []
  }
  return source
    .filter((scorer) => scorer?.name && Number.isFinite(Number(scorer?.goals)))
    .map((scorer) => ({
      team: scorer?.teamName ?? scorer?.team ?? "Okänt lag",
      player: String(scorer?.name),
      playerNumber: scorer?.number ? String(scorer.number) : undefined,
      goals: Number(scorer?.goals) || 0,
    }))
}

const dedupeTimelineEvents = (events: MatchFeedEvent[]) => {
  const seen = new Set<string>()
  return events.filter((event) => {
    const key =
      event.eventId !== undefined
        ? `id:${event.eventId}`
        : `${event.time}|${event.type}|${event.description}|${event.homeScore ?? ""}-${event.awayScore ?? ""}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

// Add type import for EnhancedMatchData if not already present or use any

const isZeroScore = (score: string) => /^0\s*[-–—]\s*0$/.test(score.trim())

function final4ToNormalized(m: import("@/lib/use-final4-data").Final4Match): NormalizedMatch {
  const isTBD = (n: string) => n.startsWith("Winner ") || n.startsWith("Loser ") || n === "TBD"
  const derivedStatus = getFinal4DerivedStatus(m)
  const displayScore = getFinal4DisplayScore(m)
  const venueLabel = getFinal4VenueLabel(m.venue)
  return {
    id: String(m.matchId),
    apiMatchId: String(m.matchId),
    homeTeam: m.homeName,
    awayTeam: m.awayName,
    opponent: `${m.awayName} (${m.category} ${m.round})`,
    normalizedTeam: m.homeName,
    date: new Date(m.date),
    displayDate: new Date(m.date).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Stockholm" }),
    time: m.time || undefined,
    venue: venueLabel,
    series: m.categoryLabel || m.series || undefined,
    result: displayScore || undefined,
    playUrl: m.playUrl || undefined,
    infoUrl: m.detailUrl || undefined,
    teamType: m.category,
    matchStatus: derivedStatus,
    matchFeed: [],
    provider: "profixio" as const,
    hasStream: Boolean(m.playUrl),
    statusLabel: derivedStatus === "live" ? "LIVE" : derivedStatus === "finished" ? "SLUT" : "KOMMANDE",
    resultState: displayScore ? "available" as const : derivedStatus === "upcoming" ? "not_started" as const : "pending" as const,
    homeScore: displayScore ? m.homeScore ?? undefined : undefined,
    awayScore: displayScore ? m.awayScore ?? undefined : undefined,
    timelineAvailable: isFinal4TimelineAvailable(m) && !isTBD(m.homeName),
  }
}

function Final4MatchSection({ openMatchModal, fetchMatchTimeline, final4InitialData }: {
  openMatchModal: (match: NormalizedMatch) => void
  fetchMatchTimeline: (match: NormalizedMatch) => Promise<void>
  final4InitialData?: Final4Data
}) {
  const { data, loading, error } = useFinal4Data(final4InitialData)

  const normalizedMatches = useMemo(() => {
    if (!data) return []
    return data.matches.map(final4ToNormalized)
  }, [data])

  const liveMatches = normalizedMatches.filter((m) => m.matchStatus === "live")

  const matchesByDate = useMemo(() => {
    const map = new Map<string, NormalizedMatch[]>()
    for (const m of normalizedMatches) {
      const dateKey = m.date.toISOString().slice(0, 10)
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(m)
    }
    for (const matches of map.values()) {
      matches.sort((a, b) => (a.time || "").localeCompare(b.time || ""))
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [normalizedMatches])

  const formatDateHeading = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Stockholm" })
  }

  const renderRow = (match: NormalizedMatch) => {
    const canOpen = match.timelineAvailable
    const isLive = match.matchStatus === "live"
    const isFinished = match.matchStatus === "finished"
    const scoreValue = match.result || null
    const rawCategory = match.teamType || ""
    const rawSeries = match.series || ""
    // Extract round from opponent field
    const roundMatch = match.opponent.match(/\((.*?)\)/)
    const roundInfo = roundMatch ? roundMatch[1] : ""

    const statusBadge = (() => {
      if (isLive) return { label: "LIVE", tone: "bg-slate-900 text-white" }
      if (isFinished) return { label: "SLUT", tone: "bg-slate-100 text-slate-500" }
      return { label: "KOMMANDE", tone: "bg-white text-slate-500 border border-slate-200" }
    })()

    return (
      <li key={match.id}>
        <article
          className={`flex flex-col gap-3 border-b border-slate-200 px-0 py-3.5 transition ${canOpen ? "cursor-pointer hover:bg-slate-50" : ""}`}
          onMouseEnter={() => { if (canOpen) fetchMatchTimeline(match).catch(() => undefined) }}
          onClick={(event) => {
            if (!canOpen) return
            if ((event.target as HTMLElement).closest("a,button")) return
            openMatchModal(match)
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusBadge.tone}`}>
              {statusBadge.label}
            </span>
            <span className="text-[11px] font-medium text-slate-400">{rawCategory}</span>
            {roundInfo && <span className="text-[11px] text-slate-300">{roundInfo}</span>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-950 break-words sm:text-[15px]">
                {match.homeTeam} vs {match.awayTeam}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500 break-words">
                {match.displayDate}{match.time ? ` • ${match.time}` : ""}{match.venue ? ` • ${match.venue}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:w-auto">
              {scoreValue && (
                <span className={`text-lg font-black tabular-nums ${isLive ? "text-red-600" : "text-slate-900"}`} data-score-value="true">
                  {scoreValue}
                </span>
              )}
              {canOpen && (
                <span className="text-xs font-medium text-green-700">Detaljer</span>
              )}
            </div>
          </div>
        </article>
      </li>
    )
  }

  return (
    <section className="pt-10 pb-14 sm:pt-14 sm:pb-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-slate-400">Matcherna kunde inte läsas in just nu.</p>
          ) : normalizedMatches.length > 0 ? (
            <div>
              {liveMatches.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-900">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      Live
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <ul>{liveMatches.map(renderRow)}</ul>
                </div>
              )}
              {matchesByDate.map(([dateKey, matches]) => (
                <div key={dateKey} className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-900 capitalize">
                      {formatDateHeading(dateKey)}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <ul>{matches.map(renderRow)}</ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">Matchprogrammet publiceras inom kort.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export function HomePageClient({ initialData, isFinal4 = false, final4InitialData }: { initialData?: EnhancedMatchData; isFinal4?: boolean; final4InitialData?: Final4Data }) {
  const searchParams = useSearchParams()
  const isEditorMode = searchParams?.get("editor") === "true"

  const [content] = useState<FullContent>(defaultContent)
  const [siteVariant, setSiteVariant] = useState<SiteVariant>(getInitialVariant)
  const [themeVariant, setThemeVariant] = useState<ThemeVariant>("orange")
  const [showHeroContent, setShowHeroContent] = useState<boolean>(true)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [selectedMatchSnapshot, setSelectedMatchSnapshot] = useState<NormalizedMatch | null>(null)
  const [timelineByMatchId, setTimelineByMatchId] = useState<Record<string, MatchFeedEvent[]>>({})
  const [topScorersByMatchId, setTopScorersByMatchId] = useState<Record<string, MatchTopScorer[]>>({})
  const [clockStateByMatchId, setClockStateByMatchId] = useState<Record<string, MatchClockState>>({})
  const [penaltiesByMatchId, setPenaltiesByMatchId] = useState<Record<string, MatchPenalty[]>>({})
  const [stableScoreByMatchId, setStableScoreByMatchId] = useState<Record<string, string>>({})
  const timelineFetchInFlightRef = useRef<Record<string, Promise<void>>>({})
  const { shopVisible } = useShopStatus()
  const {
    matches: currentMatches,
    recentResults,
    groupedFeed,
    loading: matchLoading,
    error: matchErrorMessage,
    hasPayload: hasMatchPayload,
    hasClientData: hasClientMatchData,
    refresh: refreshHomeMatches,
    isRefreshing: matchRefreshing,
  } = useMatchData({
    dataType: "liveUpcoming",
    initialData,
    followInitialWindow: true,
    refreshIntervalMs: 30_000,
  })
  const matchError = Boolean(matchErrorMessage)
  const hasTriggeredFallbackRef = useRef(false)

  useEffect(() => {
    const matches = [...currentMatches, ...recentResults]
    if (matches.length === 0) return

    setStableScoreByMatchId((prev) => {
      let changed = false
      const next = { ...prev }
      for (const match of matches) {
        const cleaned = typeof match.result === "string" ? match.result.trim() : ""
        if (cleaned && cleaned.toLowerCase() !== "inte publicerat" && next[match.id] !== cleaned) {
          next[match.id] = cleaned
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [currentMatches, recentResults])

  // If SSR returned empty data, trigger one client-side fetch as fallback
  useEffect(() => {
    if (hasTriggeredFallbackRef.current) return
    if (hasMatchPayload && !matchLoading) {
      // Data arrived (from SSR or initial direct fetch) — check if empty
      const total = (groupedFeed?.live?.length ?? 0) + (groupedFeed?.upcoming?.length ?? 0) + recentResults.length
      if (total === 0) {
        hasTriggeredFallbackRef.current = true
        refreshHomeMatches(true).catch(() => {})
      } else {
        hasTriggeredFallbackRef.current = true
      }
    }
  }, [hasMatchPayload, matchLoading, groupedFeed, recentResults, refreshHomeMatches])

  // Track previous scores to highlight live updates
  const partnersForDisplay = Array.isArray(content.partners) ? content.partners.filter((p) => p.visibleInCarousel) : []

  const grannstadenPartner: Partner = {
    id: "grannstaden",
    src: "/grannstaden.svg",
    alt: "Grannstaden",
    tier: "Platinapartner",
    visibleInCarousel: true,
    linkUrl: "https://grannstaden.se/",
    benefits: [],
  }

  const allPartnersForDisplay = [...partnersForDisplay, grannstadenPartner]

  const partnersByTier: Record<string, Partner[]> = allPartnersForDisplay.reduce(
    (acc, partner) => {
      if (!acc[partner.tier]) {
        acc[partner.tier] = []
      }
      acc[partner.tier].push(partner)
      return acc
    },
    {} as Record<string, Partner[]>,
  )

  const tierOrder = ["Diamantpartner", "Platinapartner", "Guldpartner", "Silverpartner", "Bronspartner"]

  function getMatchStatus(match: NormalizedMatch): "live" | "finished" | "upcoming" {
    return getSimplifiedMatchStatus(match)
  }

  const allHomeMatches = useMemo(() => {
    const seenIds = new Set<string>()
    return [...currentMatches, ...recentResults].filter((match) => {
      if (seenIds.has(match.id)) {
        return false
      }
      seenIds.add(match.id)
      return true
    })
  }, [currentMatches, recentResults])

  const selectedMatch = useMemo(
    () => allHomeMatches.find((match) => match.id === selectedMatchId) ?? (selectedMatchSnapshot?.id === selectedMatchId ? selectedMatchSnapshot : null),
    [allHomeMatches, selectedMatchId, selectedMatchSnapshot],
  )

  const fetchMatchTimeline = useCallback(async (match: NormalizedMatch, force = false) => {
    if (!force && Object.prototype.hasOwnProperty.call(timelineByMatchId, match.id)) {
      return
    }
    const inFlight = timelineFetchInFlightRef.current[match.id]
    if (inFlight) {
      return inFlight
    }

    const apiMatchId = match.apiMatchId
    if (!apiMatchId) {
      return
    }

    const request = (async () => {
      const response = await fetch(`${API_BASE_URL}/matcher/match/${encodeURIComponent(apiMatchId)}?includeEvents=1`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      if (!response.ok) {
        throw new Error(`Could not load timeline (${response.status})`)
      }

      const payload = await response.json()
      const rawTimeline = resolvePreferredTimeline(payload, match.matchFeed ?? [])

      const normalized = dedupeTimelineEvents(rawTimeline.map((event: any) => mapTimelineEvent(event)))
      setTimelineByMatchId((prev) => ({ ...prev, [match.id]: normalized }))
      if (payload?.clockState) {
        setClockStateByMatchId((prev) => ({ ...prev, [match.id]: payload.clockState as MatchClockState }))
      }
      if (Array.isArray(payload?.penalties)) {
        setPenaltiesByMatchId((prev) => ({ ...prev, [match.id]: payload.penalties as MatchPenalty[] }))
      }
      const topScorers = extractTopScorers(payload)
      if (topScorers.length > 0) {
        setTopScorersByMatchId((prev) => ({ ...prev, [match.id]: topScorers }))
      }
    })()

    timelineFetchInFlightRef.current[match.id] = request
    try {
      await request
    } finally {
      delete timelineFetchInFlightRef.current[match.id]
    }
  }, [timelineByMatchId])

  const openMatchModal = useCallback(
    (match: NormalizedMatch) => {
      setSelectedMatchId(match.id)
      setSelectedMatchSnapshot(match)
      fetchMatchTimeline(match).catch((error) => {
        console.warn("Failed to hydrate match timeline", error)
      })
    },
    [fetchMatchTimeline],
  )

  const getMergedTimeline = useCallback(
    (match: NormalizedMatch) => {
      const hydrated = timelineByMatchId[match.id]
      if (Object.prototype.hasOwnProperty.call(timelineByMatchId, match.id)) {
        return hydrated
      }
      return dedupeTimelineEvents((match.matchFeed ?? []).map((event) => mapTimelineEvent(event)))
    },
    [timelineByMatchId],
  )

  const renderHomeMatchCard = (match: NormalizedMatch) => {
    const status = getMatchStatus(match)
    const canOpenTimeline = canOpenMatchTimeline(match)
    const scheduleLabel = buildMatchScheduleLabel(match)
    const matchupLabel = getMatchupLabel(match)
    const showProfixioWarning = shouldShowProfixioTechnicalIssue(match)
    const showFinishedZeroZeroIssue = shouldShowFinishedZeroZeroIssue(match)
    const teamTypeRaw = match.teamType?.trim() || ""
    const teamTypeLabel = extendTeamDisplayName(teamTypeRaw) || teamTypeRaw || "Härnösands HF"
    const liveScore = typeof match.result === "string" ? match.result.trim() : ""
    const stableScore = liveScore || stableScoreByMatchId[match.id] || ""
    const hasStarted = match.date.getTime() <= Date.now() + 60_000
    // Suppress stale SSR 0-0 for live matches until first client poll confirms the score
    const isUnconfirmedZero = !hasClientMatchData && status === "live" && isZeroScore(stableScore)
    const scoreValue = stableScore && !isUnconfirmedZero && (status !== "upcoming" || hasStarted) ? stableScore : null
    const showLivePendingScore = status === "live" && (match.resultState === "live_pending" || isUnconfirmedZero) && !scoreValue
    const hasStream =
      match.hasStream === true &&
      Boolean((match.playUrl ?? "").trim()) &&
      (match.playUrl ?? "").trim().toLowerCase() !== "null"

    const statusBadge = (() => {
      if (status === "live") {
        return { label: match.statusLabel ?? "LIVE", tone: "bg-slate-900 text-white" }
      }
      if (status === "finished") {
        return { label: match.statusLabel ?? "SLUT", tone: "bg-slate-100 text-slate-500" }
      }
      return { label: match.statusLabel ?? "KOMMANDE", tone: "bg-white text-slate-500 border border-slate-200" }
    })()

    return (
      <li key={match.id}>
        <article
          id={`match-card-${match.id}`}
          className={`group relative flex flex-col gap-3 border-b border-slate-200 px-0 py-4 transition ${
            canOpenTimeline ? "cursor-pointer hover:bg-slate-50" : ""
          }`}
  onMouseEnter={() => {
            if (canOpenTimeline) {
              fetchMatchTimeline(match).catch(() => undefined)
            }
          }}
          onTouchStart={() => {
            if (canOpenTimeline) {
              fetchMatchTimeline(match).catch(() => undefined)
            }
          }}
          onClick={(event) => {
            if (!canOpenTimeline) {
              return
            }
            const target = event.target as HTMLElement
            if (target.closest("a,button")) {
              return
            }
            openMatchModal(match)
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">{teamTypeLabel}</p>
              </div>
              <h3 className="mt-1.5 text-sm font-semibold leading-tight text-slate-950 sm:text-[15px]">
                {matchupLabel}
              </h3>
              {scheduleLabel && <p className="mt-1 text-xs leading-5 text-slate-500 break-words">{scheduleLabel}</p>}
            </div>
            <span className={`inline-flex w-fit items-center justify-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusBadge.tone}`}>
              {statusBadge.label}
            </span>
          </div>

          {scoreValue && (
            <div className="py-2" data-score-value="true">
              <span className={`text-3xl font-black tabular-nums tracking-tight ${status === "live" ? "text-slate-900" : "text-slate-900"}`}>
                {scoreValue}
              </span>
            </div>
          )}

          {showLivePendingScore && (
            <p className="text-xs text-slate-400">Livescore väntar</p>
          )}

          {match.series && (
            <p className="text-[11px] text-slate-400">{match.series}</p>
          )}
        {showProfixioWarning && (
          <p className="border-l-2 border-amber-400 pl-3 text-xs text-amber-700">
            Liveuppdateringen har tekniska problem just nu.
          </p>
        )}
        {showFinishedZeroZeroIssue && (
          <p className="border-l-2 border-amber-400 pl-3 text-xs text-amber-700">
            Misstänkt resultatfel: avslutad match visas som 0–0.
          </p>
        )}
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs text-slate-400">{status === "upcoming" ? "Fler detaljer på matchsidan" : "Öppna för detaljer"}</span>
            {hasStream ? (
              <a
                href={(match.playUrl ?? "").trim()}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline"
              >
                {getMatchWatchLabel(status)}
              </a>
            ) : canOpenTimeline ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  openMatchModal(match)
                }}
                className="text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline"
              >
                Detaljer
              </button>
            ) : (
              <Link
                href="/matcher"
                onClick={(event) => event.stopPropagation()}
                className="text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline"
              >
                Till matcher
              </Link>
            )}
          </div>
      </article>
      </li>
    )
  }

  const renderUpcomingPreviewRow = (match: NormalizedMatch) => {
    const canOpenTimeline = canOpenMatchTimeline(match)
    const scheduleLabel = buildMatchScheduleLabel(match)
    const matchupLabel = getMatchupLabel(match)
    const teamTypeRaw = match.teamType?.trim() || ""
    const teamTypeLabel = extendTeamDisplayName(teamTypeRaw) || teamTypeRaw || "Härnösands HF"
    const hasStream = match.hasStream === true && Boolean((match.playUrl ?? "").trim()) && (match.playUrl ?? "").trim().toLowerCase() !== "null"
    const dayLabel = match.display?.dateCard?.trim() || match.displayDate
    const timeLabel = match.display?.time?.trim() || match.time?.trim() || ""

    return (
      <li key={match.id}>
        <article
          className={`flex flex-col gap-2 border-b border-slate-200 py-3.5 transition ${
            canOpenTimeline ? "cursor-pointer hover:bg-slate-50" : ""
          }`}
          onClick={(event) => {
            if (!canOpenTimeline) {
              return
            }
            const target = event.target as HTMLElement
            if (target.closest("a,button")) {
              return
            }
            openMatchModal(match)
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">
              {dayLabel}
            </span>
            {timeLabel ? (
              <span className="text-[11px] text-slate-300">{timeLabel}</span>
            ) : null}
            <span className="text-[11px] font-medium text-slate-400">{teamTypeLabel}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 break-words">{matchupLabel}</p>
            </div>

            {hasStream ? (
              <a
                href={(match.playUrl ?? "").trim()}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline shrink-0"
              >
                {getMatchWatchLabel("upcoming")}
              </a>
            ) : null}
          </div>
        </article>
      </li>
    )
  }

  const renderHomeFlowRow = (match: NormalizedMatch) => {
    const status = getMatchStatus(match)
    const canOpenTimeline = canOpenMatchTimeline(match)
    const scheduleLabel = buildMatchScheduleLabel(match)
    const matchupLabel = getMatchupLabel(match)
    const teamTypeRaw = match.teamType?.trim() || ""
    const teamTypeLabel = extendTeamDisplayName(teamTypeRaw) || teamTypeRaw || "Härnösands HF"
    const hasStream = match.hasStream === true && Boolean((match.playUrl ?? "").trim()) && (match.playUrl ?? "").trim().toLowerCase() !== "null"
    const liveScore = typeof match.result === "string" ? match.result.trim() : ""
    const stableScore = liveScore || stableScoreByMatchId[match.id] || ""
    const hasStarted = match.date.getTime() <= Date.now() + 60_000
    const isUnconfirmedZero = !hasClientMatchData && status === "live" && isZeroScore(stableScore)
    const scoreValue = stableScore && !isUnconfirmedZero && (status !== "upcoming" || hasStarted) ? stableScore : null
    const showLivePendingScore = status === "live" && (match.resultState === "live_pending" || isUnconfirmedZero) && !scoreValue

    const statusBadge = (() => {
      if (status === "live") {
        return { label: match.statusLabel ?? "LIVE", tone: "bg-slate-900 text-white" }
      }
      if (status === "finished") {
        return { label: match.statusLabel ?? "SLUT", tone: "bg-slate-100 text-slate-500" }
      }
      return { label: match.statusLabel ?? "KOMMANDE", tone: "bg-white text-slate-500 border border-slate-200" }
    })()

    return (
      <li key={match.id}>
        <article
          className={`flex flex-col gap-3 border-b border-slate-200 px-0 py-3.5 transition ${
            canOpenTimeline ? "cursor-pointer hover:bg-slate-50" : ""
          }`}
          onMouseEnter={() => {
            if (canOpenTimeline) {
              fetchMatchTimeline(match).catch(() => undefined)
            }
          }}
          onTouchStart={() => {
            if (canOpenTimeline) {
              fetchMatchTimeline(match).catch(() => undefined)
            }
          }}
          onClick={(event) => {
            if (!canOpenTimeline) {
              return
            }
            const target = event.target as HTMLElement
            if (target.closest("a,button")) {
              return
            }
            openMatchModal(match)
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusBadge.tone}`}>
              {statusBadge.label}
            </span>
            <span className="text-[11px] font-medium text-slate-400">{teamTypeLabel}</span>
            {match.series ? <span className="text-[11px] text-slate-300">{match.series}</span> : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-950 break-words sm:text-[15px]">{matchupLabel}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 break-words">{scheduleLabel}</p>
              {showLivePendingScore ? (
                <p className="mt-1 text-xs text-slate-400">Livescore väntar</p>
              ) : null}
            </div>

            <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
              {scoreValue ? (
                <span className="text-lg font-black tabular-nums text-slate-900" data-score-value="true">
                  {scoreValue}
                </span>
              ) : null}
              {hasStream ? (
                <a
                  href={(match.playUrl ?? "").trim()}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
                >
                  {getMatchWatchLabel(status)}
                </a>
              ) : canOpenTimeline ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    openMatchModal(match)
                  }}
                  className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
                >
                  Detaljer
                </button>
              ) : null}
            </div>
          </div>
        </article>
      </li>
    )
  }

  const renderUpcomingSkeletonRows = () => (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`upcoming-skeleton-${index}`} className="py-4">
          <div className="flex gap-2">
            <div className="h-4 w-14 bg-slate-100" />
            <div className="h-4 w-10 bg-slate-50" />
          </div>
          <div className="mt-2 h-4 w-3/5 bg-slate-100" />
          <div className="mt-1.5 h-3 w-2/5 bg-slate-50" />
        </div>
      ))}
    </div>
  )

  const homeMatchFlow = useMemo(() => {
    const seen = new Set<string>()
    const liveItems = (groupedFeed?.live ?? []).slice(0, 5)
    // Use recentResults from API, but fall back to recently finished matches
    // from the grouped feed when the API returns no recent results (e.g. when
    // a match result hasn't been published yet).
    const now = Date.now()
    const SIX_HOURS = 6 * 60 * 60 * 1000
    const finishedFallback = recentResults.length === 0
      ? (groupedFeed?.finished ?? []).filter((m) => {
          const ts = typeof m.startTimestamp === "number" ? m.startTimestamp : new Date(m.date).getTime()
          return Number.isFinite(ts) && now - ts < SIX_HOURS
        }).slice(0, 3)
      : []
    const resultItems = recentResults.length > 0 ? recentResults.slice(0, 3) : finishedFallback
    const remainingSlots = Math.max(15 - liveItems.length - resultItems.length, 0)
    const upcomingItems = (groupedFeed?.upcoming ?? []).slice(0, remainingSlots)

    const ordered = [...liveItems, ...resultItems, ...upcomingItems].filter((match) => {
      if (seen.has(match.id)) {
        return false
      }
      seen.add(match.id)
      return true
    })

    return {
      items: ordered.slice(0, 15),
      total: ordered.length,
    }
  }, [groupedFeed, recentResults])

  const showInitialMatchLoader =
    !matchError && homeMatchFlow.items.length === 0 && (matchLoading || !hasMatchPayload)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const resolved = deriveSiteVariant(window.location.host)
    setSiteVariant(resolved)

    const resolvedTheme = getThemeVariant(window.location.host)
    setThemeVariant(resolvedTheme)
  }, [])

  const isPinkTheme = themeVariant === "pink"
  const [heroImages, setHeroImages] = useState(() => getHeroImages())
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHeroImages(getHeroImages(window.location.host))
    }
  }, [])
  const heroOverlayClass = isPinkTheme
    ? "from-pink-900/40 via-pink-800/20 to-rose-900/60"
    : "from-black/70 via-black/40 to-transparent"

  return (
    <ErrorBoundary>
      <div>
        <Header />
        <main>
          {/* Hero Section */}
          {isFinal4 ? (
            <section className="relative w-full h-[70vh] sm:h-screen overflow-hidden">
              <Image
                src="/final4-hero.webp"
                alt="Final4 Norr 2026"
                fill
                className="z-0 object-cover object-center"
                priority
                quality={90}
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10" />
            </section>
          ) : (
          <section className={`relative w-full h-screen flex items-center justify-center overflow-hidden ${isPinkTheme ? "bg-gradient-to-br from-pink-50 via-pink-100 to-rose-200" : ""
            }`}>
            {/* Mobile Image */}
            {isPinkTheme && (
              <Image
                src={heroImages.mobile}
                alt="Härnösands HF Memorial - Laget Före Allt"
                fill
                quality={75}
                priority={true}
                className="z-0 object-cover block sm:hidden will-change-auto"
                sizes="100vw"
                style={{
                  objectPosition: 'center center'
                }}
                onLoad={() => {
                  if (!showHeroContent) {
                    setTimeout(() => setShowHeroContent(true), 1000)
                  }
                }}
                onError={(e) => {
                  console.error('Mobile hero image failed to load:', heroImages.mobile)
                }}
              />
            )}

            {/* Desktop Image */}
            <Image
              src={heroImages.desktop}
              alt={isPinkTheme ? "Härnösands HF Memorial - Laget Före Allt" : "Härnösands HF herrlag och damlag 2025"}
              fill
              quality={75}
              priority={true}
              className={`z-0 object-cover ${isPinkTheme ? "hidden sm:block" : "block"}`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw"
              style={{
                objectPosition: 'center center'
              }}
              onLoad={() => {
                if (isPinkTheme && !showHeroContent) {
                  setTimeout(() => setShowHeroContent(true), 1000)
                }
              }}
              onError={(e) => {
                console.error('Hero image failed to load:', heroImages.desktop)
                if (isPinkTheme) {
                  // Force reload attempt
                  const img = e.target as HTMLImageElement
                  setTimeout(() => {
                    img.src = heroImages.desktop + '?v=' + Date.now()
                  }, 1000)
                }
              }}
              {...(isEditorMode && {
                "data-editable": "true",
                "data-field-path": "home.hero.imageUrl",
              })}
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${heroOverlayClass} z-10 ${isPinkTheme ? "" : ""
              }`} />
            {isPinkTheme && (
              <>
                <div className="absolute inset-0 z-5 bg-gradient-to-br from-pink-500/8 via-rose-400/5 to-pink-900/15 pointer-events-none" />
                <div className="absolute inset-0 z-6 pointer-events-none" style={{
                  background: 'radial-gradient(circle at center, transparent 20%, rgba(236,72,153,0.05) 50%, rgba(190,24,93,0.12) 100%)'
                }} />
              </>
            )}
            <div
              className={`relative z-20 text-white text-center px-4 sm:px-6 md:px-8 max-w-5xl mx-auto transition-opacity duration-700 w-full h-full flex flex-col justify-center items-center ${showHeroContent ? "opacity-100" : "opacity-0"
                }`}
            >
              <h1
                className={`text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-3 sm:mb-4 md:mb-6 leading-tight tracking-tight text-shadow-outline`}
                {...(isEditorMode && {
                  "data-editable": "true",
                  "data-field-path": "home.hero.title",
                })}
              >
                {isPinkTheme ? (
                  <>LAGET <span className="text-pink-300 drop-shadow-[0_0_30px_rgba(244,114,182,0.8)] animate-pulse">FÖRE ALLT</span></>
                ) : (
                  <>LAGET <span className="text-orange-500">FÖRE ALLT</span></>
                )}
              </h1>
              <p
                className="text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 max-w-2xl sm:max-w-3xl mx-auto animate-fade-in-up delay-200 text-shadow-md px-4 sm:px-2 md:px-0 leading-relaxed"
                {...(isEditorMode && {
                  "data-editable": "true",
                  "data-field-path": "home.hero.description",
                })}
              >
                {content.hero.description}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 animate-fade-in-up delay-400 mb-8 sm:mb-12 px-2 sm:px-0">
                <Button
                  asChild
                  className={`${isPinkTheme
                    ? "bg-pink-500 hover:bg-pink-600 focus:ring-pink-300 shadow-pink-500/25"
                    : "bg-orange-500 hover:bg-orange-600 focus:ring-orange-300"
                    } text-white px-6 sm:px-10 py-3 sm:py-4 rounded-md text-base sm:text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 w-full sm:w-auto`}
                >
                  <Link href={content.hero.button1Link}>
                    <span
                      {...(isEditorMode && {
                        "data-editable": "true",
                        "data-field-path": "home.hero.button1Text",
                      })}
                    >
                      {content.hero.button1Text}
                    </span>
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  className={`${isPinkTheme
                    ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300 shadow-emerald-500/25"
                    : "bg-green-700 hover:bg-green-800 focus:ring-green-300"
                    } text-white px-6 sm:px-10 py-3 sm:py-4 rounded-md text-base sm:text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 w-full sm:w-auto`}
                >
                  <Link href={content.hero.button2Link}>
                    <span
                      {...(isEditorMode && {
                        "data-editable": "true",
                        "data-field-path": "home.hero.button2Text",
                      })}
                    >
                      {content.hero.button2Text}
                    </span>
                  </Link>
                </Button>
              </div>

              <div className="flex justify-center space-x-6 animate-fade-in-up delay-600">
                <Link
                  href="https://www.facebook.com/profile.php?id=61566621756014"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Följ oss på Facebook"
                  className="group flex items-center space-x-2 bg-white/15 hover:bg-white/25 rounded-full px-4 py-2 transition-transform duration-300 hover:scale-105"
                >
                  <Facebook className="w-5 h-5" />
                  <span className="font-medium hidden sm:block">Facebook</span>
                </Link>
                <Link
                  href="https://www.instagram.com/harnosandshf"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Följ oss på Instagram"
                  className="group flex items-center space-x-2 bg-white/15 hover:bg-white/25 rounded-full px-4 py-2 transition-transform duration-300 hover:scale-105"
                >
                  <Instagram className="w-5 h-5" />
                  <span className="font-medium hidden sm:block">Instagram</span>
                </Link>
              </div>
            </div>
          </section>
          )}

          {/* ===================== SHOP & QUICK ACTIONS HUB ===================== */}
          <section className="relative z-30 -mt-10 sm:-mt-16">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-5xl mx-auto">
                {/* Shop hero banner */}
                <Link
                  href={shopVisible ? SHOP_URL : "/shop"}
                  target={shopVisible ? "_blank" : undefined}
                  rel={shopVisible ? "noopener noreferrer" : undefined}
                  className="group block border border-slate-200 bg-white p-5 sm:p-6 mb-5 transition hover:border-slate-900"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Nytt i butiken</p>
                      <h2 className="mt-1 text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                        Mössor och supporterprylar
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Stöd klubben — handla direkt.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 border border-slate-900 px-4 py-2 text-xs font-semibold text-slate-900 transition group-hover:bg-slate-900 group-hover:text-white shrink-0">
                      Öppna butiken
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>

                {/* Quick action cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 border border-slate-200 mb-10 sm:mb-14">
                  <Link href="/matcher" aria-label="Matcher" className="group flex items-center gap-3 bg-white p-4 transition hover:bg-slate-50">
                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-sm font-medium text-slate-700">Matcher</span>
                  </Link>
                  <Link href={TICKET_URL} target="_blank" rel="noopener noreferrer" aria-label="Biljetter" className="group flex items-center gap-3 bg-white p-4 transition hover:bg-slate-50">
                    <Ticket className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-sm font-medium text-slate-700">Biljetter</span>
                  </Link>
                  <Link href="/lag" aria-label="Lag" className="group flex items-center gap-3 bg-white p-4 transition hover:bg-slate-50">
                    <Users className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-sm font-medium text-slate-700">Lag</span>
                  </Link>
                  <Link href={shopVisible ? SHOP_URL : "/shop"} target={shopVisible ? "_blank" : undefined} rel={shopVisible ? "noopener noreferrer" : undefined} aria-label="Butik" className="group flex items-center gap-3 bg-white p-4 transition hover:bg-slate-50">
                    <ShoppingBag className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-sm font-medium text-slate-700">Butik</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ===================== MATCHES ===================== */}
          {isFinal4 ? (
            <Final4MatchSection openMatchModal={openMatchModal} fetchMatchTimeline={fetchMatchTimeline} final4InitialData={final4InitialData} />
          ) : (
          <section className="pt-10 pb-14 sm:pt-14 sm:pb-16">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto">
                {showInitialMatchLoader ? (
                  renderUpcomingSkeletonRows()
                ) : matchError ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Matcherna kunde inte läsas in just nu.
                  </p>
                ) : homeMatchFlow.items.length > 0 ? (
                  <div className="space-y-6">
                    {/* Promoted A-lag ticket matches */}
                    {(() => {
                      const ticketMatches = homeMatchFlow.items.filter(
                        (m) => getMatchStatus(m) !== "finished" && canShowTicketForMatch(m)
                      )
                      if (ticketMatches.length === 0) return null
                      return (
                        <div className="space-y-3">
                          {ticketMatches.map((match) => {
                            const status = getMatchStatus(match)
                            const canOpen = canOpenMatchTimeline(match)
                            const scheduleLabel = buildMatchScheduleLabel(match)
                            const matchupLabel = getMatchupLabel(match)
                            const teamTypeRaw = match.teamType?.trim() || ""
                            const teamTypeLabel = extendTeamDisplayName(teamTypeRaw) || teamTypeRaw || "Härnösands HF"
                            const liveScore = typeof match.result === "string" ? match.result.trim() : ""
                            const stableScore = liveScore || stableScoreByMatchId[match.id] || ""
                            const hasStarted = match.date.getTime() <= Date.now() + 60_000
                            const scoreValue = stableScore && (status !== "upcoming" || hasStarted) ? stableScore : null
                            const isLive = status === "live"

                            return (
                              <article
                                key={`promoted-${match.id}`}
                                className={`group relative border border-slate-900 bg-slate-950 p-5 sm:p-6 text-white transition ${
                                  canOpen ? "cursor-pointer hover:bg-slate-900" : ""
                                }`}
                                onMouseEnter={() => { if (canOpen) fetchMatchTimeline(match).catch(() => undefined) }}
                                onClick={(event) => {
                                  if (!canOpen) return
                                  if ((event.target as HTMLElement).closest("a,button")) return
                                  openMatchModal(match)
                                }}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      {isLive ? (
                                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-white text-slate-900">
                                          LIVE
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/60">
                                          {match.statusLabel ?? "KOMMANDE"}
                                        </span>
                                      )}
                                      <span className="text-[11px] font-medium text-white/40">{teamTypeLabel}</span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-bold leading-snug break-words">{matchupLabel}</h3>
                                    {scheduleLabel && <p className="mt-1 text-xs text-white/40 break-words">{scheduleLabel}</p>}
                                  </div>
                                  <div className="flex flex-col items-end gap-3 shrink-0">
                                    {scoreValue && (
                                      <span className="text-3xl font-black tabular-nums text-white" data-score-value="true">
                                        {scoreValue}
                                      </span>
                                    )}
                                    <Link
                                      href={TICKET_URL}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1.5 border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white hover:text-slate-900"
                                    >
                                      <Ticket className="h-3.5 w-3.5" />
                                      Köp biljett
                                    </Link>
                                  </div>
                                </div>
                              </article>
                            )
                          })}
                        </div>
                      )
                    })()}

                    {/* LIVE matches (non-promoted) */}
                    {(() => {
                      const liveMatches = homeMatchFlow.items.filter(
                        (m) => getMatchStatus(m) === "live" && !canShowTicketForMatch(m)
                      )
                      if (liveMatches.length === 0) return null
                      return (
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-900">
                              Live
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                          </div>
                          <ul className="space-y-2">
                            {liveMatches.map(renderHomeFlowRow)}
                          </ul>
                        </div>
                      )
                    })()}

                    {/* UPCOMING matches (non-promoted) */}
                    {(() => {
                      const upcomingMatches = homeMatchFlow.items.filter(
                        (m) => getMatchStatus(m) === "upcoming" && !canShowTicketForMatch(m)
                      )
                      if (upcomingMatches.length === 0) return null
                      return (
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                              Kommande
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                          </div>
                          <ul className="space-y-2">
                            {upcomingMatches.map(renderHomeFlowRow)}
                          </ul>
                        </div>
                      )
                    })()}

                    {/* FINISHED matches */}
                    {(() => {
                      const finishedMatches = homeMatchFlow.items.filter((m) => getMatchStatus(m) === "finished")
                      if (finishedMatches.length === 0) return null
                      return (
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                              Resultat
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                          </div>
                          <ul className="space-y-2">
                            {finishedMatches.map(renderHomeFlowRow)}
                          </ul>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-sm text-slate-400">
                      Inga matcher att visa just nu.
                    </p>
                    <Link
                      href="/matcher"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
                    >
                      Se alla matcher <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}

                {homeMatchFlow.items.length > 0 && (
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <Link
                      href="/matcher"
                      className="inline-flex items-center gap-2 border border-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                    >
                      Alla matcher
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/tabeller"
                      className="inline-flex items-center gap-2 border border-emerald-700 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-700 hover:text-white"
                    >
                      Tabeller
                    </Link>
                    {shopVisible && (
                      <Link
                        href={SHOP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline"
                      >
                        Besök butiken
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
          )}

          {/* Instagram Feed Section */}
          <InstagramFeed />

          {/* About Club Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2
                    className={`text-4xl font-bold ${isPinkTheme ? "text-pink-600" : "text-green-600"} mb-2`}
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": "home.aboutClub.title",
                    })}
                  >
                    {content.aboutClub.title}
                  </h2>

                  <p
                    className="text-gray-700 mb-6"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": "home.aboutClub.paragraph1",
                    })}
                  >
                    {content.aboutClub.paragraph1}
                  </p>

                  <p
                    className="text-gray-700 mb-8"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": "home.aboutClub.paragraph2",
                    })}
                  >
                    {content.aboutClub.paragraph2}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="border border-gray-200 rounded-lg p-6 text-center">
                      <Heart className={`w-8 h-8 ${isPinkTheme ? "text-pink-600" : "text-green-600"} mx-auto mb-3`} />
                      <h3 className="font-medium mb-2 text-black text-base">Passion</h3>
                      <p
                        className="text-sm text-gray-600 leading-relaxed"
                        {...(isEditorMode && {
                          "data-editable": "true",
                          "data-field-path": "home.aboutClub.passionText",
                        })}
                      >
                        {content.aboutClub.passionText}
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-6 text-center">
                      <TrendingUp className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                      <h3 className="font-medium mb-2 text-black text-base">Utveckling</h3>
                      <p
                        className="text-sm text-gray-600 leading-relaxed"
                        {...(isEditorMode && {
                          "data-editable": "true",
                          "data-field-path": "home.aboutClub.developmentText",
                        })}
                      >
                        {content.aboutClub.developmentText}
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-6 text-center">
                      <Users className={`w-8 h-8 ${isPinkTheme ? "text-emerald-600" : "text-green-600"} mx-auto mb-3`} />
                      <h3 className="font-medium mb-2 text-black text-base">Gemenskap</h3>
                      <p
                        className="text-sm text-gray-600 leading-relaxed"
                        {...(isEditorMode && {
                          "data-editable": "true",
                          "data-field-path": "home.aboutClub.communityText",
                        })}
                      >
                        {content.aboutClub.communityText}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <Link
                      href={content.aboutClub.button1Link}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
                    >
                      <span
                        {...(isEditorMode && {
                          "data-editable": "true",
                          "data-field-path": "home.aboutClub.button1Text",
                        })}
                      >
                        {content.aboutClub.button1Text}
                      </span>
                    </Link>
                    <Link
                      href={content.aboutClub.button2Link}
                      className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-2 rounded-md font-medium transition-colors"
                    >
                      <span
                        {...(isEditorMode && {
                          "data-editable": "true",
                          "data-field-path": "home.aboutClub.button2Text",
                        })}
                      >
                        {content.aboutClub.button2Text}
                      </span>
                    </Link>
                  </div>
                </div>

                <div className="relative">
                  <div className="relative h-[400px] rounded-lg overflow-hidden shadow-xl">
                    <Image
                      src={content.aboutClub.imageSrc || "/placeholder.svg"}
                      alt="Härnösands HF ungdomslag"
                      fill
                      className="object-cover"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      {...(isEditorMode && {
                        "data-editable": "true",
                        "data-field-path": "home.aboutClub.imageSrc",
                      })}
                    />
                  </div>

                  <div className="absolute -top-4 -right-4 bg-orange-500 text-white rounded-lg p-4 shadow-lg">
                    <div
                      className="text-3xl font-bold"
                      {...(isEditorMode && {
                        "data-editable": "true",
                        "data-field-path": "home.aboutClub.statNumber",
                      })}
                    >
                      {content.aboutClub.statNumber}
                    </div>
                    <div
                      className="text-sm"
                      {...(isEditorMode && {
                        "data-editable": "true",
                        "data-field-path": "home.aboutClub.statLabel",
                      })}
                    >
                      {content.aboutClub.statLabel}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Partners Section */}
          <section className="py-16">
            <div className="container mx-auto px-4 max-w-5xl">
              <h2 className="text-4xl font-bold text-center mb-2 text-orange-500">
                Partners
              </h2>
              <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
                Lokala företag som stödjer vår verksamhet och handbollen i Härnösand.
              </p>

              {/* Partners by tier — top tier expanded, rest collapsible */}
              <div className="space-y-4">
              {tierOrder.map((tierName, tierIndex) => {
                const tierPartners = partnersByTier[tierName]
                if (!tierPartners || tierPartners.length === 0) return null
                const isDiamant = tierName === "Diamantpartner"
                const isPlatina = tierName === "Platinapartner"
                const isTopTier = isDiamant || isPlatina

                return (
                  <details key={tierName} open={tierIndex === 0} className="group">
                    <summary className={`flex items-center justify-between cursor-pointer select-none rounded-xl px-5 py-3.5 transition-colors ${
                      isDiamant
                        ? "bg-amber-50 hover:bg-amber-100"
                        : isPlatina
                          ? "bg-slate-50 hover:bg-slate-100"
                          : "bg-gray-50 hover:bg-gray-100"
                    }`}>
                      <div className="flex items-center gap-2.5">
                        {isDiamant && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                        <h3 className={`text-base font-semibold ${
                          isDiamant ? "text-amber-700" : isPlatina ? "text-slate-700" : "text-gray-600"
                        }`}>{tierName}</h3>
                        <span className="text-xs text-gray-400">{tierPartners.length}</span>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </summary>
                    <div className={`grid gap-3 pt-4 pb-2 ${
                      isTopTier
                        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                        : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
                    }`}>
                      {tierPartners.map((partner) => (
                        <a
                          key={partner.id}
                          href={partner.linkUrl || undefined}
                          target={partner.linkUrl ? "_blank" : undefined}
                          rel={partner.linkUrl ? "noopener noreferrer" : undefined}
                          aria-label={partner.alt}
                          className={`group/card relative flex flex-col items-center justify-center rounded-xl border bg-white p-3 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                            isDiamant
                              ? "border-amber-200 hover:border-amber-300"
                              : isPlatina
                                ? "border-slate-200 hover:border-slate-300"
                                : "border-gray-100 hover:border-gray-200"
                          }`}
                          style={{ minHeight: isTopTier ? "120px" : "90px" }}
                        >
                          <div className={`relative w-full ${isTopTier ? "h-14" : "h-10"} mb-1.5`}>
                            <Image
                              src={partner.src || "/placeholder.svg"}
                              alt={partner.alt}
                              fill
                              className="object-contain transition-transform duration-300 group-hover/card:scale-105"
                              loading="lazy"
                            />
                          </div>
                          <p className="text-[11px] font-medium text-gray-500 text-center mt-auto leading-tight">{partner.alt}</p>
                        </a>
                      ))}
                    </div>
                  </details>
                )
              })}
              </div>

              <section className={`${isPinkTheme ? "bg-gradient-to-r from-rose-600 to-pink-700" : "bg-green-700"} text-white p-10 rounded-2xl shadow-sm text-center mt-16`}>
                <h2 className="text-4xl font-bold mb-4">Vill du stödja Härnösands HF?</h2>
                <p className="text-xl mb-8">
                  Vi välkomnar nya partners som vill stödja vår verksamhet och bidra till utvecklingen av handbollen i
                  regionen.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link
                    href="/kontakt"
                    className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-semibold shadow-lg transition-transform transform hover:scale-105"
                  >
                    Kontakta oss för mer information
                  </Link>
                </div>
              </section>

              <section className="py-16 text-center">
                <h2 className={`text-4xl font-bold ${isPinkTheme ? "text-white" : "text-green-700"} mb-8`}>Bli en del av vårt lag!</h2>
                <p className="text-xl text-gray-700 mb-10 max-w-3xl mx-auto">
                  Oavsett om du är nybörjare eller erfaren spelare, finns det en plats för dig i Härnösands HF. Kom och
                  upplev glädjen med handboll!
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <Button
                    asChild
                    className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-md text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105"
                  >
                    <Link href="/kontakt">Börja Träna</Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-green-700 hover:bg-green-800 text-white px-10 py-4 rounded-md text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105"
                  >
                    <Link href="/kontakt">Bli en del av föreningen</Link>
                  </Button>
                </div>
              </section>
            </div>
          </section>

          {/* FAQ Section - Homepage specific */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 md:p-12 max-w-4xl mx-auto shadow-sm">
                <h2 className="text-3xl font-bold text-green-700 mb-2 text-center">
                  Vanliga frågor
                </h2>
                <p className="text-center text-sm text-gray-500 mb-8">Om Härnösands HF och vår verksamhet</p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-base font-semibold text-gray-800 hover:no-underline">
                      Vad är Härnösands HF?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 text-sm leading-relaxed">
                      Härnösands HF är en handbollsförening i Härnösand som erbjuder handboll för alla åldrar — från de
                      allra yngsta till seniorlag. Vi har lag inom både dam- och herrverksamhet samt barn- och ungdomsverksamhet.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-base font-semibold text-gray-800 hover:no-underline">
                      Hur kan jag eller mitt barn börja spela?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 text-sm leading-relaxed">
                      Kontakta oss så hjälper vi dig hitta rätt lag! Vi erbjuder kostnadsfria provträningar. Du behöver bara
                      bekväma träningskläder och inomhusskor — handbollar finns att låna.
                      <Link href="/kontakt" className="text-orange-500 hover:underline ml-1">Kontakta oss här.</Link>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger className="text-base font-semibold text-gray-800 hover:no-underline">
                      Var spelas matcherna?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 text-sm leading-relaxed">
                      Våra hemmamatcher spelas huvudsakligen i Landgrenshallen i Härnösand. Se aktuellt matchschema på{" "}
                      <Link href="/matcher" className="text-orange-500 hover:underline">matchsidan</Link> för tider och platser.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4">
                    <AccordionTrigger className="text-base font-semibold text-gray-800 hover:no-underline">
                      Hur köper jag biljetter?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 text-sm leading-relaxed">
                      Biljetter köps via Clubmate. Gå till{" "}
                      <Link href="/kop-biljett" className="text-orange-500 hover:underline">biljettsidan</Link> för att
                      komma direkt till biljettköpet. Du kan även köpa biljetter vid ingången på matchdagen.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </section>
        </main>
        {selectedMatch && (
          <MatchFeedModal
            isOpen={true}
            onClose={() => {
              setSelectedMatchId(null)
              setSelectedMatchSnapshot(null)
            }}
            matchFeed={getMergedTimeline(selectedMatch)}
            homeTeam={selectedMatch.homeTeam}
            awayTeam={selectedMatch.awayTeam}
            finalScore={selectedMatch.result}
            matchStatus={selectedMatch.matchStatus}
            matchId={selectedMatch.id}
            matchData={selectedMatch}
            clockState={clockStateByMatchId[selectedMatch.id] ?? null}
            penalties={penaltiesByMatchId[selectedMatch.id] ?? []}
            topScorers={topScorersByMatchId[selectedMatch.id] ?? []}
            onRefresh={async () => {
              forceMatchDataPoll()
              await fetchMatchTimeline(selectedMatch, true).catch(() => undefined)
            }}
          />
        )}
        <Footer />

      </div>
    </ErrorBoundary>
  )
}
