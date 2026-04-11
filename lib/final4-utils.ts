import type { Final4Match } from "./final4-data"
import { mapVenueIdToName } from "./venue-mapper"

export type Final4DisplayStatus = "live" | "finished" | "upcoming"

const MATCH_DURATION_MS = 90 * 60 * 1000
const FINAL4_TIMEZONE_OFFSET = "+02:00"

const parseScore = (result?: string | null) => {
  const parsed = String(result || "").trim().match(/(\d+)\s*[-–]\s*(\d+)/)
  if (!parsed) return null
  const home = Number(parsed[1])
  const away = Number(parsed[2])
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null
  return { home, away }
}

export const getFinal4MatchStartTimestamp = (match: Pick<Final4Match, "date" | "time">) => {
  const time = match.time?.trim() || "00:00"
  const timestamp = Date.parse(`${match.date}T${time}:00${FINAL4_TIMEZONE_OFFSET}`)
  return Number.isFinite(timestamp) ? timestamp : null
}

export const getFinal4VenueLabel = (venue?: string | null) => {
  const mapped = mapVenueIdToName(venue)
  if (!mapped) return undefined
  const trimmed = mapped.trim()
  return /^\d{1,4}$/.test(trimmed) ? undefined : trimmed
}

export const getFinal4DerivedStatus = (match: Final4Match, nowMs = Date.now()): Final4DisplayStatus => {
  const startTs = getFinal4MatchStartTimestamp(match)
  const homeScore = typeof match.homeScore === "number" ? match.homeScore : null
  const awayScore = typeof match.awayScore === "number" ? match.awayScore : null
  const hasScore = homeScore !== null && awayScore !== null
  const hasRealScore = hasScore && !(homeScore === 0 && awayScore === 0)
  const rawStatus = match.matchStatus

  if (startTs !== null && nowMs < startTs) {
    return "upcoming"
  }

  if (rawStatus === "live") {
    return "live"
  }

  if (rawStatus === "finished") {
    if (hasRealScore) {
      return "finished"
    }

    if (startTs !== null && nowMs <= startTs + MATCH_DURATION_MS) {
      return "live"
    }

    return "upcoming"
  }

  if (hasRealScore && startTs !== null && nowMs >= startTs + MATCH_DURATION_MS) {
    return "finished"
  }

  if (startTs !== null && nowMs >= startTs && nowMs <= startTs + MATCH_DURATION_MS) {
    return "live"
  }

  return "upcoming"
}

export const getFinal4DisplayScore = (match: Final4Match, nowMs = Date.now()) => {
  const status = getFinal4DerivedStatus(match, nowMs)
  if (status === "upcoming") {
    return null
  }

  const numericScore =
    typeof match.homeScore === "number" && typeof match.awayScore === "number"
      ? { home: match.homeScore, away: match.awayScore }
      : parseScore(match.result)

  if (!numericScore) {
    return null
  }

  if (numericScore.home === 0 && numericScore.away === 0) {
    return null
  }

  return `${numericScore.home}-${numericScore.away}`
}

export const isFinal4TimelineAvailable = (match: Final4Match, nowMs = Date.now()) => {
  const home = match.homeName || ""
  const away = match.awayName || ""
  const hasPlaceholder = [home, away].some(
    (name) => name.startsWith("Winner ") || name.startsWith("Loser ") || name === "TBD",
  )

  if (hasPlaceholder || !match.detailUrl) {
    return false
  }

  return getFinal4DerivedStatus(match, nowMs) !== "upcoming"
}
