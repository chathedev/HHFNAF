import { Seal } from "@/lib/seal-server"
import { ExternalLink } from "./ui"
import { StandingsTable } from "./blocks"
import { PowerRankingChart, PowerRankingChartSealed } from "./charts/power-ranking-chart"
import { OddsChart, OddsChartSealed } from "./charts/odds-chart"
import { num, pct, prob, signed, type Entity, type ScoutCategory } from "@/lib/scout"

// How a team plays, from its match logs. Plain figures, each with the sample it rests on.
export function ProfileTiles({ entity }: { entity: Entity }) {
  const p = entity.profile
  if (!p) return <p className="text-sm text-slate-500">Inga matcher med matchlogg ännu.</p>
  const pp = p.powerPlay
  const rows: { label: string; value: string; sub: string }[] = []
  if (p.halves)
    rows.push({
      label: "1:a / 2:a halvlek",
      value: `${signed(p.halves.firstFor - p.halves.firstAgainst)} / ${signed(p.halves.secondFor - p.halves.secondAgainst)}`,
      sub: "målskillnad per halvlek",
    })
  if (p.first10) rows.push({ label: "Första 10 min", value: signed(p.first10.for - p.first10.against), sub: "målskillnad per match" })
  if (p.last10) rows.push({ label: "Sista 10 min", value: signed(p.last10.for - p.last10.against), sub: "målskillnad per match" })
  rows.push({ label: "7 meter", value: p.sevenMeters.attempts ? `${p.sevenMeters.goals} av ${p.sevenMeters.attempts}` : "–", sub: p.sevenMeters.attempts ? `${p.sevenMeters.pct} % i mål` : "inga försök" })
  rows.push({ label: "Utvisningar", value: num(p.suspensions.perGame), sub: `per match (motståndarna ${num(p.suspensions.againstPerGame)})` })
  rows.push({ label: "En spelare mer", value: `${pp.gfUp}–${pp.gaUp}`, sub: pp.minutesUp ? `mål under ${num(pp.minutesUp, 0)} min` : "–" })
  rows.push({ label: "En spelare mindre", value: `${pp.gfDown}–${pp.gaDown}`, sub: pp.minutesDown ? `mål under ${num(pp.minutesDown, 0)} min` : "–" })
  if (p.leadShare) rows.push({ label: "I ledning", value: `${p.leadShare.lead} %`, sub: "av speltiden" })
  rows.push({ label: "Målskyttar", value: num(p.scorersPerGame), sub: "olika per match" })
  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[11px] font-medium text-slate-400">{row.label}</dt>
            <dd className="mt-0.5 text-lg font-black tabular-nums text-slate-950">{row.value}</dd>
            <dd className="text-xs text-slate-500">{row.sub}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-slate-400">Från {p.matches} matcher med matchlogg i Profixio.</p>
    </div>
  )
}

export function CategoryPanel({ category, highlightKey, focusKey }: { category: ScoutCategory; highlightKey?: string | null; focusKey?: string | null }) {
  if (category.resultsHidden) {
    return (
      <p className="py-4 text-sm text-slate-600">
        Förbundet publicerar inga resultat för de yngsta lagen, så här finns ingen tabell, styrka eller vinstchans – bara spelschemat. <ExternalLink href={category.url}>Serien på Profixio</ExternalLink>
      </p>
    )
  }
  const powerRows = category.power.map((row) => ({
    key: row.key,
    name: row.name,
    isHhf: row.isHhf,
    rank: row.rank,
    r: row.rating.r,
    attack: row.rating.attack,
    defence: row.rating.defence,
    games: row.rating.games,
    confidence: row.rating.confidence,
  }))
  const groups = category.groups && category.groups.length > 1 ? category.groups : null
  const oddsBlocks = groups
    ? groups.filter((g) => g.simulation && g.simulation.length).map((g) => ({ title: `Chans att vinna ${g.label.toLowerCase()}`, rows: g.simulation!, upcoming: g.upcomingCount, unit: "gruppen" }))
    : category.simulation && category.simulation.length
      ? [{ title: "Chans att vinna serien", rows: category.simulation, upcoming: category.upcomingCount, unit: "serien" }]
      : []
  return (
    <div className="space-y-8">
      <p className="text-xs text-slate-500">
        {category.playedCount} av {category.matchCount} matcher spelade
        {category.goalsPerMatch != null && ` · ${num(category.goalsPerMatch)} mål per match`}
        {category.homeWinShare != null && ` · hemmalaget vinner ${pct(category.homeWinShare)}`} · <ExternalLink href={category.url}>Profixio</ExternalLink>
      </p>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-900">{groups ? "Tabeller" : "Tabell"}</h3>
          {groups ? (
            <div className="space-y-6">
              {groups.map((group, i) => (
                <div key={group.label}>
                  <h4 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</h4>
                  <StandingsTable category={category} highlightKey={highlightKey} rows={group.standings} showWithdrawn={i === groups.length - 1} />
                </div>
              ))}
            </div>
          ) : (
            <StandingsTable category={category} highlightKey={highlightKey} />
          )}
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Styrka</h3>
          <p className="mb-2 text-xs text-slate-500">Hur många mål bättre eller sämre än ett genomsnittligt lag, räknat på alla resultat och vilka motståndare de mött.</p>
          {powerRows.length ? <Seal as={PowerRankingChartSealed} rows={powerRows} highlightKey={highlightKey ?? focusKey ?? null} /> : <p className="text-sm text-slate-500">Inga spelade matcher ännu.</p>}
        </div>
      </div>
      {oddsBlocks.map(({ title, rows: odds, upcoming, unit }) => (
        <div key={title}>
          <h3 className="mb-1 text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mb-3 text-xs text-slate-500">Resten av {unit} ({upcoming} matcher) spelad 4 000 gånger med modellens procentsatser.</p>
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <Seal as={OddsChartSealed} rows={odds} />
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-medium text-slate-400">
                  <th className="py-2">Lag</th>
                  <th className="px-2 py-2 text-right">Väntad plats</th>
                  <th className="py-2 pl-2 text-right">Vinner</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {odds.map((row) => (
                  <tr key={row.key} className={`border-b border-slate-100 ${row.isHhf ? "font-semibold text-slate-950" : "text-slate-700"}`}>
                    <td className="max-w-[170px] truncate py-2">{row.name}</td>
                    <td className="px-2 py-2 text-right">{num(row.expectedPosition)}</td>
                    <td className="py-2 pl-2 text-right">{prob(row.pFirst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
