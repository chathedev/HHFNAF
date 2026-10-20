"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Search } from "lucide-react"

type IndexEntry = { key: string; name: string; classKey: string; season: string; isHhf: boolean; played: number }

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")

const classLabel = (classKey: string) => (classKey === "HERR" ? "Herrar" : classKey === "DAM" ? "Damer" : classKey)

// Find any team in HHF's series (both seasons) and jump to its scouting profile.
export function ScoutSearch({ index, dark = false }: { index: IndexEntry[]; dark?: boolean }) {
  const [query, setQuery] = useState("")
  const results = useMemo(() => {
    const q = norm(query.trim())
    if (q.length < 2) return []
    const words = q.split(/\s+/)
    return index.filter((entry) => {
      const hay = norm(`${entry.name} ${classLabel(entry.classKey)} ${entry.season}`)
      return words.every((w) => hay.includes(w))
    }).slice(0, 12)
  }, [index, query])

  return (
    <div className="relative w-full max-w-xl">
      <label className="sr-only" htmlFor="scout-search">
        Sök lag
      </label>
      <div
        className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition focus-within:ring-2 ${
          dark
            ? "border-white/15 bg-white/10 text-white focus-within:ring-emerald-400/40"
            : "border-slate-200 bg-white text-slate-900 focus-within:ring-emerald-500/30"
        }`}
      >
        <Search className={`h-4 w-4 shrink-0 ${dark ? "text-white/60" : "text-slate-400"}`} aria-hidden />
        <input
          id="scout-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Sök lag, t.ex. Sundsvall P16"
          className={`w-full bg-transparent text-sm outline-none ${dark ? "placeholder:text-white/50" : "placeholder:text-slate-400"}`}
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Inget lag matchar “{query}”.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {results.map((entry) => (
                <li key={entry.key}>
                  <Link href={`/scout/lag/${entry.key}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition hover:bg-emerald-50">
                    <span className="min-w-0 truncate font-semibold">
                      {entry.isHhf && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" aria-hidden />}
                      {entry.name}
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
