"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, Ticket } from "lucide-react"
import type { Final4Match, Final4FeedEvent } from "@/lib/final4-data"
import { getFinal4DerivedStatus, getFinal4DisplayScore, getFinal4VenueLabel, isFinal4TimelineAvailable } from "@/lib/final4-utils"

function isTBD(name: string) {
  return name.startsWith("Winner ") || name.startsWith("Loser ") || name === "TBD"
}

function TeamName({ name }: { name: string }) {
  if (isTBD(name)) {
    return <span className="text-slate-400 italic">{name === "TBD" ? "TBD" : name.replace(/\d+$/, "").trim()}</span>
  }
  return <>{name}</>
}

function eventIcon(type?: string) {
  if (!type) return null
  const t = type.toLowerCase()
  if (t.includes("goal") || t.includes("mål")) return "\u26BD"
  if (t.includes("penalty") || t.includes("straff") || t.includes("7m") || t.includes("seven")) return "\uD83C\uDFAF"
  if (t.includes("timeout") || t.includes("time")) return "\u23F1\uFE0F"
  if (t.includes("suspend") || t.includes("utvisning") || t.includes("2min")) return "\uD83D\uDFE8"
  if (t.includes("red") || t.includes("röd")) return "\uD83D\uDFE5"
  if (t.includes("half") || t.includes("period") || t.includes("halv")) return "\u23F8\uFE0F"
  return null
}

function FeedTimeline({ feed, homeName, awayName }: { feed: Final4FeedEvent[]; homeName: string; awayName: string }) {
  if (!feed || feed.length === 0) {
    return <p className="py-3 text-center text-xs text-slate-400">Ingen tidslinje tillgänglig ännu</p>
  }

  // Show only goal events + period breaks for a clean view
  const goalEvents = feed.filter((e) => {
    const t = (e.type || "").toLowerCase()
    return t.includes("goal") || t.includes("mål") || t.includes("half") || t.includes("period") || t.includes("halv") ||
           (e.homeScore != null && e.awayScore != null)
  })

  const eventsToShow = goalEvents.length > 0 ? goalEvents : feed.slice(0, 20)

  return (
    <div className="space-y-1.5 py-2">
      {eventsToShow.map((event, i) => {
        const icon = eventIcon(event.type)
        const scoreStr = event.homeScore != null && event.awayScore != null
          ? `${event.homeScore}-${event.awayScore}`
          : event.score || null
        const team = event.team || ""
        const isHome = team && homeName.toLowerCase().includes(team.toLowerCase().slice(0, 4))

        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-10 shrink-0 text-right font-mono text-slate-400">{event.time || ""}</span>
            <span className="w-5 shrink-0 text-center">{icon}</span>
            <span className="flex-1 truncate text-slate-700">
              {event.player && <span className="font-medium">{event.player} </span>}
              {team && <span className="text-slate-400">({team})</span>}
            </span>
            {scoreStr && (
              <span className="shrink-0 font-mono font-semibold text-slate-900">{scoreStr}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function Final4MatchRow({ match, showLottery = false }: { match: Final4Match; showLottery?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const status = getFinal4DerivedStatus(match)
  const isLive = status === "live"
  const isFinished = status === "finished"
  const displayScore = getFinal4DisplayScore(match)
  const venueLabel = getFinal4VenueLabel(match.venue)
  const canOpenTimeline = isFinal4TimelineAvailable(match)
  const hasFeed = match.matchFeed && match.matchFeed.length > 0

  const statusBadge = (() => {
    if (isLive) return { label: "LIVE", tone: "bg-slate-900 text-white" }
    if (isFinished) return { label: "SLUT", tone: "bg-slate-100 text-slate-500" }
    return { label: "KOMMANDE", tone: "bg-white text-slate-500 border border-slate-200" }
  })()

  const isClickable = canOpenTimeline

  return (
    <article
      className={`flex flex-col gap-3 border-b border-slate-200 px-0 py-3.5 transition ${
        isClickable ? "cursor-pointer hover:bg-slate-50/60 active:bg-slate-100/50" : ""
      }`}
      onClick={isClickable ? () => setExpanded(!expanded) : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(!expanded) } } : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusBadge.tone}`}>
          {isLive && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" />}
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
            {venueLabel}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:w-auto">
          {displayScore && (
            <span
              className={`text-lg font-black tabular-nums ${isLive ? "text-red-600" : "text-slate-900"}`}
              data-score-value="true"
            >
              {displayScore}
            </span>
          )}
          {isClickable && (
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          )}
          {match.detailUrl && canOpenTimeline && (
            <a
              href={match.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-green-700 hover:text-green-900 underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Profixio
            </a>
          )}
        </div>
      </div>

      {/* Expandable timeline */}
      {expanded && canOpenTimeline && (
        <div className="border-t border-slate-100 pt-2" onClick={(e) => e.stopPropagation()}>
          {hasFeed ? (
            <FeedTimeline feed={match.matchFeed!} homeName={match.homeName} awayName={match.awayName} />
          ) : (
            <p className="py-3 text-center text-xs text-slate-400">
              Ingen tidslinje tillgänglig ännu
            </p>
          )}
        </div>
      )}
    </article>
  )
}
