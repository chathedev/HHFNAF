import type { NormalizedMatch } from "./use-match-data"
import { normalizeStatusValue } from "./use-match-data"

const DATE_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  weekday: "short",
  day: "numeric",
  month: "long",
})

const TIME_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

const stripHomeAway = (value?: string) => {
  if (!value) {
    return ""
  }
  return value.replace(/\s*\((hemma|borta)\)\s*$/i, "").trim()
}

export const formatMatchDateLabel = (match: NormalizedMatch) =>
  DATE_FORMATTER.format(match.date).toLowerCase()

export const formatMatchTimeLabel = (match: NormalizedMatch) => TIME_FORMATTER.format(match.date)

export const buildMatchScheduleLabel = (match: NormalizedMatch) => {
  const parts = [
    formatMatchDateLabel(match),
    formatMatchTimeLabel(match),
    match.venue?.trim() ? match.venue?.trim() : undefined,
  ].filter((value): value is string => Boolean(value))

  return parts.join(" • ")
}

export const getMatchupLabel = (match: NormalizedMatch, homeTeamLabel = "Härnösands HF") => {
  const opponentName = stripHomeAway(match.opponent) || match.awayTeam || match.homeTeam
  const isHome = match.isHome !== false

  if (isHome) {
    return `${homeTeamLabel} vs ${opponentName} (hemma)`
  }
  return `${opponentName} vs ${homeTeamLabel} (borta)`
}

export const getSimplifiedMatchStatus = (match: NormalizedMatch): "live" | "finished" | "upcoming" => {
  const normalized = normalizeStatusValue(match.matchStatus)
  if (normalized === "finished") {
    return "finished"
  }
  if (normalized === "live" || normalized === "halftime") {
    return "live"
  }
  return "upcoming"
}

export const canOpenMatchTimeline = (match: NormalizedMatch) => {
  const status = getSimplifiedMatchStatus(match)
  return status === "live" || status === "finished"
}
