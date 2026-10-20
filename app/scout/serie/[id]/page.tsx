import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { BackLink, EmptyNote, Section, StatTile, TeamLink } from "@/components/scout/ui"
import { MatchList } from "@/components/scout/blocks"
import { CategoryPanel } from "@/components/scout/team-sections"
import { classLabel, num, pct, scoutFetch, seasonLabel, updatedLabel, ScoutUnavailable, type SeriesPayload } from "@/lib/scout"

export const revalidate = 60

type Params = { id: string }

async function load(id: string) {
  if (!/^\d+$/.test(id)) return null
  try {
    return await scoutFetch<SeriesPayload>(`/serie/${id}`)
  } catch (error) {
    if (error instanceof ScoutUnavailable) return undefined
    throw error
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params
  const data = await load(id)
  return {
    title: `${data?.category.name ?? "Serie"} – HHF Scout`,
    description: "Tabell, styrkeranking, seriesimulering, skytteliga och alla matcher.",
    alternates: { canonical: `https://www.harnosandshf.se/scout/serie/${id}` },
    robots: { index: false, follow: true },
  }
}

export default async function ScoutSeriesPage({ params }: { params: Promise<Params> }) {
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
  const c = data.category
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_36%,#f8fafc_100%)]">
        <div className="h-24" />
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <BackLink href="/scout">HHF Scout</BackLink>
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-emerald-600">
            Serie · {classLabel(c.classKey)} · {seasonLabel(c.season)}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">{c.name}</h1>
          {c.leagueName && <p className="mt-2 text-sm text-slate-500">{c.leagueName}</p>}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Matcher" value={`${c.playedCount}/${c.matchCount}`} sub="spelade" />
            <StatTile label="Matchloggar" value={String(c.loggedCount)} sub="med mål och händelser" />
            <StatTile label="Mål per match" value={num(c.goalsPerMatch)} />
            <StatTile label="Hemmavinster" value={pct(c.homeWinShare)} sub={`oavgjort ${pct(c.drawShare)}`} />
          </div>

          <div className="mt-10 space-y-12">
            <Section eyebrow="Läget" title="Tabell, styrka och simulering">
              <CategoryPanel category={c} />
            </Section>

            {c.scorers && c.scorers.length > 0 && (
              <Section eyebrow="Skytteliga" title="Seriens målskyttar" description="Mål i alla tävlingar i klassen den här säsongen, från matchloggarna.">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="w-8 px-3 py-2.5">#</th>
                          <th className="px-3 py-2.5">Spelare</th>
                          <th className="px-3 py-2.5">Lag</th>
                          <th className="px-2 py-2.5 text-center">M</th>
                          <th className="px-2 py-2.5 text-center">Mål</th>
                          <th className="px-2 py-2.5 text-center">/match</th>
                          <th className="hidden px-2 py-2.5 text-center sm:table-cell">7 m</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 tabular-nums">
                        {c.scorers.map((p, index) => (
                          <tr key={`${p.teamKey}-${p.name}-${index}`} className={p.isHhf ? "bg-emerald-50/50" : ""}>
                            <td className="px-3 py-2 text-xs text-slate-400">{index + 1}</td>
                            <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                              {p.no ? <span className="mr-1 text-xs text-slate-400">#{p.no}</span> : null}
                              {p.name}
                            </td>
                            <td className="max-w-[180px] truncate whitespace-nowrap px-3 py-2 text-slate-600">
                              <TeamLink teamKey={p.teamKey} name={p.team} isHhf={p.isHhf} />
                            </td>
                            <td className="px-2 py-2 text-center text-slate-600">{p.games}</td>
                            <td className="px-2 py-2 text-center font-black text-slate-950">{p.goals}</td>
                            <td className="px-2 py-2 text-center text-slate-700">{num(p.gpg)}</td>
                            <td className="hidden px-2 py-2 text-center text-slate-600 sm:table-cell">{p.penAtt ? `${p.pen}/${p.penAtt}` : "–"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Section>
            )}

            <Section eyebrow="Spelschema" title="Kommande matcher">
              <MatchList matches={c.fixtures ?? []} perspective="hhf" empty="Inga fler matcher." analysisLinks />
            </Section>

            <Section eyebrow="Resultat" title="Alla spelade matcher">
              <MatchList matches={c.results ?? []} perspective="hhf" empty="Inga spelade matcher." />
            </Section>

            <p className="text-xs text-slate-400">Data från Profixio · uppdaterad {updatedLabel(data.generatedAt)}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
