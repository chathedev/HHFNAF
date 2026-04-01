import type { NormalizedMatch } from "./use-match-data"

const toSortableText = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

const compareText = (a?: string | null, b?: string | null) =>
  toSortableText(a).localeCompare(toSortableText(b), "sv-SE")

const compareMatchIdentity = (a: NormalizedMatch, b: NormalizedMatch) => {
  const comparisons = [
    compareText(a.teamType, b.teamType),
    compareText(a.opponent, b.opponent),
    compareText(a.homeTeam, b.homeTeam),
    compareText(a.awayTeam, b.awayTeam),
    compareText(a.venue, b.venue),
    compareText(a.series, b.series),
    compareText(a.id, b.id),
  ]

  return comparisons.find((value) => value !== 0) ?? 0
}

const getMatchTimestamp = (m: NormalizedMatch) =>
  typeof m.startTimestamp === "number"
    ? m.startTimestamp
    : m.date instanceof Date
      ? m.date.getTime()
      : new Date(m.date).getTime()

export const compareMatchesByDateAscStable = (a: NormalizedMatch, b: NormalizedMatch) => {
  const timeDiff = getMatchTimestamp(a) - getMatchTimestamp(b)
  if (timeDiff !== 0) {
    return timeDiff
  }

  return compareMatchIdentity(a, b)
}

export const compareMatchesByDateDescStable = (a: NormalizedMatch, b: NormalizedMatch) => {
  const timeDiff = getMatchTimestamp(b) - getMatchTimestamp(a)
  if (timeDiff !== 0) {
    return timeDiff
  }

  return compareMatchIdentity(a, b)
}
