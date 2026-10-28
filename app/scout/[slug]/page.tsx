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
import { ModelHistoryChartSealed, type ModelPoint } from "@/components/scout/charts/model-history-chart"
import { confidenceText, guessPair, matchDate, num, outcomeFor, scoreFor, scoutFetch, seasonLabel, sideOf, signed, updatedLabel, ScoutUnavailable, type TeamPayload } from "@/lib/scout"

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
    description: `Kommande motståndare, tabell, styrka och vinstchanser för Härnösands HF ${label}.`,
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
        <main className="min-h-screen bg-white px-4 pb-16 pt-32">
          <div className="container mx-auto max-w-4xl">
            <EmptyNote>Analysen kunde inte hämtas just nu. Försök igen om en stund.</EmptyNote>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const { team, entity, categories, upcoming, results } = data
  const rec = entity.record
  const resultsHidden = categories.length > 0 && categories.every((c) => c.resultsHidden)
  const mainCat = categories.find((c) => c.id === entity.mainCategory)

  const seasonPoints: SeasonPoint[] = [...results].reverse().map((m) => {
    const side = sideOf(m, entity.key)
    const opp = side === "away" ? m.home : m.away
    const mine = side === "away" ? m.as ?? 0 : m.hs ?? 0
    const theirs = side === "away" ? m.hs ?? 0 : m.as ?? 0
    return { id: m.id, date: matchDate(m, true), opponent: opp.name, score: scoreFor(m, entity.key), gd: mine - theirs, outcome: outcomeFor(m, entity.key) ?? "D", home: side === "home" }
  })

  // Matches in tabs: upcoming, played, and one tab per series (group stages say which group).
  const groupOf = (category: (typeof categories)[number]) =>
    category.groups && category.groups.length > 1 ? category.groups.find((g) => g.standings.some((row) => row.key === entity.key))?.label ?? null : null
  const playedList = (
    <div className="space-y-4">
      {!resultsHidden && seasonPoints.length > 1 && <Seal as={SeasonChartSealed} points={seasonPoints} />}
      <MatchList matches={results} perspective={entity.key} showSeries empty={resultsHidden ? "Resultaten publiceras inte för den här åldern." : "Inga spelade matcher än."} />
    </div>
  )
  const seriesTabs =
    categories.length > 1 || upcoming.some((m) => m.category && !categories.some((c) => c.id === m.category?.id))
      ? categories.map((category) => {
          const ofCat = (m: (typeof results)[number]) => m.category?.id === category.id
          const up = upcoming.filter(ofCat)
          const done = results.filter(ofCat)
          const group = groupOf(category)
          return {
            id: `serie-${category.id}`,
            label: (
              <>
                {category.name}
                {group ? ` · ${group}` : ""} <span className="font-normal text-slate-400">{up.length + done.length}</span>
              </>
            ),
            content: (
              <div className="space-y-6">
                {up.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">Kommande</p>
                    <MatchList matches={up} perspective={entity.key} hideOdds={resultsHidden} />
                  </div>
                )}
                {!resultsHidden && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">Spelade</p>
                    <MatchList matches={done} perspective={entity.key} empty="Inga spelade matcher i serien än." />
                  </div>
                )}
                {!resultsHidden && (
                  <Link href={`/scout/serie/${category.id}`} className="inline-block text-xs font-medium text-slate-500 hover:text-slate-900">
                    {group ? `Hela serien och tabellen för ${group.toLowerCase()} →` : "Hela serien och tabellen →"}
                  </Link>
                )}
              </div>
            ),
          }
        })
      : []
  const matchTabs = {
    initial: upcoming.length ? 0 : 1,
    tabs: [
      {
        id: "kommande",
        label: (
          <>
            Kommande <span className="font-normal text-slate-400">{upcoming.length}</span>
          </>
        ),
        content: <MatchList matches={upcoming} perspective={entity.key} showSeries hideOdds={resultsHidden} empty="Inga fler matcher inlagda i Profixio." />,
      },
      {
        id: "spelade",
        label: (
          <>
            Spelade <span className="font-normal text-slate-400">{results.length}</span>
          </>
        ),
        content: playedList,
      },
      ...seriesTabs,
    ],
  }

  // How the model has learned this team (strength and uncertainty before each match, and now).
  const history = entity.modelHistory
  const DAY = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", day: "numeric", month: "short" })
  const modelPoints: ModelPoint[] = history
    ? [
        ...history.points.map((p, i) => {
          const outcome = p.us > p.them ? "W" : p.us < p.them ? "L" : "D"
          // same rule as the register: the most likely of win, draw and loss
          const win = p.pWin ?? 0
          const draw = p.pDraw ?? 0
          const loss = p.pLoss ?? 0
          const guessed = p.pWin == null ? (p.expUs >= p.expThem ? "W" : "L") : win >= loss && win >= draw ? "W" : loss >= draw ? "L" : "D"
          return {
            id: p.id,
            label: String(i + 1),
            opponent: p.opponent,
            date: p.ts ? DAY.format(new Date(p.ts)) : p.day,
            r: p.r,
            band: p.band,
            games: p.games,
            pWin: p.pWin,
            guess: guessPair(p.expUs, p.expThem, guessed).join("–"),
            result: `${p.us}–${p.them}`,
            outcome,
          } as ModelPoint
        }),
        ...(history.now
          ? [{ id: 0, label: "Nu", opponent: null, date: null, r: history.now.r, band: history.now.band, games: history.now.games, pWin: null, guess: null, result: null, outcome: null, now: true } as ModelPoint]
          : []),
      ]
    : []
  const firstPoint = history?.points[0]

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="h-24" />
        <div className="container mx-auto max-w-4xl px-4 pb-14 pt-4">
          <PageHeader
            back={{ href: "/scout", label: "HHF Scout" }}
            title={team.label}
            sub={`${entity.categories.map((c) => c.name).join(" · ")} · säsong ${seasonLabel(data.currentSeason)}`}
            right={!resultsHidden && rec.played > 0 ? <FormChips form={rec.form.map((f) => f.outcome)} /> : undefined}
          />

          <nav aria-label="Andra HHF-lag" className="-mt-4 mb-8 flex gap-4 overflow-x-auto whitespace-nowrap border-b border-slate-200 pb-2 text-xs">
            {data.otherTeams.map((t) => (
              <Link key={t.slug} href={`/scout/${t.slug}`} className={t.slug === team.slug ? "font-semibold text-slate-950" : "text-slate-500 hover:text-slate-900"}>
                {t.label}
              </Link>
            ))}
          </nav>

          <div className="space-y-10">
            {resultsHidden ? (
              <p className="border-y border-slate-200 py-4 text-sm text-slate-600">
                Förbundet publicerar inga resultat för de yngsta lagen. Därför visar Scout bara spelschemat här – inga tabeller, styrkor eller vinstchanser.
              </p>
            ) : (
              <Figures
                items={[
                  { label: "Tabell", value: entity.position ? `${entity.position}:a` : "–", sub: entity.positionOf ? `av ${entity.positionOf}${entity.positionGroup ? ` i grupp ${entity.positionGroup.replace(/^Grupp /, "")}` : ""}${mainCat ? `${entity.positionGroup ? ", " : " i "}${mainCat.name}` : ""}` : undefined },
                  { label: "Vinst–oavgjort–förlust", value: `${rec.won}–${rec.drawn}–${rec.lost}`, sub: `${rec.played} matcher, alla tävlingar` },
                  { label: "Mål", value: `${rec.gf}–${rec.ga}`, sub: `${num(rec.gfPerGame)} gjorda, ${num(rec.gaPerGame)} insläppta per match` },
                  {
                    label: "Styrka",
                    value: entity.rating ? signed(entity.rating.r) : "–",
                    sub: entity.rating ? `${entity.rating.rank ?? "–"}:a av ${entity.rating.rankOf ?? "–"} · ${confidenceText(entity.rating)}` : "inga matcher än",
                  },
                ]}
              />
            )}

            <Section
              title="Matcher"
              id="matcher"
              note={resultsHidden ? undefined : "Kommande med vinstchans, spelade med resultat och vår gissning. Välj en serie för att bara se den. Klicka på en match för att scouta motståndaren."}
            >
              <Tabs ariaLabel="Välj matcher" initial={matchTabs.initial} tabs={matchTabs.tabs} />
            </Section>

            {!resultsHidden && (
              <>
                <Section title="Serien" id="serien">
                  {categories.length ? (
                    <Tabs tabs={categories.map((category) => ({ id: String(category.id), label: category.name, content: <CategoryPanel category={category} /> }))} />
                  ) : (
                    <EmptyNote>Ingen serie hittades.</EmptyNote>
                  )}
                </Section>

                {history && history.now && modelPoints.length > 1 && (
                  <Section title="Så har modellen lärt sig" id="modellen" note="Modellen tränas om automatiskt efter varje nytt resultat. Ju fler matcher laget spelar, desto mindre blir osäkerheten och desto säkrare blir procenten. Spelar laget bättre än väntat stiger styrkan, och då stiger vinstchansen i nästa match. De första matcherna utgår modellen från förra säsongen, så osäkerheten börjar krympa efter ett par matcher.">
                    <div className="space-y-5">
                      <Figures
                        items={[
                          { label: "Styrka nu", value: signed(history.now.r), sub: firstPoint ? `från ${signed(firstPoint.r)} före första matchen med prognos` : "mål mot ett snittlag" },
                          { label: "Osäkerhet", value: `±${num(history.now.band)} mål`, sub: firstPoint ? `från ±${num(firstPoint.band)} i början` : undefined },
                          { label: "Lärt sig av", value: `${history.now.games} ${history.now.games === 1 ? "match" : "matcher"}`, sub: "i år" },
                          { label: "Senast omtränad", value: updatedLabel(history.now.at), sub: "efter nytt resultat" },
                        ]}
                      />
                      <Seal as={ModelHistoryChartSealed} points={modelPoints} />
                    </div>
                  </Section>
                )}

                <Section title="Spelarna" note={`Från ${entity.logged} matcher med matchlogg. "Förra säsongen" räknar alla lag spelaren var med i.`}>
                  <div className="space-y-6">
                    <Seal as={ScorersChartSealed} players={entity.players} tone="hhf" />
                    <Seal as={PlayerTableSealed} players={entity.players} />
                  </div>
                </Section>

                <Section title="Så spelar laget" note="Räknat från matchloggarna och jämfört med snittet i serien.">
                  <div className="space-y-8">
                    <InsightList insights={entity.insights} />
                    {entity.profile && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-slate-900">När målen kommer</h3>
                        <Seal as={GoalTimingChartSealed} scored={entity.profile.timing.buckets} conceded={entity.profile.timing.against} periodMinutes={entity.profile.periodMinutes} matches={entity.profile.matches} tone="hhf" />
                      </div>
                    )}
                    <ProfileTiles entity={entity} />
                  </div>
                </Section>
              </>
            )}

            {entity.previousSameName && (
              <Section title={`Förra säsongen (${seasonLabel(entity.previousSameName.season)})`}>
                <Link href={`/scout/lag/${entity.previousSameName.key}`} className="flex items-center justify-between border-b border-slate-200 py-3.5 text-sm transition hover:bg-slate-50">
                  <span className="text-slate-700">
                    {entity.previousSameName.name}
                    {entity.previousSameName.record && ` · ${entity.previousSameName.record.won}–${entity.previousSameName.record.drawn}–${entity.previousSameName.record.lost}`}
                    {entity.previousSameName.position && ` · ${entity.previousSameName.position}:a av ${entity.previousSameName.positionOf}`}
                  </span>
                  <span className="text-slate-400">→</span>
                </Link>
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
