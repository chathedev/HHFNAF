import type { Metadata } from "next"
import Link from "@/components/quiet-link"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { EmptyNote, Figures, PageHeader, Section } from "@/components/scout/ui"
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
  return { title: `${data?.category.name ?? "Serie"} – HHF Scout`, description: "Tabell, styrka, chans att vinna serien, skytteliga och alla matcher.", alternates: { canonical: `https://www.harnosandshf.se/scout/serie/${id}` }, robots: { index: false, follow: true } }
}

export default async function ScoutSeriesPage({ params }: { params: Promise<Params> }) {
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
  const c = data.category
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="h-24" />
        <div className="container mx-auto max-w-4xl px-4 pb-14 pt-4">
          <PageHeader back={{ href: "/scout", label: "HHF Scout" }} title={c.name} sub={`${classLabel(c.classKey)} · säsong ${seasonLabel(c.season)}`} />
          <div className="space-y-10">
            {!c.resultsHidden && (
              <Figures
                items={[
                  { label: "Spelade matcher", value: `${c.playedCount} av ${c.matchCount}` },
                  { label: "Med matchlogg", value: String(c.loggedCount) },
                  { label: "Mål per match", value: num(c.goalsPerMatch) },
                  { label: "Hemmalaget vinner", value: pct(c.homeWinShare), sub: `oavgjort ${pct(c.drawShare)}` },
                ]}
              />
            )}

            <Section title="Tabell och styrka">
              <CategoryPanel category={c} />
            </Section>

            {!c.resultsHidden && c.scorers && c.scorers.length > 0 && (
              <Section title="Skytteliga" note="Mål i alla tävlingar i klassen i år, från matchloggarna.">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] font-medium text-slate-400">
                        <th className="w-8 py-2 pr-2">#</th>
                        <th className="py-2 pr-2">Spelare</th>
                        <th className="py-2 pr-2">Lag</th>
                        <th className="px-1.5 py-2 text-center">M</th>
                        <th className="px-1.5 py-2 text-center">Mål</th>
                        <th className="px-1.5 py-2 text-center">/match</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {c.scorers.map((p, index) => (
                        <tr key={`${p.teamKey}-${p.name}-${index}`} className={`border-b border-slate-100 ${p.isHhf ? "font-semibold text-slate-950" : "text-slate-700"}`}>
                          <td className="py-2 pr-2 text-xs text-slate-400">{index + 1}</td>
                          <td className="whitespace-nowrap py-2 pr-2">
                            {p.no ? <span className="mr-1 text-xs text-slate-400">#{p.no}</span> : null}
                            {p.name}
                          </td>
                          <td className="max-w-[180px] truncate whitespace-nowrap py-2 pr-2">
                            <Link href={`/scout/lag/${p.teamKey}`} className="underline-offset-2 hover:underline">
                              {p.team}
                            </Link>
                          </td>
                          <td className="px-1.5 py-2 text-center">{p.games}</td>
                          <td className="px-1.5 py-2 text-center font-bold text-slate-950">{p.goals}</td>
                          <td className="px-1.5 py-2 text-center">{num(p.gpg)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            <Section title="Kommande matcher">
              <MatchList matches={c.fixtures ?? []} perspective="hhf" hideOdds={c.resultsHidden} empty="Inga fler matcher." />
            </Section>

            {!c.resultsHidden && (
              <Section title="Spelade matcher">
                <MatchList matches={c.results ?? []} perspective="hhf" empty="Inga spelade matcher." />
              </Section>
            )}

            <p className="text-xs text-slate-400">Data från Profixio · uppdaterad {updatedLabel(data.generatedAt)} · <Link href="/scout#uppgifter" className="underline underline-offset-2 hover:text-slate-600">Om uppgifterna</Link></p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
