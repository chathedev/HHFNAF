"use client"

import { getMatchWatchLabel } from "@/lib/match-card-utils"
import type { NormalizedMatch } from "@/lib/use-match-data"

export function MatchCardCTA({ match, status }: { match: NormalizedMatch; status: string }) {
  const playUrl = (match.playUrl ?? "").trim()
  const hasPlayLink =
    match.hasStream === true &&
    Boolean(playUrl) &&
    playUrl.toLowerCase() !== "null"

  if (!hasPlayLink) {
    return null
  }

  return (
    <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      {hasPlayLink && (
        <a
          href={playUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-[6px] bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto sm:py-2"
        >
          <img
            src="/handbollplay_mini.png"
            alt="HandbollPlay"
            className="h-4 w-4"
          />
          <span>{getMatchWatchLabel(status)}</span>
        </a>
      )}
    </div>
  )
}
