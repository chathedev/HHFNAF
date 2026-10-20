import Link from "next/link"
import { ChevronRight } from "lucide-react"
import {
  matchDate,
  num,
  outcomeFor,
  pct,
  probsFor,
  scoreFor,
  sideOf,
  signed,
  type Entity,
  type ScoutCategory,
  type ScoutMatch,
} from "@/lib/scout"
import { OutcomeChip, TeamLink } from "./ui"
import { ProbabilityBar } from "./charts/probability-bar"

// Server-rendered React building blocks for the scout pages: match lists, standings,
// side-by-side comparisons.

export function MatchList({
  matches,
  perspective,
  empty = "Inga matcher.",
  showSeries = false,
  showTeam = false,
  analysisLinks = true,
  hideOdds = false,
}: {
  matches: ScoutMatch[]
  /** entity key to see the matches from, or "hhf" for "whichever side HHF is on" */
  perspective: string
  empty?: string
  showSeries?: boolean
  showTeam?: boolean
  analysisLinks?: boolean
  /** classes without published results: show the schedule only */
  hideOdds?: boolean
}) {
  if (!matches.length) return <p className="text-sm text-slate-500">{empty}</p>
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {matches.map((m) => {
        const key = perspective === "hhf" ? (m.hhfSide === "away" ? m.away.key : m.home.key) ?? "" : perspective
        const side = sideOf(m, key)
        const opp = side === "away" ? m.home : m.away
        const outcome = outcomeFor(m, key)
        const probs = probsFor(m.prediction, side)
        const pre = probsFor(m.preMatch, side)
        const isHhfMatch = m.home.isHhf || m.away.isHhf
        return (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70">
            <div className="w-[4.5rem] shrink-0 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">{matchDate(m, Boolean(m.ts && Date.now() - m.ts > 150 * 24 * 60 * 60 * 1000))}</p>
              <p>{m.time ?? ""}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-900">
                {showTeam && m.teamType && <span className="mr-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{m.teamType}</span>}
                <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{side === "home" ? "H" : "B"}</span>
                <TeamLink teamKey={opp.key} name={opp.name} isHhf={opp.isHhf} slug={opp.slug} className="font-semibold" />
              </p>
              <p className="truncate text-xs text-slate-400">
                {showSeries && m.category ? `${m.category.name} · ` : ""}
                {m.hs == null ? m.venue ?? "" : pre ? `Modellen före: ${pct(pre.win)} vinst` : m.ht ? `Halvtid ${side === "away" ? `${m.ht[1]}–${m.ht[0]}` : `${m.ht[0]}–${m.ht[1]}`}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {m.hs != null ? (
                <>
                  <span className="text-base font-black tabular-nums text-slate-950">{scoreFor(m, key)}</span>
                  {outcome && <OutcomeChip outcome={outcome} />}
                </>
              ) : probs ? (
                <div className="w-28 sm:w-36">
                  <ProbabilityBar
                    size="sm"
                    left={{ label: "Vinst", p: probs.win, tone: m[side ?? "home"].isHhf ? "hhf" : "team" }}
                    draw={probs.draw}
                    right={{ label: "Förlust", p: probs.loss, tone: "team" }}
                  />
                  <p className="mt-1 text-right text-[11px] text-slate-500">
                    <span className="font-bold text-slate-800">{pct(probs.win)}</span> vinstchans
                  </p>
                </div>
              ) : hideOdds && !m.played ? null : m.resultHidden || m.played ? (
                <span className="text-xs text-slate-400">Resultat publiceras ej</span>
              ) : (
                <span className="text-xs text-slate-400">För lite data</span>
              )}
              {analysisLinks && isHhfMatch && (
                <Link href={`/scout/match/${m.id}`} aria-label="Öppna matchanalys" className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function StandingsTable({ category, highlightKey }: { category: ScoutCategory; highlightKey?: string | null }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="w-8 px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Lag</th>
              <th className="px-2 py-2.5 text-center">M</th>
              <th className="px-2 py-2.5 text-center">V</th>
              <th className="px-2 py-2.5 text-center">O</th>
              <th className="px-2 py-2.5 text-center">F</th>
              <th className="hidden px-2 py-2.5 text-center sm:table-cell">Mål</th>
              <th className="px-2 py-2.5 text-center">+/−</th>
              <th className="px-2 py-2.5 text-center font-bold">P</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {category.standings.map((row) => (
              <tr
                key={row.key}
                className={`transition hover:bg-slate-50/80 ${row.isHhf ? "bg-emerald-50/60 font-medium" : row.key === highlightKey ? "bg-sky-50/70" : ""}`}
              >
                <td className="px-3 py-2.5 text-xs text-slate-400">{row.position}</td>
                <td className="max-w-[220px] truncate whitespace-nowrap px-3 py-2.5 text-slate-900">
                  <TeamLink teamKey={row.key} name={row.name} isHhf={row.isHhf} />
                </td>
                <td className="px-2 py-2.5 text-center text-slate-600">{row.played}</td>
                <td className="px-2 py-2.5 text-center text-slate-600">{row.won}</td>
                <td className="px-2 py-2.5 text-center text-slate-600">{row.drawn}</td>
                <td className="px-2 py-2.5 text-center text-slate-600">{row.lost}</td>
                <td className="hidden px-2 py-2.5 text-center text-slate-600 sm:table-cell">
                  {row.gf}–{row.ga}
                </td>
                <td className={`px-2 py-2.5 text-center text-xs font-medium ${row.gd > 0 ? "text-emerald-600" : row.gd < 0 ? "text-rose-500" : "text-slate-400"}`}>
                  {row.gd > 0 ? "+" : ""}
                  {row.gd}
                </td>
                <td className="px-2 py-2.5 text-center font-bold text-slate-900">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {category.withdrawn && category.withdrawn.length > 0 && (
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          Utgått ur serien (räknas inte i tabellen, som hos Profixio): {category.withdrawn.map((w) => w.name).join(", ")}.
        </p>
      )}
    </div>
  )
}

// Side-by-side comparison of two teams with the group average as reference.
type Metric = {
  label: string
  a: number | null | undefined
  b: number | null | undefined
  avg?: number | null
  format?: (v: number) => string
  higherIsBetter?: boolean
  note?: string
}

export function Comparison({ a, b, metrics }: { a: { name: string; isHhf: boolean }; b: { name: string; isHhf: boolean }; metrics: Metric[] }) {
  const aColor = a.isHhf ? "bg-emerald-600" : "bg-sky-700"
  const bColor = b.isHhf ? "bg-emerald-600" : "bg-sky-700"
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${aColor}`} />
          <span className="truncate">{a.name}</span>
        </span>
        <span className="text-[10px] uppercase tracking-widest text-slate-400">Snitt</span>
        <span className="flex min-w-0 items-center justify-end gap-1.5">
          <span className="truncate">{b.name}</span>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${bColor}`} />
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {metrics.map((metric) => {
          const fmt = metric.format ?? ((v: number) => num(v))
          const av = metric.a ?? null
          const bv = metric.b ?? null
          const values = [av, bv, metric.avg].filter((v): v is number => v != null && Number.isFinite(v))
          const lo = Math.min(0, ...values)
          const hi = Math.max(0.0001, ...values)
          const width = (v: number | null) => (v == null ? 0 : Math.max(4, ((v - lo) / (hi - lo || 1)) * 100))
          const better = av == null || bv == null || av === bv ? null : (av > bv) === (metric.higherIsBetter !== false) ? "a" : "b"
          return (
            <li key={metric.label} className="px-4 py-2.5">
              <p className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">{metric.label}</p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="flex items-center justify-end gap-2">
                  <span className={`text-sm tabular-nums ${better === "a" ? "font-black text-slate-950" : "font-semibold text-slate-600"}`}>{av == null ? "–" : fmt(av)}</span>
                  <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-slate-100" aria-hidden>
                    <div className={`ml-auto h-full rounded-full ${aColor}`} style={{ width: `${width(av)}%` }} />
                  </div>
                </div>
                <span className="w-12 text-center text-xs tabular-nums text-slate-400">{metric.avg == null ? "–" : fmt(metric.avg)}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-slate-100" aria-hidden>
                    <div className={`h-full rounded-full ${bColor}`} style={{ width: `${width(bv)}%` }} />
                  </div>
                  <span className={`text-sm tabular-nums ${better === "b" ? "font-black text-slate-950" : "font-semibold text-slate-600"}`}>{bv == null ? "–" : fmt(bv)}</span>
                </div>
              </div>
              {metric.note && <p className="mt-1 text-center text-[11px] text-slate-400">{metric.note}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function comparisonMetrics(a: Entity, b: Entity, category: ScoutCategory | null) {
  const pa = a.profile
  const pb = b.profile
  const halfDiff = (e: Entity) => (e.profile?.halves ? e.profile.halves.secondFor - e.profile.halves.secondAgainst : null)
  return [
    { label: "Styrka (mål mot snittlag)", a: a.rating?.r, b: b.rating?.r, avg: 0, format: (v: number) => signed(v) },
    { label: "Gjorda mål per match", a: a.record.gfPerGame, b: b.record.gfPerGame, avg: category?.baseline.gfPerGame ?? null },
    { label: "Insläppta mål per match", a: a.record.gaPerGame, b: b.record.gaPerGame, avg: category?.baseline.gfPerGame ?? null, higherIsBetter: false },
    { label: "Målskillnad per match", a: a.record.gdPerGame, b: b.record.gdPerGame, avg: 0, format: (v: number) => signed(v) },
    { label: "Målskillnad andra halvlek", a: halfDiff(a), b: halfDiff(b), format: (v: number) => signed(v) },
    { label: "7-metersförsök per match", a: pa?.sevenMeters.perGame, b: pb?.sevenMeters.perGame, avg: category?.baseline.penPerGame ?? null },
    { label: "7-metersprocent", a: pa?.sevenMeters.pct, b: pb?.sevenMeters.pct, avg: category?.baseline.penPct ?? null, format: (v: number) => `${Math.round(v)} %` },
    { label: "Utvisningar per match", a: pa?.suspensions.perGame, b: pb?.suspensions.perGame, avg: category?.baseline.suspPerGame ?? null, higherIsBetter: false },
    { label: "Olika målskyttar per match", a: pa?.scorersPerGame, b: pb?.scorersPerGame, avg: category?.baseline.scorersPerGame ?? null },
    { label: "Andel av speltiden i ledning", a: pa?.leadShare?.lead, b: pb?.leadShare?.lead, format: (v: number) => `${Math.round(v)} %` },
  ]
}

export function PredictionHero({ match, perspective }: { match: ScoutMatch; perspective: "home" | "away" }) {
  const pred = match.prediction ?? match.preMatch ?? null
  const us = perspective === "home" ? match.home : match.away
  const them = perspective === "home" ? match.away : match.home
  const probs = probsFor(pred, perspective)
  if (!probs) return null
  return (
    <ProbabilityBar
      size="lg"
      left={{ label: us.name, p: probs.win, tone: us.isHhf ? "hhf" : "team" }}
      draw={probs.draw}
      right={{ label: them.name, p: probs.loss, tone: "team" }}
    />
  )
}

