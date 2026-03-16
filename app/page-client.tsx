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
  ChevronDown,
  Facebook,
  Instagram,
  ShoppingBag,
  MapPin,
  Calendar,
  Clock,
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

  // --- Match card renderers ---

  const renderHomeFlowRow = (match: NormalizedMatch) => {
    const status = getMatchStatus(match)
    const canOpen = canOpenMatchTimeline(match)
    const scheduleLabel = buildMatchScheduleLabel(match)
    const matchupLabel = getMatchupLabel(match)
    const showProfixioWarning = shouldShowProfixioTechnicalIssue(match)
    const showFinishedZeroZeroIssue = shouldShowFinishedZeroZeroIssue(match)
    const teamTypeRaw = match.teamType?.trim() || ""
    const teamTypeLabel = extendTeamDisplayName(teamTypeRaw) || teamTypeRaw || "Härnösands HF"
    const hasStream = match.hasStream === true && Boolean((match.playUrl ?? "").trim()) && (match.playUrl ?? "").trim().toLowerCase() !== "null"
    const liveScore = typeof match.result === "string" ? match.result.trim() : ""
    const stableScore = liveScore || stableScoreByMatchId[match.id] || ""
    const hasStarted = match.date.getTime() <= Date.now() + 60_000
    const scoreValue = stableScore && (status !== "upcoming" || hasStarted) ? stableScore : null
    const showLivePendingScore = status === "live" && match.resultState === "live_pending" && !scoreValue

    const statusConfig = (() => {
      if (status === "live") return { label: match.statusLabel ?? "LIVE", bg: "bg-red-500", text: "text-white", dot: true }
      if (status === "finished") return { label: match.statusLabel ?? "SLUT", bg: "bg-neutral-100", text: "text-neutral-500", dot: false }
      return { label: match.statusLabel ?? "KOMMANDE", bg: "bg-emerald-50", text: "text-emerald-700", dot: false }
    })()

    return (
      <li key={match.id}>
        <article
          className={`group relative rounded-xl border border-neutral-200/80 bg-white p-5 transition-all duration-200 ${
            canOpen ? "cursor-pointer hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50" : ""
          }`}
          onMouseEnter={() => { if (canOpen) fetchMatchTimeline(match).catch(() => undefined) }}
          onTouchStart={() => { if (canOpen) fetchMatchTimeline(match).catch(() => undefined) }}
          onClick={(event) => {
            if (!canOpen) return
            if ((event.target as HTMLElement).closest("a,button")) return
            openMatchModal(match)
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusConfig.bg} ${statusConfig.text}`}>
                  {statusConfig.dot && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                  {statusConfig.label}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">{teamTypeLabel}</span>
                {match.series && <span className="text-[11px] text-neutral-400">{match.series}</span>}
              </div>
              <h3 className="text-[15px] font-semibold leading-snug text-neutral-900 break-words">{matchupLabel}</h3>
              {scheduleLabel && <p className="mt-1 text-xs text-neutral-500 break-words">{scheduleLabel}</p>}
              {showLivePendingScore && (
                <p className="mt-2 text-xs font-medium text-sky-600">Livescore publiceras snart.</p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              {scoreValue && (
                <span className="text-2xl font-black tabular-nums text-neutral-900" data-score-value="true">
                  {scoreValue}
                </span>
              )}
              <div className="flex items-center gap-2">
                {hasStream ? (
                  <a
                    href={(match.playUrl ?? "").trim()}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
                  >
                    {getMatchWatchLabel(status)}
                  </a>
                ) : canOpen ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openMatchModal(match) }}
                    className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-neutral-700"
                  >
                    Detaljer
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ) : (
                  <Link
                    href="/matcher"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-neutral-600 transition hover:border-neutral-400"
                  >
                    Matcher
                  </Link>
                )}
              </div>
            </div>
          </div>

          {showProfixioWarning && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Profixio har tekniska problem med liveuppdateringen just nu.
            </p>
          )}
          {showFinishedZeroZeroIssue && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Misstänkt resultatfel: avslutad match visas som 0–0.
            </p>
          )}
        </article>
      </li>
    )
  }

  const renderUpcomingSkeletonRows = () => (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`skeleton-${index}`} className="rounded-xl border border-neutral-100 bg-white p-5">
          <div className="flex gap-2 mb-3">
            <div className="h-5 w-16 rounded-md bg-neutral-100 animate-pulse" />
            <div className="h-5 w-20 rounded-md bg-neutral-100 animate-pulse" />
          </div>
          <div className="h-4 w-3/4 rounded bg-neutral-100 animate-pulse" />
          <div className="mt-2 h-3 w-1/2 rounded bg-neutral-50 animate-pulse" />
        </div>
      ))}
    </div>
  )

  const showInitialMatchLoader =
    !isInitialHomeMatchFetchDone && (matchLoading || matchRefreshing || !hasMatchPayload)

  const homeMatchFlow = useMemo(() => {
    const seen = new Set<string>()
    const liveItems = (groupedFeed?.live ?? []).slice(0, 3)
    const resultItems = recentResults.slice(0, 2)
    const remainingSlots = Math.max(10 - liveItems.length - resultItems.length, 0)
    const upcomingItems = (groupedFeed?.upcoming ?? []).slice(0, remainingSlots)

    const ordered = [...liveItems, ...resultItems, ...upcomingItems].filter((match) => {
      if (seen.has(match.id)) return false
      seen.add(match.id)
      return true
    })

    return { items: ordered.slice(0, 10), total: ordered.length }
  }, [groupedFeed, recentResults])

  useEffect(() => {
    if (typeof window === "undefined") return
    const resolved = deriveSiteVariant(window.location.host)
    setSiteVariant(resolved)
    const resolvedTheme = getThemeVariant(window.location.host)
    setThemeVariant(resolvedTheme)
  }, [])

  const isPinkTheme = themeVariant === "pink"
  const heroImages = typeof window !== "undefined" ? getHeroImages(window.location.host) : getHeroImages()

  // --- Tier display config ---
  const tierBadgeConfig: Record<string, { label: string; color: string }> = {
    Diamantpartner: { label: "Diamant", color: "bg-amber-50 text-amber-700 border-amber-200" },
    Platinapartner: { label: "Platina", color: "bg-slate-50 text-slate-600 border-slate-200" },
    Guldpartner: { label: "Guld", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    Silverpartner: { label: "Silver", color: "bg-neutral-50 text-neutral-500 border-neutral-200" },
    Bronspartner: { label: "Brons", color: "bg-orange-50 text-orange-600 border-orange-200" },
  }

  return (
    <ErrorBoundary>
      <div className="bg-white">
        <Header />
        <main>
          {/* ===================== HERO ===================== */}
          <section className="relative w-full h-[100svh] min-h-[600px] flex items-end overflow-hidden bg-neutral-950">
            {isPinkTheme && (
              <Image
                src={heroImages.mobile}
                alt="Härnösands HF Memorial"
                fill
                quality={90}
                priority
                unoptimized
                className="z-0 object-cover block sm:hidden"
                sizes="100vw"
                style={{ objectPosition: "center center" }}
              />
            )}
            <Image
              src={isPinkTheme ? heroImages.desktop : heroImages.desktop}
              alt="Härnösands HF"
              fill
              quality={90}
              priority
              unoptimized={isPinkTheme}
              className={`z-0 object-cover ${isPinkTheme ? "hidden sm:block" : "block"}`}
              sizes="100vw"
              style={{ objectPosition: "center 30%" }}
              {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.hero.imageUrl" })}
            />

            {/* Gradient overlays */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-neutral-950/40 to-transparent" />

            {/* Hero content - positioned at bottom */}
            <div className={`relative z-20 w-full pb-16 sm:pb-20 lg:pb-24 transition-opacity duration-700 ${showHeroContent ? "opacity-100" : "opacity-0"}`}>
              <div className="container mx-auto px-4 sm:px-6">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-400 mb-4 landing-fade-up">
                    Härnösands Handbollsförening
                  </p>
                  <h1
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[0.95] tracking-tight mb-6 landing-fade-up landing-delay-1"
                    {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.hero.title" })}
                  >
                    {isPinkTheme ? (
                      <>LAGET<br /><span className="text-pink-400">FÖRE ALLT</span></>
                    ) : (
                      <>LAGET<br /><span className="text-emerald-400">FÖRE ALLT</span></>
                    )}
                  </h1>
                  <p
                    className="text-base sm:text-lg text-neutral-300 max-w-xl mb-8 leading-relaxed landing-fade-up landing-delay-2"
                    {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.hero.description" })}
                  >
                    {content.hero.description}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 mb-10 landing-fade-up landing-delay-3">
                    <Link
                      href={content.hero.button1Link}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
                    >
                      <span {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.hero.button1Text" })}>
                        {content.hero.button1Text}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href={content.hero.button2Link}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      <span {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.hero.button2Text" })}>
                        {content.hero.button2Text}
                      </span>
                    </Link>
                  </div>

                  {/* Social links */}
                  <div className="flex items-center gap-3 landing-fade-up landing-delay-4">
                    <Link
                      href="https://www.facebook.com/profile.php?id=61566621756014"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/15 hover:text-white"
                    >
                      <Facebook className="w-4 h-4" />
                    </Link>
                    <Link
                      href="https://www.instagram.com/harnosandshf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/15 hover:text-white"
                    >
                      <Instagram className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 hidden sm:flex flex-col items-center gap-1 text-white/40">
              <ChevronDown className="h-5 w-5 animate-bounce" />
            </div>
          </section>

          {/* SEO H1 */}
          <section className="sr-only" aria-hidden="true">
            <h1>Härnösands HF – Handboll i Härnösand</h1>
          </section>

          {/* ===================== STATS BAR ===================== */}
          <section className="relative z-30 bg-neutral-900">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-neutral-800">
                {[
                  { value: content.stats.totalTeams, label: "Lag totalt", icon: Users },
                  { value: content.stats.aTeams, label: "A-lag", icon: Trophy },
                  { value: content.stats.youthTeams, label: "Ungdomslag", icon: Heart },
                  { value: content.stats.yearsHistory, label: "År av historia", icon: Calendar },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-4 py-6 sm:py-8 px-4 sm:px-6">
                    <stat.icon className="h-5 w-5 text-emerald-400 shrink-0 hidden sm:block" />
                    <div>
                      <p className="text-2xl sm:text-3xl font-black text-white">{stat.value}</p>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===================== MATCH FEED ===================== */}
          <section className="py-16 sm:py-20 bg-neutral-50">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto">
                {/* Section header */}
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-8">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-600 mb-2">Matchcenter</p>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900">
                      Live & kommande
                    </h2>
                    <p className="mt-2 text-sm text-neutral-500 max-w-lg">
                      Direkt från Profixio. Klicka p&aring; en match f&ouml;r detaljer.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/matcher"
                      className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-neutral-700"
                    >
                      Alla matcher
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={TICKET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
                    >
                      Köp biljett
                    </Link>
                    {shopVisible && (
                      <Link
                        href={SHOP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Butik
                      </Link>
                    )}
                  </div>
                </div>

                {/* Match list */}
                {showInitialMatchLoader ? (
                  renderUpcomingSkeletonRows()
                ) : matchError ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-8 text-center text-sm text-amber-800">
                    Matcherna kunde inte läsas in just nu.
                  </div>
                ) : homeMatchFlow.items.length > 0 ? (
                  <ul className="space-y-3">
                    {homeMatchFlow.items.map(renderHomeFlowRow)}
                  </ul>
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-5 py-12 text-center text-sm text-neutral-500">
                    Inga matcher att visa just nu.
                  </div>
                )}

                {homeMatchFlow.items.length > 0 && (
                  <div className="mt-6 text-center">
                    <Link
                      href="/matcher"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition hover:text-neutral-900"
                    >
                      Visa alla matcher
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ===================== ABOUT CLUB ===================== */}
          <section className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Text side */}
                <div className="max-w-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-600 mb-3">Om klubben</p>
                  <h2
                    className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 mb-6"
                    {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.aboutClub.title" })}
                  >
                    {content.aboutClub.title}
                  </h2>
                  <p
                    className="text-neutral-600 leading-relaxed mb-4"
                    {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.aboutClub.paragraph1" })}
                  >
                    {content.aboutClub.paragraph1}
                  </p>
                  <p
                    className="text-neutral-600 leading-relaxed mb-8"
                    {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.aboutClub.paragraph2" })}
                  >
                    {content.aboutClub.paragraph2}
                  </p>

                  {/* Value pillars */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                      { icon: Heart, title: "Passion", desc: content.aboutClub.passionText, field: "passionText" },
                      { icon: TrendingUp, title: "Utveckling", desc: content.aboutClub.developmentText, field: "developmentText" },
                      { icon: Users, title: "Gemenskap", desc: content.aboutClub.communityText, field: "communityText" },
                    ].map((pillar) => (
                      <div key={pillar.title} className="text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                          <pillar.icon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-neutral-900 mb-1">{pillar.title}</h4>
                        <p
                          className="text-xs text-neutral-500 leading-relaxed"
                          {...(isEditorMode && { "data-editable": "true", "data-field-path": `home.aboutClub.${pillar.field}` })}
                        >
                          {pillar.desc}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={content.aboutClub.button1Link}
                      className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700"
                    >
                      <span {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.aboutClub.button1Text" })}>
                        {content.aboutClub.button1Text}
                      </span>
                    </Link>
                    <Link
                      href={content.aboutClub.button2Link}
                      className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
                    >
                      <span {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.aboutClub.button2Text" })}>
                        {content.aboutClub.button2Text}
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Image side */}
                <div className="relative">
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                    <Image
                      src={content.aboutClub.imageSrc || "/placeholder.svg"}
                      alt="Härnösands HF"
                      fill
                      className="object-cover"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.aboutClub.imageSrc" })}
                    />
                  </div>
                  {/* Floating stat badge */}
                  <div className="absolute -bottom-5 -left-5 sm:-bottom-6 sm:-left-6 bg-neutral-900 text-white rounded-2xl p-5 shadow-2xl">
                    <p
                      className="text-3xl sm:text-4xl font-black"
                      {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.aboutClub.statNumber" })}
                    >
                      {content.aboutClub.statNumber}
                    </p>
                    <p
                      className="text-xs font-medium uppercase tracking-wider text-neutral-400"
                      {...(isEditorMode && { "data-editable": "true", "data-field-path": "home.aboutClub.statLabel" })}
                    >
                      {content.aboutClub.statLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===================== INSTAGRAM ===================== */}
          <InstagramFeed />

          {/* ===================== PARTNERS ===================== */}
          <section className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="text-center mb-12">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-600 mb-3">Samarbeten</p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 mb-4">
                  Våra partners
                </h2>
                <p className="text-neutral-500 max-w-xl mx-auto text-sm leading-relaxed">
                  Lokala företag och organisationer som stödjer vår verksamhet och hjälper oss utveckla handbollen i Härnösand.
                </p>
              </div>

              <div className="space-y-10 max-w-5xl mx-auto">
                {tierOrder.map((tierName) => {
                  const partners = partnersByTier[tierName]
                  if (!partners || partners.length === 0) return null
                  const config = tierBadgeConfig[tierName] || { label: tierName, color: "bg-neutral-50 text-neutral-600 border-neutral-200" }
                  const isDiamant = tierName === "Diamantpartner"

                  return (
                    <div key={tierName}>
                      <div className="flex items-center gap-3 mb-5">
                        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                          {isDiamant && <Star className="h-3 w-3 fill-current" />}
                          {config.label}
                        </span>
                        <div className="flex-1 h-px bg-neutral-100" />
                      </div>
                      <div className={`grid gap-4 ${isDiamant ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"}`}>
                        {partners.map((partner) => (
                          <div
                            key={partner.id}
                            className={`group relative flex items-center justify-center rounded-xl border bg-white p-4 transition-all duration-200 hover:shadow-md ${
                              isDiamant ? "border-neutral-200 h-28 sm:h-32" : "border-neutral-100 h-20 sm:h-24"
                            }`}
                          >
                            <div className={`relative w-full ${isDiamant ? "h-16 sm:h-20" : "h-10 sm:h-14"}`}>
                              <Image
                                src={partner.src || "/placeholder.svg"}
                                alt={partner.alt}
                                fill
                                className="object-contain transition-transform duration-200 group-hover:scale-105"
                                loading="lazy"
                                placeholder="blur"
                                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                              />
                            </div>
                            {partner.linkUrl && (
                              <a
                                href={partner.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 z-10"
                                aria-label={`Besök ${partner.alt}`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Partner CTA */}
              <div className="mt-16 rounded-2xl bg-neutral-900 p-8 sm:p-12 text-center max-w-3xl mx-auto">
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">Vill du stödja Härnösands HF?</h3>
                <p className="text-neutral-400 mb-6 max-w-lg mx-auto text-sm leading-relaxed">
                  Vi välkomnar nya partners som vill bidra till utvecklingen av handbollen i regionen.
                </p>
                <Link
                  href="/kontakt"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
                >
                  Kontakta oss
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* ===================== JOIN CTA ===================== */}
          <section className="py-16 sm:py-24 bg-neutral-50">
            <div className="container mx-auto px-4 sm:px-6 text-center">
              <div className="max-w-2xl mx-auto">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-600 mb-3">Bli en del av laget</p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 mb-4">
                  Börja spela handboll
                </h2>
                <p className="text-neutral-500 text-sm sm:text-base leading-relaxed mb-8 max-w-lg mx-auto">
                  Oavsett om du är nybörjare eller erfaren spelare finns det en plats för dig i Härnösands HF.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Link
                    href="/kontakt"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-700"
                  >
                    Börja träna
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/lag"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-6 py-3.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
                  >
                    Se våra lag
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ===================== FAQ ===================== */}
          <section className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-600 mb-3">Vanliga frågor</p>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900">
                    Att börja med handboll
                  </h2>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-b border-neutral-100">
                    <AccordionTrigger className="text-left text-base font-semibold text-neutral-900 hover:no-underline py-5">
                      Hur börjar jag spela handboll?
                    </AccordionTrigger>
                    <AccordionContent className="text-neutral-600 text-sm leading-relaxed pb-5">
                      Kontakta oss så hjälper vi dig hitta rätt lag baserat på ålder och erfarenhet. Du kan fylla i vårt kontaktformulär eller mejla oss direkt.
                      <Link href="/kontakt" className="text-emerald-600 hover:text-emerald-700 font-medium ml-1">
                        Kontakta oss →
                      </Link>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2" className="border-b border-neutral-100">
                    <AccordionTrigger className="text-left text-base font-semibold text-neutral-900 hover:no-underline py-5">
                      Vilken utrustning behöver jag?
                    </AccordionTrigger>
                    <AccordionContent className="text-neutral-600 text-sm leading-relaxed pb-5">
                      Till en början behöver du bara bekväma träningskläder, inomhusskor och en vattenflaska. Handbollar finns att låna under träningarna.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-b border-neutral-100">
                    <AccordionTrigger className="text-left text-base font-semibold text-neutral-900 hover:no-underline py-5">
                      Finns det provträningar?
                    </AccordionTrigger>
                    <AccordionContent className="text-neutral-600 text-sm leading-relaxed pb-5">
                      Ja! Vi erbjuder kostnadsfria provträningar så att du kan känna efter om handboll är något för dig. Du får träffa laget och tränarna innan du bestämmer dig.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4" className="border-b border-neutral-100">
                    <AccordionTrigger className="text-left text-base font-semibold text-neutral-900 hover:no-underline py-5">
                      Hur anmäler jag mig?
                    </AccordionTrigger>
                    <AccordionContent className="text-neutral-600 text-sm leading-relaxed pb-5">
                      Efter dina provträningar får du information om hur du enkelt blir en fullvärdig medlem i Härnösands HF.
                      <Link href="/kontakt" className="text-emerald-600 hover:text-emerald-700 font-medium ml-1">
                        Anmäl dig →
                      </Link>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="text-center mt-8">
                  <Link
                    href="/kontakt"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                  >
                    Har du fler frågor? Kontakta oss
                    <ArrowRight className="h-4 w-4" />
                  </Link>
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
