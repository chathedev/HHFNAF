"use client"

import { memo, useId, useMemo, useState } from "react"

export type CourtSide = "home" | "away"

export type CourtLineupPlayer = {
  id?: number
  name?: string
  number?: string
  played?: boolean
  isKeeper?: boolean
  isCaptain?: boolean
  position?: string
}

export type CourtPlayerStats = {
  playerId?: number
  name?: string
  number?: string
  side?: string
  goals?: number
  sevenMeterGoals?: number
  suspensions?: number
  goalTimes?: string[]
  cards?: Array<{ color?: string; type?: string } | string>
}

export type CourtTeamStats = {
  side?: string
  goals?: number
  timeouts?: number
  suspensions?: number
  sevenMeters?: { goals?: number; misses?: number; awarded?: number }
}

export type CourtEvent = {
  side: CourtSide | "center"
  time?: string
  type?: string
  player?: string
  playerNumber?: string
  homeScore?: number
  awayScore?: number
}

export type CourtPenalty = {
  side: CourtSide | null
  player?: string
  playerNumber?: string
  remaining: number
}

type MatchCourtProps = {
  homeTeam: string
  awayTeam: string
  hhfSide: CourtSide | null
  lineup?: { home?: CourtLineupPlayer[]; away?: CourtLineupPlayer[] } | null
  players?: CourtPlayerStats[] | null
  teamStats?: CourtTeamStats[] | null
  events: CourtEvent[]
  penalties: CourtPenalty[]
  isLive: boolean
  /** Length of one half in seconds (youth matches are often 2 x 20 or 2 x 25). */
  periodSeconds?: number
}

// Court geometry in metres: 40 x 20, goals 3 m wide centred on the baseline.
const W = 40
const H = 20
const GOAL_TOP = 8.5
const GOAL_BOTTOM = 11.5

const toSeconds = (value?: string) => {
  const match = /^(\d{1,3}):(\d{2})/.exec((value ?? "").trim())
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN
}

const formatClock = (total: number) => {
  const safe = Math.max(0, Math.floor(total))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`
}

const shortName = (name?: string) => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return parts[0] ?? ""
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`
}

const isGoal = (event: CourtEvent) => {
  const t = (event.type ?? "").toLowerCase()
  return (t.startsWith("mål") || t.includes("goal")) && !t.includes("miss")
}

const isSuspension = (event: CourtEvent) => (event.type ?? "").toLowerCase().includes("utvisning")

type CourtCard = NonNullable<CourtPlayerStats["cards"]>[number]

const isRedCard = (card: CourtCard) => {
  const text = (typeof card === "string" ? card : `${card?.color ?? ""} ${card?.type ?? ""}`).toLowerCase()
  return text.includes("röd") || text.includes("red")
}

/** Goal-area arc (6 m) or free-throw arc (9 m) for the goal at x = 0, mirrored for x = 40. */
const arcPath = (radius: number, mirrored: boolean) => {
  const x = (value: number) => (mirrored ? W - value : value)
  const sweep = mirrored ? 0 : 1
  return [
    `M ${x(0)} ${GOAL_TOP - radius}`,
    `A ${radius} ${radius} 0 0 ${sweep} ${x(radius)} ${GOAL_TOP}`,
    `L ${x(radius)} ${GOAL_BOTTOM}`,
    `A ${radius} ${radius} 0 0 ${sweep} ${x(0)} ${GOAL_BOTTOM + radius}`,
  ].join(" ")
}

// Slots inside the goal area, newest in the middle, then alternating outwards.
const GOAL_SLOTS_Y = [10, 7.5, 12.5, 5, 15]
const GOAL_SLOT_X = 2.7

function CourtSvg({
  recentGoals,
  lastEvent,
  penalties,
  hhfSide,
  isLive,
}: {
  recentGoals: Record<CourtSide, CourtEvent[]>
  lastEvent: CourtEvent | null
  penalties: CourtPenalty[]
  hhfSide: CourtSide | null
  isLive: boolean
}) {
  const clipId = `court-bounds-${useId().replace(/:/g, "")}`
  // Home attacks the right goal, away the left one. A team's latest scorers sit in
  // the goal area they scored in, so nothing on the court pretends to be a position.
  const line = "#94a3b8"
  const bubbleColor = (side: CourtSide) => (side === hhfSide ? "#059669" : "#475569")
  const renderGoalStack = (side: CourtSide) =>
    recentGoals[side].slice(0, GOAL_SLOTS_Y.length).map((event, index) => {
      const cx = side === "home" ? W - GOAL_SLOT_X : GOAL_SLOT_X
      const cy = GOAL_SLOTS_Y[index]
      const newest = index === 0
      const r = newest ? 1.25 : 1
      return (
        <g key={`${side}-${event.time}-${index}`} opacity={1 - index * 0.15}>
          {newest && isLive && lastEvent === event && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={0.25} className="court-pulse" />
          )}
          <circle cx={cx} cy={cy} r={r} fill={bubbleColor(side)} />
          <text x={cx} y={cy} dy="0.36em" textAnchor="middle" fontSize={newest ? 1.2 : 1} fontWeight={800} fill="#fff">
            {event.playerNumber || "•"}
          </text>
        </g>
      )
    })

  // Suspended players wait at their bench: home bench on the left half, away on the right.
  const benchChips = (side: CourtSide) =>
    penalties
      .filter((p) => p.side === side)
      .slice(0, 3)
      .map((p, index) => {
        // Three chips per half at most, kept clear of the centre line.
        const x = side === "home" ? 1 + index * 6 : W - 6.4 - index * 6
        return (
          <g key={`pen-${side}-${index}`}>
            <rect x={x} y={H - 2.3} width={5.4} height={1.6} rx={0.8} fill="#ffe4e6" />
            <text x={x + 2.7} y={H - 1.5} dy="0.35em" textAnchor="middle" fontSize={0.85} fontWeight={800} fill="#be123c">
              {p.playerNumber ? `#${p.playerNumber} ` : ""}
              {formatClock(p.remaining)}
            </text>
          </g>
        )
      })

  return (
    <svg viewBox={`-1.4 -0.4 ${W + 2.8} ${H + 0.8}`} className="block h-auto w-full" role="img" aria-label="Handbollsplan med senaste målskyttarna">
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="#f8fafc" stroke={line} strokeWidth={0.12} />
      {/* 6 m goal areas */}
      <path d={`${arcPath(6, false)} Z`} fill="#ecfdf5" stroke={line} strokeWidth={0.12} />
      <path d={`${arcPath(6, true)} Z`} fill="#ecfdf5" stroke={line} strokeWidth={0.12} />
      {/* 9 m free-throw lines */}
      <g clipPath={`url(#${clipId})`}>
        <path d={arcPath(9, false)} fill="none" stroke={line} strokeWidth={0.1} strokeDasharray="0.45 0.45" />
        <path d={arcPath(9, true)} fill="none" stroke={line} strokeWidth={0.1} strokeDasharray="0.45 0.45" />
      </g>
      {/* 7 m lines and 4 m goalkeeper marks */}
      <line x1={7} x2={7} y1={9.5} y2={10.5} stroke={line} strokeWidth={0.12} />
      <line x1={W - 7} x2={W - 7} y1={9.5} y2={10.5} stroke={line} strokeWidth={0.12} />
      <line x1={4} x2={4} y1={9.92} y2={10.08} stroke={line} strokeWidth={0.2} />
      <line x1={W - 4} x2={W - 4} y1={9.92} y2={10.08} stroke={line} strokeWidth={0.2} />
      {/* centre line and substitution lines (4.5 m from centre) */}
      <line x1={W / 2} x2={W / 2} y1={0} y2={H} stroke={line} strokeWidth={0.12} />
      <line x1={W / 2 - 4.5} x2={W / 2 - 4.5} y1={H - 0.3} y2={H + 0.3} stroke={line} strokeWidth={0.12} />
      <line x1={W / 2 + 4.5} x2={W / 2 + 4.5} y1={H - 0.3} y2={H + 0.3} stroke={line} strokeWidth={0.12} />
      {/* goals, 3 m wide */}
      <rect x={-1} y={GOAL_TOP} width={1} height={3} fill="#e2e8f0" stroke="#64748b" strokeWidth={0.12} />
      <rect x={W} y={GOAL_TOP} width={1} height={3} fill="#e2e8f0" stroke="#64748b" strokeWidth={0.12} />
      {renderGoalStack("home")}
      {renderGoalStack("away")}
      {benchChips("home")}
      {benchChips("away")}
    </svg>
  )
}

function MomentumLine({
  events,
  hhfSide,
  periodSeconds,
}: {
  events: CourtEvent[]
  hhfSide: CourtSide | null
  periodSeconds?: number
}) {
  const points = useMemo(() => {
    const goals = events
      .filter((e) => isGoal(e) && typeof e.homeScore === "number" && typeof e.awayScore === "number")
      .map((e) => ({ t: toSeconds(e.time), diff: (e.homeScore ?? 0) - (e.awayScore ?? 0) }))
      .filter((p) => Number.isFinite(p.t))
      .sort((a, b) => a.t - b.t)
    return goals
  }, [events])

  if (points.length < 2) return null
  // Show the difference from HHF's point of view when HHF plays.
  const sign = hhfSide === "away" ? -1 : 1
  const half = periodSeconds && periodSeconds > 0 ? periodSeconds : 1800
  const end = Math.max(half * 2, points[points.length - 1].t)
  const halfMinutes = Math.round(half / 60)
  const maxAbs = Math.max(3, ...points.map((p) => Math.abs(p.diff)))
  const x = (t: number) => (t / end) * 100
  const y = (diff: number) => 15 - (sign * diff / maxAbs) * 13
  let d = `M 0 ${y(0)}`
  let prev = 0
  for (const p of points) {
    d += ` L ${x(p.t)} ${y(prev)} L ${x(p.t)} ${y(p.diff)}`
    prev = p.diff
  }
  d += ` L ${x(points[points.length - 1].t)} ${y(prev)}`

  return (
    <div className="mt-4">
      <div className="mb-1 flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        <span>Målskillnad</span>
        <span className="tabular-nums">0 · {halfMinutes} · {halfMinutes * 2} min</span>
      </div>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="block h-12 w-full" aria-hidden>
        <rect x={0} y={0} width={100} height={15} fill="#ecfdf5" />
        <rect x={0} y={15} width={100} height={15} fill="#f8fafc" />
        <line x1={x(half)} x2={x(half)} y1={0} y2={30} stroke="#cbd5e1" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
        <line x1={0} x2={100} y1={15} y2={15} stroke="#cbd5e1" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke="#059669" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

type RosterRow = {
  key: string
  name: string
  number?: string
  isKeeper: boolean
  isCaptain: boolean
  played: boolean
  goals: number
  sevenMeterGoals: number
  suspensions: number
  red: boolean
  goalTimes: string[]
}

const buildRoster = (
  side: CourtSide,
  lineup: CourtLineupPlayer[] | undefined,
  players: CourtPlayerStats[],
): { rows: RosterRow[]; staff: string[] } => {
  const statsById = new Map<number, CourtPlayerStats>()
  const statsByNumber = new Map<string, CourtPlayerStats>()
  players
    .filter((p) => p.side === side)
    .forEach((p) => {
      if (typeof p.playerId === "number") statsById.set(p.playerId, p)
      if (p.number) statsByNumber.set(String(p.number), p)
    })

  const rows: RosterRow[] = []
  const staff: string[] = []
  const seen = new Set<CourtPlayerStats>()
  const toRow = (base: CourtLineupPlayer | null, stats: CourtPlayerStats | undefined, key: string): RosterRow => ({
    key,
    name: base?.name || stats?.name || "Okänd",
    number: base?.number || stats?.number || undefined,
    isKeeper: Boolean(base?.isKeeper),
    isCaptain: Boolean(base?.isCaptain),
    played: base ? base.played !== false : true,
    goals: stats?.goals ?? 0,
    sevenMeterGoals: stats?.sevenMeterGoals ?? 0,
    suspensions: stats?.suspensions ?? 0,
    red: Array.isArray(stats?.cards) ? stats!.cards!.some(isRedCard) : false,
    goalTimes: Array.isArray(stats?.goalTimes) ? stats!.goalTimes!.filter(Boolean) : [],
  })

  ;(lineup ?? []).forEach((entry, index) => {
    // Profixio lists team officials with a letter A-E as position; players have "S".
    if (/^[A-E]$/i.test(entry.position ?? "")) {
      if (entry.name) staff.push(entry.name)
      return
    }
    const stats =
      (typeof entry.id === "number" ? statsById.get(entry.id) : undefined) ?? statsByNumber.get(String(entry.number))
    if (stats) seen.add(stats)
    rows.push(toRow(entry, stats, `${side}-${entry.id ?? entry.number}-${index}`))
  })

  // Scorers who are missing from the lineup (lineup not published yet). Stats rows
  // for officials (timeouts, warnings) are skipped by name.
  const staffNames = new Set(staff.map((name) => name.trim().toLowerCase()))
  players
    .filter((p) => p.side === side && !seen.has(p) && !staffNames.has((p.name ?? "").trim().toLowerCase()))
    .forEach((p, index) => rows.push(toRow(null, p, `${side}-extra-${p.playerId ?? p.number ?? index}`)))

  rows.sort((a, b) => {
    const na = Number.parseInt(a.number ?? "", 10)
    const nb = Number.parseInt(b.number ?? "", 10)
    return (Number.isFinite(na) ? na : 999) - (Number.isFinite(nb) ? nb : 999)
  })
  return { rows, staff }
}

function RosterGrid({ rows, accent }: { rows: RosterRow[]; accent: boolean }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Laguppställningen är inte publicerad än.</p>
  }
  return (
    <ul className="grid grid-cols-1 gap-1.5 min-[380px]:grid-cols-2">
      {rows.map((row) => {
        const open = openKey === row.key
        return (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => setOpenKey(open ? null : row.key)}
              aria-expanded={open}
              className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${
                open ? "border-emerald-300 bg-emerald-50/60" : "border-slate-100 bg-white hover:border-slate-200"
              } ${row.played ? "" : "opacity-45"}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums ${
                  row.isKeeper
                    ? "bg-amber-400 text-slate-900"
                    : accent
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-700 text-white"
                }`}
              >
                {row.number ?? "–"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {row.name}
                  {row.isCaptain && <span className="ml-1 text-[10px] font-black text-emerald-700">C</span>}
                </span>
                <span className="block text-[11px] text-slate-400">
                  {row.isKeeper ? "Målvakt" : row.played ? "Spelade" : "Spelade inte"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {row.goals > 0 && (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-emerald-700">
                    {row.goals} mål
                  </span>
                )}
                {row.suspensions > 0 && (
                  <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-rose-700">
                    {row.suspensions}×2′
                  </span>
                )}
                {row.red && <span role="img" className="h-3.5 w-2.5 rounded-[2px] bg-rose-600" aria-label="Rött kort" />}
              </span>
            </button>
            {open && (
              <div className="px-3 pb-1 pt-1.5 text-[11px] text-slate-500">
                {row.goalTimes.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {row.goalTimes.map((t, i) => (
                      <span key={`${row.key}-t-${i}`} className="rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold tabular-nums text-slate-600">
                        {t}
                      </span>
                    ))}
                    {row.sevenMeterGoals > 0 && <span className="py-0.5">varav {row.sevenMeterGoals} på 7-m</span>}
                  </span>
                ) : (
                  <span>Inga mål i matchen.</span>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function MatchCourtComponent({
  homeTeam,
  awayTeam,
  hhfSide,
  lineup,
  players,
  teamStats,
  events,
  penalties,
  isLive,
  periodSeconds,
}: MatchCourtProps) {
  const [rosterSide, setRosterSide] = useState<CourtSide>(hhfSide ?? "home")
  const safePlayers = useMemo(() => (Array.isArray(players) ? players : []), [players])

  // The modal's feed is already ordered newest first; reversing keeps its tie-breaks.
  const chronological = useMemo(() => [...events].reverse(), [events])

  const { recentGoals, lastEvent } = useMemo(() => {
    const goals = chronological.filter(isGoal)
    const bySide: Record<CourtSide, CourtEvent[]> = {
      home: goals.filter((g) => g.side === "home").slice(-5).reverse(),
      away: goals.filter((g) => g.side === "away").slice(-5).reverse(),
    }
    const notable = chronological.filter((e) => isGoal(e) || isSuspension(e))
    return { recentGoals: bySide, lastEvent: notable.length > 0 ? notable[notable.length - 1] : null }
  }, [chronological])

  const rosters = useMemo(
    () => ({
      home: buildRoster("home", lineup?.home, safePlayers),
      away: buildRoster("away", lineup?.away, safePlayers),
    }),
    [lineup, safePlayers],
  )

  const statsFor = (side: CourtSide) => (Array.isArray(teamStats) ? teamStats.find((s) => s.side === side) : undefined)
  const home = statsFor("home")
  const away = statsFor("away")
  const statRows: Array<{ label: string; home: string; away: string }> = []
  if (home || away) {
    statRows.push({
      label: "7-meter",
      home: `${home?.sevenMeters?.goals ?? 0}/${home?.sevenMeters?.awarded ?? 0}`,
      away: `${away?.sevenMeters?.goals ?? 0}/${away?.sevenMeters?.awarded ?? 0}`,
    })
    statRows.push({ label: "Utvisningar", home: String(home?.suspensions ?? 0), away: String(away?.suspensions ?? 0) })
    statRows.push({ label: "Timeouts", home: String(home?.timeouts ?? 0), away: String(away?.timeouts ?? 0) })
  }

  const lastEventText = lastEvent
    ? `${lastEvent.time ? `${lastEvent.time} ` : ""}${isGoal(lastEvent) ? "Mål" : "Utvisning"}${
        lastEvent.playerNumber ? ` #${lastEvent.playerNumber}` : ""
      }${lastEvent.player ? ` ${shortName(lastEvent.player)}` : ""}${
        lastEvent.side === "home" ? `, ${homeTeam}` : lastEvent.side === "away" ? `, ${awayTeam}` : ""
      }`
    : null

  const activeRoster = rosters[rosterSide]

  return (
    <div className="px-4 py-5 sm:px-6">
      <style>{`@keyframes court-pulse{0%{transform:scale(1);opacity:1}100%{transform:scale(2.1);opacity:0}}.court-pulse{transform-box:fill-box;transform-origin:center;animation:court-pulse 1.6s ease-out infinite}@media (prefers-reduced-motion:reduce){.court-pulse{animation:none}}`}</style>

      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest">
        <span className={`min-w-0 truncate ${hhfSide === "away" ? "text-emerald-700" : "text-slate-400"}`}>← {awayTeam}</span>
        <span className={`min-w-0 truncate text-right ${hhfSide === "home" ? "text-emerald-700" : "text-slate-400"}`}>{homeTeam} →</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5">
        <CourtSvg recentGoals={recentGoals} lastEvent={lastEvent} penalties={penalties} hhfSide={hhfSide} isLive={isLive} />
      </div>
      <p className="mt-2 flex items-center gap-2 text-sm text-slate-700" aria-live={isLive ? "polite" : "off"}>
        {lastEventText ? (
          <>
            {isLive && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />}
            <span className="min-w-0 truncate">
              <span className="text-slate-400">Senast: </span>
              {lastEventText}
            </span>
          </>
        ) : (
          <span className="text-slate-400">Inga mål än.</span>
        )}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-slate-400">
        Pilen visar anfallsriktning. Numren i målgården är de senaste målskyttarna. Spelarpositioner från video kommer.
      </p>

      <MomentumLine events={chronological} hhfSide={hhfSide} periodSeconds={periodSeconds} />

      {statRows.length > 0 && (
        <dl className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100 text-sm">
          {statRows.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2">
              <dd className="font-bold tabular-nums text-slate-900">{row.home}</dd>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{row.label}</dt>
              <dd className="text-right font-bold tabular-nums text-slate-900">{row.away}</dd>
            </div>
          ))}
        </dl>
      )}

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-500">Spelare</h3>
          <div className="flex min-w-0 rounded-full bg-slate-100 p-0.5 text-xs font-semibold" role="group" aria-label="Välj lag">
            {(["home", "away"] as const).map((side) => (
              <button
                key={side}
                type="button"
                aria-pressed={rosterSide === side}
                onClick={() => setRosterSide(side)}
                className={`min-w-0 max-w-[9.5rem] truncate rounded-full px-3 py-1 transition ${
                  rosterSide === side ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                {side === "home" ? homeTeam : awayTeam}
              </button>
            ))}
          </div>
        </div>
        <RosterGrid rows={activeRoster.rows} accent={rosterSide === hhfSide} />
        {activeRoster.staff.length > 0 && (
          <p className="mt-3 text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Ledare: </span>
            {activeRoster.staff.join(", ")}
          </p>
        )}
      </section>
    </div>
  )
}

export const MatchCourt = memo(MatchCourtComponent)
export default MatchCourt
