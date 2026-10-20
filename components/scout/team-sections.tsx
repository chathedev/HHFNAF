import { ExternalLink } from "./ui"
import { StandingsTable } from "./blocks"
import { PowerRankingChart } from "./charts/power-ranking-chart"
import { OddsChart } from "./charts/odds-chart"
import { num, pct, signed, type Entity, type ScoutCategory } from "@/lib/scout"

// Team profile figures from match logs: each tile states its sample size.

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-black text-slate-950">{value}</p>
      {sub && <p className="text-[11px] leading-tight text-slate-500">{sub}</p>}
    </div>
  )
}

export function ProfileTiles({ entity }: { entity: Entity }) {
  const p = entity.profile
  if (!p) return <p className="text-sm text-slate-500">Inga matcher med matchlogg ännu.</p>
  const halves = p.halves
  const pp = p.powerPlay
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {halves && (
        <Tile
          label="Halvlekar"
          value={`${signed(halves.firstFor - halves.firstAgainst)} / ${signed(halves.secondFor - halves.secondAgainst)}`}
          sub={`Målskillnad 1:a / 2:a halvlek per match (${halves.n} matcher)`}
        />
      )}
      {halves && <Tile label="Ledning i paus" value={`${halves.leadAtHalf} av ${halves.n}`} sub={`Vände ${halves.winsAfterTrailingAtHalf} till vinst efter underläge`} />}
      {p.first10 && <Tile label="Första 10 min" value={signed(p.first10.for - p.first10.against)} sub={`${num(p.first10.for)} gjorda, ${num(p.first10.against)} insläppta per match`} />}
      {p.last10 && <Tile label="Sista 10 min" value={signed(p.last10.for - p.last10.against)} sub={`${num(p.last10.for)} gjorda, ${num(p.last10.against)} insläppta per match`} />}
      <Tile
        label="7 meter"
        value={p.sevenMeters.attempts ? `${p.sevenMeters.goals}/${p.sevenMeters.attempts}` : "–"}
        sub={p.sevenMeters.attempts ? `${p.sevenMeters.pct} % · ${num(p.sevenMeters.perGame)} försök per match` : "Inga försök"}
      />
      <Tile
        label="7 m mot laget"
        value={p.sevenMeters.against.attempts ? `${p.sevenMeters.against.goals}/${p.sevenMeters.against.attempts}` : "–"}
        sub={p.sevenMeters.against.attempts ? `Motståndarna sätter ${p.sevenMeters.against.pct} %` : "Inga försök"}
      />
      <Tile label="Utvisningar" value={num(p.suspensions.perGame)} sub={`per match · motståndarna ${num(p.suspensions.againstPerGame)}`} />
      <Tile
        label="Överläge"
        value={`${pp.gfUp}–${pp.gaUp}`}
        sub={pp.minutesUp ? `mål med en spelare mer (${num(pp.minutesUp, 0)} min)` : "ingen tid i överläge"}
      />
      <Tile
        label="Underläge"
        value={`${pp.gfDown}–${pp.gaDown}`}
        sub={pp.minutesDown ? `mål med en spelare mindre (${num(pp.minutesDown, 0)} min)` : "ingen tid i underläge"}
      />
      {p.leadShare && <Tile label="Speltid i ledning" value={`${p.leadShare.lead} %`} sub={`underläge ${p.leadShare.trail} %, lika ${p.leadShare.tied} %`} />}
      <Tile label="Vändningar" value={String(p.comebacks)} sub={`vinster efter minst 3 måls underläge · tappade ledningar ${p.blownLeads}`} />
      <Tile label="Längsta ryck" value={String(p.runs.best)} sub={`raka mål · snitt ${num(p.runs.avgLongestFor)} per match`} />
      <Tile label="Målskyttar" value={num(p.scorersPerGame)} sub="olika målskyttar per match" />
      <Tile label="Timeouts" value={num(p.timeouts.perGame)} sub="per match" />
    </div>
  )
}

export function CategoryPanel({ category, highlightKey, focusKey }: { category: ScoutCategory; highlightKey?: string | null; focusKey?: string | null }) {
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
  const odds = category.simulation ?? []
  if (category.resultsHidden) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Resultaten publiceras inte i den här klassen</p>
        <p className="mt-1">
          Förbundet visar inga resultat för de yngsta lagen, så HHF Scout gör inga tabeller, styrkor eller vinstchanser här. Spelschemat och motståndarna finns
          ändå med. {category.matchCount} matcher i serien.
        </p>
        <div className="mt-3">
          <ExternalLink href={category.url}>Serien på Profixio</ExternalLink>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {category.playedCount} av {category.matchCount} matcher spelade · {category.loggedCount} med matchlogg
          {category.goalsPerMatch != null && ` · ${num(category.goalsPerMatch)} mål per match`}
          {category.homeWinShare != null && ` · hemmalaget vinner ${pct(category.homeWinShare)}`}
        </span>
        <ExternalLink href={category.url}>Serien på Profixio</ExternalLink>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-900">Tabell</h3>
          <StandingsTable category={category} highlightKey={highlightKey} />
          {category.group && <p className="mt-2 text-xs text-slate-500">Visar HHF:s grupp i den här omgången.</p>}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-900">Styrkeranking</h3>
          {powerRows.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <PowerRankingChart rows={powerRows} highlightKey={highlightKey ?? focusKey ?? null} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Inga spelade matcher ännu.</p>
          )}
        </div>
      </div>
      {odds.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-bold text-slate-900">Seriesimulering</h3>
          <p className="mb-2 text-xs text-slate-500">
            Alla {category.upcomingCount} återstående matcher spelade 4 000 gånger med modellens sannolikheter. Tabellordning: poäng, målskillnad, gjorda mål.
          </p>
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <OddsChart rows={odds} />
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2">Lag</th>
                    <th className="px-2 py-2 text-center" title="Väntad slutplacering">Plac.</th>
                    <th className="px-2 py-2 text-center" title="Väntad poäng">Poäng</th>
                    <th className="px-2 py-2 text-center">Etta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {odds.map((row) => (
                    <tr key={row.key} className={row.isHhf ? "bg-emerald-50/60 font-medium" : ""}>
                      <td className="max-w-[160px] truncate px-3 py-2 text-slate-900">{row.name}</td>
                      <td className="px-2 py-2 text-center text-slate-700">{num(row.expectedPosition)}</td>
                      <td className="px-2 py-2 text-center text-slate-700">{num(row.expectedPoints)}</td>
                      <td className="px-2 py-2 text-center font-semibold text-slate-900">{pct(row.pFirst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
