"use client"

import { useMemo } from "react"
import Image from "next/image"
import { Trophy, MapPin, Calendar, ExternalLink, Loader2 } from "lucide-react"
import { useFinal4Data, type Final4Match } from "@/lib/use-final4-data"
import { Final4MatchCard } from "@/components/final4-match-card"
import { Final4Header } from "@/components/final4-header"
import { isFinal4Active, isFinal4Over } from "@/lib/final4-config"

function StatusBadgeInline({ status }: { status: Final4Match["matchStatus"] }) {
  if (status === "live") {
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        Live
      </span>
    )
  }
  return null
}

function StatsBar({ matches }: { matches: Final4Match[] }) {
  const live = matches.filter((m) => m.matchStatus === "live").length
  const finished = matches.filter((m) => m.matchStatus === "finished").length
  const upcoming = matches.filter((m) => m.matchStatus === "upcoming").length
  const teams = new Set(matches.flatMap((m) => [m.homeName, m.awayName]))

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Matcher", value: matches.length, icon: Trophy },
        { label: "Lag", value: teams.size, icon: MapPin },
        { label: "Avslutade", value: finished },
        { label: live > 0 ? "Live nu" : "Kommande", value: live > 0 ? live : upcoming },
      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg bg-white/5 border border-white/10 p-3 text-center"
        >
          <div className="text-2xl font-bold text-white">{stat.value}</div>
          <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

function TeamsList({ matches }: { matches: Final4Match[] }) {
  const teams = useMemo(() => {
    const teamSet = new Map<string, { wins: number; losses: number; draws: number; played: number }>()
    for (const m of matches) {
      for (const name of [m.homeName, m.awayName]) {
        if (!teamSet.has(name)) teamSet.set(name, { wins: 0, losses: 0, draws: 0, played: 0 })
      }
      if (m.matchStatus === "finished" && m.homeScore != null && m.awayScore != null) {
        const home = teamSet.get(m.homeName)!
        const away = teamSet.get(m.awayName)!
        home.played++
        away.played++
        if (m.homeScore > m.awayScore) {
          home.wins++
          away.losses++
        } else if (m.homeScore < m.awayScore) {
          away.wins++
          home.losses++
        } else {
          home.draws++
          away.draws++
        }
      }
    }
    return Array.from(teamSet.entries())
      .sort((a, b) => b[1].wins - a[1].wins || a[0].localeCompare(b[0], "sv"))
      .map(([name, stats]) => ({ name, ...stats }))
  }, [matches])

  if (teams.length === 0) return null

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <div
          key={team.name}
          className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-4 py-3"
        >
          <span className="text-sm font-medium text-white truncate">{team.name}</span>
          {team.played > 0 && (
            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
              {team.wins}V {team.draws}O {team.losses}F
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function MatchSchedule({ matches }: { matches: Final4Match[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, Final4Match[]> = {}
    for (const m of matches) {
      const date = new Date(m.date)
      const key = date.toLocaleDateString("sv-SE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "Europe/Stockholm",
      })
      if (!map[key]) map[key] = []
      map[key].push(m)
    }
    return Object.entries(map)
  }, [matches])

  const liveMatches = matches.filter((m) => m.matchStatus === "live")

  return (
    <div className="space-y-10">
      {liveMatches.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            Live nu
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {liveMatches.map((match) => (
              <Final4MatchCard key={match.matchId} match={match} />
            ))}
          </div>
        </div>
      )}

      {grouped.map(([dateLabel, dayMatches]) => (
        <div key={dateLabel}>
          <h3 className="text-base font-semibold text-blue-300 mb-3 capitalize flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-400/60" />
            {dateLabel}
            {dayMatches.some((m) => m.matchStatus === "live") && (
              <StatusBadgeInline status="live" />
            )}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {dayMatches.map((match) => (
              <Final4MatchCard key={match.matchId} match={match} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Final4PageClient() {
  const { data, loading, error } = useFinal4Data()
  const active = isFinal4Active()
  const over = isFinal4Over()

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      <Final4Header />

      {/* Hero */}
      <section className="relative h-[55vh] min-h-[400px] max-h-[600px] overflow-hidden">
        <Image
          src="/final4-hero.webp"
          alt="Final4 Norr 2026"
          fill
          className="object-cover object-center"
          priority
          quality={90}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060e1a] via-[#060e1a]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-amber-900/20" />

        <div className="relative h-full flex flex-col items-center justify-end pb-12 px-4 text-center">
          <div className="animate-fade-in-up">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-3">
              <span className="text-blue-400">FINAL4</span>{" "}
              <span className="text-amber-400">NORR</span>
            </h1>
            <p className="text-gray-300 text-lg sm:text-xl font-medium mb-2">
              6 – 12 april 2026
            </p>
            {active && (
              <div className="inline-flex items-center gap-2 rounded-full bg-red-600/90 px-4 py-1.5 text-sm font-bold uppercase tracking-wide mt-2">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Turneringen pagår
              </div>
            )}
            {over && (
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-600/80 px-4 py-1.5 text-sm font-semibold mt-2">
                Turneringen avslutad
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="container mx-auto px-4 py-10 max-w-5xl space-y-12">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-2">Kunde inte ladda matchdata</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        )}

        {data && data.matches.length > 0 && (
          <>
            {/* Stats */}
            <StatsBar matches={data.matches} />

            {/* Live update indicator */}
            {active && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Uppdateras i realtid
              </div>
            )}

            {/* Match schedule */}
            <section id="matcher">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-400" />
                Matchschema
              </h2>
              <MatchSchedule matches={data.matches} />
            </section>

            {/* Teams */}
            <section id="lag">
              <h2 className="text-2xl font-bold text-white mb-6">Deltagande lag</h2>
              <TeamsList matches={data.matches} />
            </section>
          </>
        )}

        {data && data.matches.length === 0 && (
          <div className="text-center py-16">
            <Trophy className="h-12 w-12 text-blue-400/40 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Matchprogrammet kommer snart</h2>
            <p className="text-gray-400">
              Matcher för Final4 Norr publiceras inom kort.
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-white/10 pt-8 pb-6 text-center space-y-3">
          <div className="text-sm text-gray-500">
            <span className="text-blue-400 font-semibold">Final4 Norr</span> — arrangeras av Härnösands HF
          </div>
          <a
            href="https://www.harnosandshf.se"
            className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-blue-200 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            www.harnosandshf.se
          </a>
        </footer>
      </main>
    </div>
  )
}
