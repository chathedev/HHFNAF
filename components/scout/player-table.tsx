"use client"

import { useMemo, useState } from "react"
import type { Player } from "@/lib/scout"

// Sortable player statistics from Profixio match logs. Numbers align in columns
// (tabular figures); the sort column is marked for screen readers.

type SortKey = "goals" | "gpg" | "games" | "share" | "pen" | "susp" | "recent" | "prev"

const COLUMNS: { key: SortKey; label: string; title: string; className?: string }[] = [
  { key: "games", label: "M", title: "Matcher med matchlogg där spelaren var med" },
  { key: "goals", label: "Mål", title: "Mål totalt (inkl. 7 m)" },
  { key: "gpg", label: "/match", title: "Mål per match" },
  { key: "share", label: "Andel", title: "Andel av lagets mål", className: "hidden sm:table-cell" },
  { key: "pen", label: "7 m", title: "7-metersmål / försök" },
  { key: "susp", label: "2 min", title: "Utvisningar" },
  { key: "recent", label: "Senaste 3", title: "Mål i lagets tre senaste matcher (senaste först)", className: "hidden md:table-cell" },
  { key: "prev", label: "Förra säsongen", title: "Mål / matcher förra säsongen (alla lag)", className: "hidden lg:table-cell" },
]

function value(player: Player, key: SortKey): number {
  switch (key) {
    case "recent":
      return player.recent.reduce((sum, g) => sum + g, 0)
    case "prev":
      return player.prev ? player.prev.goals : -1
    default:
      return player[key] as number
  }
}

export function PlayerTable({ players, highlight = false, limit = 25 }: { players: Player[]; highlight?: boolean; limit?: number }) {
  const [sort, setSort] = useState<SortKey>("goals")
  const [showAll, setShowAll] = useState(false)
  const sorted = useMemo(() => [...players].sort((a, b) => value(b, sort) - value(a, sort) || b.goals - a.goals), [players, sort])
  const visible = showAll ? sorted : sorted.slice(0, limit)
  if (!players.length) return <p className="text-sm text-slate-500">Inga spelare med matchlogg ännu.</p>
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="w-10 px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Spelare</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-2 py-2.5 text-center ${col.className ?? ""}`}
                  aria-sort={sort === col.key ? "descending" : "none"}
                  title={col.title}
                >
                  <button
                    type="button"
                    onClick={() => setSort(col.key)}
                    className={`inline-flex items-center gap-1 rounded px-1 uppercase tracking-wider transition hover:text-slate-900 ${sort === col.key ? "text-slate-950" : ""}`}
                  >
                    {col.label}
                    {sort === col.key && <span aria-hidden>▾</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {visible.map((p, index) => (
              <tr key={`${p.name}-${p.no}-${index}`} className={`transition hover:bg-slate-50/80 ${index === 0 && sort === "goals" && highlight ? "bg-emerald-50/40" : ""}`}>
                <td className="px-3 py-2.5 text-xs font-bold text-slate-400">{p.no ?? "–"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900">
                  {p.name}
                  {p.keeper && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">MV</span>}
                  {p.captain && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">C</span>}
                </td>
                <td className="px-2 py-2.5 text-center text-slate-600">{p.games}</td>
                <td className="px-2 py-2.5 text-center font-black text-slate-950">{p.goals}</td>
                <td className="px-2 py-2.5 text-center text-slate-700">{p.gpg.toFixed(1).replace(".", ",")}</td>
                <td className="hidden px-2 py-2.5 text-center text-slate-600 sm:table-cell">{p.share}&nbsp;%</td>
                <td className="px-2 py-2.5 text-center text-slate-600">{p.penAtt ? `${p.pen}/${p.penAtt}` : "–"}</td>
                <td className="px-2 py-2.5 text-center text-slate-600">{p.susp || "–"}</td>
                <td className="hidden px-2 py-2.5 text-center text-slate-600 md:table-cell">{p.recent.length ? p.recent.join(" · ") : "–"}</td>
                <td className="hidden whitespace-nowrap px-2 py-2.5 text-center text-slate-500 lg:table-cell" title={p.prev ? p.prev.teams.map((t) => `${t.team} (${t.classKey}): ${t.goals} mål på ${t.games}`).join("\n") : undefined}>
                  {p.prev ? `${p.prev.goals} på ${p.prev.games}` : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > limit && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full border-t border-slate-100 px-4 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-slate-50"
        >
          {showAll ? "Visa färre" : `Visa alla ${sorted.length} spelare`}
        </button>
      )}
    </div>
  )
}
