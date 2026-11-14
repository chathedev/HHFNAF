"use client"

import { withSealed } from "@/components/sealed"
import Link from "@/components/quiet-link"
import { useMemo, useState } from "react"
import { Search } from "lucide-react"

type IndexEntry = {
  key: string
  name: string
  names?: string[]
  classKey: string
  season: string
  isHhf: boolean
  label?: string | null
  series?: string[]
  played: number
}

const norm = (value: string | null | undefined) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

const classLabel = (classKey: string) => (classKey === "HERR" ? "Herrar" : classKey === "DAM" ? "Damer" : classKey)

const CLASS_WORD = /^(?:[fp]\d{1,2}|dam|damer|herr|herrar)$/
const classOfWord = (word: string) => (word.startsWith("dam") ? "dam" : word.startsWith("herr") ? "herr" : word)

// Same rules as the API's /scout/search: a class word ("F16", "dam") must be the team's class
// exactly; a number ("lag 2") must be a whole word of the name or HHF label; every other word
// may appear in the name, HHF label or series; "hhf" means Härnösands HF. HHF first, then this
// season, then the best name match.
export function rankTeams(index: IndexEntry[], query: string) {
  const q = norm(query).trim()
  if (q.length < 2) return []
  const words = q.replace(/[()]/g, " ").split(/\s+/).filter(Boolean)
  const newest = index.reduce((max, entry) => (entry.season > max ? entry.season : max), "")
  const hits: { entry: IndexEntry; score: number }[] = []
  for (const entry of index) {
    const cls = norm(entry.classKey)
    const names = norm([entry.name, ...(entry.names ?? [])].join(" "))
    const labelled = `${names} ${norm(entry.label)}`
    const hay = `${labelled} ${norm((entry.series ?? []).join(" "))} ${norm(entry.season)}`
    let ok = true
    let nameHits = 0
    for (const word of words) {
      if (CLASS_WORD.test(word)) {
        if (classOfWord(word) !== cls) ok = false
        if (!ok) break
        continue
      }
      if (word === "hhf") {
        if (!entry.isHhf) ok = false
        if (!ok) break
        continue
      }
      const numeric = /^\d+$/.test(word)
      const hit = (text: string) => (numeric ? text.split(/[^a-z0-9]+/).includes(word) : text.includes(word))
      if (!hit(numeric ? labelled : hay)) {
        ok = false
        break
      }
      if (hit(names)) nameHits += 1
    }
    if (!ok) continue
    const startsWith = words.some((w) => names.startsWith(w))
    hits.push({
      entry,
      score: (entry.isHhf ? 1000 : 0) + (entry.season === newest ? 500 : 0) + nameHits * 20 + (startsWith ? 10 : 0) + Math.min(entry.played, 9),
    })
  }
  return hits
    .sort((a, b) => b.score - a.score || (a.entry.label ?? a.entry.name).localeCompare(b.entry.label ?? b.entry.name, "sv"))
    .map((hit) => hit.entry)
}

// Find any team in HHF's series (both seasons) and jump to its scouting profile.
export function ScoutSearch({ index, dark = false }: { index: IndexEntry[]; dark?: boolean }) {
  const [query, setQuery] = useState("")
  const results = useMemo(() => rankTeams(index, query).slice(0, 15), [index, query])

  return (
    <div className="relative w-full max-w-xl">
      <label className="sr-only" htmlFor="scout-search">
        Sök lag
      </label>
      <div className="flex items-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus-within:border-slate-900">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <input
          id="scout-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Sök lag, t.ex. HHF F16 lag 2 eller Sundsvall P16"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden border border-slate-300 bg-white text-slate-900 shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Inget lag matchar “{query}”.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {results.map((entry) => (
                <li key={entry.key}>
                  <Link href={`/scout/lag/${entry.key}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{entry.name}</span>
                      {(entry.label || entry.series?.length) && (
                        <span className="block truncate text-xs text-slate-500">
                          {entry.label ?? entry.series?.[0]}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {classLabel(entry.classKey)} · {entry.season.replace("/", "–")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export const ScoutSearchSealed = withSealed(ScoutSearch, "ScoutSearch")
