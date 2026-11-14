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
import { MatchCard } from "@/components/matcher/match-card"

const noPrefetch = () => undefined
import { MatchFeedModal } from "@/components/match-feed-modal"
import { useRestoreOpenMatch } from "@/components/build-refresh"
import {
  birthYearsInLabel,
  createTeamMatchKeySet,
  extendTeamDisplayName,
  matchLabelFitsTeam,
  teamClassKey,
  withSquad,
  type ClubTeamMetadata,
} from "@/lib/team-display"
import { compareMatchesByDateAscStable, compareMatchesByDateDescStable } from "@/lib/match-sort"
import { canOpenMatchTimeline, getMatchProviderBadge, getProviderHelperText, getMatchWatchLabel, getSimplifiedMatchStatus } from "@/lib/match-card-utils"

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
  const { matches: currentMatches, loading: currentLoading, error: currentError, refresh, hasClientData } = useMatchData({
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
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Lagets matcher</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{teamDisplayName}</h2>
                {scoutLinks.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <span className="text-xs text-slate-500">Motståndare och vinstchanser:</span>
                    {scoutLinks.map((link) => (
                      <Link
                        key={link.slug}
                        href={`/scout/${link.slug}`}
                        className="inline-flex items-center gap-1 border border-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                      >
                        {scoutLinks.length > 1 ? `Scout · ${link.label.split(" · ").slice(1).join(" · ") || link.label}` : "HHF Scout"} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {(() => {
                // Same scoreboard rows as /matcher: what is coming first, then the results.
                // Grouped by the same status the rows show, so a row never says "Slut" under "Kommande".
                const live = teamMatches.filter((match) => getSimplifiedMatchStatus(match) === "live")
                const open = teamMatches.filter((match) => getSimplifiedMatchStatus(match) === "upcoming")
                const done = teamMatches.filter((match) => getSimplifiedMatchStatus(match) === "finished")
                const list = (label: string, items: NormalizedMatch[]) =>
                  items.length ? (
                    <div>
                      <div className="mb-3 flex items-center gap-3">
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</h3>
                        <span className="text-[11px] font-semibold tabular-nums text-slate-400">{items.length}</span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                      <div className="divide-y divide-slate-100 border border-slate-200 text-left">
                        {items.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            hasClientMatchData={hasClientData}
                            showDate
                            onOpen={setSelectedMatch}
                            onPrefetch={noPrefetch}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null
                return (
                  <>
                    {list("Live nu", live)}
                    {list("Kommande", open)}
                    {list("Resultat", done)}
                  </>
                )
              })()}

              {showLoadingState && (
                <p className="border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Hämtar matcher…</p>
              )}

              {showErrorState && (
                <Card className="rounded-none border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 shadow-none">
                  {typeof error === "string"
                    ? error
                    : "Kunde inte hämta matcher just nu. Försök igen senare."}
                </Card>
              )}

              {showEmptyState && (
                <p className="border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Inga matcher planerade just nu.</p>
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
