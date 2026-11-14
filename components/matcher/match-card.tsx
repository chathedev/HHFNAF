"use client"

import { memo, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react"
import Link from "@/components/quiet-link"

import {
  canOpenMatchTimeline,
  formatMatchTimeLabel,
  getMatchWatchLabel,
  getSimplifiedMatchStatus,
  shouldShowFinishedZeroZeroIssue,
  shouldShowProfixioTechnicalIssue,
} from "@/lib/match-card-utils"
import type { NormalizedMatch } from "@/lib/use-match-data"
import { extendTeamDisplayName, withSquad } from "@/lib/team-display"
import { liveOdds } from "@/lib/live-odds"

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

const SHORT_DATE = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", timeZone: "Europe/Stockholm" })

// A goal while live: the score blinks red for a moment.
function useScoreFlash(value: string | null) {
  const previous = useRef(value)
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    const before = previous.current
    previous.current = value
    if (!value || !before || value === before) return
    setFlash(true)
    const id = globalThis.setTimeout(() => setFlash(false), 1500)
    return () => globalThis.clearTimeout(id)
  }, [value])
  return flash
}

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
  // "Flickor - F16 Mitt" -> "F16 Mitt": the class already says girls or boys.
  const series = match.series?.trim().replace(/^(flickor|pojkar|damer|herrar)\s*-\s*/i, "") || null
  const baseTeamLabel = extendTeamDisplayName(teamTypeRaw) || teamTypeRaw || "Härnösands HF"
  // A squad named after its series ("Mitt") is already said by the series ("F14 Mitt").
  const squadInSeries = Boolean(match.squad && !/^lag \d/i.test(match.squad) && series?.toLowerCase().includes(match.squad.toLowerCase()))
  const teamTypeLabel = squadInSeries ? baseTeamLabel : withSquad(baseTeamLabel, match)

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
  const flash = useScoreFlash(status === "live" ? scoreValue : null)
  const outcome = (() => {
    // Two HHF squads against each other: no "our" result to show.
    if (status !== "finished" || !scorePair || (isHHFName(homeName) && isHHFName(awayName))) return null
    const our = isHomeMatch ? scorePair.home : scorePair.away
    const their = isHomeMatch ? scorePair.away : scorePair.home
    if (our > their) return "win" as const
    if (our < their) return "loss" as const
    return "draw" as const
  })()

  const playUrl = (match.playUrl ?? "").trim()
  const hasPlayLink = match.hasStream === true && Boolean(playUrl) && playUrl.toLowerCase() !== "null"

  const outcomeChip =
    outcome === "win"
      ? { letter: "V", label: "Vinst", tone: "bg-slate-950 text-white" }
      : outcome === "loss"
        ? { letter: "F", label: "Förlust", tone: "border border-slate-300 text-slate-500" }
        : outcome === "draw"
          ? { letter: "O", label: "Oavgjort", tone: "bg-slate-100 text-slate-600" }
          : null

  const timeLabel = formatMatchTimeLabel(match)
  // "15 nov": fits the narrow time column on a phone.
  const dateLabel = SHORT_DATE.format(match.date).replace(/\.$/, "")
  const scoutHref =
    match.apiMatchId && match.provider !== "procup" && /^\d+$/.test(String(match.apiMatchId))
      ? `/scout/match/${match.apiMatchId}`
      : null
  // The pre-match chance, so only before kickoff (some matches never flip to live in Profixio).
  const winChance =
    status === "upcoming" && typeof match.winChance === "number" && match.date.getTime() > Date.now() ? match.winChance : null
  // Live: HHF Scout's pre-match prediction updated from the score and the time played
  // (estimated from kickoff: two halves plus a 10 min break). Before the first goal the
  // pre-match chance stands.
  const liveChance = (() => {
    const pre = match.scoutOdds
    if (status !== "live" || !pre) return null
    const hhfHome = isHHFName(homeName) && !isHHFName(awayName)
    const hhfAway = isHHFName(awayName) && !isHHFName(homeName)
    if (!hhfHome && !hhfAway) return null
    const flip = (pre.hhfSide === "home") !== hhfHome
    const oriented = flip
      ? { pHome: pre.pAway, pDraw: pre.pDraw, pAway: pre.pHome, margin: -pre.margin, sigma: pre.sigma }
      : pre
    const senior = /^(dam|herr|a-lag)/i.test(teamTypeRaw)
    const halfMinutes = senior ? 30 : 25
    const played = Math.max(0, (Date.now() - match.date.getTime()) / 60_000)
    const playing = played <= halfMinutes ? played : played <= halfMinutes + 10 ? halfMinutes : played - 10
    const odds = scorePair
      ? liveOdds(oriented, scorePair.home, scorePair.away, Math.min(0.97, playing / (2 * halfMinutes)))
      : oriented
    return { value: Math.round(100 * (hhfHome ? odds.pHome : odds.pAway)), now: Boolean(scorePair) }
  })()
  const isProcup = match.provider === "procup"
  const infoUrl = /^https?:\/\//i.test(match.infoUrl ?? "") ? match.infoUrl! : null
  const profixioHref = infoUrl && /^https:\/\/(www\.)?profixio\.com\//i.test(infoUrl) ? infoUrl : null
  // Cups (ProCup and others) get their own match page link instead.
  const otherInfoHref = infoUrl && !profixioHref ? infoUrl : null
  const liveLabel = match.statusLabel && !/^live$/i.test(match.statusLabel.trim()) ? match.statusLabel.trim() : null

  const metaParts = [teamTypeLabel, series, match.venue?.trim() || null, isProcup ? "ProCup" : null].filter(
    (part): part is string => Boolean(part && part.length > 0),
  )

  const handleActivate = (event: MouseEvent | KeyboardEvent) => {
    if (!canOpenTimeline) return
    const target = event.target as HTMLElement
    if (target.closest("a,button")) return
    onOpen(match)
  }

  // One side of the scoreboard: team name, its goals, the winner a shade darker.
  const teamLine = (name: string, goals: number | null, other: number | null) => {
    const ours = isHHFName(name)
    const leads = goals != null && other != null && goals > other
    return (
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`min-w-0 truncate text-[15px] leading-6 ${ours ? "font-semibold text-slate-950" : "text-slate-600"}`}
          title={name}
        >
          {name}
        </span>
        {goals != null && (
          <span
            className={`shrink-0 text-[15px] leading-6 tabular-nums transition-colors duration-700 ${
              leads || (status === "live" && goals === other) ? "font-black" : "font-semibold"
            } ${flash ? "text-rose-600" : leads || (status === "live" && goals === other) ? "text-slate-950" : "text-slate-400"}`}
          >
            {goals}
          </span>
        )}
      </div>
    )
  }

  return (
    <article
      id={`match-card-${match.id}`}
      role={canOpenTimeline ? "button" : undefined}
      tabIndex={canOpenTimeline ? 0 : undefined}
      aria-label={canOpenTimeline ? `${homeName} mot ${awayName}, öppna matchhändelser` : undefined}
      className={`group relative bg-white transition-colors ${
        canOpenTimeline
          ? "cursor-pointer hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900"
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
        // Enter on the Scout/Profixio/stream links inside must follow the link, not open the popup.
        if (event.target !== event.currentTarget) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleActivate(event)
        }
      }}
    >
      {status === "live" && <span className="absolute inset-y-0 left-0 w-0.5 bg-rose-500" aria-hidden />}
      <div className="flex gap-3 px-3 py-3 sm:gap-5 sm:px-5 sm:py-3.5">
        {/* Left: when, or how far it has come */}
        <div className="w-14 shrink-0 pt-0.5 sm:w-16">
          {status === "live" ? (
            <>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-rose-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" aria-hidden />
                Live
              </p>
              {liveLabel && <p className="mt-0.5 truncate text-[11px] text-slate-500">{liveLabel}</p>}
            </>
          ) : status === "finished" ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Slut</p>
              {showDate && dateLabel && <p className="mt-0.5 truncate text-[11px] text-slate-400">{dateLabel}</p>}
            </>
          ) : (
            <>
              <p className="text-[15px] font-bold leading-6 tabular-nums text-slate-950">{timeLabel}</p>
              {showDate && dateLabel && <p className="truncate text-[11px] text-slate-400">{dateLabel}</p>}
            </>
          )}
        </div>

        {/* Middle: the scoreboard */}
        <div className="min-w-0 flex-1">
          {teamLine(homeName, scorePair ? scorePair.home : null, scorePair ? scorePair.away : null)}
          {teamLine(awayName, scorePair ? scorePair.away : null, scorePair ? scorePair.home : null)}
          {metaParts.length > 0 && (
            <p className="mt-1 truncate text-xs text-slate-400" title={metaParts.join(" · ")}>
              {metaParts.join(" · ")}
            </p>
          )}
          {showLivePendingScore && (
            <p className="mt-1.5 text-xs text-slate-500">
              {isProcup ? "Pågår. ProCup visar ingen livescore för matchen." : "Livescore väntar på första målet i Profixio."}
            </p>
          )}
          {awaitingFinishedResult && <p className="mt-1.5 text-xs text-slate-500">Resultat inväntas.</p>}
          {showProfixioWarning && (
            <p className="mt-1.5 border-l-2 border-amber-400 pl-2 text-xs text-amber-700">
              Liveuppdateringen har tekniska problem just nu.
            </p>
          )}
          {showFinishedZeroZeroIssue && (
            <p className="mt-1.5 border-l-2 border-amber-400 pl-2 text-xs text-amber-700">
              Står som 0–0 fast matchen är slut. Kontrollera matchrapporten.
            </p>
          )}
          {(hasPlayLink || scoutHref || profixioHref || otherInfoHref || winChance != null || liveChance) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold">
              {liveChance && (
                <span className="tabular-nums text-slate-900" title="HHF Scout, uppdateras med ställning och matchtid">
                  {liveChance.value} % vinstchans
                  <span className="font-normal text-slate-400"> {liveChance.now ? "just nu" : "före matchen"}</span>
                </span>
              )}
              {winChance != null && (
                <span
                  className="tabular-nums text-slate-900"
                  title={match.expectedScore ? `HHF Scout: väntat ${match.expectedScore}` : "HHF Scout"}
                >
                  {winChance} % vinstchans
                  {match.expectedScore && <span className="ml-1.5 font-normal text-slate-400"> väntat {match.expectedScore}</span>}
                </span>
              )}
              {hasPlayLink && (
                <a
                  href={playUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-slate-900 underline-offset-4 hover:underline"
                >
                  <img src="/handbollplay_mini.png" alt="" className="h-3.5 w-3.5 brightness-0" />
                  {getMatchWatchLabel(status)}
                </a>
              )}
              {scoutHref && (
                <Link
                  href={scoutHref}
                  onClick={(event) => event.stopPropagation()}
                  className="text-slate-500 underline-offset-4 hover:text-slate-950 hover:underline"
                >
                  Scout
                </Link>
              )}
              {profixioHref && (
                <a
                  href={profixioHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="text-slate-500 underline-offset-4 hover:text-slate-950 hover:underline"
                >
                  Profixio ↗
                </a>
              )}
              {otherInfoHref && (
                <a
                  href={otherInfoHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="text-slate-500 underline-offset-4 hover:text-slate-950 hover:underline"
                >
                  Matchsida ↗
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right: our result, at a glance */}
        <div className="flex w-6 shrink-0 justify-end pt-0.5">
          {outcomeChip && (
            <span
              className={`inline-flex h-6 w-6 items-center justify-center text-[11px] font-bold ${outcomeChip.tone}`}
              title={outcomeChip.label}
              aria-label={outcomeChip.label}
            >
              {outcomeChip.letter}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

export const MatchCard = memo(MatchCardInner)
