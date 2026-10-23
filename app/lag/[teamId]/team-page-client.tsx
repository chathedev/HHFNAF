"use client"

import { withSealed } from "@/components/sealed"
import Link from "@/components/quiet-link"
import Image from "@/components/quiet-image"
import { useEffect, useMemo, useState } from "react"

import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { Card } from "@/components/ui/card"
import { normalizeMatchKey } from "@/lib/matches"
import { useMatchData, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchFeedModal } from "@/components/match-feed-modal"
import { useRestoreOpenMatch } from "@/components/build-refresh"
import {
  birthYearsInLabel,
  createTeamMatchKeySet,
  extendTeamDisplayName,
  matchLabelFitsTeam,
  teamClassKey,
  type ClubTeamMetadata,
} from "@/lib/team-display"
import { compareMatchesByDateAscStable, compareMatchesByDateDescStable } from "@/lib/match-sort"
import { canOpenMatchTimeline, getMatchProviderBadge, getProviderHelperText, getMatchWatchLabel } from "@/lib/match-card-utils"

const PLACEHOLDER_HERO = "/placeholder.jpg"

const MATCH_STATUS_PRIORITY: Record<NonNullable<NormalizedMatch["matchStatus"]>, number> = {
  live: 0,
  halftime: 0, // Halftime is treated same as live
  upcoming: 1,
  finished: 2,
}

const getStatusPriority = (status: NormalizedMatch["matchStatus"]) =>
  status ? MATCH_STATUS_PRIORITY[status] : 3

const getDerivedStatus = (match: NormalizedMatch): NormalizedMatch["matchStatus"] => {
  // TRUST BACKEND COMPLETELY - it knows the real match status
  return match.matchStatus === "halftime" ? "live" : (match.matchStatus ?? "upcoming")
}

const extractOpponentName = (opponent: string) => opponent.replace(/\s*\((hemma|borta)\)\s*$/i, "").trim()

const buildScheduleLine = (match: NormalizedMatch) =>
  [match.displayDate, match.time, match.venue].filter((item): item is string => Boolean(item)).join(" • ")

export default function TeamPageClient({
  team,
  scoutLinks = [],
}: {
  team: ClubTeamMetadata
  scoutLinks?: { slug: string; label: string }[]
}) {
  const teamDisplayName = team.displayName

  const [selectedMatch, setSelectedMatch] = useState<NormalizedMatch | null>(null);
  const { matches: currentMatches, loading: currentLoading, error: currentError, refresh } = useMatchData({
    dataType: "liveUpcoming",
  });
  const { matches: finishedMatches, loading: finishedLoading, error: finishedError } = useMatchData({
    dataType: "old",
  });

  const yearlessAllowed = team.matchesYearlessClass !== false;
  const teamMatchKeys = useMemo(
    () => createTeamMatchKeySet(yearlessAllowed ? team.name : null, team.displayName, team.id, teamDisplayName),
    [yearlessAllowed, team.name, team.displayName, team.id, teamDisplayName],
  );

  // Youth teams match on birth years: laget.se's "F15 (2011)" plays in the competition
  // class "F16 (2010/2011)". Labels without years ("F19", "A-lag Herrar") match on class.
  const teamClass = useMemo(() => teamClassKey(team.name), [team.name]);
  const usesBirthYears = Boolean(team.birthYears?.length);

  const allMatches = useMemo(() => {
    const seenIds = new Set<string>()

    return [...currentMatches, ...finishedMatches].filter((match) => {
      if (seenIds.has(match.id)) {
        return false
      }
      seenIds.add(match.id)
      return true
    })
  }, [currentMatches, finishedMatches])

  const teamMatches = useMemo(() => {
    const filtered = allMatches.filter((match) => {
      if (teamMatchKeys.has(match.normalizedTeam)) {
        return true
      }
      if (match.teamType) {
        const fallbackKey = normalizeMatchKey(match.teamType)
        if (fallbackKey && teamMatchKeys.has(fallbackKey)) {
          return true
        }
        if (usesBirthYears && birthYearsInLabel(match.teamType).length > 0) {
          return matchLabelFitsTeam(match.teamType, team)
        }
        if (yearlessAllowed && teamClass && teamClassKey(match.teamType) === teamClass) {
          return true
        }
      }
      return false
    })

    return filtered
      .slice()
      .sort((a, b) => {
        const statusA = getDerivedStatus(a)
        const statusB = getDerivedStatus(b)
        const statusDiff = getStatusPriority(statusA) - getStatusPriority(statusB)
        if (statusDiff !== 0) {
          return statusDiff
        }
        if (statusA === "finished" && statusB === "finished") {
          return compareMatchesByDateDescStable(a, b)
        }
        return compareMatchesByDateAscStable(a, b)
      })
      .slice(0, 2)
  }, [allMatches, teamMatchKeys, teamClass, usesBirthYears, yearlessAllowed, team])
  useRestoreOpenMatch(teamMatches, setSelectedMatch)
  const descriptionFallback =
    "Härnösands HF samlar spelare, ledare och supportrar i ett starkt lagbygge. Följ laget via våra kanaler och uppdateringar nedan."
  const loading = currentLoading || finishedLoading
  const error = currentError ?? finishedError
  const showLoadingState = loading && teamMatches.length === 0
  const showErrorState = !loading && Boolean(error) && teamMatches.length === 0
  const showEmptyState = !loading && !error && teamMatches.length === 0

  return (
    <>
      <Header />
      <main className="flex-1 bg-white">
        {/* The hero runs up under the fixed header, so no white strip shows above it. */}
        <section className="relative overflow-hidden rounded-b-[3rem] bg-gradient-to-br from-emerald-600 via-emerald-500 to-orange-400">
          <div className="pointer-events-none absolute -left-36 top-8 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-44 bottom-[-140px] h-80 w-80 rounded-full bg-emerald-900/30 blur-3xl" />
          <div className="pointer-events-none absolute -left-36 top-8 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pb-20 pt-40 text-center text-white md:px-6 md:pb-24 md:pt-44">
            <Link
              href="/lag"
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-600 shadow transition hover:bg-emerald-50"
            >
              Tillbaka till alla lag
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/80">{team.category}</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">{teamDisplayName}</h1>
            <p className="mt-5 max-w-2xl text-sm text-white/85 md:text-base">
              {team.description && team.description.trim().length > 0 ? team.description : descriptionFallback}
            </p>
          </div>
        </section>

        {/* Team Hero Image Section */}
        {team.heroImage && team.heroImage !== PLACEHOLDER_HERO && (
          <section className="px-4 py-12 md:px-6">
            <div className="mx-auto max-w-4xl">
              <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
                <Image
                  src={team.heroImage}
                  alt={team.heroImageAlt ?? teamDisplayName}
                  width={1200}
                  height={800}
                  className="w-full h-auto object-contain bg-gray-50"
                  priority
                />
              </div>
            </div>
          </section>
        )}

        <div className="px-4 pb-16 pt-12 md:px-6">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="rounded-xl border border-emerald-100/80 bg-white p-5 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Laget.se</p>
                {team.link ? (
                  <Link
                    href={team.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    Öppna laget.se
                  </Link>
                ) : (
                  <p className="mt-3 text-xs text-gray-500">Länk läggs till snart.</p>
                )}
              </Card>

              <Card className="rounded-xl border border-emerald-100/70 bg-white p-5 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Instagram</p>
                {team.instagramLink ? (
                  <Link
                    href={team.instagramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    Följ laget
                  </Link>
                ) : (
                  <p className="mt-3 text-xs text-gray-500">Instagram uppdateras snart.</p>
                )}
              </Card>

              <Card className="rounded-xl border border-orange-200/80 bg-white p-5 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-600">Kontakt</p>
                <Link
                  href="/kontakt"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500"
                >
                  Kontakta föreningen
                </Link>
              </Card>
            </div>

            {(team.trainingPattern?.length || team.leaders?.length) ? (
              <div className="grid gap-4 md:grid-cols-2">
                {team.trainingPattern && team.trainingPattern.length > 0 && (
                  <Card className="rounded-xl border border-emerald-100/80 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Träningstider</p>
                    <ul className="mt-3 space-y-2">
                      {team.trainingPattern.map((slot) => (
                        <li
                          key={`${slot.weekday}-${slot.time}-${slot.location ?? ""}`}
                          className="flex items-baseline justify-between gap-3 text-sm"
                        >
                          <span className="font-semibold capitalize text-gray-900">{slot.weekday}</span>
                          <span className="text-right text-gray-600">
                            {slot.endTime ? `${slot.time}–${slot.endTime}` : slot.time}
                            {slot.location ? <span className="block text-xs text-gray-500">{slot.location}</span> : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-gray-500">Från lagets kalender på laget.se, uppdateras löpande.</p>
                  </Card>
                )}
                {team.leaders && team.leaders.length > 0 && (
                  <Card className="rounded-xl border border-emerald-100/80 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Ledare</p>
                    <ul className="mt-3 space-y-2">
                      {team.leaders.map((leader) => (
                        <li key={`${leader.name}-${leader.role ?? ""}`} className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="font-semibold text-gray-900">{leader.name}</span>
                          {leader.role ? <span className="text-right text-gray-500">{leader.role}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            ) : null}

            {/* Minimalistic matcher button */}
            {/* Removed matcher button as requested */}
            <section aria-label="Lagets matcher" className="mt-10 space-y-6">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">Lagets matcher</p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900">{teamDisplayName}</h2>
                {scoutLinks.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {scoutLinks.map((link) => (
                      <Link
                        key={link.slug}
                        href={`/scout/${link.slug}`}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        HHF Scout{scoutLinks.length > 1 ? ` · ${link.label}` : ""}: motståndare och vinstchanser →
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {teamMatches.map((match) => {
                const status = getDerivedStatus(match)
                const opponentName = extractOpponentName(match.opponent)
                const isHome = match.isHome !== false
                const homeAwayLabel = isHome ? "hemma" : "borta"
                const scheduleLine = buildScheduleLine(match)
                const trimmedResult = match.result?.trim()

                // Check if match should be finished based on time
                const now = Date.now()
                const minutesSinceKickoff = (now - match.date.getTime()) / (1000 * 60)
                const normalizedResult = trimmedResult?.replace(/[–-]/g, '-').toLowerCase()
                const isZeroZero = normalizedResult === "0-0" || normalizedResult === "00" || trimmedResult === "0-0" || trimmedResult === "0–0"

                // A handball match typically lasts 60 minutes (2x30 min) + breaks ~10-15 min = ~75 minutes max
                // Only consider finished if way past reasonable time (2+ hours) AND showing stale 0-0
                const matchShouldBeFinished = minutesSinceKickoff > 120 && isZeroZero && status !== "live"
                const isStaleZeroResult = isZeroZero && matchShouldBeFinished

                const hasResult =
                  Boolean(trimmedResult) &&
                  trimmedResult?.toLowerCase() !== "inte publicerat" &&
                  trimmedResult !== "0-0" &&
                  trimmedResult !== "0–0"

                const playLabel = getMatchWatchLabel(status)
                const canOpenTimeline = canOpenMatchTimeline(match)
                const providerBadge = getMatchProviderBadge(match)
                const providerHelperText = getProviderHelperText(match)
                const matchTeamLabel = extendTeamDisplayName(match.teamType)

                // Don't show LIVE badge if match should be finished
                const shouldShowLive = status === "live" && !matchShouldBeFinished

                return (
                  <Card
                    key={match.id}
                    className={`group relative rounded-2xl border border-emerald-100/80 bg-white p-6 text-left shadow-sm transition ${canOpenTimeline ? "cursor-pointer hover:border-emerald-400 hover:shadow-lg" : ""
                      }`}
                    onClick={() => {
                      if (canOpenTimeline) {
                        setSelectedMatch(match)
                      }
                    }}
                    role={canOpenTimeline ? "button" : undefined}
                    tabIndex={canOpenTimeline ? 0 : undefined}
                    onKeyDown={(event) => {
                      if (!canOpenTimeline) {
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setSelectedMatch(match)
                      }
                    }}
                  >
                    {canOpenTimeline && (
                      <div className="absolute top-4 right-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <span className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Se matchhändelser
                        </span>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          {matchTeamLabel && (
                            <span className="text-sm font-semibold text-emerald-700">{matchTeamLabel}</span>
                          )}
                          {providerBadge && (
                            <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${providerBadge.tone}`}>
                              {providerBadge.label}
                            </span>
                          )}
                          {shouldShowLive && (
                            <span className="inline-flex items-center gap-1.5 rounded bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                              LIVE
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {isHome ? (
                            <>
                              Härnösands HF <span className="text-gray-400">vs</span> {opponentName} ({homeAwayLabel})
                            </>
                          ) : (
                            <>
                              {opponentName} <span className="text-gray-400">vs</span> Härnösands HF ({homeAwayLabel})
                            </>
                          )}
                        </h3>
                        {scheduleLine && <p className="mt-1 text-sm text-gray-600">{scheduleLine}</p>}
                        {match.series && <p className="mt-1 text-xs text-gray-500">{match.series}</p>}
                        {providerHelperText && <p className="mt-1 text-xs font-medium text-sky-700">{providerHelperText}</p>}
                      </div>
                      {match.infoUrl && (
                        <Link
                          href={match.infoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 transition hover:text-emerald-700"
                          onClick={(event) => event.stopPropagation()}
                          title="Matchsida"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-4">
                        {hasResult ? (
                          <span className="text-2xl font-bold text-gray-900" data-score-value="true">
                            {match.result}
                          </span>
                        ) : isStaleZeroResult ? (
                          <div className="flex flex-col">
                            <span className="text-2xl font-bold text-gray-500">—</span>
                            <span className="text-xs text-gray-500">Resultat ej publicerat</span>
                          </div>
                        ) : null}

                        {match.playUrl && (
                          <a
                            href={match.playUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                            title={playLabel}
                          >
                            <img src="/handbollplay_mini.png" alt="" className="h-4 w-4 brightness-0 invert" />
                            {playLabel}
                          </a>
                        )}
                      </div>

                    </div>
                  </Card>
                )
              })}

              {showLoadingState && (
                <Card className="rounded-xl border border-emerald-100/70 bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
                  Hämtar matcher…
                </Card>
              )}

              {showErrorState && (
                <Card className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 shadow-sm">
                  {typeof error === "string"
                    ? error
                    : "Kunde inte hämta matcher just nu. Försök igen senare."}
                </Card>
              )}

              {showEmptyState && (
                <Card className="rounded-xl border border-emerald-100/70 bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
                  Inga matcher planerade just nu.
                </Card>
              )}
            </section>

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
          matchData={selectedMatch}
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

export const TeamPageClientSealed = withSealed(TeamPageClient, "TeamPageClient")
