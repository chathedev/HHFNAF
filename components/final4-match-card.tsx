"use client"

import type { Final4Match } from "@/lib/use-final4-data"

function StatusBadge({ status }: { status: Final4Match["matchStatus"] }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white uppercase tracking-wide animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        Live
      </span>
    )
  }
  if (status === "finished") {
    return (
      <span className="inline-flex rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Slut
      </span>
    )
  }
  return null
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Stockholm",
  })
}

export function Final4MatchCard({ match }: { match: Final4Match }) {
  const isLive = match.matchStatus === "live"
  const isFinished = match.matchStatus === "finished"
  const hasScore = match.homeScore != null && match.awayScore != null

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isLive
          ? "border-red-500/30 bg-gradient-to-r from-red-950/20 to-slate-900/80 shadow-lg shadow-red-500/10"
          : isFinished
            ? "border-gray-700/30 bg-slate-900/60"
            : "border-blue-500/20 bg-slate-900/40 hover:border-blue-400/40"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{formatDate(match.date)}</span>
          {match.time && (
            <>
              <span className="text-gray-600">|</span>
              <span>{match.time}</span>
            </>
          )}
        </div>
        <StatusBadge status={match.matchStatus} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right">
          <p className="text-sm font-semibold text-white truncate">{match.homeName}</p>
        </div>

        <div className="flex-shrink-0 min-w-[72px] text-center">
          {hasScore ? (
            <div className={`text-2xl font-bold tabular-nums ${isLive ? "text-red-400 score-pulse" : "text-white"}`}>
              {match.homeScore} - {match.awayScore}
            </div>
          ) : (
            <div className="text-lg font-medium text-gray-500">vs</div>
          )}
        </div>

        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-white truncate">{match.awayName}</p>
        </div>
      </div>

      {(match.venue || match.series) && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          {match.venue && <span className="truncate">{match.venue}</span>}
          {match.series && <span className="truncate">{match.series}</span>}
        </div>
      )}
    </div>
  )
}

export function Final4MatchList({ matches }: { matches: Final4Match[] }) {
  // Group matches by date
  const grouped = matches.reduce<Record<string, Final4Match[]>>((acc, match) => {
    const dateKey = new Date(match.date).toLocaleDateString("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Stockholm",
    })
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(match)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([dateLabel, dayMatches]) => (
        <div key={dateLabel}>
          <h3 className="text-lg font-semibold text-blue-300 mb-3 capitalize">{dateLabel}</h3>
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
