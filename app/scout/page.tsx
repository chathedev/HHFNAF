import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { EmptyNote, FormChips, PageHeader, Section } from "@/components/scout/ui"
import { MatchList } from "@/components/scout/blocks"
import { CalibrationChart } from "@/components/scout/charts/calibration-chart"
import { ScoutSearch } from "@/components/scout/scout-search"
import { matchDate, pct, prob, probsFor, scoutFetch, sideOf, updatedLabel, type OverviewPayload } from "@/lib/scout"

export const revalidate = 60

export const metadata: Metadata = {
  title: "HHF Scout – motståndaranalys",
  description: "Inför matchen: motståndarens resultat, målskyttar och form, och hur stor chans vi har. För alla Härnösands HF:s lag, byggt på Profixio.",
  alternates: { canonical: "https://www.harnosandshf.se/scout" },
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
        <div className="container mx-auto max-w-4xl px-4 pb-16 pt-6">
          <PageHeader
            title="HHF Scout"
            sub="Inför matchen: se hur motståndaren har spelat, vem som gör deras mål och hur stor chans vi har. Alla HHF-lag, byggt på varje match i Profixio."
          />

          {failed && <EmptyNote>Analysen kunde inte hämtas just nu. Försök igen om en stund.</EmptyNote>}
          {!failed && !data && <EmptyNote>Analysen byggs – kom tillbaka om en stund.</EmptyNote>}

          {data && (
            <div className="space-y-12">
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

              <ScoutSearch index={data.index} />

              <Section title="Den här veckan">
                <MatchList matches={data.week} perspective="hhf" showTeam showSeries empty="Inga HHF-matcher de närmaste sju dagarna." />
              </Section>

              <Section title="Lagen">
                <ul>
                  {data.teams.map((team) => {
                    const brief = team.brief
                    const next = team.next
                    const side = next ? sideOf(next, team.key) : null
                    const opp = next ? (side === "away" ? next.home : next.away) : null
                    const probs = next ? probsFor(next.prediction, side) : null
                    return (
                      <li key={team.slug}>
                        <Link href={`/scout/${team.slug}`} className="flex items-center gap-4 border-b border-slate-200 py-3.5 transition hover:bg-slate-50">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-950 sm:text-[15px]">{team.label}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {brief.position && brief.record && brief.record.played > 0 ? `${brief.position}:a av ${brief.positionOf} · ` : ""}
                              {next && opp ? `Nästa: ${opp.name}, ${matchDate(next)}` : "Inga fler matcher inlagda"}
                            </p>
                          </div>
                          <div className="hidden shrink-0 sm:block">{brief.record && brief.record.played > 0 && <FormChips form={brief.record.form} />}</div>
                          <div className="w-24 shrink-0 text-right text-xs text-slate-500">
                            {probs ? (
                              <>
                                <span className="text-sm font-bold tabular-nums text-slate-950">{prob(probs.win)}</span> vinst
                              </>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </Section>

              <Section title="Senaste resultaten">
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
                    {evalPrev?.calibration && evalPrev.calibration.length > 0 && <CalibrationChart bins={evalPrev.calibration} height={200} />}
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
