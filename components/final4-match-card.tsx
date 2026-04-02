"use client"

import type { Final4Match } from "@/lib/use-final4-data"

function isTBD(name: string) {
  return name.startsWith("Winner ") || name.startsWith("Loser ") || name === "TBD"
}

function TeamName({ name }: { name: string }) {
  if (isTBD(name)) {
    return <span className="text-slate-400 italic">{name === "TBD" ? "TBD" : name.replace(/\d+$/, "").trim()}</span>
  }
  return <>{name}</>
}

export function Final4MatchRow({ match }: { match: Final4Match }) {
  const isLive = match.matchStatus === "live"
  const isFinished = match.matchStatus === "finished"
  const hasScore = match.homeScore != null && match.awayScore != null
  const isFinalRound = match.round.toLowerCase() === "final"
  const isBronze = match.round.toLowerCase().includes("brons")

  const statusBadge = (() => {
    if (isLive) return { label: "LIVE", tone: "bg-slate-900 text-white" }
    if (isFinished) return { label: "SLUT", tone: "bg-slate-100 text-slate-500" }
    return { label: "KOMMANDE", tone: "bg-white text-slate-500 border border-slate-200" }
  })()

  const roundBadge = (() => {
    if (isFinalRound) return { label: "Final", tone: "bg-amber-50 text-amber-700 border border-amber-200" }
    if (isBronze) return { label: "Brons", tone: "bg-orange-50 text-orange-600 border border-orange-200" }
    return { label: match.round, tone: "bg-blue-50 text-blue-600 border border-blue-200" }
  })()

  return (
    <article
      className={`flex flex-col gap-3 border-b border-slate-200 px-0 py-3.5 transition ${
        isFinalRound ? "bg-amber-50/30" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusBadge.tone}`}>
          {statusBadge.label}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold ${roundBadge.tone}`}>
          {roundBadge.label}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950 break-words sm:text-[15px]">
            <TeamName name={match.homeName} /> vs <TeamName name={match.awayName} />
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 break-words">
            {match.time && <>{match.time} &middot; </>}
            {match.venue}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:w-auto">
          {hasScore && (
            <span
              className={`text-lg font-black tabular-nums ${isLive ? "text-red-600" : "text-slate-900"}`}
              data-score-value="true"
            >
              {match.homeScore}–{match.awayScore}
            </span>
          )}
          {match.detailUrl && (
            <a
              href={match.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Detaljer
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
