import { normalizeMatchKey } from "./matches"

export type ClubTeamMetadata = {
  id: string
  name: string
  displayName: string
  category: string
  description?: string
  link?: string
  instagramLink?: string
  heroImage?: string
  heroImageAlt?: string
}

export const CLUB_TEAM_METADATA: ClubTeamMetadata[] = [
  { id: "dam-utv", name: "Dam/utv", displayName: "Dam/utv", category: "Dam", heroImage: "/HarnosandsHF/Gruppfoto/Härnösands HF - Dam.jpg", heroImageAlt: "Dam/utv" },
  { id: "a-lag-herrar", name: "A-lag Herrar", displayName: "A-lag Herrar", category: "Herr", heroImage: "/HarnosandsHF/Gruppfoto/Härnösands HF - A lag herr.jpg", heroImageAlt: "A-lag Herrar" },
  { id: "fritids-teknikskola", name: "Fritids-Teknikskola", displayName: "Fritids-Teknikskola", category: "Övrigt", heroImage: "/placeholder.jpg", heroImageAlt: "Fritids-Teknikskola" },
  { id: "f19-senior", name: "F19-Senior", displayName: "F19-Senior", category: "Dam", heroImage: "/HarnosandsHF/Gruppfoto/Härnösands HF - F19.jpg", heroImageAlt: "F19-Senior" },
  { id: "f16-2009", name: "F16", displayName: "F16 (2009)", category: "Dam", heroImage: "/placeholder.jpg", heroImageAlt: "F16" },
  { id: "f15-2010", name: "F15", displayName: "F15 (2010)", category: "Dam", heroImage: "/placeholder.jpg", heroImageAlt: "F15" },
  { id: "f14-2011", name: "F14", displayName: "F14 (2011–12)", category: "Dam", heroImage: "/placeholder.jpg", heroImageAlt: "F14" },
  { id: "f13-2012", name: "F13", displayName: "F13 (2012)", category: "Dam", heroImage: "/placeholder.jpg", heroImageAlt: "F13" },
  { id: "f12-2013", name: "F12", displayName: "F12 (2013)", category: "Dam", heroImage: "/placeholder.jpg", heroImageAlt: "F12" },
  { id: "f11-2014", name: "F11", displayName: "F11 (2014)", category: "Dam", heroImage: "/placeholder.jpg", heroImageAlt: "F11" },
  { id: "f10-2015", name: "F10", displayName: "F10 (2015)", category: "Dam", heroImage: "/placeholder.jpg", heroImageAlt: "F10" },
  { id: "f9-2016", name: "F9", displayName: "F9 (2016)", category: "Dam", heroImage: "/placeholder.jpg", heroImageAlt: "F9" },
  { id: "f8-2017", name: "F8", displayName: "F8 (2017)", category: "Dam", heroImage: "/placeholder.jpg", heroImageAlt: "F8" },
  { id: "f7-2018", name: "F7", displayName: "F7 (2018)", category: "Dam", heroImage: "/placeholder.jpg", heroImageAlt: "F7" },
  { id: "f6-2019", name: "F6", displayName: "F6 (2019)", category: "Dam", heroImage: "/placeholder.jpg", heroImageAlt: "F6" },
  { id: "p16-2009-2010", name: "P16", displayName: "P16 (2009–10)", category: "Herr", heroImage: "/placeholder.jpg", heroImageAlt: "P16" },
  { id: "p14-2011", name: "P14", displayName: "P14 (2011)", category: "Herr", heroImage: "/placeholder.jpg", heroImageAlt: "P14" },
  { id: "p13-2012", name: "P13", displayName: "P13 (2012)", category: "Herr", heroImage: "/placeholder.jpg", heroImageAlt: "P13" },
  { id: "p12-2013-2014", name: "P12", displayName: "P12 (2013–14)", category: "Herr", heroImage: "/placeholder.jpg", heroImageAlt: "P12" },
  { id: "p10-2015", name: "P10", displayName: "P10 (2015)", category: "Herr", heroImage: "/placeholder.jpg", heroImageAlt: "P10" },
  { id: "p9-2016", name: "P9", displayName: "P9 (2016)", category: "Herr", heroImage: "/placeholder.jpg", heroImageAlt: "P9" },
  { id: "p8-2017", name: "P8", displayName: "P8 (2017)", category: "Herr", heroImage: "/placeholder.jpg", heroImageAlt: "P8" },
  { id: "p7-2018", name: "P7", displayName: "P7 (2018)", category: "Herr", heroImage: "/placeholder.jpg", heroImageAlt: "P7" },
]

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
