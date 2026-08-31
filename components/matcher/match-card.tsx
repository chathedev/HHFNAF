"use client"

import { memo, type KeyboardEvent, type MouseEvent } from "react"

import {
  canOpenMatchTimeline,
  formatMatchTimeLabel,
  getSimplifiedMatchStatus,
  shouldShowFinishedZeroZeroIssue,
  shouldShowProfixioTechnicalIssue,
} from "@/lib/match-card-utils"
import type { NormalizedMatch } from "@/lib/use-match-data"
import { AnimatedScore } from "@/components/animated-score"
import { MatchCardCTA } from "@/components/match-card-cta"
import { extendTeamDisplayName } from "@/lib/team-display"

const cleanOpponentName = (value?: string) =>
  (value || "").replace(/\s*\((hemma|borta)\)\s*$/i, "").trim()

const parseScorePair = (result?: string) => {
  const parsed = (result || "").trim().match(/(\d+)\s*[-–—]\s*(\d+)/)
  if (!parsed) return null
  const home = Number.parseInt(parsed[1], 10)
  const away = Number.parseInt(parsed[2], 10)
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null
  return { home, away }
}

const isHHFName = (value: string) => /härnösand|harnosand/i.test(value)

export type MatchCardProps = {
  match: NormalizedMatch
  hasClientMatchData: boolean
  showDate?: boolean
  onOpen: (match: NormalizedMatch) => void
  onPrefetch: (match: NormalizedMatch) => void
}

function MatchCardInner({ match, hasClientMatchData, showDate = false, onOpen, onPrefetch }: MatchCardProps) {
  const status = getSimplifiedMatchStatus(match)
  const canOpenTimeline = canOpenMatchTimeline(match)
  const showProfixioWarning = shouldShowProfixioTechnicalIssue(match)
  const showFinishedZeroZeroIssue = hasClientMatchData && shouldShowFinishedZeroZeroIssue(match)

  const teamTypeRaw = match.teamType?.trim() || ""
  const teamTypeLabel = extendTeamDisplayName(teamTypeRaw) || teamTypeRaw || "Härnösands HF"

  const isHomeMatch = match.isHome !== false
  const opponentName = cleanOpponentName(match.opponent)
  const homeName = match.homeTeam?.trim() || (isHomeMatch ? "Härnösands HF" : opponentName)
  const awayName = match.awayTeam?.trim() || (isHomeMatch ? opponentName : "Härnösands HF")

  const cleanedResult = match.result?.trim()
  const isUnconfirmedZero =
    !hasClientMatchData &&
    (status === "live" || status === "finished") &&
    cleanedResult != null &&
    /^0\s*[-–—]\s*0$/.test(cleanedResult)
  const scoreValue =
    status === "upcoming" ||
    match.resultState === "not_started" ||
    match.resultState === "live_pending" ||
    isUnconfirmedZero
      ? null
      : cleanedResult && cleanedResult.length > 0
        ? cleanedResult
        : null
  const awaitingFinishedResult = status === "finished" && !scoreValue && !isUnconfirmedZero
  const showLivePendingScore = status === "live" && (match.resultState === "live_pending" || isUnconfirmedZero)

  const scorePair = parseScorePair(scoreValue ?? undefined)
  const outcome = (() => {
    if (status !== "finished" || !scorePair) return null
    const our = isHomeMatch ? scorePair.home : scorePair.away
    const their = isHomeMatch ? scorePair.away : scorePair.home
    if (our > their) return "win" as const
    if (our < their) return "loss" as const
    return "draw" as const
  })()

  const statusBadge =
    status === "live"
      ? { label: match.statusLabel ?? "LIVE", tone: "bg-rose-500 text-white" }
      : status === "finished"
        ? { label: match.statusLabel ?? "SLUT", tone: "bg-slate-100 text-slate-500" }
        : { label: match.statusLabel ?? "Kommande", tone: "bg-sky-50 text-sky-700" }

  const outcomeText =
    outcome === "win"
      ? { label: "Vinst", tone: "text-emerald-600" }
      : outcome === "loss"
        ? { label: "Förlust", tone: "text-rose-500" }
        : outcome === "draw"
          ? { label: "Oavgjort", tone: "text-slate-500" }
          : null

  const metaParts = [
    showDate ? match.display?.dateCard || match.displayDate : null,
    status !== "upcoming" ? formatMatchTimeLabel(match) : null,
    match.venue?.trim() || null,
  ].filter((part): part is string => Boolean(part && part.length > 0))

  const handleActivate = (event: MouseEvent | KeyboardEvent) => {
    if (!canOpenTimeline) return
    const target = event.target as HTMLElement
    if (target.closest("a,button")) return
    onOpen(match)
  }

  return (
    <article
      id={`match-card-${match.id}`}
      role={canOpenTimeline ? "button" : undefined}
      tabIndex={canOpenTimeline ? 0 : undefined}
      aria-label={canOpenTimeline ? `${homeName} mot ${awayName}, öppna matchhändelser` : undefined}
      className={`group relative rounded-lg border border-slate-200 bg-white transition-colors ${
        canOpenTimeline
          ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          : ""
      }`}
      onMouseEnter={() => {
        if (canOpenTimeline) onPrefetch(match)
      }}
      onTouchStart={() => {
        if (canOpenTimeline) onPrefetch(match)
      }}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleActivate(event)
        }
      }}
    >
      <div className="px-4 py-3.5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {teamTypeLabel}
            {match.series && (
              <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">{match.series}</span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2.5">
            {outcomeText && (
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${outcomeText.tone}`}>
                {outcomeText.label}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest tabular-nums ${statusBadge.tone} ${
                status === "live" ? "live-badge" : ""
              }`}
            >
              {status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />}
              {statusBadge.label}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-4">
          <h3 className="min-w-0 truncate text-sm font-semibold leading-tight sm:text-[15px]" title={`${homeName} – ${awayName}`}>
            <span className={isHHFName(homeName) ? "text-slate-950" : "text-slate-600"}>{homeName}</span>
            <span className="text-slate-300"> – </span>
            <span className={isHHFName(awayName) ? "text-slate-950" : "text-slate-600"}>{awayName}</span>
          </h3>
          <div className="shrink-0 text-right">
            {scoreValue ? (
              <AnimatedScore
                value={scoreValue}
                className="whitespace-nowrap text-xl font-black tabular-nums tracking-tight text-slate-950"
              />
            ) : status === "upcoming" ? (
              <p className="text-xl font-black tabular-nums tracking-tight text-slate-950">
                {formatMatchTimeLabel(match)}
              </p>
            ) : awaitingFinishedResult ? (
              <p className="text-xs font-medium text-slate-400">Resultat inväntas</p>
            ) : null}
          </div>
        </div>

        {metaParts.length > 0 && (
          <p className="mt-1.5 text-xs text-slate-400">{metaParts.join(" · ")}</p>
        )}

        {showLivePendingScore && (
          <p className="mt-2.5 border-l-2 border-sky-300 pl-3 text-xs text-sky-800">
            Matchen är live men poängen har ännu inte publicerats.
          </p>
        )}
        {showProfixioWarning && (
          <p className="mt-2.5 border-l-2 border-amber-400 pl-3 text-xs text-amber-700">
            Liveuppdateringen har tekniska problem för den här matchen just nu.
          </p>
        )}
        {showFinishedZeroZeroIssue && (
          <p className="mt-2.5 border-l-2 border-amber-400 pl-3 text-xs text-amber-700">
            Misstänkt resultatfel: matchen är avslutad men står som 0–0. Kontrollera matchrapporten.
          </p>
        )}

        <MatchCardCTA match={match} status={status} />
      </div>
    </article>
  )
}

export const MatchCard = memo(MatchCardInner)
