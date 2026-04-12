"use client"

import { useMemo } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { useFinal4Data, type Final4Match, type Final4Data } from "@/lib/use-final4-data"
import { Final4MatchRow } from "@/components/final4-match-card"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { isFinal4Active } from "@/lib/final4-config"
import { getFinal4DerivedStatus } from "@/lib/final4-utils"

function formatDateHeading(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Stockholm",
  })
}

export function Final4PageClient({ initialData }: { initialData?: Final4Data }) {
  const { data, loading, error } = useFinal4Data(initialData)
  const active = isFinal4Active()

  const { liveMatches, upcomingByDate, finishedByDate } = useMemo(() => {
    if (!data) return { liveMatches: [], upcomingByDate: [], finishedByDate: [] }

    const live: Final4Match[] = []
    const upcoming: Final4Match[] = []
    const finished: Final4Match[] = []

    for (const m of data.matches) {
      const status = getFinal4DerivedStatus(m)
      if (status === "live") live.push(m)
      else if (status === "finished") finished.push(m)
      else upcoming.push(m)
    }

    const groupByDate = (matches: Final4Match[]) => {
      const map = new Map<string, Final4Match[]>()
      for (const m of matches) {
        const dateKey = new Date(m.date).toISOString().slice(0, 10)
        if (!map.has(dateKey)) map.set(dateKey, [])
        map.get(dateKey)!.push(m)
      }
      for (const arr of map.values()) {
        arr.sort((a, b) => (a.time || "").localeCompare(b.time || ""))
      }
      return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
    }

    return {
      liveMatches: live,
      upcomingByDate: groupByDate(upcoming),
      finishedByDate: groupByDate(finished),
    }
  }, [data])

  const hasUpcoming = upcomingByDate.some(([, m]) => m.length > 0)
  const hasFinished = finishedByDate.some(([, m]) => m.length > 0)

  return (
    <div>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative w-full h-[70vh] sm:h-screen overflow-hidden">
          <Image
            src="/final4-hero.webp"
            alt="Final4 Norr 2026"
            fill
            className="z-0 object-cover object-center"
            priority
            quality={90}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
        </section>

        {/* Matches */}
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">Final4 Norr</h2>
              <p className="text-sm text-slate-500 mb-8">
                16 matcher &middot; F14, P14, F16, P16 &middot; Härnösand
              </p>

              {loading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                </div>
              )}

              {error && (
                <div className="py-12 text-center">
                  <p className="text-slate-400 mb-1">Kunde inte ladda matchdata</p>
                  <p className="text-xs text-slate-300">{error}</p>
                </div>
              )}

              {data && data.matches.length > 0 && (
                <div className="space-y-10">
                  {/* ── LIVE NOW ── */}
                  {liveMatches.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-900">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          Pågår nu
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                      <ul>
                        {liveMatches.map((m) => (
                          <li key={m.matchId}><Final4MatchRow match={m} /></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* ── UPCOMING ── */}
                  {hasUpcoming && (
                    <div>
                      {upcomingByDate.map(([dateKey, matches]) => (
                        <div key={dateKey} className="mb-6 last:mb-0">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-900 capitalize">
                              {formatDateHeading(dateKey)}
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                          </div>
                          <ul>
                            {matches.map((m) => (
                              <li key={m.matchId}><Final4MatchRow match={m} /></li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── FINISHED (collapsed, secondary) ── */}
                  {hasFinished && (
                    <details className="group">
                      <summary className="flex items-center gap-3 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden mb-3">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                          Avslutade matcher
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">&#9660;</span>
                      </summary>
                      <div className="space-y-6">
                        {finishedByDate.map(([dateKey, matches]) => (
                          <div key={dateKey}>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-medium uppercase tracking-widest text-slate-300 capitalize">
                                {formatDateHeading(dateKey)}
                              </span>
                              <div className="flex-1 h-px bg-slate-100" />
                            </div>
                            <ul className="opacity-80">
                              {matches.map((m) => (
                                <li key={m.matchId}><Final4MatchRow match={m} /></li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

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
                  <p className="text-sm text-slate-400">Matcher för Final4 Norr publiceras inom kort.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
