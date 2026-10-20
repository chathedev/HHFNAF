import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Database, Target, Users, Trophy, Activity } from "lucide-react"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { Section, Card, FormChips, Pill, EmptyNote } from "@/components/scout/ui"
import { MatchList } from "@/components/scout/blocks"
import { ProbabilityBar } from "@/components/scout/charts/probability-bar"
import { CalibrationChart } from "@/components/scout/charts/calibration-chart"
import { ScoutSearch } from "@/components/scout/scout-search"
import {
  matchDate,
  num,
  pct,
  probsFor,
  scoutFetch,
  seasonLabel,
  sideOf,
  updatedLabel,
  type OverviewPayload,
  type ScoutMatch,
} from "@/lib/scout"

export const revalidate = 60

export const metadata: Metadata = {
  title: "HHF Scout – motståndaranalys",
  description:
    "Motståndaranalys för alla Härnösands HF:s lag: varje match i våra serier, styrkerankning, vinstchanser, målskyttar och matchprognoser byggda på Profixio-data.",
  alternates: { canonical: "https://www.harnosandshf.se/scout" },
}

function WeekCard({ match, perspectiveKey }: { match: ScoutMatch; perspectiveKey: string }) {
  const side = sideOf(match, perspectiveKey) ?? (match.hhfSide || "home")
  const us = side === "home" ? match.home : match.away
  const them = side === "home" ? match.away : match.home
  const probs = probsFor(match.prediction, side)
  return (
    <Link
      href={`/scout/match/${match.id}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center justify-between gap-2">
        <Pill tone="emerald">{match.teamType ?? match.classKey}</Pill>
        <span className="text-xs font-semibold text-slate-500">
          {matchDate(match)} {match.time}
        </span>
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{side === "home" ? "Hemma mot" : "Borta mot"}</p>
      <p className="truncate text-lg font-black tracking-tight text-slate-950">{them.name}</p>
      <p className="truncate text-xs text-slate-500">{[match.venue, match.category?.name].filter(Boolean).join(" · ")}</p>
      <div className="mt-4">
        {probs ? (
          <>
            <ProbabilityBar
              left={{ label: us.name.replace(/^Härnösands HF/, "HHF"), p: probs.win, tone: us.isHhf ? "hhf" : "team" }}
              draw={probs.draw}
              right={{ label: them.name, p: probs.loss, tone: "team" }}
            />
            <p className="mt-2 text-xs text-slate-500">
              Väntat resultat ungefär <span className="font-bold text-slate-800">{Math.round(probs.us)}–{Math.round(probs.them)}</span>
            </p>
          </>
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {them.name} har inte spelat i år än – ingen prognos, men analysen visar förra säsongen.
          </p>
        )}
      </div>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
        Öppna matchanalysen <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

export default async function ScoutHubPage() {
  let data: OverviewPayload | null = null
  let failed = false
  try {
    data = await scoutFetch<OverviewPayload>("/overview")
  } catch {
    failed = true
  }

  const evalPrev = data?.model.previous
  const evalCur = data?.model.current

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_36%,#f8fafc_100%)]">
        {/* Hero */}
        <div className="relative overflow-hidden bg-slate-950 pb-12 pt-28 text-white sm:pb-16 sm:pt-32">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" aria-hidden />
          <div className="container relative mx-auto max-w-6xl overflow-visible px-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.35em] text-emerald-400">Härnösands HF</span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/80 ring-1 ring-white/15">Motståndaranalys</span>
            </div>
            <h1 className="mt-3 text-5xl font-black tracking-tight sm:text-7xl">
              HHF <span className="bg-gradient-to-r from-emerald-400 to-orange-300 bg-clip-text text-transparent">Scout</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/75 sm:text-lg">
              Varje match, varje mål och varje lag i våra serier – den här säsongen och förra – hämtat från Profixio och analyserat.
              Se vem motståndarna är, hur de spelar, vem som gör deras mål och hur stor chans vi har.
            </p>
            <div className="mt-6">{data && <ScoutSearch index={data.index} dark />}</div>
            {data && (
              <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { icon: Database, label: "Matcher", value: data.coverage.matches.toLocaleString("sv-SE"), sub: `${data.coverage.played.toLocaleString("sv-SE")} med resultat` },
                  { icon: Activity, label: "Matchloggar", value: data.coverage.withLogs.toLocaleString("sv-SE"), sub: "mål, utvisningar, 7 m" },
                  { icon: Users, label: "Lag", value: data.coverage.teams.toLocaleString("sv-SE"), sub: "i HHF:s serier" },
                  { icon: Trophy, label: "Spelare", value: data.coverage.players.toLocaleString("sv-SE"), sub: "med statistik" },
                  {
                    icon: Target,
                    label: "Rätt vinnare",
                    value: evalPrev?.accuracy != null ? pct(evalPrev.accuracy) : "–",
                    sub: evalPrev?.n ? `testat på ${evalPrev.n} matcher` : "",
                  },
                ].map((tile) => (
                  <div key={tile.label} className="rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/55">
                      <tile.icon className="h-3.5 w-3.5" aria-hidden />
                      {tile.label}
                    </dt>
                    <dd className="mt-1 text-2xl font-black">{tile.value}</dd>
                    <dd className="text-xs text-white/50">{tile.sub}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        <div className="container mx-auto max-w-6xl space-y-12 px-4 py-10">
          {failed && <EmptyNote>Analysdatan kunde inte hämtas just nu. Försök igen om en stund.</EmptyNote>}
          {!failed && !data && <EmptyNote>Analysen byggs – kom tillbaka om en stund.</EmptyNote>}

          {data && (
            <>
              <Section
                eyebrow="Kommande"
                title="Veckans matcher"
                description="Vinstchanserna kommer från en modell som har testats på hundratals matcher i efterhand. Klicka för hela analysen av motståndaren."
              >
                {data.week.length ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.week.map((m) => {
                      const hhfKey = m.hhfSide === "away" ? m.away.key : m.home.key
                      return <WeekCard key={m.id} match={m} perspectiveKey={hhfKey ?? ""} />
                    })}
                  </div>
                ) : (
                  <EmptyNote>Inga HHF-matcher de närmaste sju dagarna.</EmptyNote>
                )}
              </Section>

              <Section eyebrow="Alla lag" title="Välj lag" description="Tabellplacering, styrka, form och nästa motståndare för varje HHF-lag med seriespel.">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.teams.map((team) => {
                    const brief = team.brief
                    const next = team.next
                    const nextSide = next ? sideOf(next, team.key) : null
                    const nextOpp = next ? (nextSide === "away" ? next.home : next.away) : null
                    const probs = next ? probsFor(next.prediction, nextSide) : null
                    return (
                      <Link
                        key={team.slug}
                        href={`/scout/${team.slug}`}
                        className="group flex flex-col rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/60 p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-lg font-black tracking-tight text-slate-950">{team.label}</p>
                            <p className="truncate text-xs text-slate-500">{team.categories.map((c) => c.name).join(" · ")}</p>
                          </div>
                          {brief.position && (
                            <div className="shrink-0 text-right">
                              <p className="text-2xl font-black leading-none text-emerald-700">{brief.position}</p>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">av {brief.positionOf}</p>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                          {brief.record && brief.record.played > 0 ? (
                            <span>
                              <span className="font-bold text-slate-900">
                                {brief.record.won}-{brief.record.drawn}-{brief.record.lost}
                              </span>{" "}
                              ({brief.record.gf}–{brief.record.ga})
                            </span>
                          ) : (
                            <span>Inga spelade matcher än</span>
                          )}
                          {brief.rating?.rank && (
                            <span>
                              Styrka <span className="font-bold text-slate-900">#{brief.rating.rank}</span> av {brief.rating.rankOf}
                            </span>
                          )}
                          {brief.record && <FormChips form={brief.record.form} size="sm" />}
                        </div>
                        {next && nextOpp ? (
                          <div className="mt-4 rounded-xl border border-slate-100 bg-white/80 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                              Nästa: {matchDate(next)} {next.time}
                            </p>
                            <p className="truncate text-sm font-bold text-slate-900">
                              {nextSide === "home" ? "mot" : "borta mot"} {nextOpp.name}
                            </p>
                            {probs ? (
                              <div className="mt-2">
                                <ProbabilityBar size="sm" left={{ label: "Vinst", p: probs.win, tone: "hhf" }} draw={probs.draw} right={{ label: "Förlust", p: probs.loss, tone: "team" }} />
                                <p className="mt-1 text-xs text-slate-500">
                                  <span className="font-bold text-emerald-700">{pct(probs.win)}</span> vinstchans enligt modellen
                                </p>
                              </div>
                            ) : (
                              <p className="mt-1 text-xs text-slate-500">För lite data för en prognos ännu.</p>
                            )}
                          </div>
                        ) : (
                          <p className="mt-4 text-xs text-slate-500">Inga fler matcher inlagda.</p>
                        )}
                        {team.topScorer && (
                          <p className="mt-3 text-xs text-slate-500">
                            Skyttekung: <span className="font-semibold text-slate-800">{team.topScorer.name}</span> {team.topScorer.goals} mål
                          </p>
                        )}
                        <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          Öppna lagets scouting <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </Section>

              <Section eyebrow="Facit" title="Senaste resultaten" description="Hur det gick – och vad modellen trodde före matchen.">
                <MatchList matches={data.recent} perspective="hhf" empty="Inga spelade matcher än." showSeries showTeam />
              </Section>

              <Section
                eyebrow="Metod"
                title="Så räknar HHF Scout"
                description="Inga gissningar: allt bygger på riktiga matcher från Profixio, och modellen är testad på matcher den inte hade sett."
              >
                <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                  <Card className="p-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-emerald-50/70 p-3 ring-1 ring-emerald-100">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Förra säsongen</p>
                        <p className="mt-1 text-2xl font-black text-emerald-800">{evalPrev?.accuracy != null ? pct(evalPrev.accuracy) : "–"}</p>
                        <p className="text-xs text-slate-600">rätt vinnare i {evalPrev?.n ?? 0} matcher</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Den här säsongen</p>
                        <p className="mt-1 text-2xl font-black text-slate-900">{evalCur?.accuracy != null ? pct(evalCur.accuracy) : "–"}</p>
                        <p className="text-xs text-slate-600">rätt vinnare i {evalCur?.n ?? 0} matcher</p>
                      </div>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      <li>
                        <span className="font-semibold text-slate-900">Varje match räknas.</span> Alla lag i HHF:s serier och grupper, med alla sina matcher – inte bara mot oss.
                      </li>
                      <li>
                        <span className="font-semibold text-slate-900">Styrka i mål.</span> Varje lag får en anfalls- och en försvarsstyrka utifrån resultaten, justerat för hur bra motståndet var och för hemmaplan.
                      </li>
                      <li>
                        <span className="font-semibold text-slate-900">Testad i efterhand.</span> Före varje matchdag har modellen bara fått se tidigare matcher. Jämförelse: att alltid tippa
                        laget med bäst målskillnad gav {evalPrev?.gdBaselineAccuracy != null ? pct(evalPrev.gdBaselineAccuracy) : "–"} rätt.
                      </li>
                      <li>
                        <span className="font-semibold text-slate-900">Ärlig osäkerhet.</span> Med få spelade matcher blir procenten försiktigare. Lag utan matcher i år får ingen prognos.
                      </li>
                      <li>
                        <span className="font-semibold text-slate-900">Seriesimulering.</span> Resterande matcher spelas 4 000 gånger i datorn för att räkna fram chansen att vinna serien.
                      </li>
                    </ul>
                  </Card>
                  <Card className="p-5">
                    <p className="text-sm font-bold text-slate-900">Stämmer procenten?</p>
                    <p className="mb-3 text-xs text-slate-500">Förra säsongen, {evalPrev?.n ?? 0} matcher: hur ofta favoriten vann jämfört med vad modellen sa.</p>
                    {evalPrev?.calibration && evalPrev.calibration.length > 0 ? <CalibrationChart bins={evalPrev.calibration} /> : <p className="text-sm text-slate-500">För få matcher.</p>}
                  </Card>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  Data: Profixio · senast uppdaterad {updatedLabel(data.generatedAt)} · säsong {seasonLabel(data.currentSeason)} och {seasonLabel(data.previousSeason)} ·{" "}
                  {num(data.coverage.withLogs, 0)} matcher med fullständig matchlogg.
                </p>
              </Section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
