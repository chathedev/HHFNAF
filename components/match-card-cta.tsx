"use client"

import type { NormalizedMatch } from "@/lib/use-match-data"

const TICKET_LINK = "https://clubs.clubmate.se/harnosandshf/overview/"
const TICKET_TEAM_KEYWORDS = ["a-lag herrar", "a-lag dam", "herr", "dam"]

export function MatchCardCTA({ match, status }: { match: NormalizedMatch; status: string }) {
  const normalizedTeamType = match.teamType?.toLowerCase() ?? ""
  const isTicketTeam = TICKET_TEAM_KEYWORDS.some((keyword) => normalizedTeamType.includes(keyword))
  const isAtObacka = Boolean(match.venue?.toLowerCase().includes("öbacka"))
  const isHomeMatch = match.isHome !== false
  const showTicketCTA = isTicketTeam && isAtObacka && isHomeMatch

  const playUrl = (match.playUrl ?? "").trim()
  const hasPlayLink = playUrl.length > 0 && playUrl.toLowerCase() !== "null"

  if (!showTicketCTA && !hasPlayLink) {
    return null
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      {hasPlayLink && (
        <a
          href={playUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-[6px] border border-transparent bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/40 transition hover:opacity-90 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <img
            src="/handbollplay_mini.png"
            alt="HandbollPlay"
            className="h-4 w-4"
          />
          <span>{status === "finished" ? "Se repris" : "Se live"}</span>
        </a>
      )}
      {showTicketCTA && (
        <a
          href={TICKET_LINK}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-[6px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
            />
          </svg>
          Köp biljett
        </a>
      )}
    </div>
  )
}
