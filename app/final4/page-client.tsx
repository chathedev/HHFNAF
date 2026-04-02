"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Trophy, MapPin, Clock, Loader2, ExternalLink, ChevronDown } from "lucide-react"
import { useFinal4Data, type Final4Match } from "@/lib/use-final4-data"
import { Final4MatchCard } from "@/components/final4-match-card"
import { Final4Header } from "@/components/final4-header"
import { isFinal4Active, isFinal4Over } from "@/lib/final4-config"

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  F14: { bg: "from-pink-950/30 to-transparent", text: "text-pink-300", border: "border-pink-500/20", accent: "bg-pink-500" },
  P14: { bg: "from-cyan-950/30 to-transparent", text: "text-cyan-300", border: "border-cyan-500/20", accent: "bg-cyan-500" },
  F16: { bg: "from-purple-950/30 to-transparent", text: "text-purple-300", border: "border-purple-500/20", accent: "bg-purple-500" },
  P16: { bg: "from-emerald-950/30 to-transparent", text: "text-emerald-300", border: "border-emerald-500/20", accent: "bg-emerald-500" },
}

const CATEGORY_ORDER = ["F14", "P14", "F16", "P16"]

function CategorySection({ category, matches }: { category: string; matches: Final4Match[] }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.F14
  const [expanded, setExpanded] = useState(true)
  const liveCount = matches.filter((m) => m.matchStatus === "live").length
  const semifinals = matches.filter((m) => m.round.toLowerCase().includes("semifinal"))
  const bronzeMatch = matches.find((m) => m.round.toLowerCase().includes("brons"))
  const finalMatch = matches.find((m) => m.round.toLowerCase() === "final")

  return (
    <div className={`rounded-2xl border ${colors.border} bg-gradient-to-b ${colors.bg} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`h-8 w-1 rounded-full ${colors.accent}`} />
          <div className="text-left">
            <h3 className={`text-lg font-bold ${colors.text}`}>
              Final4 Norr {category}
            </h3>
            <p className="text-xs text-gray-500">{matches.length} matcher</p>
          </div>
          {liveCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {liveCount} Live
            </span>
          )}
        </div>
        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Semifinals */}
          {semifinals.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Semifinaler</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {semifinals.map((m) => (
                  <Final4MatchCard key={m.matchId} match={m} />
                ))}
              </div>
            </div>
          )}

          {/* Bronze + Final */}
          <div className="grid gap-3 sm:grid-cols-2">
            {bronzeMatch && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Bronsmatch</p>
                <Final4MatchCard match={bronzeMatch} />
              </div>
            )}
            {finalMatch && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Final</p>
                <Final4MatchCard match={finalMatch} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TournamentInfo() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { icon: Trophy, label: "Åldersklasser", value: "F14, P14, F16, P16" },
        { icon: MapPin, label: "Plats", value: "Öbacka SC & Änget Sportcenter" },
        { icon: Clock, label: "Datum", value: "11–12 april 2026" },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <item.icon className="h-4.5 w-4.5 text-blue-400" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">{item.label}</div>
            <div className="text-sm font-medium text-white">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function LiveBanner({ matches }: { matches: Final4Match[] }) {
  const liveMatches = matches.filter((m) => m.matchStatus === "live")
  if (liveMatches.length === 0) return null

  return (
    <div className="rounded-xl border border-red-500/30 bg-gradient-to-r from-red-950/40 via-red-950/20 to-transparent p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
        <h3 className="text-base font-bold text-red-400">Live nu — {liveMatches.length} {liveMatches.length === 1 ? "match" : "matcher"}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {liveMatches.map((m) => (
          <Final4MatchCard key={m.matchId} match={m} />
        ))}
      </div>
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

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      <Final4Header />

      {/* Hero */}
      <section className="relative h-[50vh] min-h-[380px] max-h-[550px] overflow-hidden">
        <Image
          src="/final4-hero.webp"
          alt="Final4 Norr 2026"
          fill
          className="object-cover object-top"
          priority
          quality={90}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060e1a] via-[#060e1a]/70 to-[#060e1a]/20" />

        <div className="relative h-full flex flex-col items-center justify-end pb-10 px-4 text-center">
          <div className="animate-fade-in-up">
            <p className="text-xs sm:text-sm text-blue-300/80 uppercase tracking-[0.3em] font-medium mb-2">Handbollturnering</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-1">
              <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">FINAL4</span>{" "}
              <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">NORR</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg font-medium">
              11 – 12 april 2026 &middot; Härnösand
            </p>
            {active && (
              <div className="inline-flex items-center gap-2 rounded-full bg-red-600/90 px-4 py-1.5 text-xs font-bold uppercase tracking-widest mt-4 shadow-lg shadow-red-500/20">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Turneringen pågår
              </div>
            )}
            {over && (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold mt-4">
                Turneringen avslutad — se resultaten nedan
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-sm text-gray-500">Laddar matchdata...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16 rounded-xl border border-red-500/20 bg-red-950/10">
            <p className="text-gray-400 mb-2">Kunde inte ladda matchdata</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        )}

        {data && data.matches.length > 0 && (
          <>
            {/* Tournament info */}
            <TournamentInfo />

            {/* Live banner */}
            <LiveBanner matches={data.matches} />

            {/* Real-time indicator */}
            {active && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Uppdateras automatiskt var 30:e sekund
              </div>
            )}

            {/* Categories */}
            <section id="matcher" className="space-y-4">
              {CATEGORY_ORDER.map((cat) => {
                const matches = matchesByCategory[cat]
                if (!matches || matches.length === 0) return null
                return <CategorySection key={cat} category={cat} matches={matches} />
              })}
            </section>

            {/* Teams */}
            <section id="lag">
              <h2 className="text-xl font-bold text-white mb-4">Deltagande lag</h2>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {teams.map((team) => (
                  <div
                    key={team}
                    className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 text-sm text-gray-300 truncate"
                  >
                    {team}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {data && data.matches.length === 0 && (
          <div className="text-center py-20">
            <Trophy className="h-14 w-14 text-amber-400/30 mx-auto mb-5" />
            <h2 className="text-2xl font-bold text-white mb-3">Matchprogrammet kommer snart</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Matcher för Final4 Norr publiceras inom kort. Kom tillbaka nära turneringsdatum.
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-white/[0.06] pt-8 pb-6 text-center space-y-3">
          <p className="text-sm text-gray-600">
            <span className="text-blue-400 font-semibold">Final4 Norr</span> — arrangeras av Härnösands HF
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://www.harnosandshf.se"
              className="inline-flex items-center gap-1.5 text-sm text-blue-400/70 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              harnosandshf.se
            </a>
            {data?.tournament.profixioUrl && (
              <a
                href={data.tournament.profixioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Profixio
              </a>
            )}
          </div>
        </footer>
      </main>
    </div>
  )
}
