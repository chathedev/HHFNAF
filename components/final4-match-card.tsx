"use client"

import type { Final4Match } from "@/lib/use-final4-data"
import { Trophy, Medal } from "lucide-react"

function isTBD(name: string) {
  return name.startsWith("Winner ") || name.startsWith("Loser ") || name === "TBD"
}

function TeamName({ name }: { name: string }) {
  if (isTBD(name)) {
    return <span className="text-gray-500 italic text-xs">{name === "TBD" ? "TBD" : name.replace(/\d+$/, "").trim()}</span>
  }
  return <span className="text-white font-semibold">{name}</span>
}

function RoundBadge({ round }: { round: string }) {
  if (!round) return null
  const isFinal = round.toLowerCase() === "final"
  const isBronze = round.toLowerCase().includes("brons")
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        isFinal
          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
          : isBronze
            ? "bg-orange-500/15 text-orange-300 border border-orange-500/20"
            : "bg-blue-500/15 text-blue-300 border border-blue-500/20"
      }`}
    >
      {isFinal && <Trophy className="h-2.5 w-2.5" />}
      {isBronze && <Medal className="h-2.5 w-2.5" />}
      {round}
    </span>
  )
}

function StatusBadge({ status }: { status: Final4Match["matchStatus"] }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        Live
      </span>
    )
  }
  if (status === "finished") {
    return (
      <span className="inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
        Slut
      </span>
    )
  }
  return null
}

function formatTime(time: string) {
  return time || ""
}

export function Final4MatchCard({ match }: { match: Final4Match }) {
  const isLive = match.matchStatus === "live"
  const isFinished = match.matchStatus === "finished"
  const hasScore = match.homeScore != null && match.awayScore != null
  const isFinalRound = match.round.toLowerCase() === "final"

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all ${
        isLive
          ? "border-red-500/40 bg-gradient-to-br from-red-950/30 via-slate-900/80 to-slate-900/90 shadow-lg shadow-red-500/10 ring-1 ring-red-500/20"
          : isFinalRound
            ? "border-amber-500/25 bg-gradient-to-br from-amber-950/15 to-slate-900/70"
            : isFinished
              ? "border-white/5 bg-slate-900/40"
              : "border-white/10 bg-slate-900/50 hover:border-blue-500/30 hover:bg-slate-900/60"
      }`}
    >
      {/* Top row: round + time + status */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <RoundBadge round={match.round} />
          <span className="text-xs text-gray-500">{formatTime(match.time)}</span>
        </div>
        <StatusBadge status={match.matchStatus} />
      </div>

      {/* Score area */}
      <div className="flex items-center gap-3">
        <div className="flex-1 text-right min-w-0">
          <p className="text-sm truncate"><TeamName name={match.homeName} /></p>
        </div>

        <div className="flex-shrink-0 min-w-[68px] text-center">
          {hasScore ? (
            <div className={`text-2xl font-bold tabular-nums tracking-tight ${isLive ? "text-red-400 score-pulse" : "text-white"}`}>
              {match.homeScore}
              <span className="text-gray-500 mx-0.5">–</span>
              {match.awayScore}
            </div>
          ) : (
            <div className="text-sm font-medium text-gray-600">vs</div>
          )}
        </div>

        <div className="flex-1 text-left min-w-0">
          <p className="text-sm truncate"><TeamName name={match.awayName} /></p>
        </div>
      </div>

      {/* Bottom: venue */}
      {match.venue && (
        <div className="mt-2.5 text-[11px] text-gray-600 truncate text-center">
          {match.venue}
        </div>
      )}
    </div>
  )
}
