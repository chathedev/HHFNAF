"use client"

import { useMemo, useState, useEffect } from "react"
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
} from "lucide-react"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { ErrorBoundary } from "@/components/error-boundary"
import { defaultContent } from "@/lib/default-content"
import type { FullContent, Partner } from "@/lib/content-types"
import { deriveSiteVariant, type SiteVariant, getThemeVariant, getHeroImages, type ThemeVariant } from "@/lib/site-variant"
import { canShowTicketForMatch } from "@/lib/matches"
import { extendTeamDisplayName } from "@/lib/team-display"
import { buildMatchScheduleLabel, getMatchupLabel, getSimplifiedMatchStatus, canOpenMatchTimeline } from "@/lib/match-card-utils"
import { useMatchData, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchFeedModal } from "@/components/match-feed-modal"
import { InstagramFeed } from "@/components/instagram-feed"
import type { EnhancedMatchData } from "@/lib/use-match-data"

const TICKET_URL = "https://clubs.clubmate.se/harnosandshf/overview/"


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
  const limitedParams = useMemo(() => ({ limit: 10 }), [])
  const {
    matches: upcomingMatches,
    loading: matchLoading,
    error: matchErrorMessage,
    refresh,
    isRefreshing: isRefreshingMatches,
  } = useMatchData({
    refreshIntervalMs: 1_000,
    dataType: "liveUpcoming",
    params: limitedParams,
    initialData,
  })
  const liveParams = useMemo(() => ({ limit: 3 }), [])
  const {
    matches: liveMatches,
    loading: liveLoading,
  } = useMatchData({
    refreshIntervalMs: 1_000,
    dataType: "live",
    params: liveParams,
  })
  const matchError = Boolean(matchErrorMessage)

  const selectedMatch = useMemo(() => {
    if (!selectedMatchId) {
      return null
    }
    return upcomingMatches.find((match) => match.id === selectedMatchId) ?? null
  }, [selectedMatchId, upcomingMatches])

  useEffect(() => {
    if (!selectedMatchId || matchLoading) {
      return
    }
    if (!selectedMatch) {
      setSelectedMatchId(null)
    }
  }, [selectedMatchId, selectedMatch, matchLoading])

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

  const matchesTodayForward = useMemo(() => {
    const now = Date.now()
    const liveLookbackMs = 1000 * 60 * 60 * 6

    // Home page: Show only live (within window) and upcoming matches
    const statusOrder: Record<string, number> = { live: 0, upcoming: 1 }

    const matchesInWindow = upcomingMatches.filter((match) => {
      const status = match.matchStatus === "halftime" ? "live" : (match.matchStatus ?? "upcoming")

      if (status === "live") {
        const kickoff = match.date.getTime()
        return kickoff >= now - liveLookbackMs
      }

      return status === "upcoming"
    })

    matchesInWindow.sort((a, b) => {
      const statusA = getMatchStatus(a)
      const statusB = getMatchStatus(b)
      const statusDiff = (statusOrder[statusA] ?? 3) - (statusOrder[statusB] ?? 3)
      if (statusDiff !== 0) {
        return statusDiff
      }
      return a.date.getTime() - b.date.getTime()
    })

    return matchesInWindow
  }, [upcomingMatches])

  const renderHomeMatchCard = (match: NormalizedMatch) => {
    const status = getMatchStatus(match)
    const canOpenTimeline = canOpenMatchTimeline(match)
    const scheduleLabel = buildMatchScheduleLabel(match)
    const matchupLabel = getMatchupLabel(match)
    const teamTypeRaw = match.teamType?.trim() || ""
    const teamTypeLabel = extendTeamDisplayName(teamTypeRaw) || teamTypeRaw || "Härnösands HF"
    const scoreValue =
      status !== "upcoming" && match.result && match.result.trim().length > 0
        ? match.result.trim()
        : null

    const statusBadge = (() => {
      if (status === "live") {
        return { label: "LIVE", tone: "bg-rose-50 text-rose-600" }
      }
      if (status === "finished") {
        return { label: "SLUT", tone: "bg-gray-100 text-gray-600" }
      }
      return { label: "KOMMANDE", tone: "bg-blue-50 text-blue-600" }
    })()

    return (
      <li key={match.id}>
        <article
          id={`match-card-${match.id}`}
          className={`group relative flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 transition-all ${canOpenTimeline ? "cursor-pointer hover:border-emerald-300 hover:shadow-lg" : ""
            }`}
          onClick={() => canOpenTimeline && setSelectedMatchId(match.id)}
          role={canOpenTimeline ? "button" : undefined}
          tabIndex={canOpenTimeline ? 0 : undefined}
          onKeyDown={(event) => {
            if (canOpenTimeline && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault()
              setSelectedMatchId(match.id)
            }
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.5em] text-gray-400">
                {teamTypeLabel}
              </p>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                {matchupLabel}
              </h3>
              {scheduleLabel && <p className="text-sm text-gray-500">{scheduleLabel}</p>}
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.35em] ${statusBadge.tone}`}>
              {statusBadge.label}
            </span>
          </div>

          {scoreValue && (
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-gray-900" data-score-value="true">
                {scoreValue}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                {status === "live" ? "Pågår" : "Resultat"}
              </span>
            </div>
          )}

          {match.series && (
            <p className="text-xs text-slate-400">{match.series}</p>
          )}
        </article>
      </li>
    )
  }

  const matchesToDisplay = matchesTodayForward.slice(0, 10)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const resolved = deriveSiteVariant(window.location.host)
    setSiteVariant(resolved)

    const resolvedTheme = getThemeVariant(window.location.host)
    setThemeVariant(resolvedTheme)
  }, [])

  function shouldShowTicketButton(match: NormalizedMatch): boolean {
    if (getMatchStatus(match) === "finished") {
      return false;
    }
    return canShowTicketForMatch(match);
  }

  // Helper for result card display logic
  const showResultCard = (status: string, hasResult: boolean) => status === "live" || status === "finished" || hasResult;
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

          {/* Stats Section */}
          <section className={`text-white py-12 ${isPinkTheme ? "bg-gradient-to-r from-pink-500/90 to-rose-600/90" : "bg-green-600/90"}`}>
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div className="flex flex-col items-center">
                  <Users className="w-12 h-12 mb-2" />
                  <div
                    className="text-4xl font-bold"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": "home.stats.totalTeams",
                    })}
                  >
                    {content.stats.totalTeams}
                  </div>
                  <div className="text-sm">Totalt Lag</div>
                </div>

                <div className="flex flex-col items-center">
                  <Trophy className="w-12 h-12 mb-2" />
                  <div
                    className="text-4xl font-bold"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": "home.stats.aTeams",
                    })}
                  >
                    {content.stats.aTeams}
                  </div>
                  <div className="text-sm">A-lag</div>
                </div>

                <div className="flex flex-col items-center">
                  <Award className="w-12 h-12 mb-2" />
                  <div
                    className="text-4xl font-bold"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": "home.stats.youthTeams",
                    })}
                  >
                    {content.stats.youthTeams}
                  </div>
                  <div className="text-sm">Ungdomslag</div>
                </div>

                <div className="flex flex-col items-center">
                  <History className="w-12 h-12 mb-2" />
                  <div
                    className="text-4xl font-bold"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": "home.stats.yearsHistory",
                    })}
                  >
                    {content.stats.yearsHistory}
                  </div>
                  <div className="text-sm">År av Historia</div>
                </div>
              </div>
            </div>
          </section>
          {(matchLoading || matchesToDisplay.length > 0 || matchError) && (
            <section className="py-10 bg-white">
              <div className="container mx-auto px-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-600">Matcher</p>
                    <h3 className="text-3xl font-black text-gray-900 sm:text-4xl">Live & Kommande</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Här visas matcher som är live eller på väg att starta – listan uppdateras automatiskt.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">
                      {!matchLoading && !matchError ? "Uppdateras varje sekund" : "Uppdateras snart..."}
                    </span>
                    <Link
                      href="/matcher"
                      className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-600 hover:text-emerald-800"
                    >
                      Se alla matcher →
                    </Link>
                  </div>
                </div>

                <div className="mt-8">
                  {matchLoading && (
                    <div className="space-y-3">
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="h-24 rounded-2xl border border-gray-100 bg-gray-50 animate-pulse" />
                      ))}
                    </div>
                  )}

                  {!matchLoading && matchError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {matchErrorMessage}
                    </div>
                  )}

                  {!matchLoading && !matchError && matchesToDisplay.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                      Inga matcher att visa just nu.
                    </div>
                  )}

                  {!matchLoading && !matchError && matchesToDisplay.length > 0 && (
                    <ul className="mt-3 space-y-3">{matchesToDisplay.map(renderHomeMatchCard)}</ul>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Cards Section */}
          <section className="py-12 bg-white">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Upplev <span className={isPinkTheme ? "text-pink-400" : "text-orange-500"}>Handboll</span> Live
                </h2>
                <p className="text-gray-600 max-w-xl mx-auto">
                  Följ våra matcher och stötta laget. Varje match är en upplevelse värd att dela.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {/* Se Matcher Card */}
                <div className={`group bg-white rounded-lg border border-gray-200 ${isPinkTheme ? "hover:border-pink-300" : "hover:border-green-300"} transition-all duration-200 overflow-hidden`}>
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className={`w-10 h-10 ${isPinkTheme ? "bg-pink-100" : "bg-green-100"} rounded-lg flex items-center justify-center mr-3`}>
                        <Trophy className={`w-5 h-5 ${isPinkTheme ? "text-pink-600" : "text-green-600"}`} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">Se Matcher</h3>
                    </div>

                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                      Följ våra kommande matcher och upplev spänningen live. Stötta laget och var en del av vår
                      handbollsfamilj.
                    </p>

                    <Link
                      href="/matcher"
                      className={`inline-flex items-center ${isPinkTheme ? "text-pink-600 hover:text-pink-700" : "text-green-600 hover:text-green-700"} font-medium text-sm group-hover:translate-x-1 transition-transform`}
                    >
                      Se Alla Matcher
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {/* Köp Biljetter Card */}
                <div className="group bg-white rounded-lg border border-gray-200 hover:border-orange-300 transition-all duration-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className={`w-10 h-10 ${isPinkTheme ? "bg-emerald-100" : "bg-orange-100"} rounded-lg flex items-center justify-center mr-3`}>
                        <Star className={`w-5 h-5 ${isPinkTheme ? "text-emerald-600" : "text-orange-600"}`} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">Köp Biljetter</h3>
                    </div>

                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                      Säkra din plats på läktaren och upplev handboll på nära håll. Varje biljett stödjer vårt lag och
                      vår utveckling.
                    </p>

                    <Link
                      href="https://clubs.clubmate.se/harnosandshf/overview/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center ${isPinkTheme ? "text-emerald-600 hover:text-emerald-700" : "text-orange-600 hover:text-orange-700"} font-medium text-sm group-hover:translate-x-1 transition-transform`}
                    >
                      Köp Biljetter Nu
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
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
        <Footer />

        {/* Match Feed Modal */}
        {selectedMatch && (() => {
          // Use the actual display names from the match card
          const displayOpponentName = selectedMatch.opponent.replace(/\s*\((hemma|borta)\)\s*$/i, '').trim()
          const displayHomeTeam = selectedMatch.isHome !== false ? "Härnösands HF" : displayOpponentName
          const displayAwayTeam = selectedMatch.isHome !== false ? displayOpponentName : "Härnösands HF"

          return (
            <MatchFeedModal
              isOpen={true}
              onClose={() => setSelectedMatchId(null)}
              matchFeed={selectedMatch.matchFeed || []}
              homeTeam={displayHomeTeam}
              awayTeam={displayAwayTeam}
              finalScore={selectedMatch.result}
              matchStatus={selectedMatch.matchStatus}
              matchId={selectedMatch.id}
              matchData={selectedMatch}
              onRefresh={async () => {
                console.log("🔄 Home page: Starting refresh...")
                await refresh()
              }}
            />
          )
        })()}
      </div>
    </ErrorBoundary>
  )
}
