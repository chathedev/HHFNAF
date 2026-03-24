"use client"

import { useState, useMemo } from "react"

type StandingsTeam = {
  team: string
  M: number
  W: number
  D: number
  L: number
  GF: number
  GA: number
  GD: number
  P: number
}

type StandingsData = Record<string, StandingsTeam[]>

const CATEGORY_FILTERS = [
  { label: "Alla", value: "all" },
  { label: "Dam", value: "dam" },
  { label: "Herr", value: "herr" },
  { label: "Flickor", value: "flickor" },
  { label: "Pojkar", value: "pojkar" },
] as const

function classifySeries(series: string): string {
  const s = series.toLowerCase()
  if (s.includes("dam") || s.includes("f19") || s.includes("f16") || s.includes("f15") || s.includes("f14") || s.includes("f13") || s.includes("f12") || s.includes("flickor")) {
    if (s.startsWith("dam") || s.includes("- dam")) return "dam"
    return "flickor"
  }
  if (s.includes("herr") || s.includes("p16") || s.includes("p14") || s.includes("p13") || s.includes("p12") || s.includes("pojkar")) {
    if (s.startsWith("herr") || s.includes("- herr")) return "herr"
    return "pojkar"
  }
  return "all"
}

export function TabellerClient({ initialData }: { initialData: StandingsData }) {
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(() => {
    // Expand all by default
    return new Set(Object.keys(initialData))
  })
  const [searchQuery, setSearchQuery] = useState("")

  const seriesList = useMemo(() => {
    return Object.entries(initialData)
      .filter(([, teams]) => Array.isArray(teams) && teams.length > 0)
      .map(([series, teams]) => ({ series, teams: teams as StandingsTeam[], category: classifySeries(series) }))
      .sort((a, b) => b.teams.length - a.teams.length)
  }, [initialData])

  const filteredSeries = useMemo(() => {
    return seriesList.filter((s) => {
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesSeries = s.series.toLowerCase().includes(q)
        const matchesTeam = s.teams.some((t) => t.team.toLowerCase().includes(q))
        if (!matchesSeries && !matchesTeam) return false
      }
      return true
    })
  }, [seriesList, categoryFilter, searchQuery])

  const toggleSeries = (series: string) => {
    setExpandedSeries((prev) => {
      const next = new Set(prev)
      if (next.has(series)) next.delete(series)
      else next.add(series)
      return next
    })
  }

  const expandAll = () => setExpandedSeries(new Set(filteredSeries.map((s) => s.series)))
  const collapseAll = () => setExpandedSeries(new Set())

  const totalSeries = filteredSeries.length
  const hhfSeriesCount = filteredSeries.filter((s) =>
    s.teams.some((t) => t.team.toLowerCase().includes("härnösand"))
  ).length

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition hover:text-emerald-900 mb-4"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Startsidan
        </a>
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-600">Härnösands HF</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Serietabeller</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base max-w-2xl">
          Ställningar för alla serier vi deltar i. Beräknade från matchresultat — 2 poäng för vinst, 1 för oavgjort.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Serier</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{totalSeries}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600">HHF deltar i</p>
          <p className="mt-1 text-2xl font-black text-emerald-700">{hhfSeriesCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 col-span-2 sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Poängsystem</p>
          <p className="mt-1 text-sm font-medium text-slate-700">V=2p, O=1p, F=0p</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setCategoryFilter(f.value)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  categoryFilter === f.value
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Sök lag eller serie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={expandAll} className="text-xs text-emerald-700 font-medium hover:underline">
            Visa alla
          </button>
          <span className="text-slate-300">|</span>
          <button onClick={collapseAll} className="text-xs text-slate-500 font-medium hover:underline">
            Dölj alla
          </button>
        </div>
      </div>

      {/* Tables */}
      {filteredSeries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm text-slate-500">Inga tabeller matchar filtret.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSeries.map((s) => {
            const isExpanded = expandedSeries.has(s.series)
            const hhfTeam = s.teams.find((t) => t.team.toLowerCase().includes("härnösand"))
            const hhfPosition = hhfTeam ? s.teams.indexOf(hhfTeam) + 1 : null

            return (
              <div key={s.series} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button
                  onClick={() => toggleSeries(s.series)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{s.series}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {s.teams.length} lag
                      {hhfPosition && (
                        <span className="ml-2 text-emerald-600 font-medium">
                          HHF #{hhfPosition}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="ml-4 shrink-0 text-sm text-slate-400">{isExpanded ? "−" : "+"}</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2.5 w-8">#</th>
                          <th className="px-3 py-2.5">Lag</th>
                          <th className="px-3 py-2.5 text-center">M</th>
                          <th className="px-3 py-2.5 text-center">V</th>
                          <th className="px-3 py-2.5 text-center">O</th>
                          <th className="px-3 py-2.5 text-center">F</th>
                          <th className="px-3 py-2.5 text-center hidden sm:table-cell">GM</th>
                          <th className="px-3 py-2.5 text-center hidden sm:table-cell">IM</th>
                          <th className="px-3 py-2.5 text-center">+/−</th>
                          <th className="px-3 py-2.5 text-center font-bold">P</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {s.teams.map((team, idx) => {
                          const isHHF = team.team.toLowerCase().includes("härnösand")
                          return (
                            <tr
                              key={team.team}
                              className={`${isHHF ? "bg-emerald-50/60 font-medium" : ""} hover:bg-slate-50/80 transition`}
                            >
                              <td className="px-3 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                              <td className="px-3 py-2.5 text-slate-900 whitespace-nowrap max-w-[200px] truncate">
                                {isHHF && (
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle" />
                                )}
                                {team.team}
                              </td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{team.M}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{team.W}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{team.D}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{team.L}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600 hidden sm:table-cell">{team.GF}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600 hidden sm:table-cell">{team.GA}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span
                                  className={`text-xs font-medium ${
                                    team.GD > 0 ? "text-emerald-600" : team.GD < 0 ? "text-rose-500" : "text-slate-400"
                                  }`}
                                >
                                  {team.GD > 0 ? "+" : ""}
                                  {team.GD}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900">{team.P}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
