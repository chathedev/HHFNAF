import Link from "next/link"
import {
  matchDate,
  num,
  outcomeFor,
  prob,
  probsFor,
  scoreFor,
  sideOf,
  signed,
  type Entity,
  type ScoutCategory,
  type ScoutMatch,
} from "@/lib/scout"
import { OutcomeChip } from "./ui"
import { ProbabilityBar } from "./charts/probability-bar"

// Match rows in the home page style: the whole row is the link (to the match analysis).

export function MatchList({
  matches,
  perspective,
  empty = "Inga matcher.",
  showSeries = false,
  showTeam = false,
  hideOdds = false,
}: {
  matches: ScoutMatch[]
  /** entity key to see the matches from, or "hhf" for "whichever side HHF is on" */
  perspective: string
  empty?: string
  showSeries?: boolean
  showTeam?: boolean
  analysisLinks?: boolean
  /** classes without published results: schedule only */
  hideOdds?: boolean
}) {
  if (!matches.length) return <p className="py-4 text-sm text-slate-500">{empty}</p>
  const recentCutoff = Date.now() - 150 * 24 * 60 * 60 * 1000
  return (
    <ul>
      {matches.map((m) => {
        const key = perspective === "hhf" ? (m.hhfSide === "away" ? m.away.key : m.home.key) ?? "" : perspective
        const side = sideOf(m, key) ?? "home"
        const opp = side === "away" ? m.home : m.away
        const outcome = outcomeFor(m, key)
        const probs = probsFor(m.prediction, side)
        const pre = probsFor(m.preMatch, side)
        const meta = [
          `${matchDate(m, Boolean(m.ts && m.ts < recentCutoff))}${m.time ? ` ${m.time}` : ""}`,
          side === "home" ? "hemma" : "borta",
          showSeries && m.category ? m.category.name : null,
          m.hs == null ? m.venue : null,
        ]
          .filter(Boolean)
          .join(" · ")
        return (
          <li key={m.id}>
            <Link href={`/scout/match/${m.id}`} className="flex items-center gap-4 border-b border-slate-200 py-3.5 transition hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950 sm:text-[15px]">
                  {showTeam && m.teamType ? <span className="mr-2 text-[11px] font-medium text-slate-400">{m.teamType}</span> : null}
                  {opp.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{meta}</p>
              </div>
              <div className="shrink-0 text-right">
                {m.hs != null ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tabular-nums text-slate-900">{scoreFor(m, key)}</span>
                    {outcome && <OutcomeChip outcome={outcome} />}
                  </div>
                ) : probs && !hideOdds ? (
                  <p className="text-xs text-slate-500">
                    <span className="text-sm font-bold tabular-nums text-slate-950">{prob(probs.win)}</span> vinstchans
                  </p>
                ) : hideOdds ? null : m.played || m.resultHidden ? (
                  <p className="text-xs text-slate-400">Resultat publiceras ej</p>
                ) : (
                  <p className="text-xs text-slate-400">Ingen prognos än</p>
                )}
                {m.hs != null && pre && <p className="mt-0.5 text-[11px] text-slate-400">Prognos före: {prob(pre.win)} vinst</p>}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function StandingsTable({ category, highlightKey }: { category: ScoutCategory; highlightKey?: string | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] font-medium text-slate-400">
            <th className="w-8 py-2 pr-2">#</th>
            <th className="py-2 pr-2">Lag</th>
            <th className="px-1.5 py-2 text-center">M</th>
            <th className="px-1.5 py-2 text-center">V</th>
            <th className="px-1.5 py-2 text-center">O</th>
            <th className="px-1.5 py-2 text-center">F</th>
            <th className="hidden px-1.5 py-2 text-center sm:table-cell">Mål</th>
            <th className="px-1.5 py-2 text-center">+/−</th>
            <th className="py-2 pl-1.5 text-center">P</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {category.standings.map((row) => (
            <tr key={row.key} className={`border-b border-slate-100 ${row.isHhf ? "font-semibold text-slate-950" : row.key === highlightKey ? "bg-slate-50" : "text-slate-700"}`}>
              <td className="py-2 pr-2 text-xs text-slate-400">{row.position}</td>
              <td className="max-w-[220px] truncate whitespace-nowrap py-2 pr-2">
                <Link href={`/scout/lag/${row.key}`} className="underline-offset-2 hover:underline">
                  {row.name}
                </Link>
              </td>
              <td className="px-1.5 py-2 text-center">{row.played}</td>
              <td className="px-1.5 py-2 text-center">{row.won}</td>
              <td className="px-1.5 py-2 text-center">{row.drawn}</td>
              <td className="px-1.5 py-2 text-center">{row.lost}</td>
              <td className="hidden px-1.5 py-2 text-center sm:table-cell">
                {row.gf}–{row.ga}
              </td>
              <td className="px-1.5 py-2 text-center text-xs">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
              <td className="py-2 pl-1.5 text-center font-bold text-slate-900">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {category.withdrawn && category.withdrawn.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">Utgått ur serien (räknas inte, som hos Profixio): {category.withdrawn.map((w) => w.name).join(", ")}.</p>
      )}
    </div>
  )
}

// Side-by-side comparison: plain numbers, the better one in bold.
type Metric = { label: string; a: number | null | undefined; b: number | null | undefined; avg?: number | null; format?: (v: number) => string; higherIsBetter?: boolean }

export function Comparison({ a, b, metrics }: { a: { name: string; isHhf: boolean }; b: { name: string; isHhf: boolean }; metrics: Metric[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-400">
          <th className="py-2 text-left font-medium" />
          <th className="max-w-[120px] truncate px-2 py-2 text-right font-medium">{a.name}</th>
          <th className="max-w-[120px] truncate px-2 py-2 text-right font-medium">{b.name}</th>
          <th className="hidden py-2 pl-2 text-right font-medium sm:table-cell">Snitt i serien</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {metrics.map((metric) => {
          const fmt = metric.format ?? ((v: number) => num(v))
          const av = metric.a ?? null
          const bv = metric.b ?? null
          const better = av == null || bv == null || av === bv ? null : (av > bv) === (metric.higherIsBetter !== false) ? "a" : "b"
          return (
            <tr key={metric.label} className="border-b border-slate-100">
              <td className="py-2 pr-2 text-slate-600">{metric.label}</td>
              <td className={`px-2 py-2 text-right ${better === "a" ? "font-bold text-slate-950" : "text-slate-600"}`}>{av == null ? "–" : fmt(av)}</td>
              <td className={`px-2 py-2 text-right ${better === "b" ? "font-bold text-slate-950" : "text-slate-600"}`}>{bv == null ? "–" : fmt(bv)}</td>
              <td className="hidden py-2 pl-2 text-right text-slate-400 sm:table-cell">{metric.avg == null ? "–" : fmt(metric.avg)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function comparisonMetrics(a: Entity, b: Entity, category: ScoutCategory | null) {
  const pa = a.profile
  const pb = b.profile
  const halfDiff = (e: Entity) => (e.profile?.halves ? e.profile.halves.secondFor - e.profile.halves.secondAgainst : null)
  return [
    { label: "Styrka (mål mot ett snittlag)", a: a.rating?.r, b: b.rating?.r, avg: 0, format: (v: number) => signed(v) },
    { label: "Gjorda mål per match", a: a.record.gfPerGame, b: b.record.gfPerGame, avg: category?.baseline.gfPerGame ?? null },
    { label: "Insläppta mål per match", a: a.record.gaPerGame, b: b.record.gaPerGame, avg: category?.baseline.gfPerGame ?? null, higherIsBetter: false },
    { label: "Målskillnad i andra halvlek", a: halfDiff(a), b: halfDiff(b), format: (v: number) => signed(v) },
    { label: "7-metersförsök per match", a: pa?.sevenMeters.perGame, b: pb?.sevenMeters.perGame, avg: category?.baseline.penPerGame ?? null },
    { label: "Sätter 7-metrar", a: pa?.sevenMeters.pct, b: pb?.sevenMeters.pct, avg: category?.baseline.penPct ?? null, format: (v: number) => `${Math.round(v)} %` },
    { label: "Utvisningar per match", a: pa?.suspensions.perGame, b: pb?.suspensions.perGame, avg: category?.baseline.suspPerGame ?? null, higherIsBetter: false },
    { label: "Olika målskyttar per match", a: pa?.scorersPerGame, b: pb?.scorersPerGame, avg: category?.baseline.scorersPerGame ?? null },
  ]
}

export function PredictionHero({ match, perspective }: { match: ScoutMatch; perspective: "home" | "away" }) {
  const pred = match.prediction ?? match.preMatch ?? null
  const us = perspective === "home" ? match.home : match.away
  const them = perspective === "home" ? match.away : match.home
  const probs = probsFor(pred, perspective)
  if (!probs) return null
  return <ProbabilityBar size="lg" left={{ label: us.name, p: probs.win, tone: us.isHhf ? "hhf" : "team" }} draw={probs.draw} right={{ label: them.name, p: probs.loss, tone: "team" }} />
}
