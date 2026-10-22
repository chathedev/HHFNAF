import { Seal } from "@/lib/seal-server"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { EmptyNote, ExternalLink, FormChips, InsightList, PageHeader, Section } from "@/components/scout/ui"
import { Comparison, MatchList, PredictionHero, comparisonMetrics } from "@/components/scout/blocks"
import { CategoryPanel, ProfileTiles } from "@/components/scout/team-sections"
import { PlayerTable, PlayerTableSealed } from "@/components/scout/player-table"
import { GoalTimingChart, GoalTimingChartSealed } from "@/components/scout/charts/goal-timing-chart"
import { ScorersChart, ScorersChartSealed } from "@/components/scout/charts/scorers-chart"
import { SeasonChart, SeasonChartSealed, type SeasonPoint } from "@/components/scout/charts/season-chart"
import {
  matchDate,
  outcomeFor,
  pct,
  probsFor,
  realVenueLabel,
  scoreFor,
  scoutFetch,
  seasonLabel,
  sideOf,
  signed,
  updatedLabel,
  ScoutUnavailable,
  type Entity,
  type MatchPayload,
  type ScoutMatch,
} from "@/lib/scout"

export const revalidate = 60

type Params = { id: string }

async function load(id: string) {
  if (!/^\d+$/.test(id)) return null
  try {
    return await scoutFetch<MatchPayload>(`/match/${id}`)
  } catch (error) {
    if (error instanceof ScoutUnavailable) return undefined
    throw error
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params
  const data = await load(id)
  const title = data ? `${data.match.home.name} – ${data.match.away.name}` : "Matchanalys"
  return {
    title: `${title} – HHF Scout`,
    description: "Matchanalys: vinstchans, motståndarens målskyttar, resultat, inbördes möten och gemensamma motståndare.",
    alternates: { canonical: `https://www.harnosandshf.se/scout/match/${id}` },
    robots: { index: false, follow: true },
  }
}

function seasonPoints(matches: ScoutMatch[], key: string): SeasonPoint[] {
  return [...matches]
    .filter((m) => m.hs != null)
    .reverse()
    .map((m) => {
      const side = sideOf(m, key)
      const opp = side === "away" ? m.home : m.away
      const mine = side === "away" ? m.as ?? 0 : m.hs ?? 0
      const theirs = side === "away" ? m.hs ?? 0 : m.as ?? 0
      return { id: m.id, date: matchDate(m, true), opponent: opp.name, score: scoreFor(m, key), gd: mine - theirs, outcome: outcomeFor(m, key) ?? "D", home: side === "home" }
    })
}

function TeamLine({ e }: { e: Entity | null }) {
  if (!e) return null
  const r = e.record
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 py-3">
      <div className="min-w-0">
        <Link href={e.isHhf && e.slug ? `/scout/${e.slug}` : `/scout/lag/${e.key}`} className="truncate text-sm font-semibold text-slate-950 underline-offset-2 hover:underline">
          {e.name}
        </Link>
        <p className="text-xs text-slate-500">
          {r.played ? `${r.won}–${r.drawn}–${r.lost} i år, mål ${r.gf}–${r.ga}` : "Inga matcher i år"}
          {e.position ? ` · ${e.position}:a i tabellen` : ""}
        </p>
      </div>
      <FormChips form={r.form.map((f) => f.outcome)} />
    </div>
  )
}

export default async function ScoutMatchPage({ params }: { params: Promise<Params> }) {
  const { id } = await params
  const data = await load(id)
  if (data === null) notFound()
  if (!data) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white px-4 pb-16 pt-32">
          <div className="container mx-auto max-w-4xl">
            <EmptyNote>Analysen kunde inte hämtas just nu. Försök igen om en stund.</EmptyNote>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const { match, hhf, opponent } = data
  const isHhfMatch = Boolean(match.hhfSide)
  const side = sideOf(match, hhf?.key) ?? "home"
  const played = match.hs != null
  const pred = match.prediction ?? match.preMatch ?? null
  const probs = probsFor(pred, side)
  const oppName = opponent?.name ?? "motståndaren"
  const prev = opponent?.previousSameName ?? null
  const gamesUs = pred ? (side === "home" ? pred.homeGames : pred.awayGames) : 0
  const gamesThem = pred ? (side === "home" ? pred.awayGames : pred.homeGames) : 0
  const fewest = Math.min(gamesUs, gamesThem)
  const certainty = fewest >= 8 ? "hög" : fewest >= 4 ? "medel" : "låg"

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="h-24" />
        <div className="container mx-auto max-w-4xl px-4 pb-14 pt-4">
          <PageHeader
            back={hhf?.isHhf && hhf.slug ? { href: `/scout/${hhf.slug}`, label: match.teamType ?? "Laget" } : { href: "/scout", label: "HHF Scout" }}
            title={`${match.home.name} – ${match.away.name}`}
            sub={[`${matchDate(match, true)}${match.time ? ` ${match.time}` : ""}`, match.venue, match.category?.name].filter(Boolean).join(" · ")}
            right={played ? <p className="text-4xl font-black tabular-nums text-slate-950">{match.hs}–{match.as}</p> : undefined}
          />

          <div className="space-y-10">
            <section>
              {probs ? (
                <>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{played ? "Vinstchans före matchen" : "Vinstchans"}</p>
                  <PredictionHero match={{ ...match, prediction: pred }} perspective={side} />
                  <p className="mt-4 text-sm text-slate-600">
                    Ungefärligt resultat:{" "}
                    <span className="font-semibold text-slate-950">
                      {side === "home" ? `${Math.round(probs.us)}–${Math.round(probs.them)}` : `${Math.round(probs.them)}–${Math.round(probs.us)}`}
                    </span>
                    . Bygger på {gamesUs} och {gamesThem} spelade matcher i år, så säkerheten är <span className="font-semibold text-slate-950">{certainty}</span>. Förra säsongen pekade
                    samma metod ut rätt vinnare i {pct(data.model.previous.accuracy)} av matcherna.
                  </p>
                  {(() => {
                    const notes: string[] = []
                    const us = side === "home" ? match.home : match.away
                    const them = side === "home" ? match.away : match.home
                    const venue = realVenueLabel(match, side)
                    if (match.hvSource && match.hvSource !== "fixture") {
                      notes.push(
                        venue === "neutral plan"
                          ? `Matchen spelas på neutral plan${match.venue ? ` (${match.venue})` : ""}, så ingen hemmafördel räknas in.`
                          : venue === "hemma"
                            ? `${us.name} spelar i egen hall${match.venue ? ` (${match.venue})` : ""} och får en liten hemmafördel.`
                            : `${them.name} spelar i egen hall${match.venue ? ` (${match.venue})` : ""} och får en liten hemmafördel.`,
                      )
                    }
                    const priorUs = side === "home" ? pred?.homePrior : pred?.awayPrior
                    const priorThem = side === "home" ? pred?.awayPrior : pred?.homePrior
                    const priorText = (name: string, src?: string | null) =>
                      src === "cohort" ? `${name} startade säsongen från klubbens lag i samma åldersgrupp förra året` : src === "club" ? `${name} startade säsongen från klubbens nivå förra året` : src === "club-form" ? `${name} bedöms utifrån hur klubbens andra lag spelat i år` : null
                    const pri = [priorText(us.name, priorUs), priorText(them.name, priorThem)].filter(Boolean)
                    if (pri.length) notes.push(`${pri.join(" och ")}, och årets matcher tar snabbt över.`)
                    return notes.length ? <p className="mt-2 text-sm text-slate-500">{notes.join(" ")}</p> : null
                  })()}
                </>
              ) : (
                <p className="border-y border-slate-200 py-4 text-sm text-slate-600">
                  {match.resultHidden
                    ? "Resultaten i den här klassen publiceras inte, så här finns ingen vinstchans."
                    : opponent && opponent.record.played === 0
                      ? `${oppName} har inte spelat någon match i år, så det finns ingen vinstchans att räkna fram än.${prev ? " Längre ner ser du deras förra säsong." : ""}`
                      : "Det finns för lite data för en vinstchans ännu."}
                </p>
              )}
              <div className="mt-4">
                <TeamLine e={hhf} />
                <TeamLine e={opponent} />
              </div>
              <div className="mt-3 flex gap-4">
                <ExternalLink href={match.profixioUrl}>Matchen på Profixio</ExternalLink>
                {match.playUrl && <ExternalLink href={match.playUrl}>Se på Handbollplay</ExternalLink>}
              </div>
            </section>

            <Section title={`Bra att veta om ${oppName}`} note="Bara det siffrorna tydligt visar, jämfört med snittet i serien.">
              <InsightList insights={opponent?.insights ?? []} perspective={isHhfMatch ? "opponent" : "team"} />
            </Section>

            <Section title={`Vem gör målen i ${oppName}?`} note={opponent?.logged ? `Från ${opponent.logged} matcher med matchlogg i år. Numret är tröjnumret spelaren oftast haft.` : undefined}>
              {opponent && opponent.players.length ? (
                <div className="space-y-6">
                  <Seal as={ScorersChartSealed} players={opponent.players} tone="team" />
                  <Seal as={PlayerTableSealed} players={opponent.players} />
                </div>
              ) : (
                <EmptyNote>Ingen matchlogg för {oppName} i år ännu.</EmptyNote>
              )}
            </Section>

            <Section title={`${oppName}s matcher i år`}>
              {data.opponentMatches.results.length ? (
                <div className="space-y-4">
                  <Seal as={SeasonChartSealed} points={seasonPoints(data.opponentMatches.results, opponent?.key ?? "")} />
                  <MatchList matches={data.opponentMatches.results} perspective={opponent?.key ?? ""} showSeries />
                </div>
              ) : (
                <EmptyNote>Inga spelade matcher i år.</EmptyNote>
              )}
            </Section>

            {hhf && opponent && (
              <Section title="Lag mot lag" note="I år, alla tävlingar. Fetstil = bäst av de två.">
                <Comparison a={{ name: hhf.name, isHhf: hhf.isHhf }} b={{ name: opponent.name, isHhf: opponent.isHhf }} metrics={comparisonMetrics(hhf, opponent, data.category)} />
              </Section>
            )}

            <Section title="Inbördes möten" note="I år och förra säsongen.">
              <MatchList matches={data.h2h} perspective={isHhfMatch ? "hhf" : hhf?.key ?? ""} showSeries empty="Lagen har inte mötts i den data vi har." />
            </Section>

            <Section title="Mot samma motståndare" note="Lag som båda har mött i år – vem klarade samma uppgift bäst?">
              {data.common.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] font-medium text-slate-400">
                        <th className="py-2 pr-2">Mot</th>
                        <th className="px-2 py-2 text-right">{hhf?.name}</th>
                        <th className="px-2 py-2 text-right">{oppName}</th>
                        <th className="py-2 pl-2 text-right">Skillnad</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {data.common.map((c) => (
                        <tr key={c.key} className="border-b border-slate-100 text-slate-700">
                          <td className="py-2 pr-2">{c.name}</td>
                          <td className="px-2 py-2 text-right">{c.hhf.map((m) => scoreFor(m, hhf?.key ?? "")).join(", ")}</td>
                          <td className="px-2 py-2 text-right">{c.opp.map((m) => scoreFor(m, opponent?.key ?? "")).join(", ")}</td>
                          <td className="py-2 pl-2 text-right font-semibold text-slate-950">{signed(c.diff)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.commonAvgDiff != null && (
                    <p className="mt-3 text-sm text-slate-600">
                      I snitt har {hhf?.name} gjort <span className="font-semibold text-slate-950">{signed(data.commonAvgDiff)} mål</span> {data.commonAvgDiff >= 0 ? "bättre" : "sämre"} per match än {oppName} mot samma lag.
                    </p>
                  )}
                </div>
              ) : (
                <EmptyNote>Inga gemensamma motståndare ännu.</EmptyNote>
              )}
            </Section>

            <Section title="När målen kommer" note="Gjorda mål uppåt, insläppta nedåt, per tiondel av matchen (snitt per match).">
              <div className="grid gap-8 sm:grid-cols-2">
                {[hhf, opponent].map((e) =>
                  e ? (
                    <div key={e.key}>
                      <p className="mb-2 text-sm font-semibold text-slate-900">{e.name}</p>
                      {e.profile ? (
                        <Seal as={GoalTimingChartSealed} scored={e.profile.timing.buckets} conceded={e.profile.timing.against} periodMinutes={e.profile.periodMinutes} matches={e.profile.matches} tone={e.isHhf ? "hhf" : "team"} height={180} />
                      ) : (
                        <p className="text-sm text-slate-500">Ingen matchlogg ännu.</p>
                      )}
                    </div>
                  ) : null,
                )}
              </div>
              {opponent?.profile && (
                <div className="mt-8">
                  <p className="mb-3 text-sm font-semibold text-slate-900">{oppName} i siffror</p>
                  <ProfileTiles entity={opponent} />
                </div>
              )}
            </Section>

            {prev && (
              <Section title={`${oppName} förra säsongen`}>
                <Link href={`/scout/lag/${prev.key}`} className="flex items-center justify-between border-b border-slate-200 py-3.5 text-sm transition hover:bg-slate-50">
                  <span className="text-slate-700">
                    {seasonLabel(prev.season)}
                    {prev.record ? ` · ${prev.record.won}–${prev.record.drawn}–${prev.record.lost}, mål ${prev.record.gf}–${prev.record.ga}` : ""}
                    {prev.position ? ` · ${prev.position}:a av ${prev.positionOf}` : ""}
                  </span>
                  <span className="text-slate-400">→</span>
                </Link>
              </Section>
            )}

            {data.category && (
              <Section title={`Serien: ${data.category.name}`}>
                <CategoryPanel category={data.category} highlightKey={opponent?.isHhf ? null : opponent?.key} />
              </Section>
            )}

            <p className="text-xs text-slate-400">Data från Profixio · uppdaterad {updatedLabel(data.generatedAt)}. Vinstchansen är en uppskattning, inte ett facit.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
