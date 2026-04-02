"use client"

import { useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Loader2 } from "lucide-react"
import { useFinal4Data, type Final4Match } from "@/lib/use-final4-data"
import { Final4MatchRow } from "@/components/final4-match-card"
import { Final4Header } from "@/components/final4-header"
import { isFinal4Active, isFinal4Over } from "@/lib/final4-config"

const CATEGORY_ORDER = ["F14", "P14", "F16", "P16"]

const CATEGORY_LABELS: Record<string, string> = {
  F14: "Flickor 14",
  P14: "Pojkar 14",
  F16: "Flickor 16",
  P16: "Pojkar 16",
}

function CategorySection({ category, matches }: { category: string; matches: Final4Match[] }) {
  const semifinals = matches.filter((m) => m.round.toLowerCase().includes("semifinal"))
  const bronzeMatch = matches.find((m) => m.round.toLowerCase().includes("brons"))
  const finalMatch = matches.find((m) => m.round.toLowerCase() === "final")
  const liveCount = matches.filter((m) => m.matchStatus === "live").length
  const orderedMatches = [...semifinals, ...(bronzeMatch ? [bronzeMatch] : []), ...(finalMatch ? [finalMatch] : [])]

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-900">
          {CATEGORY_LABELS[category] || category}
        </span>
        {liveCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {liveCount} Live
          </span>
        )}
        <span className="text-[10px] text-slate-400">{matches.length} matcher</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <ul className="space-y-0">
        {orderedMatches.map((m) => (
          <li key={m.matchId}>
            <Final4MatchRow match={m} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Final4PageClient() {
  const { data, loading, error } = useFinal4Data()
  const active = isFinal4Active()
  const over = isFinal4Over()

  const matchesByCategory = useMemo(() => {
    if (!data) return {}
    const map: Record<string, Final4Match[]> = {}
    for (const cat of CATEGORY_ORDER) {
      map[cat] = data.matches.filter((m) => m.category === cat)
    }
    return map
  }, [data])

  const teams = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    for (const m of data.matches) {
      if (!m.homeName.startsWith("Winner ") && !m.homeName.startsWith("Loser ") && m.homeName !== "TBD") set.add(m.homeName)
      if (!m.awayName.startsWith("Winner ") && !m.awayName.startsWith("Loser ") && m.awayName !== "TBD") set.add(m.awayName)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "sv"))
  }, [data])

  const liveMatches = data?.matches.filter((m) => m.matchStatus === "live") ?? []

  return (
    <div className="bg-white min-h-screen">
      <Final4Header />

      {/* Hero — full-width image */}
      <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
        <Image
          src="/final4-hero.webp"
          alt="Final4 Norr 2026"
          fill
          className="z-0 object-cover object-center"
          priority
          quality={85}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10" />

        <div className="relative z-20 text-white text-center px-4 sm:px-6 max-w-5xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 leading-tight tracking-tight text-shadow-outline">
            FINAL4 <span className="text-amber-400">NORR</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl mb-6 max-w-2xl mx-auto text-shadow-md leading-relaxed">
            Handbollturnering i Härnösand &middot; 11–12 april 2026
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="#matcher"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-base font-semibold shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl inline-flex items-center justify-center gap-2"
            >
              Se matcherna
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
          {active && (
            <div className="mt-6 inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-semibold">Turneringen pågår</span>
            </div>
          )}
          {over && (
            <div className="mt-6 inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-2">
              <span className="text-sm font-medium">Turneringen avslutad</span>
            </div>
          )}
        </div>
      </section>

      <main>
        {/* Match section */}
        <section id="matcher" className="py-12 sm:py-16">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2">Matcher</h2>
              <p className="text-slate-500 text-sm mb-8">
                F14, P14, F16, P16 &middot; 16 matcher totalt &middot; Semifinaler, bronsmatcher & finaler
              </p>

              {loading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                </div>
              )}

              {error && (
                <div className="py-12 text-center">
                  <p className="text-slate-400 mb-2">Kunde inte ladda matchdata</p>
                  <p className="text-xs text-slate-300">{error}</p>
                </div>
              )}

              {data && data.matches.length > 0 && (
                <div className="space-y-10">
                  {/* Live banner */}
                  {liveMatches.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-900">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          Live
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                      <ul className="space-y-0">
                        {liveMatches.map((m) => (
                          <li key={m.matchId}>
                            <Final4MatchRow match={m} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Categories */}
                  {CATEGORY_ORDER.map((cat) => {
                    const matches = matchesByCategory[cat]
                    if (!matches || matches.length === 0) return null
                    return <CategorySection key={cat} category={cat} matches={matches} />
                  })}

                  {active && (
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Uppdateras automatiskt
                    </p>
                  )}
                </div>
              )}

              {data && data.matches.length === 0 && (
                <div className="py-16 text-center">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Matchprogrammet kommer snart</h3>
                  <p className="text-sm text-slate-400">
                    Matcher för Final4 Norr publiceras inom kort.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Teams section */}
        {teams.length > 0 && (
          <section id="lag" className="py-12 bg-slate-50">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-6">Deltagande lag</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {teams.map((team) => (
                    <div
                      key={team}
                      className="rounded-md bg-white border border-slate-200 px-3 py-2.5 text-sm text-slate-700 truncate"
                    >
                      {team}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Info section */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-6">
              {[
                { label: "Klasser", value: "F14, P14, F16, P16" },
                { label: "Datum", value: "11–12 april 2026" },
                { label: "Plats", value: "Öbacka SC & Änget Sportcenter, Härnösand" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                  <p className="text-sm font-medium text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-slate-500 mb-3">
              <span className="font-bold text-blue-700">Final4 Norr</span> — arrangeras av Härnösands HF
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="https://www.harnosandshf.se"
                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition"
              >
                harnosandshf.se
              </Link>
              {data?.tournament.profixioUrl && (
                <a
                  href={data.tournament.profixioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-400 hover:text-slate-600 transition"
                >
                  Profixio
                </a>
              )}
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
