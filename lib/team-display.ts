import { normalizeMatchKey } from "./matches"

export type TeamTrainingSlot = {
  weekday: string
  time: string
  endTime?: string | null
  location?: string | null
}

export type TeamLeader = { name: string; role?: string | null }

export type ClubTeamMetadata = {
  id: string
  name: string
  displayName: string
  category: string
  // Birth years of the laget.se team. Matches are picked by these, since a competition
  // class ("F16 (2010/2011)") can span more than one laget.se team.
  birthYears?: number[]
  description?: string
  link?: string
  instagramLink?: string
  heroImage?: string
  heroImageAlt?: string
  trainingPattern?: TeamTrainingSlot[]
  leaders?: TeamLeader[]
  // False when a senior team shares the class: then bare "F19" matches belong to it.
  matchesYearlessClass?: boolean
}

// The live team list comes from the API (GET /teams, which follows laget.se); see
// lib/club-teams.ts and the /lag/<id> handling in proxy.ts. This copy of the 2026/27 laget.se teams is only the fallback for when
// the API cannot be reached.
export const CLUB_TEAM_METADATA: ClubTeamMetadata[] = [
  { id: "dam-utv", name: "Dam/utv", displayName: "Dam/utv", category: "Dam", link: "https://www.laget.se/HHK-dam-utv" },
  { id: "a-lag-herrar", name: "A-lag Herrar", displayName: "A-lag Herrar", category: "Herr", link: "https://www.laget.se/HarnosandsHFHerr" },
  { id: "fritids-teknikskola", name: "Fritids-Teknikskola", displayName: "Fritids-Teknikskola", category: "Övrigt", link: "https://www.laget.se/HarnosandsHK-Fritids-Teknikskola" },
  { id: "f19-senior", name: "F19", displayName: "F19-Senior", category: "Dam", link: "https://www.laget.se/HarnosandsHF-F19-senior" },
  { id: "f19-2009", name: "F19", displayName: "F19 (2009)", category: "Dam", birthYears: [2009], link: "https://www.laget.se/F19-2009" },
  { id: "f16-2010", name: "F16", displayName: "F16 (2010)", category: "Dam", birthYears: [2010], link: "https://www.laget.se/F16-2010" },
  { id: "f15-2011", name: "F15", displayName: "F15 (2011)", category: "Dam", birthYears: [2011], link: "https://www.laget.se/F15-2011" },
  { id: "f14-2012", name: "F14", displayName: "F14 (2012)", category: "Dam", birthYears: [2012], link: "https://www.laget.se/F14-2012" },
  { id: "f13-2013", name: "F13", displayName: "F13 (2013)", category: "Dam", birthYears: [2013], link: "https://www.laget.se/F13-2013" },
  { id: "f12-2014", name: "F12", displayName: "F12 (2014)", category: "Dam", birthYears: [2014], link: "https://www.laget.se/F12-2014" },
  { id: "f11-2015", name: "F11", displayName: "F11 (2015)", category: "Dam", birthYears: [2015], link: "https://www.laget.se/F11-2015" },
  { id: "f10-2016", name: "F10", displayName: "F10 (2016)", category: "Dam", birthYears: [2016], link: "https://www.laget.se/F10-2016" },
  { id: "f9-2017", name: "F9", displayName: "F9 (2017)", category: "Dam", birthYears: [2017], link: "https://www.laget.se/F9-2017" },
  { id: "f8-2018", name: "F8", displayName: "F8 (2018)", category: "Dam", birthYears: [2018], link: "https://www.laget.se/F8-2018" },
  { id: "f7-2019", name: "F7", displayName: "F7 (2019)", category: "Dam", birthYears: [2019], link: "https://www.laget.se/F7-2019" },
  { id: "f6-2020", name: "F6", displayName: "F6 (2020)", category: "Dam", birthYears: [2020], link: "https://www.laget.se/HarnosandsHF-F62020" },
  { id: "p19-2007-2009", name: "P19", displayName: "P19 (2007–2009)", category: "Herr", birthYears: [2007, 2008, 2009], link: "https://www.laget.se/HarnosandsHF-P19-Senior" },
  { id: "p16-2010-2011", name: "P16", displayName: "P16 (2010/2011)", category: "Herr", birthYears: [2010, 2011], link: "https://www.laget.se/P16" },
  { id: "p15-2011", name: "P15", displayName: "P15 (2011)", category: "Herr", birthYears: [2011], link: "https://www.laget.se/P15-2011" },
  { id: "p14-2012", name: "P14", displayName: "P14 (2012)", category: "Herr", birthYears: [2012], link: "https://www.laget.se/P14-2012" },
  { id: "p13-2013-2014", name: "P13", displayName: "P13 (2013/2014)", category: "Herr", birthYears: [2013, 2014], link: "https://www.laget.se/P13-2013" },
  { id: "p11-2015", name: "P11", displayName: "P11 (2015)", category: "Herr", birthYears: [2015], link: "https://www.laget.se/P11-2015" },
  { id: "p10-2016", name: "P10", displayName: "P10 (2016)", category: "Herr", birthYears: [2016], link: "https://www.laget.se/P10-2016" },
  { id: "p9-2017", name: "P9", displayName: "P9 (2017)", category: "Herr", birthYears: [2017], link: "https://www.laget.se/P9-2017" },
  { id: "p8-2018", name: "P8", displayName: "P8 (2018)", category: "Herr", birthYears: [2018], link: "https://www.laget.se/P8-2018" },
  { id: "p7-2019", name: "P7", displayName: "P7 (2019)", category: "Herr", birthYears: [2019], link: "https://www.laget.se/HarnosandsHF-P72019" },
]

// Team page ids carry the class and birth years ("f12-2013"), and laget.se renames the
// classes every season. An id from an earlier season resolves to the team the same birth
// cohort plays in now, so old links and bookmarks keep working.
export const resolveLegacyTeamId = (id: string, teams: Pick<ClubTeamMetadata, "id" | "birthYears">[]) => {
  const match = /^([fp])\d{1,2}-((?:19|20)\d{2})(?:-(?:19|20)\d{2})*$/i.exec(id.trim())
  if (!match) return null
  const gender = match[1].toLowerCase()
  const years = Array.from(id.matchAll(/(?:19|20)\d{2}/g), (m) => Number(m[0]))
  const candidates = teams.filter((team) => team.id.toLowerCase().startsWith(gender) && /^[fp]\d/i.test(team.id))
  // The same birth years exactly ("p14-2011" -> P15 (2011)); otherwise the team holding
  // most of them, ties going to the younger players (who stay together longest).
  let best: { id: string; score: number } | null = null
  for (const team of candidates) {
    const teamYears = team.birthYears ?? []
    const overlap = years.filter((year) => teamYears.includes(year)).length
    if (overlap === 0) continue
    const exact = overlap === years.length && teamYears.length === years.length
    const score = (exact ? 1000 : 0) + overlap * 10 + (teamYears.includes(years[years.length - 1]) ? 1 : 0)
    if (!best || score > best.score) best = { id: team.id, score }
  }
  return best?.id ?? null
}

// True when a match's class label ("P12 (2014/2015)") is played by players from a team
// with these birth years. Both sides must name a gender and birth years.
export const matchLabelFitsTeam = (label: string | null | undefined, team: Pick<ClubTeamMetadata, "name" | "birthYears">) => {
  const teamGender = teamClassOf(team.name)?.gender
  const labelGender = teamClassOf(label)?.gender
  const years = birthYearsInLabel(label)
  if (!teamGender || !labelGender || teamGender !== labelGender) return false
  if (!team.birthYears?.length || years.length === 0) return false
  return years.some((year) => team.birthYears!.includes(year))
}

// Youth classes are named by the age players turn during the season, so the birth years
// behind "P16" move every season. Mirrors seasonalTeamLabel in the API
// (SERVERF/teamtype-inference.js): class X in the season ending year Y covers players born
// Y-X-1, plus Y-X for the two-year classes (even ages from 12 up). Seasons start in July.
const TEAM_CLASS_PATTERN = /^\s*([fp])\s*(\d{1,2})(?!\d)/i

// Evaluated in Stockholm time so the server and the browser agree on the season even
// around the 1 July rollover.
const STOCKHOLM_YEAR_MONTH = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
})

export const seasonEndYearForDate = (value: Date = new Date()) => {
  const parts = STOCKHOLM_YEAR_MONTH.formatToParts(value)
  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  return month >= 7 ? year + 1 : year
}

export const teamClassOf = (value?: string | null) => {
  const match = TEAM_CLASS_PATTERN.exec(value ?? "")
  if (!match) return null
  const age = Number(match[2])
  if (!Number.isFinite(age)) return null
  return { gender: match[1].toUpperCase() as "F" | "P", age }
}

export const teamClassKey = (value?: string | null) => {
  const teamClass = teamClassOf(value)
  return teamClass ? `${teamClass.gender.toLowerCase()}${teamClass.age}` : null
}

// Only a bare class ("P16") or a class plus year list ("F14 (2011–12)") is relabeled; cup
// codes like "P12B" are separate classes.
const RELABELABLE_CLASS_PATTERN = /^\s*[fp]\s*\d{1,2}(?:\s*\([\d\s/–-]*\))?\s*$/i

export const seasonalTeamLabel = (value: string, date: Date = new Date()) => {
  if (!RELABELABLE_CLASS_PATTERN.test(value)) return value
  const teamClass = teamClassOf(value)
  if (!teamClass || teamClass.age < 5 || teamClass.age > 18) return value
  const older = seasonEndYearForDate(date) - teamClass.age - 1
  const twoYear = teamClass.age >= 12 && teamClass.age % 2 === 0
  return `${teamClass.gender}${teamClass.age} (${twoYear ? `${older}/${older + 1}` : older})`
}

// Birth years named in a label, e.g. "P16 (2010/2011)" -> [2010, 2011].
export const birthYearsInLabel = (value?: string | null) =>
  Array.from((value ?? "").matchAll(/(?:19|20)\d{2}/g), (m) => Number(m[0]))

const EXTENDED_TEAM_DISPLAY_BY_KEY: Record<string, string> = {
  f162009: "F16 (2009/2010/2011)",
  p142011: "P14 (2011/2012)",
  f122013: "F12 (2013/2014)",
}

export const isExtendedTeamKey = (value?: string | null) => {
  const normalized = normalizeMatchKey(value)
  return Boolean(normalized && EXTENDED_TEAM_DISPLAY_BY_KEY[normalized])
}

export const extendTeamDisplayName = (value?: string | null) => {
  if (!value) {
    return value ?? ""
  }

  const trimmed = value.trim()
  const normalized = normalizeMatchKey(trimmed)
  if (normalized && EXTENDED_TEAM_DISPLAY_BY_KEY[normalized]) {
    return EXTENDED_TEAM_DISPLAY_BY_KEY[normalized]
  }

  return trimmed
}

export const extendTeamDisplayNameFromCandidates = (
  candidates: Array<string | null | undefined>,
  fallback?: string,
) => {
  for (const candidate of candidates) {
    const normalized = normalizeMatchKey(candidate)
    if (normalized && EXTENDED_TEAM_DISPLAY_BY_KEY[normalized]) {
      return EXTENDED_TEAM_DISPLAY_BY_KEY[normalized]
    }
  }
  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }
  return fallback ?? ""
}

export const createTeamMatchKeySet = (...values: Array<string | null | undefined>) => {
  const keys = new Set<string>()
  values.forEach((value) => {
    const normalized = normalizeMatchKey(value)
    if (normalized) {
      keys.add(normalized)
    }
  })
  return keys
}

// Display label for a team/class: youth classes get the current season's birth years,
// everything else keeps its existing display name.
export const currentTeamLabel = (value?: string | null, date: Date = new Date()) => {
  if (!value) return value ?? ""
  const seasonal = seasonalTeamLabel(value.trim(), date)
  return seasonal !== value.trim() ? seasonal : extendTeamDisplayName(value)
}
