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

  const outcomeChip =
    outcome === "win"
      ? { label: "Vinst", tone: "bg-emerald-100 text-emerald-700" }
      : outcome === "loss"
        ? { label: "Förlust", tone: "bg-rose-50 text-rose-600" }
        : outcome === "draw"
          ? { label: "Oavgjort", tone: "bg-slate-100 text-slate-600" }
          : null

  const stripeTone =
    status === "live"
      ? "bg-rose-500"
      : status === "upcoming"
        ? "bg-emerald-400"
        : outcome === "win"
          ? "bg-emerald-500"
          : outcome === "loss"
            ? "bg-rose-300"
            : "bg-slate-200"

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
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 ${
        canOpenTimeline
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_12px_32px_rgba(16,185,129,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-[0.995]"
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
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${stripeTone}`} />
      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              {teamTypeLabel}
            </span>
            {match.series && <span className="truncate text-xs text-slate-400">{match.series}</span>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {outcomeChip && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${outcomeChip.tone}`}>
                {outcomeChip.label}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] tabular-nums ${statusBadge.tone} ${
                status === "live" ? "live-badge" : ""
              }`}
            >
              {status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />}
              {statusBadge.label}
            </span>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
          <div className="min-w-0 text-right">
            <p
              className={`truncate text-sm font-semibold leading-snug sm:text-base ${
                isHHFName(homeName) ? "text-slate-950" : "text-slate-600"
              }`}
              title={homeName}
            >
              {homeName}
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Hemma</p>
          </div>

          <div className="flex min-w-[4.5rem] flex-col items-center justify-center">
            {scoreValue ? (
              <AnimatedScore
                value={scoreValue}
                className="whitespace-nowrap text-xl font-black tabular-nums tracking-tight text-slate-950 sm:text-2xl"
              />
            ) : status === "upcoming" ? (
              <>
                <p className="text-xl font-black tabular-nums tracking-tight text-slate-950 sm:text-2xl">
                  {formatMatchTimeLabel(match)}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Avkast</p>
              </>
            ) : awaitingFinishedResult ? (
              <p className="text-xs font-medium text-slate-400">Resultat inväntas</p>
            ) : (
              <p className="text-lg font-bold text-slate-300">vs</p>
            )}
          </div>

          <div className="min-w-0">
            <p
              className={`truncate text-sm font-semibold leading-snug sm:text-base ${
                isHHFName(awayName) ? "text-slate-950" : "text-slate-600"
              }`}
              title={awayName}
            >
              {awayName}
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Borta</p>
          </div>
        </div>

        {metaParts.length > 0 && (
          <p className="mt-3 text-center text-xs text-slate-400">{metaParts.join(" · ")}</p>
        )}

        {showLivePendingScore && (
          <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
            Matchen är live men poängen har ännu inte publicerats.
          </p>
        )}
        {showProfixioWarning && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Liveuppdateringen har tekniska problem för den här matchen just nu.
          </p>
        )}
        {showFinishedZeroZeroIssue && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Misstänkt resultatfel: matchen är avslutad men står som 0–0. Kontrollera matchrapporten.
          </p>
        )}

        <MatchCardCTA match={match} status={status} />
      </div>
    </article>
  )
}

export const MatchCard = memo(MatchCardInner)
