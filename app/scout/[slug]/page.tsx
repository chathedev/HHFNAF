import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { BackLink, Card, EmptyNote, FormChips, InsightList, Pill, Section, StatTile } from "@/components/scout/ui"
import { MatchList } from "@/components/scout/blocks"
import { Tabs } from "@/components/scout/tabs"
import { CategoryPanel, ProfileTiles } from "@/components/scout/team-sections"
import { PlayerTable } from "@/components/scout/player-table"
import { ProbabilityBar } from "@/components/scout/charts/probability-bar"
import { GoalTimingChart } from "@/components/scout/charts/goal-timing-chart"
import { ScorersChart } from "@/components/scout/charts/scorers-chart"
import { SeasonChart, type SeasonPoint } from "@/components/scout/charts/season-chart"
import {
  confidenceText,
  matchDate,
  num,
  outcomeFor,
  pct,
  probsFor,
  scoreFor,
  scoutFetch,
  seasonLabel,
  sideOf,
  signed,
  updatedLabel,
  ScoutUnavailable,
  type TeamPayload,
} from "@/lib/scout"

export const revalidate = 60

type Params = { slug: string }

async function load(slug: string) {
  try {
    return await scoutFetch<TeamPayload>(`/team/${encodeURIComponent(slug)}`)
  } catch (error) {
    if (error instanceof ScoutUnavailable) return undefined
    throw error
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const data = await load(slug)
  const label = data?.team.label ?? slug.toUpperCase()
  return {
    title: `${label} – HHF Scout`,
    description: `Motståndaranalys, tabell, styrkeranking och vinstchanser för Härnösands HF ${label}.`,
    alternates: { canonical: `https://www.harnosandshf.se/scout/${slug}` },
    robots: { index: false, follow: true },
  }
}

export default async function ScoutTeamPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const data = await load(slug)
  if (data === null) notFound()

  if (!data) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-32">
          <div className="container mx-auto max-w-6xl">
            <EmptyNote>Analysdatan kunde inte hämtas just nu. Försök igen om en stund.</EmptyNote>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const { team, entity, categories, upcoming, results } = data
  const rec = entity.record
  // The youngest classes: Profixio does not publish results, so neither do we.
  const resultsHidden = categories.length > 0 && categories.every((c) => c.resultsHidden)
  const next = upcoming[0] ?? null
  const nextSide = next ? sideOf(next, entity.key) : null
  const nextOpp = next ? (nextSide === "away" ? next.home : next.away) : null
  const nextOppBrief = next?.opponent ?? null
  const nextProbs = next ? probsFor(next.prediction, nextSide) : null

  const seasonPoints: SeasonPoint[] = [...results]
    .reverse()
    .map((m) => {
      const outcome = outcomeFor(m, entity.key)
      const side = sideOf(m, entity.key)
      const opp = side === "away" ? m.home : m.away
      const mine = side === "away" ? m.as ?? 0 : m.hs ?? 0
      const theirs = side === "away" ? m.hs ?? 0 : m.as ?? 0
      return {
        id: m.id,
        date: matchDate(m, true),
        opponent: opp.name,
        score: scoreFor(m, entity.key),
        gd: mine - theirs,
        outcome: outcome ?? "D",
        home: side === "home",
      }
    })

  const preMatchHits = results.filter((m) => {
    const side = sideOf(m, entity.key)
    const probs = probsFor(m.preMatch, side)
    const outcome = outcomeFor(m, entity.key)
    if (!probs || !outcome) return false
    const pick = probs.win >= probs.loss && probs.win >= probs.draw ? "W" : probs.loss >= probs.draw ? "L" : "D"
    return pick === outcome
  }).length
  const preMatchTotal = results.filter((m) => m.preMatch).length

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_36%,#f8fafc_100%)]">
        <div className="h-24" />
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <BackLink href="/scout">HHF Scout</BackLink>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-emerald-600">HHF Scout · {seasonLabel(data.currentSeason)}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">{team.label}</h1>
              <p className="mt-2 text-sm text-slate-500">{entity.categories.map((c) => c.name).join(" · ")}</p>
            </div>
            <FormChips form={rec.form.map((f) => f.outcome)} />
          </div>

          <nav aria-label="Andra HHF-lag" className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {data.otherTeams.map((t) => (
              <Link
                key={t.slug}
                href={`/scout/${t.slug}`}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  t.slug === team.slug ? "bg-slate-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-950"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          {resultsHidden ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4 text-sm text-amber-900">
              <p className="font-bold">Resultaten publiceras inte för {team.label}</p>
              <p className="mt-1">
                Förbundet visar inga resultat för de yngsta lagen. HHF Scout följer det: inga tabeller, styrkor, vinstchanser eller skytteligor här – bara spelschemat
                och vilka lag ni möter.
              </p>
            </div>
          ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="Tabell"
                value={entity.position ? `${entity.position}:a` : "–"}
                sub={entity.positionOf ? `av ${entity.positionOf} i ${categories.find((c) => c.id === entity.mainCategory)?.name ?? "serien"}` : undefined}
                highlight
              />
              <StatTile label="Resultat" value={`${rec.won}-${rec.drawn}-${rec.lost}`} sub={`${rec.played} matcher · ${rec.points} poäng (alla tävlingar)`} />
              <StatTile label="Mål" value={`${rec.gf}–${rec.ga}`} sub={`${num(rec.gfPerGame)} gjorda, ${num(rec.gaPerGame)} insläppta per match`} />
              <StatTile
                label="Styrka"
                value={entity.rating ? signed(entity.rating.r) : "–"}
                sub={entity.rating ? `#${entity.rating.rank ?? "–"} av ${entity.rating.rankOf ?? "–"} · ${confidenceText(entity.rating)}` : "inga matcher än"}
              />
            </div>
          )}

          <div className="mt-10 space-y-12">
            {next && nextOpp && !resultsHidden && (
              <Section eyebrow="Nästa match" title={`${nextSide === "home" ? "Hemma mot" : "Borta mot"} ${nextOpp.name}`}>
                <Card className="overflow-hidden">
                  <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Pill tone="sky">
                          {matchDate(next)} {next.time}
                        </Pill>
                        {next.venue && <span>{next.venue}</span>}
                        {next.category && <span>· {next.category.name}</span>}
                      </div>
                      <div className="mt-5">
                        {nextProbs ? (
                          <>
                            <ProbabilityBar
                              size="lg"
                              left={{ label: "HHF vinner", p: nextProbs.win, tone: "hhf" }}
                              draw={nextProbs.draw}
                              right={{ label: `${nextOpp.name} vinner`, p: nextProbs.loss, tone: "team" }}
                            />
                            <p className="mt-3 text-sm text-slate-600">
                              Väntat resultat ungefär <span className="font-black text-slate-950">{Math.round(nextProbs.us)}–{Math.round(nextProbs.them)}</span>. Bygger på{" "}
                              {next.prediction ? `${nextSide === "away" ? next.prediction.awayGames : next.prediction.homeGames} respektive ${nextSide === "away" ? next.prediction.homeGames : next.prediction.awayGames} spelade matcher` : "spelade matcher"} i år.
                            </p>
                          </>
                        ) : (
                          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            {nextOpp.name} har inte spelat någon match i år ännu, så modellen ger ingen procent. I analysen finns deras förra säsong.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="border-t border-slate-100 bg-slate-50/60 p-5 lg:border-l lg:border-t-0">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Motståndaren i år</p>
                      {nextOppBrief?.record && nextOppBrief.record.played > 0 ? (
                        <dl className="mt-2 space-y-1.5 text-sm">
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Resultat</dt>
                            <dd className="font-semibold text-slate-900">
                              {nextOppBrief.record.won}-{nextOppBrief.record.drawn}-{nextOppBrief.record.lost} ({nextOppBrief.record.gf}–{nextOppBrief.record.ga})
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Tabell</dt>
                            <dd className="font-semibold text-slate-900">{nextOppBrief.position ? `${nextOppBrief.position} av ${nextOppBrief.positionOf}` : "–"}</dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Styrka</dt>
                            <dd className="font-semibold text-slate-900">{nextOppBrief.rating ? `${signed(nextOppBrief.rating.r)} (#${nextOppBrief.rating.rank ?? "–"})` : "–"}</dd>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <dt className="text-slate-500">Form</dt>
                            <dd>
                              <FormChips form={nextOppBrief.record.form} size="sm" />
                            </dd>
                          </div>
                        </dl>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">Inga spelade matcher i år.</p>
                      )}
                      <Link
                        href={`/scout/match/${next.id}`}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        Scouta {nextOpp.name} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </Card>
              </Section>
            )}

            <Section
              eyebrow="Spelschema"
              title="Kommande matcher"
              description={resultsHidden ? "Alla inlagda matcher i Profixio." : "Vinstchans enligt modellen för varje match. Klicka på pilen för motståndaranalysen."}
            >
              <MatchList matches={upcoming} perspective={entity.key} empty="Inga fler matcher inlagda i Profixio." showSeries hideOdds={resultsHidden} />
            </Section>

            {!resultsHidden && (
            <Section eyebrow="Serien" title="Tabell, styrka och simulering">
              {categories.length ? (
                <Tabs
                  tabs={categories.map((category) => ({
                    id: String(category.id),
                    label: category.name,
                    content: <CategoryPanel category={category} />,
                  }))}
                />
              ) : (
                <EmptyNote>Ingen serie hittades.</EmptyNote>
              )}
            </Section>
            )}

            {!resultsHidden && (
              <>
            <Section
              eyebrow="Säsongen"
              title="Match för match"
              description={
                preMatchTotal
                  ? `Modellens förhandstips stämde i ${preMatchHits} av ${preMatchTotal} matcher där den hade underlag (oavgjort tippar den nästan aldrig, så en oavgjord match räknas som miss).`
                  : undefined
              }
            >
              {seasonPoints.length ? (
                <div className="space-y-4">
                  <Card className="p-4">
                    <SeasonChart points={seasonPoints} />
                  </Card>
                  <MatchList matches={results} perspective={entity.key} showSeries />
                </div>
              ) : (
                <EmptyNote>Inga spelade matcher än.</EmptyNote>
              )}
            </Section>

            <Section eyebrow="Truppen" title="Spelarstatistik" description={`Från ${entity.logged} matcher med matchlogg i Profixio. Förra säsongen räknar alla lag spelaren var med i.`}>
              <div className="space-y-4">
                <Card className="p-4">
                  <p className="mb-2 text-sm font-bold text-slate-900">Målskyttar</p>
                  <ScorersChart players={entity.players} tone="hhf" />
                </Card>
                <PlayerTable players={entity.players} highlight />
              </div>
            </Section>

            <Section eyebrow="Lagprofil" title="Så spelar laget" description="Styrkor och saker att jobba på, räknat från matchloggarna och jämfört med snittet i serien.">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <InsightList insights={entity.insights} />
                </div>
                <Card className="p-4">
                  <p className="mb-2 text-sm font-bold text-slate-900">När målen kommer</p>
                  {entity.profile ? (
                    <GoalTimingChart
                      scored={entity.profile.timing.buckets}
                      conceded={entity.profile.timing.against}
                      periodMinutes={entity.profile.periodMinutes}
                      matches={entity.profile.matches}
                      tone="hhf"
                    />
                  ) : (
                    <p className="text-sm text-slate-500">Ingen matchlogg ännu.</p>
                  )}
                </Card>
              </div>
              <div className="mt-4">
                <ProfileTiles entity={entity} />
              </div>
            </Section>
              </>
            )}

            {entity.previousSameName && (
              <Section eyebrow="Historik" title={`Förra säsongen (${seasonLabel(entity.previousSameName.season)})`}>
                <Link
                  href={`/scout/lag/${entity.previousSameName.key}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300"
                >
                  <span className="text-sm text-slate-700">
                    <span className="font-bold text-slate-950">{entity.previousSameName.name}</span>{" "}
                    {entity.previousSameName.record &&
                      `· ${entity.previousSameName.record.won}-${entity.previousSameName.record.drawn}-${entity.previousSameName.record.lost}, ${entity.previousSameName.record.gf}–${entity.previousSameName.record.ga}`}
                    {entity.previousSameName.position && ` · ${entity.previousSameName.position}:a av ${entity.previousSameName.positionOf}`}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              </Section>
            )}

            <p className="text-xs text-slate-400">
              Data från Profixio · uppdaterad {updatedLabel(data.generatedAt)} · vinstchanserna är modellens uppskattningar, inte löften. Rätt utgång förra säsongen:{" "}
              {data.model.previous.accuracy != null ? pct(data.model.previous.accuracy) : "–"} av {data.model.previous.n} matcher.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
