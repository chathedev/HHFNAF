import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, MapPin, CalendarDays, PlayCircle } from "lucide-react"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { BackLink, Card, EmptyNote, ExternalLink, FormChips, InsightList, Pill, Section, TeamLink } from "@/components/scout/ui"
import { Comparison, MatchList, PredictionHero, comparisonMetrics } from "@/components/scout/blocks"
import { CategoryPanel, ProfileTiles } from "@/components/scout/team-sections"
import { PlayerTable } from "@/components/scout/player-table"
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
    description: "Matchanalys: vinstchanser, motståndarens målskyttar, form, inbördes möten och gemensamma motståndare.",
    alternates: { canonical: `https://www.harnosandshf.se/scout/match/${id}` },
    robots: { index: false, follow: true },
  }
}

function seasonPoints(matches: ScoutMatch[], key: string): SeasonPoint[] {
  return [...matches]
    .filter((m) => m.hs != null && m.season === matches[0]?.season)
    .reverse()
    .map((m) => {
      const side = sideOf(m, key)
      const opp = side === "away" ? m.home : m.away
      const mine = side === "away" ? m.as ?? 0 : m.hs ?? 0
      const theirs = side === "away" ? m.hs ?? 0 : m.as ?? 0
      return { id: m.id, date: matchDate(m, true), opponent: opp.name, score: scoreFor(m, key), gd: mine - theirs, outcome: outcomeFor(m, key) ?? "D", home: side === "home" }
    })
}

function TeamHeader({ entity, align }: { entity: Entity | null; align: "left" | "right" }) {
  if (!entity) return <div />
  const rec = entity.record
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-widest ${entity.isHhf ? "text-emerald-400" : "text-sky-300"}`}>
        {entity.isHhf ? "HHF" : "Motståndare"}
      </p>
      <TeamLink teamKey={entity.key} name={entity.name} isHhf={entity.isHhf} slug={entity.slug} className="block truncate text-xl font-black tracking-tight text-white sm:text-3xl" />
      <p className="mt-1 text-xs text-white/60">
        {rec.played ? `${rec.won}-${rec.drawn}-${rec.lost} · ${rec.gf}–${rec.ga}` : "Inga matcher i år"}
        {entity.position ? ` · ${entity.position}:a av ${entity.positionOf}` : ""}
      </p>
      <div className={`mt-2 flex ${align === "right" ? "justify-end" : ""}`}>
        <FormChips form={rec.form.map((f) => f.outcome)} size="sm" />
      </div>
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
        <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-32">
          <div className="container mx-auto max-w-6xl">
            <EmptyNote>Analysdatan kunde inte hämtas just nu. Försök igen om en stund.</EmptyNote>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const { match, hhf, opponent } = data
  const hhfSide = sideOf(match, hhf?.key) ?? "home"
  const left = hhfSide === "home" ? data.hhf : data.opponent
  const right = hhfSide === "home" ? data.opponent : data.hhf
  const played = match.hs != null
  const pred = match.prediction ?? null
  const pre = match.preMatch ?? null
  const probs = probsFor(pred ?? pre, hhfSide)
  const oppName = opponent?.name ?? "motståndaren"
  const oppNoGames = opponent && opponent.record.played === 0
  const prev = opponent?.previousSameName ?? null
  const hhfTeamLabel = match.teamType ?? hhf?.classLabel ?? ""

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_36%,#f8fafc_100%)]">
        <div className="relative overflow-hidden bg-slate-950 pb-10 pt-28 text-white">
          <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" aria-hidden />
          <div className="container relative mx-auto max-w-6xl px-4">
            <Link href={hhf?.slug ? `/scout/${hhf.slug}` : "/scout"} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-300 transition hover:text-emerald-200">
              ← {hhf?.slug ? `${hhfTeamLabel} i HHF Scout` : "HHF Scout"}
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> {matchDate(match, true)} {match.time}
              </span>
              {match.venue && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {match.venue}
                </span>
              )}
              {match.category && <span>· {match.category.name}</span>}
              {hhfTeamLabel && <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold text-white/80">{hhfTeamLabel}</span>}
            </div>
            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
              <TeamHeader entity={left} align="left" />
              <div className="text-center">
                {played ? (
                  <p className="text-4xl font-black tabular-nums sm:text-6xl">
                    {match.hs}–{match.as}
                  </p>
                ) : (
                  <p className="text-xl font-black text-white/40 sm:text-3xl">mot</p>
                )}
                {match.ht && <p className="text-xs text-white/50">({match.ht[0]}–{match.ht[1]})</p>}
              </div>
              <TeamHeader entity={right} align="right" />
            </div>

            <div className="mt-8 rounded-2xl bg-white p-4 text-slate-900 sm:p-5">
              {probs ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">{played ? "Modellen före matchen" : "Vinstchans enligt modellen"}</p>
                    <span className="text-xs text-slate-500">
                      Väntat resultat ungefär{" "}
                      <span className="font-bold text-slate-900">
                        {hhfSide === "home" ? `${Math.round(probs.us)}–${Math.round(probs.them)}` : `${Math.round(probs.them)}–${Math.round(probs.us)}`}
                      </span>
                    </span>
                  </div>
                  <PredictionHero match={{ ...match, prediction: pred ?? pre }} perspective={hhfSide} />
                  <p className="mt-3 text-xs text-slate-500">
                    Underlag: {hhf?.name ?? "HHF"} {confidenceText(hhf?.rating)}; {oppName} {confidenceText(opponent?.rating)}. Modellen hade rätt utgång i{" "}
                    {data.model.previous.accuracy != null ? pct(data.model.previous.accuracy) : "–"} av {data.model.previous.n} testmatcher förra säsongen.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  {oppNoGames
                    ? `${oppName} har inte spelat någon match den här säsongen, så modellen ger ingen procent.${prev ? " Längre ner finns deras förra säsong." : ""}`
                    : "För lite data för en prognos ännu."}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                <ExternalLink href={match.profixioUrl}>Matchen på Profixio</ExternalLink>
                {match.playUrl && <ExternalLink href={match.playUrl}>Se på Handbollplay</ExternalLink>}
              </div>
            </div>

            <nav aria-label="Avsnitt" className="mt-5 flex gap-2 overflow-x-auto text-xs font-semibold">
              {[
                ["nycklar", "Nycklar"],
                ["jamforelse", "Jämförelse"],
                ["spelare", "Spelare"],
                ["matcher", "Deras matcher"],
                ["inbordes", "Inbördes"],
                ["gemensamma", "Gemensamma motståndare"],
                ["malen", "När målen kommer"],
                ["serien", "Serien"],
              ].map(([anchor, label]) => (
                <a key={anchor} href={`#${anchor}`} className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-white/80 ring-1 ring-white/10 transition hover:bg-white/20 hover:text-white">
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl space-y-12 px-4 py-10">
          <Section id="nycklar" eyebrow="Nycklar till matchen" title={`Det här vet vi om ${oppName}`} description="Bara sådant som siffrorna tydligt visar, jämfört med snittet i serien.">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-bold text-slate-900">{oppName}</p>
                <InsightList insights={opponent?.insights ?? []} perspective="opponent" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-slate-900">{hhf?.name ?? "HHF"}</p>
                <InsightList insights={hhf?.insights ?? []} />
              </div>
            </div>
          </Section>

          {hhf && opponent && (
            <Section id="jamforelse" eyebrow="Jämförelse" title="Lag mot lag" description="Den här säsongen, alla tävlingar. Mittkolumnen är snittet i serien. Fetstil = bäst av de två.">
              <Comparison a={{ name: hhf.name, isHhf: true }} b={{ name: opponent.name, isHhf: opponent.isHhf }} metrics={comparisonMetrics(hhf, opponent, data.category)} />
            </Section>
          )}

          <Section
            id="spelare"
            eyebrow="Spelarna"
            title={`Vem gör målen i ${oppName}?`}
            description={opponent?.logged ? `Från ${opponent.logged} matcher med matchlogg den här säsongen. Tröjnummer = vanligaste numret.` : undefined}
          >
            {opponent && opponent.players.length ? (
              <div className="space-y-4">
                <Card className="p-4">
                  <ScorersChart players={opponent.players} tone="team" />
                </Card>
                <PlayerTable players={opponent.players} />
              </div>
            ) : (
              <EmptyNote>Ingen matchlogg för {oppName} den här säsongen ännu.</EmptyNote>
            )}
          </Section>

          <Section id="matcher" eyebrow="Facit" title={`${oppName}s matcher`} description="Varje match de har spelat den här säsongen, mot alla lag.">
            {data.opponentMatches.results.length ? (
              <div className="space-y-4">
                <Card className="p-4">
                  <SeasonChart points={seasonPoints(data.opponentMatches.results, opponent?.key ?? "")} />
                </Card>
                <MatchList matches={data.opponentMatches.results} perspective={opponent?.key ?? ""} showSeries />
              </div>
            ) : (
              <EmptyNote>Inga spelade matcher den här säsongen.</EmptyNote>
            )}
            {data.opponentMatches.upcoming.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-bold text-slate-900">Deras kommande matcher</p>
                <MatchList matches={data.opponentMatches.upcoming} perspective={opponent?.key ?? ""} showSeries />
              </div>
            )}
          </Section>

          <Section id="inbordes" eyebrow="Historik" title="Inbördes möten" description="Den här säsongen och förra (samma åldersklass).">
            <MatchList matches={data.h2h} perspective="hhf" empty="Lagen har inte mötts i den data vi har." showSeries />
          </Section>

          <Section
            id="gemensamma"
            eyebrow="Gemensamma motståndare"
            title="Mot samma lag"
            description="Lag som både HHF och motståndaren har mött den här säsongen. Skillnaden visar vem som klarat samma uppgift bäst."
          >
            {data.common.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-2.5">Motståndare</th>
                        <th className="px-3 py-2.5 text-center">{hhf?.name ?? "HHF"}</th>
                        <th className="px-3 py-2.5 text-center">{oppName}</th>
                        <th className="px-3 py-2.5 text-center">Skillnad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 tabular-nums">
                      {data.common.map((c) => (
                        <tr key={c.key}>
                          <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900">
                            <TeamLink teamKey={c.key} name={c.name} />
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-700">{c.hhf.map((m) => scoreFor(m, hhf?.key ?? "")).join(", ")}</td>
                          <td className="px-3 py-2.5 text-center text-slate-700">{c.opp.map((m) => scoreFor(m, opponent?.key ?? "")).join(", ")}</td>
                          <td className={`px-3 py-2.5 text-center font-bold ${c.diff > 0 ? "text-emerald-700" : c.diff < 0 ? "text-rose-600" : "text-slate-500"}`}>{signed(c.diff)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.commonAvgDiff != null && (
                  <p className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-700">
                    I snitt har {hhf?.name ?? "HHF"} gjort{" "}
                    <span className={`font-black ${data.commonAvgDiff >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(data.commonAvgDiff)} mål</span> bättre per match än {oppName} mot samma motståndare
                    ({data.common.length} lag).
                  </p>
                )}
              </div>
            ) : (
              <EmptyNote>Inga gemensamma motståndare ännu.</EmptyNote>
            )}
          </Section>

          <Section id="malen" eyebrow="Matchbild" title="När målen kommer" description="Gjorda och insläppta mål per matchperiod, snitt per match med matchlogg.">
            <div className="grid gap-4 lg:grid-cols-2">
              {[hhf, opponent].map((e) =>
                e ? (
                  <Card key={e.key} className="p-4">
                    <p className="mb-2 text-sm font-bold text-slate-900">{e.name}</p>
                    {e.profile ? (
                      <GoalTimingChart scored={e.profile.timing.buckets} conceded={e.profile.timing.against} periodMinutes={e.profile.periodMinutes} matches={e.profile.matches} tone={e.isHhf ? "hhf" : "team"} />
                    ) : (
                      <p className="text-sm text-slate-500">Ingen matchlogg ännu.</p>
                    )}
                  </Card>
                ) : null,
              )}
            </div>
            {opponent?.profile && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-bold text-slate-900">{oppName} i siffror</p>
                <ProfileTiles entity={opponent} />
              </div>
            )}
          </Section>

          {prev && (
            <Section eyebrow="Förra säsongen" title={`${prev.name} ${seasonLabel(prev.season)}`}>
              <Link href={`/scout/lag/${prev.key}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300">
                <span className="text-sm text-slate-700">
                  {prev.record ? `${prev.record.won}-${prev.record.drawn}-${prev.record.lost}, ${prev.record.gf}–${prev.record.ga}` : ""}
                  {prev.position ? ` · ${prev.position}:a av ${prev.positionOf}` : ""}
                  {prev.rating ? ` · styrka ${signed(prev.rating.r)}` : ""}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700">
                  Hela förra säsongen <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
              {opponent && opponent.squadHistory.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Spelare i årets lag spelade förra säsongen i:{" "}
                  {opponent.squadHistory.map((s, index) => (
                    <span key={s.key}>
                      {index > 0 && ", "}
                      <Link href={`/scout/lag/${s.key}`} className="font-semibold text-slate-700 hover:underline">
                        {s.name} {s.classKey}
                      </Link>{" "}
                      ({s.shared} spelare)
                    </span>
                  ))}
                </p>
              )}
            </Section>
          )}

          {data.category && (
            <Section id="serien" eyebrow="Serien" title={data.category.name}>
              <CategoryPanel category={data.category} highlightKey={opponent?.isHhf ? null : opponent?.key} />
            </Section>
          )}

          <p className="text-xs text-slate-400">
            Data från Profixio · uppdaterad {updatedLabel(data.generatedAt)} · {num(data.model.previous.n, 0)} testmatcher förra säsongen. Procent är modellens uppskattning – handboll är aldrig
            säker.
          </p>
          {match.hhfSide === null && <Pill>Ingen HHF-match</Pill>}
        </div>
      </main>
      <Footer />
    </>
  )
}
