"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
import { useMemo, useState } from "react"

import lagContent from "@/public/content/lag.json"
import Footer from "@/components/footer"
import { Card } from "@/components/ui/card"
import { canShowTicketForMatch, normalizeMatchKey } from "@/lib/matches"
import { useMatchData, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchFeedModal } from "@/components/match-feed-modal"

const PLACEHOLDER_HERO = "/placeholder.jpg"
const TICKET_URL = "https://clubs.clubmate.se/harnosandshf/overview/"

const encodeAssetPath = (path: string) => {
  if (!path) {
    return PLACEHOLDER_HERO
  }
  const segments = path.split("/").map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
  return segments.join("/")
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

const MATCH_STATUS_PRIORITY: Record<NonNullable<NormalizedMatch["matchStatus"]>, number> = {
  live: 0,
  upcoming: 1,
  finished: 2,
}

const getStatusPriority = (status: NormalizedMatch["matchStatus"]) =>
  status ? MATCH_STATUS_PRIORITY[status] : 3

const getDerivedStatus = (match: NormalizedMatch): NormalizedMatch["matchStatus"] => {
  if (match.matchStatus) {
    return match.matchStatus
  }
  const now = Date.now()
  const kickoff = match.date.getTime()
  const liveWindowEnd = kickoff + 1000 * 60 * 60 * 2.5
  if (now >= kickoff && now <= liveWindowEnd) {
    return "live"
  }
  if (now < kickoff) {
    return "upcoming"
  }
  return match.result ? "finished" : "finished"
}

const extractOpponentName = (opponent: string) => opponent.replace(/\s*\((hemma|borta)\)\s*$/i, "").trim()

const buildScheduleLine = (match: NormalizedMatch) =>
  [match.displayDate, match.time, match.venue].filter((item): item is string => Boolean(item)).join(" • ")

const shouldShowTicketButton = (match: NormalizedMatch, status: NormalizedMatch["matchStatus"]) =>
  status !== "finished" && canShowTicketForMatch(match)

// Correct teams array, no duplicates or syntax errors
const teams = [
  { id: "dam-utv", name: "Dam/utv", displayName: "Dam/utv" },
  { id: "a-lag-herrar", name: "A-lag Herrar", displayName: "A-lag Herrar" },
  { id: "fritids-teknikskola", name: "Fritids-Teknikskola", displayName: "Fritids-Teknikskola" },
  { id: "f19-senior", name: "F19-Senior", displayName: "F19-Senior" },
  { id: "f16-2009", name: "F16 (2009)", displayName: "F16 (2009)" },
  { id: "f15-2010", name: "F15 (2010)", displayName: "F15 (2010)" },
  { id: "f14-2011", name: "F14 (2011)", displayName: "F14 (2011)" },
  { id: "f13-2012", name: "F13 (2012)", displayName: "F13 (2012)" },
  { id: "f12-2013", name: "F12 (2013)", displayName: "F12 (2013)" },
  { id: "f11-2014", name: "F11 (2014)", displayName: "F11 (2014)" },
  { id: "f10-2015", name: "F10 (2015)", displayName: "F10 (2015)" },
  { id: "f9-2016", name: "F9 (2016)", displayName: "F9 (2016)" },
  { id: "f8-2017", name: "F8 (2017)", displayName: "F8 (2017)" },
  { id: "f7-2018", name: "F7 (2018)", displayName: "F7 (2018)" },
  { id: "f6-2019", name: "F6 (2019)", displayName: "F6 (2019)" },
  { id: "p16-2009-2010", name: "P16 (2009/2010)", displayName: "P16 (2009/2010)" },
  { id: "p14-2011", name: "P14 (2011)", displayName: "P14 (2011)" },
  { id: "p13-2012", name: "P13 (2012)", displayName: "P13 (2012)" },
  { id: "p12-2013-2014", name: "P12 (2013/2014)", displayName: "P12 (2013/2014)" },
  { id: "p10-2015", name: "P10 (2015)", displayName: "P10 (2015)" },
  { id: "p9-2016", name: "P9 (2016)", displayName: "P9 (2016)" },
  { id: "p8-2017", name: "P8 (2017)", displayName: "P8 (2017)" },
  { id: "p7-2018", name: "P7 (2018)", displayName: "P7 (2018)" },
];

type TeamPageProps = {
  params: { teamId: string }
}

export default function TeamPage({ params }: TeamPageProps) {
  const team = teams.find((item) => item.id === params.teamId)
  if (!team) {
    notFound()
  }

  const [selectedMatch, setSelectedMatch] = useState<NormalizedMatch | null>(null)
  const { matches: allMatches, loading, error, refresh } = useMatchData({
    dataType: "current",
    refreshIntervalMs: 3_000,
  })

  const teamMatchKeys = useMemo(() => {s
    const keys = new Set<string>(); => {
    // Only use new names for filtering
    keys.add(team.name); names for filtering
    keys.add(team.displayName);eam.name);
    keys.add(team.id);s.add(team.displayName);
    return keys;
  }, [team.name, team.displayName, team.id])
.displayName, team.id])
  const teamMatches = useMemo(() => {
    const now = Date.now()t teamMatches = useMemo(() => {
    const recentFinishedThreshold = 1000 * 60 * 60 * 24 Date.now()
0 * 60 * 24
    const filtered = allMatches.filter((match) => teamMatchKeys.has(match.normalizedTeam))
    const relevant = filtered.filter((match) => {r((match) => teamMatchKeys.has(match.normalizedTeam))
      const status = getDerivedStatus(match)red.filter((match) => {
      if (status !== "finished") {
        return true      if (status !== "finished") {
      }
      return now - match.date.getTime() <= recentFinishedThreshold
    })ecentFinishedThreshold

    return relevant
      .slice()urn relevant
      .sort((a, b) => {
        const statusA = getDerivedStatus(a).sort((a, b) => {
        const statusB = getDerivedStatus(b)        const statusA = getDerivedStatus(a)
        const statusDiff = getStatusPriority(statusA) - getStatusPriority(statusB)sB = getDerivedStatus(b)
        if (statusDiff !== 0) {statusDiff = getStatusPriority(statusA) - getStatusPriority(statusB)
          return statusDiff!== 0) {
        }
        if (statusA === "finished" && statusB === "finished") {
          return b.date.getTime() - a.date.getTime()
        }() - a.date.getTime()
        return a.date.getTime() - b.date.getTime()
      })eturn a.date.getTime() - b.date.getTime()
      .slice(0, 2)
  }, [allMatches, teamMatchKeys])
Matches, teamMatchKeys])
  const descriptionFallback =
    "Härnösands HF samlar spelare, ledare och supportrar i ett starkt lagbygge. Följ laget via våra kanaler och uppdateringar nedan."descriptionFallback =
 samlar spelare, ledare och supportrar i ett starkt lagbygge. Följ laget via våra kanaler och uppdateringar nedan."
  const showLoadingState = loading && teamMatches.length === 0
  const showErrorState = !loading && Boolean(error) && teamMatches.length === 0  const showLoadingState = loading && teamMatches.length === 0
  const showEmptyState = !loading && !error && teamMatches.length === 0ding && Boolean(error) && teamMatches.length === 0

  return (
    <>
      <main className="flex-1 bg-white">

        <section className="relative overflow-hidden rounded-b-[3rem] bg-gradient-to-br from-emerald-600 via-emerald-500 to-orange-400">
          <div className="pointer-events-none absolute -left-36 top-8 h-72 w-72 rounded-full bg-white/15 blur-3xl" />ection className="relative overflow-hidden rounded-b-[3rem] bg-gradient-to-br from-emerald-600 via-emerald-500 to-orange-400">
          <div className="pointer-events-none absolute -right-44 bottom-[-140px] h-80 w-80 rounded-full bg-emerald-900/30 blur-3xl" />    <div className="pointer-events-none absolute -left-36 top-8 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center text-white md:px-6 md:py-24">-none absolute -right-44 bottom-[-140px] h-80 w-80 rounded-full bg-emerald-900/30 blur-3xl" />
            <Link          <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center text-white md:px-6 md:py-24">
              href="/lag"
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-600 shadow transition hover:bg-emerald-50"
            >cking-[0.35em] text-emerald-600 shadow transition hover:bg-emerald-50"
              Tillbaka till alla lag
            </Link>lbaka till alla lag
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/80">{team.category}</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">{team.displayName}</h1>
            <p className="mt-5 max-w-2xl text-sm text-white/85 md:text-base">h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">{team.displayName}</h1>
              {team.description && team.description.trim().length > 0-2xl text-sm text-white/85 md:text-base">
                ? team.description.description && team.description.trim().length > 0
                : descriptionFallback}
            </p>
          </div>
        </section>

        <div className="px-4 pb-16 pt-12 md:px-6">
          <div className="mx-auto max-w-4xl space-y-8">ssName="px-4 pb-16 pt-12 md:px-6">
            <div className="grid gap-4 sm:grid-cols-3">lassName="mx-auto max-w-4xl space-y-8">
              <Card className="rounded-xl border border-emerald-100/80 bg-white p-5 text-center shadow-sm">lassName="grid gap-4 sm:grid-cols-3">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Laget.se</p>              <Card className="rounded-xl border border-emerald-100/80 bg-white p-5 text-center shadow-sm">
                {team.link ? (d uppercase tracking-[0.3em] text-emerald-700">Laget.se</p>
                  <Link
                    href={team.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"ner noreferrer"
                  >ssName="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                    Öppna laget.se
                  </Link>
                ) : (
                  <p className="mt-3 text-xs text-gray-500">Länk läggs till snart.</p>
                )}p className="mt-3 text-xs text-gray-500">Länk läggs till snart.</p>
              </Card>

              <Card className="rounded-xl border border-emerald-100/70 bg-white p-5 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Instagram</p>xt-center shadow-sm">
                {team.instagramLink ? ( className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Instagram</p>
                  <Link.instagramLink ? (
                    href={team.instagramLink}                  <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"errer"
                  >ssName="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                    Följ laget
                  </Link>
                ) : (
                  <p className="mt-3 text-xs text-gray-500">Instagram uppdateras snart.</p>
                )}p className="mt-3 text-xs text-gray-500">Instagram uppdateras snart.</p>
              </Card>

              <Card className="rounded-xl border border-orange-200/80 bg-white p-5 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-600">Kontakt</p>ter shadow-sm">
                <Link className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-600">Kontakt</p>
                  href="/kontakt"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500"                  href="/kontakt"
                >er-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500"
                  Kontakta föreningen
                </Link>takta föreningen
              </Card>
            </div>
>
            {/* Minimalistic matcher button */}
            {/* Removed matcher button as requested */}istic matcher button */}
            ed matcher button as requested */}
            <section aria-label="Lagets matcher" className="mt-10 space-y-6">
              <div className="text-center">            <section aria-label="Lagets matcher" className="mt-10 space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">Lagets matcher</p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900">{team.displayName}</h2>ercase tracking-[0.3em] text-emerald-700">Lagets matcher</p>
              </div>    <h2 className="mt-2 text-2xl font-bold text-gray-900">{team.displayName}</h2>

              {teamMatches.map((match) => {
                const status = getDerivedStatus(match)
                const opponentName = extractOpponentName(match.opponent)
                const isHome = match.isHome !== falset opponentName = extractOpponentName(match.opponent)
                const homeAwayLabel = isHome ? "hemma" : "borta"                const isHome = match.isHome !== false
                const scheduleLine = buildScheduleLine(match)e ? "hemma" : "borta"
                const trimmedResult = match.result?.trim()(match)
                const hasResult =
                  Boolean(trimmedResult) && trimmedResult.toLowerCase() !== "inte publicerat"
                const playLabel = status === "finished" ? "Se repris" : "Se live"rCase() !== "inte publicerat"
                const canOpenTimeline = status === "live" || status === "finished" repris" : "Se live"
                const showTicket = shouldShowTicketButton(match, status)|| status === "finished"
= shouldShowTicketButton(match, status)
                return (
                  <Card
                    key={match.id}
                    className={`group relative rounded-2xl border border-emerald-100/80 bg-white p-6 text-left shadow-sm transition ${
                      canOpenTimeline ? "cursor-pointer hover:border-emerald-400 hover:shadow-lg" : ""                    className={`group relative rounded-2xl border border-emerald-100/80 bg-white p-6 text-left shadow-sm transition ${
                    }`}nOpenTimeline ? "cursor-pointer hover:border-emerald-400 hover:shadow-lg" : ""
                    onClick={() => {
                      if (canOpenTimeline) { {
                        setSelectedMatch(match)
                      }
                    }}
                    role={canOpenTimeline ? "button" : undefined}
                    tabIndex={canOpenTimeline ? 0 : undefined}"button" : undefined}
                    onKeyDown={(event) => { 0 : undefined}
                      if (!canOpenTimeline) {eyDown={(event) => {
                        returnif (!canOpenTimeline) {
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()ter" || event.key === " ") {
                        setSelectedMatch(match))
                      }ectedMatch(match)
                    }}
                  >
                    {canOpenTimeline && (
                      <div className="absolute top-4 right-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <span className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">div className="absolute top-4 right-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">  <span className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />       <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          </svg>inecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          Se matchhändelser
                        </span>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">ame="flex items-start justify-between gap-4">
                        <div className="mb-2 flex items-center gap-3">lassName="flex-1">
                          <span className="text-sm font-semibold text-emerald-700">{match.teamType}</span>  <div className="mb-2 flex items-center gap-3">
                          {status === "live" && (                          <span className="text-sm font-semibold text-emerald-700">{match.teamType}</span>
                            <span className="inline-flex items-center gap-1.5 rounded bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />nline-flex items-center gap-1.5 rounded bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                              LIVEse rounded-full bg-red-600" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {isHome ? (ame="text-xl font-bold text-gray-900">
                            <> (
                              Härnösands HF <span className="text-gray-400">vs</span> {opponentName} ({homeAwayLabel})<>
                            </>Härnösands HF <span className="text-gray-400">vs</span> {opponentName} ({homeAwayLabel})
                          ) : (
                            <>
                              {opponentName} <span className="text-gray-400">vs</span> Härnösands HF ({homeAwayLabel})
                            </>
                          )}
                        </h3>
                        {scheduleLine && <p className="mt-1 text-sm text-gray-600">{scheduleLine}</p>}
                        {match.series && <p className="mt-1 text-xs text-gray-500">{match.series}</p>}
                      </div>series && <p className="mt-1 text-xs text-gray-500">{match.series}</p>}
                      {match.infoUrl && (
                        <LinkinfoUrl && (
                          href={match.infoUrl}
                          target="_blank"
                          rel="noopener noreferrer"rget="_blank"
                          className="text-emerald-600 transition hover:text-emerald-700"oreferrer"
                          onClick={(event) => event.stopPropagation()}ssName="text-emerald-600 transition hover:text-emerald-700"
                          title="Matchsida"event.stopPropagation()}
                        >a"
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />wBox="0 0 24 24">
                          </svg>="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </Link>
                      )}/Link>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-4">ame="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
                        {hasResult && (iv className="flex items-center gap-4">
                          <span className="text-2xl font-bold text-gray-900" data-score-value="true">asResult && (
                            {match.result}                          <span className="text-2xl font-bold text-gray-900" data-score-value="true">
                          </span>
                        )}

                        {match.playUrl && (
                          <a(
                            href={match.playUrl}
                            target="_blank"  href={match.playUrl}
                            rel="noopener noreferrer"                            target="_blank"
                            onClick={(event) => event.stopPropagation()}oreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"onClick={(event) => event.stopPropagation()}
                            title={status === "finished" ? "Se repris" : "Se matchen live"}ex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                          >== "finished" ? "Se repris" : "Se matchen live"}
                            <img src="/handbollplay_mini.png" alt="" className="h-4 w-4 brightness-0 invert" />
                            {playLabel}ssName="h-4 w-4 brightness-0 invert" />
                          </a>
                        )}
                      </div>

                      {showTicket && (
                        <aket && (
                          href={TICKET_URL}
                          target="_blank"ef={TICKET_URL}
                          rel="noopener noreferrer"                          target="_blank"
                          onClick={(event) => event.stopPropagation()}r noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"onClick={(event) => event.stopPropagation()}
                        >-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          </svg>="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          Köp biljett
                        </a> Köp biljett
                      )}
                    </div>
                  </Card>
                )
              })}

              {showLoadingState && (
                <Card className="rounded-xl border border-emerald-100/70 bg-white p-6 text-center text-sm text-gray-600 shadow-sm">gState && (
                  Hämtar matcher…Card className="rounded-xl border border-emerald-100/70 bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
                </Card> Hämtar matcher…
              )}                </Card>

              {showErrorState && (
                <Card className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 shadow-sm">(
                  {error ?? "Kunde inte hämta matcher just nu. Försök igen senare."}lassName="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 shadow-sm">
                </Card>  {error ?? "Kunde inte hämta matcher just nu. Försök igen senare."}
              )}               

              {showEmptyState && (
                <Card className="rounded-xl border border-emerald-100/70 bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
                  Detta lag använder inte Profixio ännu.
                </Card>
              )}
            </section>

            {/* Team photo restored below */}
            <Card className="overflow-hidden rounded-2xl border border-emerald-100/70 bg-white shadow-lg shadow-emerald-50 mt-8">
              <div
                className="h-[420px] w-full rounded-2xl bg-gray-200 md:h-[520px]"
                style={{
                  backgroundImage: `url(${team.heroImage})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
                role="img"
                aria-label={team.heroImageAlt}
              />
            </Card>
          </div>
        </div>
      </main>
      {selectedMatch && (
        <MatchFeedModal
          isOpen={true}
          onClose={() => setSelectedMatch(null)}
          matchFeed={selectedMatch.matchFeed ?? []}
          homeTeam={selectedMatch.isHome !== false ? "Härnösands HF" : extractOpponentName(selectedMatch.opponent)}
          awayTeam={selectedMatch.isHome !== false ? extractOpponentName(selectedMatch.opponent) : "Härnösands HF"}
          finalScore={selectedMatch.result}
          matchStatus={getDerivedStatus(selectedMatch)}
          matchId={selectedMatch.id}
          onRefresh={async () => {
            try {
              await refresh()
            } catch {
              // ignore refresh polling errors
            }
          }}
        />
      )}
      <Footer />
    </>
  )
}
