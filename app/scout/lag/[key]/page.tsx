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
import { GoalTimingChart } from "@/components/scout/charts/goal-timing-chart"
import { ScorersChart } from "@/components/scout/charts/scorers-chart"
import { SeasonChart, type SeasonPoint } from "@/components/scout/charts/season-chart"
import {
  classLabel,
  confidenceText,
  matchDate,
  num,
  outcomeFor,
  scoreFor,
  scoutFetch,
  seasonLabel,
  sideOf,
  signed,
  updatedLabel,
  ScoutUnavailable,
  type ProfilePayload,
} from "@/lib/scout"

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
  return {
    title: `${name} – HHF Scout`,
    description: "Lagprofil: resultat, målskyttar, styrka och matchbild från Profixio.",
    alternates: { canonical: `https://www.harnosandshf.se/scout/lag/${key}` },
    robots: { index: false, follow: true },
  }
}

export default async function ScoutProfilePage({ params }: { params: Promise<Params> }) {
  const { key } = await params
  const data = await load(key)
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
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_36%,#f8fafc_100%)]">
        <div className="h-24" />
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <BackLink href="/scout">HHF Scout</BackLink>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className={`text-[11px] font-bold uppercase tracking-[0.35em] ${entity.isHhf ? "text-emerald-600" : "text-sky-700"}`}>
                Lagprofil · {classLabel(entity.classKey)} · {seasonLabel(entity.season)}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">{entity.name}</h1>
              <p className="mt-2 text-sm text-slate-500">
                {entity.categories.map((c) => c.name).join(" · ")}
                {entity.names.length > 1 && ` · även listat som ${entity.names.filter((n) => n !== entity.name).join(", ")}`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {!isCurrent && <Pill tone="amber">Avslutad säsong</Pill>}
              <FormChips form={rec.form.map((f) => f.outcome)} />
            </div>
          </div>

          {entity.isHhf && entity.slug && isCurrent && (
            <Link href={`/scout/${entity.slug}`} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700">
              Öppna HHF-lagets scouting <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {entity.nextSameName && (
            <Link href={`/scout/lag/${entity.nextSameName.key}`} className="ml-2 mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:underline">
              Samma lag i år <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Tabell" value={entity.position ? `${entity.position}:a` : "–"} sub={entity.positionOf ? `av ${entity.positionOf}` : undefined} highlight={entity.isHhf} />
            <StatTile label="Resultat" value={`${rec.won}-${rec.drawn}-${rec.lost}`} sub={`${rec.played} matcher · ${rec.points} poäng`} />
            <StatTile label="Mål" value={`${rec.gf}–${rec.ga}`} sub={`${num(rec.gfPerGame)} gjorda, ${num(rec.gaPerGame)} insläppta per match`} />
            <StatTile
              label="Styrka"
              value={entity.rating ? signed(entity.rating.r) : "–"}
              sub={entity.rating ? `#${entity.rating.rank ?? "–"} av ${entity.rating.rankOf ?? "–"} · ${confidenceText(entity.rating)}` : "inga matcher"}
            />
          </div>

          <div className="mt-10 space-y-12">
            {vsHhf.length > 0 && (
              <Section eyebrow="Mot HHF" title="Kommande matcher mot Härnösands HF">
                <MatchList matches={vsHhf} perspective={entity.key} showSeries />
              </Section>
            )}

            <Section eyebrow="Analys" title="Styrkor och svagheter" description="Från matchloggarna, jämfört med snittet i serien.">
              <div className="grid gap-4 lg:grid-cols-2">
                <InsightList insights={entity.insights} perspective={entity.isHhf ? "team" : "opponent"} />
                <Card className="p-4">
                  <p className="mb-2 text-sm font-bold text-slate-900">När målen kommer</p>
                  {entity.profile ? (
                    <GoalTimingChart scored={entity.profile.timing.buckets} conceded={entity.profile.timing.against} periodMinutes={entity.profile.periodMinutes} matches={entity.profile.matches} tone={tone} />
                  ) : (
                    <p className="text-sm text-slate-500">Ingen matchlogg.</p>
                  )}
                </Card>
              </div>
              <div className="mt-4">
                <ProfileTiles entity={entity} />
              </div>
            </Section>

            <Section eyebrow="Spelarna" title="Målskyttar och statistik" description={`Från ${entity.logged} matcher med matchlogg.`}>
              {entity.players.length ? (
                <div className="space-y-4">
                  <Card className="p-4">
                    <ScorersChart players={entity.players} tone={tone} />
                  </Card>
                  <PlayerTable players={entity.players} highlight={entity.isHhf} />
                </div>
              ) : (
                <EmptyNote>Ingen matchlogg med spelare.</EmptyNote>
              )}
            </Section>

            <Section eyebrow="Facit" title="Alla matcher" description="Varje spelad match i alla tävlingar i klassen.">
              {points.length > 0 && (
                <Card className="mb-4 p-4">
                  <SeasonChart points={points} />
                </Card>
              )}
              <MatchList matches={results} perspective={entity.key} empty="Inga spelade matcher." showSeries />
              {upcoming.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-bold text-slate-900">Kommande</p>
                  <MatchList matches={upcoming} perspective={entity.key} showSeries />
                </div>
              )}
            </Section>

            {categories.length > 0 && (
              <Section eyebrow="Serien" title="Tabell och styrka">
                <Tabs
                  tabs={categories.map((category) => ({
                    id: String(category.id),
                    label: category.name,
                    content: <CategoryPanel category={category} highlightKey={entity.isHhf ? null : entity.key} />,
                  }))}
                />
              </Section>
            )}

            {(entity.previousSameName || entity.squadHistory.length > 0) && (
              <Section eyebrow="Historik" title="Förra säsongen">
                <div className="space-y-2">
                  {entity.previousSameName && (
                    <Link href={`/scout/lag/${entity.previousSameName.key}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300">
                      <span className="text-sm text-slate-700">
                        <span className="font-bold text-slate-950">{entity.previousSameName.name}</span> {classLabel(entity.previousSameName.classKey)} {seasonLabel(entity.previousSameName.season)}
                        {entity.previousSameName.record && ` · ${entity.previousSameName.record.won}-${entity.previousSameName.record.drawn}-${entity.previousSameName.record.lost}`}
                        {entity.previousSameName.position && ` · ${entity.previousSameName.position}:a av ${entity.previousSameName.positionOf}`}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  )}
                  {entity.squadHistory.length > 0 && (
                    <p className="text-xs text-slate-500">
                      Årets spelare kommer från:{" "}
                      {entity.squadHistory.map((s, index) => (
                        <span key={s.key}>
                          {index > 0 && ", "}
                          <Link href={`/scout/lag/${s.key}`} className="font-semibold text-slate-700 hover:underline">
                            {s.name} {classLabel(s.classKey)}
                          </Link>{" "}
                          ({s.shared} spelare)
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </Section>
            )}

            <p className="text-xs text-slate-400">Data från Profixio · uppdaterad {updatedLabel(data.generatedAt)}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
