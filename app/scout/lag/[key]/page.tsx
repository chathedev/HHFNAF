import { Seal } from "@/lib/seal-server"
import type { Metadata } from "next"
import Link from "@/components/quiet-link"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { EmptyNote, Figures, FormChips, InsightList, PageHeader, Section } from "@/components/scout/ui"
import { MatchList } from "@/components/scout/blocks"
import { Tabs } from "@/components/scout/tabs"
import { CategoryPanel, ProfileTiles } from "@/components/scout/team-sections"
import { PlayerTable, PlayerTableSealed } from "@/components/scout/player-table"
import { GoalTimingChart, GoalTimingChartSealed } from "@/components/scout/charts/goal-timing-chart"
import { ScorersChart, ScorersChartSealed } from "@/components/scout/charts/scorers-chart"
import { SeasonChart, SeasonChartSealed, type SeasonPoint } from "@/components/scout/charts/season-chart"
import { classLabel, confidenceText, matchDate, num, outcomeFor, scoreFor, scoutFetch, seasonLabel, sideOf, signed, updatedLabel, ScoutUnavailable, type ProfilePayload } from "@/lib/scout"

export const revalidate = 60

type Params = { key: string }

async function load(key: string) {
  if (!/^[a-z0-9-]{3,120}$/.test(key)) return null
  try {
    return await scoutFetch<ProfilePayload>(`/lag/${encodeURIComponent(key)}`)
  } catch (error) {
    if (error instanceof ScoutUnavailable) return undefined
    throw error
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { key } = await params
  const data = await load(key)
  const name = data ? `${data.entity.name} ${classLabel(data.entity.classKey)} ${seasonLabel(data.entity.season)}` : "Lagprofil"
  return { title: `${name} – HHF Scout`, description: "Lagprofil: resultat, målskyttar, styrka och matchbild från Profixio.", alternates: { canonical: `https://www.harnosandshf.se/scout/lag/${key}` }, robots: { index: false, follow: true } }
}

export default async function ScoutProfilePage({ params }: { params: Promise<Params> }) {
  const { key } = await params
  const data = await load(key)
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
  const { entity, results, upcoming, vsHhf, categories } = data
  const rec = entity.record
  const isCurrent = entity.season === data.currentSeason
  const points: SeasonPoint[] = [...results].reverse().map((m) => {
    const side = sideOf(m, entity.key)
    const opp = side === "away" ? m.home : m.away
    const mine = side === "away" ? m.as ?? 0 : m.hs ?? 0
    const theirs = side === "away" ? m.hs ?? 0 : m.as ?? 0
    return { id: m.id, date: matchDate(m, true), opponent: opp.name, score: scoreFor(m, entity.key), gd: mine - theirs, outcome: outcomeFor(m, entity.key) ?? "D", home: side === "home" }
  })
  const tone = entity.isHhf ? "hhf" : "team"

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="h-24" />
        <div className="container mx-auto max-w-4xl px-4 pb-14 pt-4">
          <PageHeader
            back={{ href: "/scout", label: "HHF Scout" }}
            title={entity.name}
            sub={`${classLabel(entity.classKey)} · ${entity.categories.map((c) => c.name).join(" · ")} · säsong ${seasonLabel(entity.season)}${isCurrent ? "" : " (avslutad)"}`}
            right={rec.played > 0 ? <FormChips form={rec.form.map((f) => f.outcome)} /> : undefined}
          />

          <div className="space-y-10">
            {(entity.isHhf && entity.slug && isCurrent) || entity.nextSameName ? (
              <p className="-mt-6 flex gap-4 text-sm">
                {entity.isHhf && entity.slug && isCurrent && (
                  <Link href={`/scout/${entity.slug}`} className="font-medium text-emerald-700 underline-offset-2 hover:underline">
                    Öppna HHF-lagets sida →
                  </Link>
                )}
                {entity.nextSameName && (
                  <Link href={`/scout/lag/${entity.nextSameName.key}`} className="font-medium text-slate-700 underline-offset-2 hover:underline">
                    Samma lag i år →
                  </Link>
                )}
              </p>
            ) : null}

            <Figures
              items={[
                { label: "Tabell", value: entity.position ? `${entity.position}:a` : "–", sub: entity.positionOf ? `av ${entity.positionOf}${entity.positionGroup ? ` i grupp ${entity.positionGroup.replace(/^Grupp /, "")}` : ""}` : undefined },
                { label: "Vinst–oavgjort–förlust", value: `${rec.won}–${rec.drawn}–${rec.lost}`, sub: `${rec.played} matcher` },
                { label: "Mål", value: `${rec.gf}–${rec.ga}`, sub: `${num(rec.gfPerGame)} gjorda, ${num(rec.gaPerGame)} insläppta per match` },
                { label: "Styrka", value: entity.rating ? signed(entity.rating.r) : "–", sub: entity.rating ? `${entity.rating.rank ?? "–"}:a av ${entity.rating.rankOf ?? "–"} · ${confidenceText(entity.rating)}` : "inga matcher" },
              ]}
            />

            {vsHhf.length > 0 && (
              <Section title="Kommande matcher mot HHF">
                <MatchList matches={vsHhf} perspective={entity.key} showSeries />
              </Section>
            )}

            <Section title="Bra att veta" note="Från matchloggarna, jämfört med snittet i serien.">
              <InsightList insights={entity.insights} perspective={entity.isHhf ? "team" : "opponent"} />
            </Section>

            <Section title="Vem gör målen?" note={`Från ${entity.logged} matcher med matchlogg.`}>
              {entity.players.length ? (
                <div className="space-y-6">
                  <Seal as={ScorersChartSealed} players={entity.players} tone={tone} />
                  <Seal as={PlayerTableSealed} players={entity.players} />
                </div>
              ) : (
                <EmptyNote>Ingen matchlogg med spelare.</EmptyNote>
              )}
            </Section>

            <Section title="Alla matcher" note="Varje spelad match, alla tävlingar. Klicka för detaljer.">
              {points.length > 0 && (
                <div className="mb-4">
                  <Seal as={SeasonChartSealed} points={points} />
                </div>
              )}
              <MatchList matches={results} perspective={entity.key} showSeries empty="Inga spelade matcher." />
              {upcoming.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-1 text-sm font-semibold text-slate-900">Kommande</h3>
                  <MatchList matches={upcoming} perspective={entity.key} showSeries />
                </div>
              )}
            </Section>

            {entity.profile && (
              <Section title="Matchbild">
                <div className="space-y-8">
                  <Seal as={GoalTimingChartSealed} scored={entity.profile.timing.buckets} conceded={entity.profile.timing.against} periodMinutes={entity.profile.periodMinutes} matches={entity.profile.matches} tone={tone} />
                  <ProfileTiles entity={entity} />
                </div>
              </Section>
            )}

            {categories.length > 0 && (
              <Section title="Serien">
                <Tabs tabs={categories.map((category) => ({ id: String(category.id), label: category.name, content: <CategoryPanel category={category} highlightKey={entity.isHhf ? null : entity.key} /> }))} />
              </Section>
            )}

            {(entity.previousSameName || entity.squadHistory.length > 0) && (
              <Section title="Förra säsongen">
                {entity.previousSameName && (
                  <Link href={`/scout/lag/${entity.previousSameName.key}`} className="flex items-center justify-between border-b border-slate-200 py-3.5 text-sm transition hover:bg-slate-50">
                    <span className="text-slate-700">
                      {entity.previousSameName.name} {classLabel(entity.previousSameName.classKey)} {seasonLabel(entity.previousSameName.season)}
                      {entity.previousSameName.record && ` · ${entity.previousSameName.record.won}–${entity.previousSameName.record.drawn}–${entity.previousSameName.record.lost}`}
                      {entity.previousSameName.position && ` · ${entity.previousSameName.position}:a av ${entity.previousSameName.positionOf}`}
                    </span>
                    <span className="text-slate-400">→</span>
                  </Link>
                )}
                {entity.squadHistory.length > 0 && (
                  <p className="mt-3 text-xs text-slate-500">
                    Årets spelare spelade förra säsongen i:{" "}
                    {entity.squadHistory.map((s, index) => (
                      <span key={s.key}>
                        {index > 0 && ", "}
                        <Link href={`/scout/lag/${s.key}`} className="font-medium text-slate-700 hover:underline">
                          {s.name} {classLabel(s.classKey)}
                        </Link>{" "}
                        ({s.shared} spelare)
                      </span>
                    ))}
                  </p>
                )}
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
