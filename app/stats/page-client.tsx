"use client"

import { useEffect, useMemo, useState } from "react"
import { extendTeamDisplayName } from "@/lib/team-display"

const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "")) ||
  "https://api.harnosandshf.se"

type PlayerRow = {
  rank?: number
  name: string
  number?: string
  playerId?: number
  goals: number
  assists: number
  suspensions: number
  penaltyGoals: number
  penaltyMisses: number
  matchesPlayed?: number
  teamName?: string
}

type StatsPayload = {
  overview: {
    totalMatches: number
    matchesWithFeed: number
    liveMatches: number
    upcomingMatches: number
  }
  matchResults: {
    wins: number
    losses: number
    draws: number
    totalGoalsScored: number
    totalGoalsConceded: number
    averageGoalsScored: number | string
    averageGoalsConceded: number | string
  }
  eventStats: {
    goals: number
    penalties: number
    suspensions: number
    timeouts: number
    sevenMeterThrows: number
    sevenMeterMisses: number
    sevenMeterGoals: number
  }
  playerStats: {
    topScorers: PlayerRow[]
    mostAssists: PlayerRow[]
    mostSuspensions: PlayerRow[]
  }
  byPlayer?: Record<string, PlayerRow>
  byTeam?: Record<string, unknown>
}

const TAB_OPTIONS: Array<{ id: "statistik" | "topplistor" | "lag"; label: string; hint: string }> = [
  { id: "statistik", label: "Statistik", hint: "Alla spelare" },
  { id: "topplistor", label: "Topplistor", hint: "Mest mål, utvisningar, 7-m" },
  { id: "lag", label: "Lag", hint: "Hela truppen" },
]

const LIMIT_OPTIONS: Array<{ value: 3 | 5 | 10 | 0; label: string }> = [
  { value: 3, label: "Topp 3" },
  { value: 5, label: "Topp 5" },
  { value: 10, label: "Topp 10" },
  { value: 0, label: "Alla" },
]

const DEFAULT_TEAM = "A-lag Herrar"

type SortKey = "goals" | "suspensions" | "penaltyGoals" | "matchesPlayed" | "name"

export function StatsPageClient() {
  const [teamTypes, setTeamTypes] = useState<string[]>([])
  const [teamType, setTeamType] = useState<string>(DEFAULT_TEAM)
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<"statistik" | "topplistor" | "lag">("statistik")
  const [topLimit, setTopLimit] = useState<3 | 5 | 10 | 0>(10)
  const [sortKey, setSortKey] = useState<SortKey>("goals")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE_URL}/matcher/data/stats`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const keys = Object.keys((d?.byTeam as Record<string, unknown>) || {})
        const sorted = keys.slice().sort((a, b) => a.localeCompare(b, "sv"))
        setTeamTypes(sorted)
        if (sorted.length > 0 && !sorted.includes(teamType)) {
          setTeamType(sorted.includes(DEFAULT_TEAM) ? DEFAULT_TEAM : sorted[0])
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetch(`${API_BASE_URL}/matcher/data/stats?teamType=${encodeURIComponent(teamType)}`, {
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: StatsPayload) => {
        if (cancelled) return
        setStats(d)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e?.message ?? "Kunde inte ladda statistik")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [teamType])

  const allPlayers = useMemo(() => {
    if (!stats?.byPlayer) return [] as PlayerRow[]
    const raw = Object.values(stats.byPlayer)
    // Exclude entries without a real name
    return raw.filter((p) => p && typeof p.name === "string" && p.name.trim().length > 0)
  }, [stats])

  const sortedPlayers = useMemo(() => {
    const copy = [...allPlayers]
    copy.sort((a, b) => {
      if (sortKey === "name") {
        const cmp = a.name.localeCompare(b.name, "sv")
        return sortDir === "asc" ? cmp : -cmp
      }
      const av = Number(a[sortKey] ?? 0)
      const bv = Number(b[sortKey] ?? 0)
      const primary = sortDir === "asc" ? av - bv : bv - av
      if (primary !== 0) return primary
      // Tie breaker: higher goals first, then name
      const goalTie = (b.goals ?? 0) - (a.goals ?? 0)
      if (goalTie !== 0) return goalTie
      return a.name.localeCompare(b.name, "sv")
    })
    return copy
  }, [allPlayers, sortKey, sortDir])

  const topScorers = useMemo(() => {
    const list = stats?.playerStats?.topScorers ?? []
    return topLimit === 0 ? list : list.slice(0, topLimit)
  }, [stats, topLimit])

  const mostSuspensions = useMemo(() => {
    const list = stats?.playerStats?.mostSuspensions ?? []
    return topLimit === 0 ? list : list.slice(0, topLimit)
  }, [stats, topLimit])

  const mostSevenMeter = useMemo(() => {
    const list = [...allPlayers]
      .filter((p) => (p.penaltyGoals ?? 0) > 0)
      .sort((a, b) => (b.penaltyGoals ?? 0) - (a.penaltyGoals ?? 0))
    return topLimit === 0 ? list : list.slice(0, topLimit)
  }, [allPlayers, topLimit])

  const record = stats?.matchResults
  const overview = stats?.overview

  const totalTeamGoals = stats?.matchResults?.totalGoalsScored ?? 0
  const totalConceded = stats?.matchResults?.totalGoalsConceded ?? 0
  const goalDiff = totalTeamGoals - totalConceded

  const teamTitle = useMemo(() => extendTeamDisplayName(teamType) || teamType, [teamType])

  const hasAnyData = allPlayers.length > 0

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 text-white">
        <div className="container mx-auto px-4 py-10 sm:py-14">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/70">Härnösands HF · Säsong 2025/26</p>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">{teamTitle}</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">
                Spelarstatistik aggregerad från alla matcher med Profixio-data. Mål, utvisningar, 7-meter och
                matchdeltagande — uppdateras automatiskt efter varje spelad match.
              </p>
            </div>

            <div className="w-full sm:w-auto">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-white/70">
                Välj lag
              </label>
              <select
                value={teamType}
                onChange={(e) => setTeamType(e.target.value)}
                className="w-full min-w-[220px] rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60 sm:w-auto"
              >
                {teamTypes.length === 0 && <option value={teamType}>{teamTitle}</option>}
                {teamTypes.map((t) => (
                  <option key={t} value={t} className="text-slate-900">
                    {extendTeamDisplayName(t) || t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary tiles */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="Matcher" value={overview?.totalMatches ?? 0} hint={`${overview?.matchesWithFeed ?? 0} med händelsedata`} />
            <SummaryTile
              label="V–O–F"
              value={`${record?.wins ?? 0}–${record?.draws ?? 0}–${record?.losses ?? 0}`}
              hint="Vinster · oavgjorda · förluster"
            />
            <SummaryTile
              label="Målskillnad"
              value={`${goalDiff >= 0 ? "+" : ""}${goalDiff}`}
              hint={`${totalTeamGoals} gjorda · ${totalConceded} insläppta`}
            />
            <SummaryTile
              label="Målsnitt"
              value={`${record?.averageGoalsScored ?? "0"}`}
              hint={`mot ${record?.averageGoalsConceded ?? "0"} per match`}
            />
          </div>
        </div>
      </section>

      {/* Tab bar */}
      <div className="sticky top-16 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container mx-auto flex items-center gap-1 overflow-x-auto px-4">
          {TAB_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTab(opt.id)}
              className={`relative whitespace-nowrap px-4 py-4 text-sm font-bold uppercase tracking-wider transition ${
                tab === opt.id ? "text-emerald-700" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {opt.label}
              <span className="ml-2 hidden text-[11px] font-medium normal-case tracking-normal text-slate-400 sm:inline">
                {opt.hint}
              </span>
              {tab === opt.id && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-emerald-600" />}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {isLoading && <LoadingSkeleton />}
        {!isLoading && error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Kunde inte ladda statistik: {error}
          </div>
        )}
        {!isLoading && !error && !hasAnyData && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
            Ingen spelarstatistik har registrerats för {teamTitle} ännu. Data aggregeras automatiskt från
            matchhändelser.
          </div>
        )}

        {!isLoading && !error && hasAnyData && tab === "statistik" && (
          <StatistikTable
            players={sortedPlayers}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={(key) => {
              if (sortKey === key) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"))
              } else {
                setSortKey(key)
                setSortDir(key === "name" ? "asc" : "desc")
              }
            }}
          />
        )}

        {!isLoading && !error && hasAnyData && tab === "topplistor" && (
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Visa</span>
              {LIMIT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTopLimit(opt.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    topLimit === opt.value
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Leaderboard title="Flest mål" metricLabel="mål" players={topScorers} metric={(p) => p.goals} />
              <Leaderboard
                title="Flest utvisningar"
                metricLabel="utv"
                players={mostSuspensions}
                metric={(p) => p.suspensions}
                accent="amber"
              />
              <Leaderboard
                title="Flest 7-metersmål"
                metricLabel="7-m"
                players={mostSevenMeter}
                metric={(p) => p.penaltyGoals}
                accent="sky"
                emptyMessage="Inga 7-metersmål registrerade."
              />
            </div>
          </div>
        )}

        {!isLoading && !error && hasAnyData && tab === "lag" && (
          <TruppGrid players={sortedPlayers.length > 0 ? sortedPlayers : allPlayers} />
        )}
      </div>
    </div>
  )
}

function SummaryTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-white sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-white/70">{hint}</p>}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 w-full animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  )
}

function HeaderCell({
  children,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align = "right",
  title,
}: {
  children: React.ReactNode
  sortKey: SortKey
  currentSort: SortKey
  currentDir: "asc" | "desc"
  onSort: (key: SortKey) => void
  align?: "left" | "right"
  title?: string
}) {
  const active = currentSort === sortKey
  const arrow = active ? (currentDir === "asc" ? "▲" : "▼") : ""
  return (
    <th
      scope="col"
      title={title}
      className={`cursor-pointer select-none px-2 py-2 text-[11px] font-bold uppercase tracking-widest transition ${
        align === "right" ? "text-right" : "text-left"
      } ${active ? "text-emerald-700" : "text-slate-500 hover:text-slate-900"}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {arrow && <span className="text-[9px]">{arrow}</span>}
      </span>
    </th>
  )
}

function StatistikTable({
  players,
  sortKey,
  sortDir,
  onSort,
}: {
  players: PlayerRow[]
  sortKey: SortKey
  sortDir: "asc" | "desc"
  onSort: (key: SortKey) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Spelarstatistik</h2>
          <p className="text-xs text-slate-500">
            Klicka på en kolumn för att sortera. M = matcher · G = mål · 7m = 7-metersmål · Utv = utvisningar · A =
            assists.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
          {players.length} spelare
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white">
            <tr className="border-b border-slate-100">
              <th className="w-8 px-2 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">#</th>
              <HeaderCell sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={onSort} align="left">
                Namn
              </HeaderCell>
              <th className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Nr
              </th>
              <HeaderCell sortKey="matchesPlayed" currentSort={sortKey} currentDir={sortDir} onSort={onSort} title="Matcher spelade">
                M
              </HeaderCell>
              <HeaderCell sortKey="goals" currentSort={sortKey} currentDir={sortDir} onSort={onSort} title="Mål">
                G
              </HeaderCell>
              <HeaderCell sortKey="penaltyGoals" currentSort={sortKey} currentDir={sortDir} onSort={onSort} title="7-metersmål">
                7m
              </HeaderCell>
              <HeaderCell sortKey="suspensions" currentSort={sortKey} currentDir={sortDir} onSort={onSort} title="Utvisningar">
                Utv
              </HeaderCell>
              <th className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-widest text-slate-400" title="Assists">
                A
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null
              return (
                <tr key={`${p.playerId ?? p.name}-${i}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-2 py-2 text-[11px] font-semibold tabular-nums text-slate-400">
                    {medal ? <span className="text-base">{medal}</span> : i + 1}
                  </td>
                  <td className="px-2 py-2">
                    <p className="font-semibold text-slate-900">{p.name}</p>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {p.number ? (
                      <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-700">
                        {p.number}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-700">{p.matchesPlayed ?? 0}</td>
                  <td className="px-2 py-2 text-right font-black tabular-nums text-slate-900">{p.goals ?? 0}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-sky-700">{p.penaltyGoals ?? 0}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-amber-700">{p.suspensions ?? 0}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-500">{p.assists ?? 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Leaderboard({
  title,
  metricLabel,
  players,
  metric,
  accent = "emerald",
  emptyMessage,
}: {
  title: string
  metricLabel: string
  players: PlayerRow[]
  metric: (player: PlayerRow) => number | undefined
  accent?: "emerald" | "amber" | "sky"
  emptyMessage?: string
}) {
  const accentClasses = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
  }[accent]

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${accentClasses}`}>
          {metricLabel}
        </span>
      </header>
      {players.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-400">{emptyMessage ?? "Inga spelare ännu."}</p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {players.map((p, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null
            return (
              <li
                key={`${p.playerId ?? p.name}-${i}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {medal ? (
                    <span className="text-lg leading-none">{medal}</span>
                  ) : (
                    <span className="w-5 text-center text-[11px] font-semibold tabular-nums text-slate-400">
                      {i + 1}
                    </span>
                  )}
                  {p.number && (
                    <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-700">
                      {p.number}
                    </span>
                  )}
                  <p className="truncate font-semibold text-slate-900">{p.name}</p>
                </div>
                <p className="shrink-0 text-base font-black tabular-nums text-slate-900">{metric(p) ?? 0}</p>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function TruppGrid({ players }: { players: PlayerRow[] }) {
  const sorted = [...players].sort((a, b) => {
    const aNum = Number.parseInt(a.number ?? "999", 10)
    const bNum = Number.parseInt(b.number ?? "999", 10)
    if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) return aNum - bNum
    return a.name.localeCompare(b.name, "sv")
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Hela truppen</h2>
        <span className="text-xs text-slate-500">{sorted.length} spelare — sorterat efter tröjnummer</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {sorted.map((p, i) => (
          <div
            key={`${p.playerId ?? p.name}-${i}`}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-lg font-black tabular-nums text-white">
                {p.number || "—"}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mål</p>
                <p className="text-xl font-black tabular-nums text-slate-900">{p.goals ?? 0}</p>
              </div>
            </div>
            <p className="mt-3 truncate text-sm font-bold text-slate-900">{p.name}</p>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
              <span>
                <span className="font-semibold text-slate-700">{p.matchesPlayed ?? 0}</span> matcher
              </span>
              {(p.suspensions ?? 0) > 0 && (
                <span>
                  <span className="font-semibold text-amber-700">{p.suspensions}</span> utv
                </span>
              )}
              {(p.penaltyGoals ?? 0) > 0 && (
                <span>
                  <span className="font-semibold text-sky-700">{p.penaltyGoals}</span> 7-m
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
