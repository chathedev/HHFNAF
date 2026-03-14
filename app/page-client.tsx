"use client"

import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  ArrowRight,
  Heart,
  TrendingUp,
  Users,
  Star,
  Plus,
  Minus,
  Trophy,
  Award,
  History,
  Facebook,
  Instagram,
  ShoppingBag,
} from "lucide-react"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { ErrorBoundary } from "@/components/error-boundary"
import { defaultContent } from "@/lib/default-content"
import type { FullContent, Partner } from "@/lib/content-types"
import { deriveSiteVariant, type SiteVariant, getThemeVariant, getHeroImages, type ThemeVariant } from "@/lib/site-variant"
import { extendTeamDisplayName } from "@/lib/team-display"
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
import { useMatchData, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchCardCTA } from "@/components/match-card-cta"
import { InstagramFeed } from "@/components/instagram-feed"
import { MatchFeedModal, type MatchClockState, type MatchFeedEvent, type MatchPenalty } from "@/components/match-feed-modal"
import { SHOP_URL, useShopStatus } from "@/components/shop-status-provider"
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
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-site-variant")
    if (attr === "staging" || attr === "production" || attr === "development") {
      return attr
    }
  }

  return deriveSiteVariant(
    typeof window !== "undefined" ? window.location.host : process.env.NEXT_PUBLIC_VERCEL_URL || undefined,
  )
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


export function HomePageClient({ initialData }: { initialData?: EnhancedMatchData }) {
  const searchParams = useSearchParams()
  const isEditorMode = searchParams?.get("editor") === "true"

  const [content] = useState<FullContent>(defaultContent)
  const [siteVariant, setSiteVariant] = useState<SiteVariant>(getInitialVariant)
  const [themeVariant, setThemeVariant] = useState<ThemeVariant>(() => {
    if (typeof window !== "undefined") {
      return getThemeVariant(window.location.host)
    }
    return "orange"
  })
  const [showHeroContent, setShowHeroContent] = useState<boolean>(true)
  const [openTier, setOpenTier] = useState<string | null>("Diamantpartner")
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [timelineByMatchId, setTimelineByMatchId] = useState<Record<string, MatchFeedEvent[]>>({})
  const [topScorersByMatchId, setTopScorersByMatchId] = useState<Record<string, MatchTopScorer[]>>({})
  const [clockStateByMatchId, setClockStateByMatchId] = useState<Record<string, MatchClockState>>({})
  const [penaltiesByMatchId, setPenaltiesByMatchId] = useState<Record<string, MatchPenalty[]>>({})
  const [stableScoreByMatchId, setStableScoreByMatchId] = useState<Record<string, string>>({})
  const timelineFetchInFlightRef = useRef<Record<string, Promise<void>>>({})
  const [isInitialHomeMatchFetchDone, setIsInitialHomeMatchFetchDone] = useState(Boolean(initialData?.matches?.length))
  const hasStartedInitialHomeMatchFetchRef = useRef(false)
  const limitedParams = useMemo(() => ({ limit: 10 }), [])
  const { shopVisible } = useShopStatus()
  const {
    matches: currentMatches,
    recentResults,
    groupedFeed,
    loading: matchLoading,
    error: matchErrorMessage,
    hasPayload: hasMatchPayload,
    refresh: refreshHomeMatches,
    isRefreshing: matchRefreshing,
  } = useMatchData({
    dataType: "liveUpcoming",
    params: limitedParams,
    initialData,
    followInitialWindow: true,
  })
  const matchError = Boolean(matchErrorMessage)

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

  useEffect(() => {
    if (hasStartedInitialHomeMatchFetchRef.current) {
      return
    }
    if (hasMatchPayload) {
      setIsInitialHomeMatchFetchDone(true)
      return
    }

    hasStartedInitialHomeMatchFetchRef.current = true
    refreshHomeMatches(true)
      .catch(() => {
        // Error state from useMatchData decides visibility.
      })
      .finally(() => {
        setIsInitialHomeMatchFetchDone(true)
      })
  }, [hasMatchPayload, refreshHomeMatches])

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
    () => allHomeMatches.find((match) => match.id === selectedMatchId) ?? null,
    [allHomeMatches, selectedMatchId],
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
    const scoreValue = stableScore && (status !== "upcoming" || hasStarted) ? stableScore : null
    const showLivePendingScore = status === "live" && match.resultState === "live_pending" && !scoreValue
    const hasStream =
      match.hasStream === true &&
      Boolean((match.playUrl ?? "").trim()) &&
      (match.playUrl ?? "").trim().toLowerCase() !== "null"

    const statusBadge = (() => {
      if (status === "live") {
        return { label: match.statusLabel ?? "LIVE", tone: "bg-rose-50 text-rose-600" }
      }
      if (status === "finished") {
        return { label: match.statusLabel ?? "SLUT", tone: "bg-gray-100 text-gray-600" }
      }
      return { label: match.statusLabel ?? "KOMMANDE", tone: "bg-blue-50 text-blue-600" }
    })()

    return (
      <li key={match.id}>
        <article
          id={`match-card-${match.id}`}
          className={`group relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all ${
            canOpenTimeline ? "cursor-pointer hover:border-emerald-400 hover:shadow-md" : ""
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
            <span className={`inline-flex w-fit items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusBadge.tone}`}>
              {statusBadge.label}
            </span>
          </div>

          {scoreValue && (
            <div className="flex items-end justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-xl font-black text-slate-950" data-score-value="true">
                {scoreValue}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {status === "live" ? "Pågår" : "Resultat"}
              </span>
            </div>
          )}

          {showLivePendingScore && (
            <div className="flex flex-col gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
              <span className="text-sm font-semibold text-sky-800">Livescore väntar</span>
              <span className="text-xs text-sky-700">
                Poäng publiceras så fort liveflödet skickar dem.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {match.series && (
              <p className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">{match.series}</p>
            )}
          </div>
        {showProfixioWarning && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Profixio har tekniska problem med liveuppdateringen för den här matchen just nu.
          </p>
        )}
        {showFinishedZeroZeroIssue && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Misstänkt resultatfel från Profixio: avslutad match visas som 0–0.
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
                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-slate-900 hover:text-slate-950"
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
                className="inline-flex items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Öppna
              </button>
            ) : (
              <Link
                href="/matcher"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
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
          className={`flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition ${
            canOpenTimeline ? "cursor-pointer hover:border-emerald-400 hover:bg-slate-50" : ""
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
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              {dayLabel}
            </span>
            {timeLabel ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                {timeLabel}
              </span>
            ) : null}
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">{teamTypeLabel}</span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-950 break-words sm:text-[15px]">{matchupLabel}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 break-words">{scheduleLabel}</p>
              {match.series ? <p className="mt-1 text-[11px] leading-5 text-slate-400 break-words">{match.series}</p> : null}
            </div>

            <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
              {hasStream ? (
                <a
                  href={(match.playUrl ?? "").trim()}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-slate-900 hover:text-slate-950 sm:w-auto"
                >
                  {getMatchWatchLabel("upcoming")}
                </a>
              ) : canOpenTimeline ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    openMatchModal(match)
                  }}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-900 sm:w-auto"
                >
                  Visa
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Link
                  href="/matcher"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950 sm:w-auto"
                >
                  Till matcher
                </Link>
              )}
            </div>
          </div>
        </article>
      </li>
    )
  }

  const renderUpcomingSkeletonRows = () => (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`upcoming-skeleton-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-20 rounded-full bg-slate-100" />
            <div className="h-6 w-16 rounded-full bg-slate-100" />
            <div className="h-6 w-14 rounded-full bg-emerald-50" />
          </div>
          <div className="mt-3 h-4 w-4/5 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-3/5 rounded bg-slate-100" />
          <div className="mt-3 flex justify-end">
            <div className="h-8 w-24 rounded-md bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )

  const showInitialMatchLoader =
    !isInitialHomeMatchFetchDone && (matchLoading || matchRefreshing || !hasMatchPayload)
  const groupedHomeMatches = useMemo(() => {
    const live = (groupedFeed?.live ?? []).slice(0, 2)
    const upcoming = (groupedFeed?.upcoming ?? []).slice(0, 10)
    const recent = recentResults.slice(0, 3)
    return {
      live,
      upcoming,
      recent,
      counts: {
        live: groupedFeed?.live?.length ?? 0,
        upcoming: groupedFeed?.upcoming?.length ?? 0,
        recent: recentResults.length,
      },
    }
  }, [groupedFeed, recentResults])

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
  const heroImages = typeof window !== "undefined" ? getHeroImages(window.location.host) : getHeroImages()
  const heroOverlayClass = isPinkTheme
    ? "from-pink-900/40 via-pink-800/20 to-rose-900/60"
    : "from-black/70 via-black/40 to-transparent"

  return (
    <ErrorBoundary>
      <div>
        <Header />
        <main>
          {/* Hero Section */}
          <section className={`relative w-full h-screen flex items-center justify-center overflow-hidden ${isPinkTheme ? "bg-gradient-to-br from-pink-50 via-pink-100 to-rose-200" : ""
            }`}>
            {/* Mobile Image */}
            {isPinkTheme && (
              <Image
                src={heroImages.mobile}
                alt="Härnösands HF Memorial - Laget Före Allt"
                fill
                quality={100}
                priority={true}
                unoptimized={true}
                className="z-0 transition-all duration-700 object-cover saturate-125 contrast-110 brightness-105 hue-rotate-15 block sm:hidden"
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
              src={isPinkTheme ? heroImages.desktop : heroImages.desktop}
              alt={isPinkTheme ? "Härnösands HF Memorial - Laget Före Allt" : "Härnösands HF herrlag och damlag 2025"}
              fill
              quality={100}
              priority={true}
              unoptimized={isPinkTheme}
              className={`z-0 transition-all duration-700 object-cover ${isPinkTheme
                ? "saturate-125 contrast-110 brightness-105 hue-rotate-15 hidden sm:block"
                : "block"
                }`}
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
            <div className={`absolute inset-0 bg-gradient-to-t ${heroOverlayClass} z-10 ${isPinkTheme ? "backdrop-blur-[0.5px]" : ""
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
                className={`text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-3 sm:mb-4 md:mb-6 leading-tight tracking-tight animate-fade-in-up text-shadow-outline ${isPinkTheme ? "drop-shadow-2xl filter drop-shadow-[0_0_20px_rgba(236,72,153,0.3)]" : ""
                  }`}
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
                    } text-white px-6 sm:px-10 py-3 sm:py-4 rounded-md text-base sm:text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 w-full sm:w-auto`}
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
                    } text-white px-6 sm:px-10 py-3 sm:py-4 rounded-md text-base sm:text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 w-full sm:w-auto`}
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
                  className="group flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 transition-all duration-300 hover:scale-105"
                >
                  <Facebook className="w-5 h-5" />
                  <span className="font-medium hidden sm:block">Facebook</span>
                </Link>
                <Link
                  href="https://www.instagram.com/harnosandshf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 transition-all duration-300 hover:scale-105"
                >
                  <Instagram className="w-5 h-5" />
                  <span className="font-medium hidden sm:block">Instagram</span>
                </Link>
              </div>
            </div>
          </section>

          {/* SEO H1 Section */}
          <section className="sr-only" aria-hidden="true">
            <h1>Härnösands HF – Handboll i Härnösand</h1>
          </section>

          <section className="relative z-30 -mt-10 pb-14 sm:-mt-20 sm:pb-16">
            <div className="container mx-auto px-4">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(249,250,251,1),rgba(236,253,245,0.9))] px-5 py-5 sm:px-8 sm:py-7">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-600">Matchläge</p>
                      <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                        Live, på tur och nyss klart.
                      </h2>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                        Ett snabbt läge direkt från Profixio. För hela listan, fler lag och full detaljvy går du vidare till matchsidan.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link
                        href="/matcher"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Till matcher
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href={TICKET_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 transition hover:border-orange-400 hover:bg-orange-100"
                      >
                        Köp biljett
                      </Link>
                      {shopVisible ? (
                        <Link
                          href={SHOP_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          Butik
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center gap-2 text-rose-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Live</span>
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-950">{groupedHomeMatches.counts.live}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center gap-2 text-sky-700">
                        <Trophy className="h-4 w-4" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Kommande</span>
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-950">{groupedHomeMatches.counts.upcoming}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-700">
                        <History className="h-4 w-4" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Senaste resultat</span>
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-950">{groupedHomeMatches.counts.recent}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-6">
                  {showInitialMatchLoader ? (
                    <>
                      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="mb-4 h-5 w-24 rounded bg-slate-200" />
                        <div className="space-y-3">
                          {Array.from({ length: 2 }).map((_, index) => (
                            <div key={`live-skeleton-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                              <div className="h-3 w-16 rounded bg-slate-100" />
                              <div className="mt-3 h-4 w-4/5 rounded bg-slate-200" />
                              <div className="mt-2 h-3 w-3/5 rounded bg-slate-100" />
                            </div>
                          ))}
                        </div>
                      </section>
                      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="mb-4 h-5 w-28 rounded bg-slate-200" />
                        {renderUpcomingSkeletonRows()}
                      </section>
                      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="mb-4 h-5 w-32 rounded bg-slate-200" />
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <div key={`recent-skeleton-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                              <div className="h-3 w-20 rounded bg-slate-100" />
                              <div className="mt-3 h-4 w-4/5 rounded bg-slate-200" />
                              <div className="mt-2 h-3 w-3/5 rounded bg-slate-100" />
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  ) : matchError ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
                      Matcherna kunde inte läsas in just nu.
                    </div>
                  ) : (
                    <>
                      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-600">Live</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-950">På planen nu</h3>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                            {groupedHomeMatches.counts.live}
                          </span>
                        </div>
                        <div className="mt-4 space-y-3">
                          {groupedHomeMatches.live.length > 0 ? (
                            <ul className="space-y-3">{groupedHomeMatches.live.map(renderHomeMatchCard)}</ul>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                              Inga live matcher just nu.
                            </div>
                          )}
                        </div>
                      </section>

                      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Kommande</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-950">Närmast framåt</h3>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                            {groupedHomeMatches.counts.upcoming}
                          </span>
                        </div>
                        <div className="mt-4 space-y-2">
                          {groupedHomeMatches.upcoming.length > 0 ? (
                            <ul className="space-y-2">
                              {groupedHomeMatches.upcoming.map(renderUpcomingPreviewRow)}
                            </ul>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                              Inga kommande matcher att visa just nu.
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-slate-500">
                            Visar de närmaste {groupedHomeMatches.upcoming.length} matcherna. För fler dagar och full översikt går du vidare till matchsidan.
                          </p>
                          <Link
                            href="/matcher"
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            Till matcher
                          </Link>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Resultat</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-950">Nyss klara</h3>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                            {groupedHomeMatches.counts.recent}
                          </span>
                        </div>
                        <div className="mt-4 space-y-3">
                          {groupedHomeMatches.recent.length > 0 ? (
                            <ul className="space-y-3">{groupedHomeMatches.recent.map(renderHomeMatchCard)}</ul>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                              Inga färska resultat just nu.
                            </div>
                          )}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

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
                      <h4 className="font-medium mb-2 text-black text-base">Passion</h4>
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
                      <h4 className="font-medium mb-2 text-black text-base">Utveckling</h4>
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
                      <h4 className="font-medium mb-2 text-black text-base">Gemenskap</h4>
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

          {/* Partners Carousel Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-4xl font-bold text-center mb-2">
                Våra <span className="text-orange-500">Partners</span>
              </h2>
              <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
                Vi är stolta över att samarbeta med lokala företag och organisationer som stödjer vår verksamhet och
                hjälper oss att utveckla handbollen i Härnösand.
              </p>

              {tierOrder.map(
                (tierName) =>
                  partnersByTier[tierName] && (
                    <Collapsible
                      key={tierName}
                      open={openTier === tierName}
                      onOpenChange={() => setOpenTier(openTier === tierName ? null : tierName)}
                      className="mb-8 border-b border-gray-200 pb-4"
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex justify-between items-center mb-4 cursor-pointer">
                          <h3 className={`text-3xl font-bold ${isPinkTheme ? "text-emerald-600" : "text-green-600"}`}>{tierName}</h3>
                          <Button variant="ghost" size="icon" aria-expanded={openTier === tierName}>
                            {openTier === tierName ? (
                              <Minus className={`w-6 h-6 ${isPinkTheme ? "text-emerald-700" : "text-green-700"}`} />
                            ) : (
                              <Plus className={`w-6 h-6 ${isPinkTheme ? "text-emerald-700" : "text-green-700"}`} />
                            )}
                          </Button>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="CollapsibleContent animate-fade-in">
                        <div className="flex justify-center">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {partnersByTier[tierName].map((partner) => {
                              const isDiamant = partner.tier === "Diamantpartner"
                              const isHighcon = partner.id === "highcon"
                              return (
                                <div key={partner.id} className="relative group w-full h-36">
                                  <Card
                                    className={`p-4 shadow-lg rounded-lg flex flex-col items-center justify-center h-full w-full text-center
                                  ${isDiamant ? "border-2 border-yellow-500 bg-white" : "bg-white"}
                                `}
                                  >
                                    {isDiamant && (
                                      <Star className="absolute top-1 right-1 w-5 h-5 text-yellow-500 fill-yellow-500" />
                                    )}
                                    <div className={`relative w-full mb-2 ${isHighcon ? "h-24" : "h-20"}`}>
                                      <Image
                                        src={partner.src || "/placeholder.svg"}
                                        alt={partner.alt}
                                        fill
                                        className="object-contain transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                        placeholder="blur"
                                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                                      />
                                    </div>
                                    <h4
                                      className={`text-sm font-semibold ${isDiamant ? "text-gray-900" : "text-gray-800"}`}
                                    >
                                      {partner.alt}
                                    </h4>
                                    {partner.linkUrl && (
                                      <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                                        <Button
                                          onClick={() => window.open(partner.linkUrl, "_blank")}
                                          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
                                        >
                                          Gå till
                                        </Button>
                                      </div>
                                    )}
                                  </Card>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ),
              )}

              <section className={`${isPinkTheme ? "bg-gradient-to-r from-rose-600 to-pink-700" : "bg-green-700"} text-white p-10 rounded-lg shadow-xl text-center mt-16`}>
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

          {/* FAQ Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="bg-white shadow-lg rounded-lg p-8 md:p-12 max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-green-700 mb-8 text-center">
                  Vanliga frågor om att börja träna
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-lg font-semibold text-gray-800 hover:no-underline">
                      Hur börjar jag spela handboll i Härnösands HF?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 text-base">
                      Det enklaste sättet att börja är att kontakta oss! Vi hjälper dig att hitta rätt lag baserat på
                      din ålder och erfarenhet. Du kan fylla i vårt kontaktformulär eller skicka ett mejl direkt till
                      oss.
                      <Link href="/kontakt" className="text-orange-500 hover:underline ml-2">
                        Kontakta oss här.
                      </Link>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-lg font-semibold text-gray-800 hover:no-underline">
                      Vilken utrustning behöver jag?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 text-base">
                      Till en början behöver du bara bekväma träningskläder, inomhusskor och en vattenflaska. Handbollar
                      finns att låna under träningarna. När du väl bestämmer dig för att fortsätta kan du behöva annan utrustning.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger className="text-lg font-semibold text-gray-800 hover:no-underline">
                      Finns det provträningar?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 text-base">
                      Absolut! Vi erbjuder alltid några kostnadsfria provträningar så att du kan känna efter om handboll
                      är något för dig. Detta ger dig en chans att träffa laget och tränarna innan du bestämmer dig.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4">
                    <AccordionTrigger className="text-lg font-semibold text-gray-800 hover:no-underline">
                      Hur anmäler jag mig?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 text-base">
                      Efter dina provträningar får du information om hur du enkelt anmäler dig och blir en fullvärdig
                      medlem i Härnösands HF. Vi ser fram emot att välkomna dig till vår handbollsfamilj!
                      <Link href="/kontakt" className="text-orange-500 hover:underline ml-2">
                        Anmäl dig via kontaktformuläret.
                      </Link>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <div className="text-center mt-8">
                  <Button
                    asChild
                    className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-md text-lg font-semibold transition-colors"
                  >
                    <Link href="/kontakt">Kontakta oss för mer information</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>
        {selectedMatch && (
          <MatchFeedModal
            isOpen={true}
            onClose={() => setSelectedMatchId(null)}
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
              await fetchMatchTimeline(selectedMatch, true).catch(() => undefined)
            }}
          />
        )}
        <Footer />

      </div>
    </ErrorBoundary>
  )
}
