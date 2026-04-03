"use client"

import Link from "next/link"
import { Ticket } from "lucide-react"
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

export function Final4MatchRow({ match, showLottery = false }: { match: Final4Match; showLottery?: boolean }) {
  const isLive = match.matchStatus === "live"
  const isFinished = match.matchStatus === "finished"
  const hasScore = match.homeScore != null && match.awayScore != null

  const statusBadge = (() => {
    if (isLive) return { label: "LIVE", tone: "bg-slate-900 text-white" }
    if (isFinished) return { label: "SLUT", tone: "bg-slate-100 text-slate-500" }
    return { label: "KOMMANDE", tone: "bg-white text-slate-500 border border-slate-200" }
  })()

  return (
    <article className="flex flex-col gap-3 border-b border-slate-200 px-0 py-3.5 transition">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusBadge.tone}`}>
          {statusBadge.label}
        </span>
        <span className="text-[11px] font-medium text-slate-400">
          {match.category}
        </span>
        {match.round && (
          <span className="text-[11px] text-slate-300">
            {match.round}
          </span>
        )}
        {match.series && match.series !== match.categoryLabel && (
          <span className="text-[11px] text-slate-300">{match.series}</span>
        )}
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
          {showLottery && !isFinished && (
            <Link
              href={`/lottery/${match.matchId}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Ticket className="h-3.5 w-3.5" />
              Köp Lott
            </Link>
          )}
          {match.detailUrl && (
            <a
              href={match.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-green-700 hover:text-green-900 underline-offset-2 hover:underline"
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
