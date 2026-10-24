import { Seal } from "@/lib/seal-server"
import type { Metadata } from "next"
import Link from "@/components/quiet-link"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { EmptyNote, FormChips, OutcomeChip, PageHeader, Section } from "@/components/scout/ui"
import { MatchList } from "@/components/scout/blocks"
import { CalibrationChart, CalibrationChartSealed } from "@/components/scout/charts/calibration-chart"
import { ProbabilityBar } from "@/components/scout/charts/probability-bar"
import { ScoutSearch, ScoutSearchSealed } from "@/components/scout/scout-search"
import { guessHit, guessScore, matchDate, outcomeFor, pct, prob, probsFor, scoreFor, scoutFetch, sideOf, updatedLabel, type OverviewPayload } from "@/lib/scout"

export const revalidate = 60

export const metadata: Metadata = {
  title: "HHF Scout – motståndaranalys",
  description: "Inför matchen: motståndarens resultat, målskyttar och form, och hur stor chans vi har. För alla Härnösands HF:s lag, byggt på Profixio.",
  alternates: { canonical: "https://www.harnosandshf.se/scout" },
}

type Probs = ReturnType<typeof probsFor>

function Odds({ probs }: { probs: Probs }) {
  if (!probs) return <span className="w-24 shrink-0 text-right text-xs text-slate-400 sm:w-32">–</span>
  return (
    <div className="w-24 shrink-0 text-right sm:w-32">
      <p className="text-xs text-slate-500">
        <span className="text-sm font-bold tabular-nums text-slate-950">{prob(probs.win)}</span> vinst
      </p>
      <div className="mt-1">
        <ProbabilityBar size="sm" left={{ label: "Vinst", p: probs.win, tone: "hhf" }} draw={probs.draw} right={{ label: "Förlust", p: probs.loss, tone: "team" }} />
      </div>
    </div>
  )
}

type WeekMatch = OverviewPayload["week"][number]

// A match from today that has been played: the result, and what we guessed before it.
function PlayedToday({ m, side }: { m: WeekMatch; side: "home" | "away" }) {
  const key = (side === "away" ? m.away.key : m.home.key) ?? ""
  const outcome = outcomeFor(m, key)
  const pre = m.preMatch ?? null
  const guess = guessScore(pre, side)
  const pre_ = probsFor(pre, side)
  const us = side === "away" ? m.as : m.hs
  const them = side === "away" ? m.hs : m.as
  const hit = pre && us != null && them != null ? guessHit(pre, side, us, them) : null
  return (
    <div className="w-28 shrink-0 text-right sm:w-44">
      <div className="flex items-center justify-end gap-2">
        <span className="text-lg font-black tabular-nums text-slate-900">{scoreFor(m, key)}</span>
        {outcome && <OutcomeChip outcome={outcome} />}
      </div>
      {guess && pre_ ? (
        <p className="mt-0.5 text-[11px] text-slate-500">
          Gissning {guess}
          <span className="hidden sm:inline"> · {prob(pre_.win)} vinst</span>
          {hit != null && <span className={hit ? " font-semibold text-emerald-700" : " font-semibold text-slate-400"}>{hit ? " · rätt" : " · fel"}</span>}
        </p>
      ) : (
        <p className="mt-0.5 text-[11px] text-slate-400">Ingen gissning</p>
      )}
    </div>
  )
}

const DAY_FMT = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", weekday: "long", day: "numeric", month: "long" })

function weekByDay(matches: OverviewPayload["week"]) {
  const groups = new Map<string, OverviewPayload["week"]>()
  for (const m of matches) {
    const key = m.ts ? DAY_FMT.format(new Date(m.ts)) : m.day ?? ""
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }
  return Array.from(groups.entries())
}

function groupTeams(teams: OverviewPayload["teams"]) {
  const order: [string, (c: string) => boolean][] = [
    ["Seniorer", (c) => c === "HERR" || c === "DAM"],
    ["Flickor", (c) => c.startsWith("F")],
    ["Pojkar", (c) => c.startsWith("P")],
  ]
  return order.map(([name, fits]) => [name, teams.filter((t) => fits(t.classKey))] as const).filter(([, list]) => list.length > 0)
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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="h-24" />
        <div className="container mx-auto max-w-4xl px-4 pb-14 pt-4">
          <PageHeader
            title="HHF Scout"
            sub="Inför matchen: se hur motståndaren har spelat, vem som gör deras mål och hur stor chans vi har. Alla HHF-lag, byggt på varje match i Profixio."
          />

          {failed && <EmptyNote>Analysen kunde inte hämtas just nu. Försök igen om en stund.</EmptyNote>}
          {!failed && !data && <EmptyNote>Analysen byggs – kom tillbaka om en stund.</EmptyNote>}

          {data && (
            <div className="space-y-10">
              <ol className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                <li>
                  <span className="font-semibold text-slate-950">1. Välj ditt lag</span> nedan och se alla kommande matcher.
                </li>
                <li>
                  <span className="font-semibold text-slate-950">2. Klicka på en match</span> för att se motståndarens målskyttar, resultat och form.
                </li>
                <li>
                  <span className="font-semibold text-slate-950">3. Vinstchansen</span> är en uppskattning från alla resultat i serien – inget facit.
                </li>
              </ol>

              <Seal as={ScoutSearchSealed} index={data.index} />

              <Section title="Den här veckan" note="HHF:s matcher i dag och sju dagar framåt. Dagens spelade matcher visas med resultat och vår gissning till dagens slut." right={<Link href="/scout/register" className="text-xs font-medium text-slate-500 transition hover:text-slate-900">Register →</Link>}>
                {data.week.length ? (
                  <div className="space-y-6">
                    {weekByDay(data.week).map(([day, list]) => (
                      <div key={day}>
                        <p className="mb-1 text-sm font-semibold text-slate-950">{day.charAt(0).toUpperCase() + day.slice(1)}</p>
                        <ul>
                          {list.map((m) => {
                            const side = m.hhfSide === "away" ? "away" : "home"
                            const opp = side === "away" ? m.home : m.away
                            const probs = probsFor(m.prediction, side)
                            return (
                              <li key={m.id}>
                                <Link href={`/scout/match/${m.id}`} className="flex items-center gap-4 border-b border-slate-100 py-3 transition hover:bg-slate-50">
                                  <span className="w-12 shrink-0 text-sm tabular-nums text-slate-500">{m.time ?? ""}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-slate-950">
                                      <span className="font-semibold">{m.teamType}</span>
                                      <span className="text-slate-400"> {side === "home" ? "hemma mot" : "borta mot"} </span>
                                      <span className="font-semibold">{opp.name}</span>
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-slate-500">{[m.category?.name, m.venue].filter(Boolean).join(" · ")}</p>
                                  </div>
                                  {m.hs != null && m.as != null ? (
                                    <PlayedToday m={m} side={side} />
                                  ) : m.played || m.resultHidden ? (
                                    <span className="w-24 shrink-0 text-right text-xs text-slate-400 sm:w-32">Spelad</span>
                                  ) : m.ts && m.ts < Date.now() ? (
                                    <span className="w-24 shrink-0 text-right text-xs text-slate-400 sm:w-32">Pågår</span>
                                  ) : (
                                    <Odds probs={probs} />
                                  )}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-sm text-slate-500">Inga HHF-matcher de närmaste sju dagarna.</p>
                )}
              </Section>

              <Section title="Välj lag" note="Alla HHF-lag med seriespel. Siffran till höger är chansen att vinna nästa match.">
                <div className="space-y-8">
                  {groupTeams(data.teams).map(([group, teams]) => (
                    <div key={group}>
                      <p className="mb-1 text-sm font-semibold text-slate-950">{group}</p>
                      <ul>
                        {teams.map((team) => {
                          const brief = team.brief
                          const next = team.next
                          const side = next ? sideOf(next, team.key) : null
                          const opp = next ? (side === "away" ? next.home : next.away) : null
                          const probs = next ? probsFor(next.prediction, side) : null
                          const played = brief.record && brief.record.played > 0
                          return (
                            <li key={team.slug}>
                              <Link href={`/scout/${team.slug}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-slate-100 py-3 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950">{team.label}</p>
                                  <p className="text-xs text-slate-500">
                                    {played && brief.position ? `${brief.position}:a av ${brief.positionOf}` : "Inga resultat än"}
                                    {played && brief.record ? ` · ${brief.record.won}–${brief.record.drawn}–${brief.record.lost}` : ""}
                                  </p>
                                </div>
                                <p className="order-3 col-span-2 truncate text-xs text-slate-500 sm:order-none sm:col-span-1 sm:text-sm">
                                  {next && opp ? (
                                    <>
                                      Nästa: <span className="text-slate-800">{opp.name}</span>, {matchDate(next)}
                                    </>
                                  ) : (
                                    "Inga fler matcher inlagda"
                                  )}
                                </p>
                                <Odds probs={probs} />
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Senaste resultaten" right={<Link href="/scout/register" className="text-xs font-medium text-slate-500 transition hover:text-slate-900">Alla gissningar →</Link>}>
                <MatchList matches={data.recent} perspective="hhf" showTeam showSeries empty="Inga spelade matcher än." />
              </Section>

              <Section title="Hur säker är vinstchansen?">
                <div className="grid gap-8 sm:grid-cols-2">
                  <div className="space-y-3 text-sm text-slate-600">
                    <p>
                      Varje lag får en styrka utifrån alla sina resultat i serien – och hur bra motståndarna var. Av styrkorna räknas chansen fram för varje match.
                    </p>
                    <p>
                      Vi har testat det i efterhand på förra säsongens {evalPrev?.n ?? 0} matcher, där modellen bara fick se matcher spelade innan: den pekade ut rätt vinnare i{" "}
                      <span className="font-semibold text-slate-950">{pct(evalPrev?.accuracy)}</span> av fallen.
                    </p>
                    <p>Med få spelade matcher är siffrorna osäkrare, och lag som inte spelat i år får ingen procent alls.</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-slate-500">När modellen sa X %, hur ofta vann favoriten? Grå linje = perfekt.</p>
                    {evalPrev?.calibration && evalPrev.calibration.length > 0 && <Seal as={CalibrationChartSealed} bins={evalPrev.calibration} height={200} />}
                  </div>
                </div>
              </Section>

              <p className="text-xs text-slate-400">
                Data från Profixio · uppdaterad {updatedLabel(data.generatedAt)} · {data.coverage.matches.toLocaleString("sv-SE")} matcher, {data.coverage.withLogs.toLocaleString("sv-SE")} med matchlogg
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
