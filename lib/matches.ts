const LAGET_BASE_URL = "https://www.laget.se"
const DEFAULT_MAX_MONTHS_AHEAD = 6

export type UpcomingMatch = {
  opponent: string
  teamType: string
  isHome: boolean
  date: Date
  time: string
  displayDate: string
  eventUrl: string
  detailPath?: string
  infoUrl?: string
  venue?: string
  series?: string
  result?: string
  homeTeam?: string
  awayTeam?: string
  fullDateText?: string
}

export const MATCH_TYPES_WITH_TICKETS = ["a-lag", "dam/utv"]
export const TICKET_VENUES = ["öbacka sc"]

const HARNOSAND_CLUB_NAME = "härnösands hf"

const formatDateForDisplay = (date: Date) => {
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(date)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

const extractTextNodes = (element: Element) =>
  Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean)

export const parseMatchesFromHtml = (html: string, year: number, monthIndex: number, now: Date) => {
  if (typeof window === "undefined") {
    return [] as UpcomingMatch[]
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const dayNodes = Array.from(doc.querySelectorAll("li.fullCalendar__day"))
  const matches: UpcomingMatch[] = []

  dayNodes.forEach((dayNode) => {
    const dayAttr = dayNode.getAttribute("data-day")
    if (!dayAttr) {
      return
    }
    const day = Number.parseInt(dayAttr, 10)
    if (!Number.isFinite(day)) {
      return
    }

    const eventNodes = Array.from(dayNode.querySelectorAll("li.fullCalendar__item"))
    eventNodes.forEach((eventNode) => {
      const inner = eventNode.querySelector(".fullCalendar__itemInner")
      if (!inner) {
        return
      }

      const timeText = inner.querySelector(".fullCalendar__time")?.textContent?.trim()
      if (!timeText) {
        return
      }

      const [hourStr, minuteStr] = timeText.split(":")
      const hours = Number.parseInt(hourStr, 10)
      const minutes = Number.parseInt(minuteStr, 10)
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return
      }

      const matchDate = new Date(year, monthIndex, day, hours, minutes)
      if (matchDate.getTime() < now.getTime()) {
        return
      }

      const descriptionElement = inner.querySelector(".fullCalendar__text")
      if (!descriptionElement) {
        return
      }

      const opponentParts = extractTextNodes(descriptionElement)
      if (opponentParts.length === 0) {
        return
      }

      const rawOpponent = opponentParts.join(" ").replace(/\s+/g, " ").trim()
      if (!rawOpponent) {
        return
      }

      const teamType = inner.querySelector(".fullCalendar__midText")?.textContent?.trim() ?? ""
      const isHome = /hemma/i.test(rawOpponent)
      const opponent = rawOpponent.replace(/\s*\((hemma|borta)\)\s*/i, "").trim()
      const dataSrc = inner.getAttribute("data-src") ?? ""
      const eventUrl = dataSrc ? new URL(dataSrc, LAGET_BASE_URL).toString() : LAGET_BASE_URL

      matches.push({
        opponent,
        teamType,
        isHome,
        date: matchDate,
        time: timeText,
        displayDate: formatDateForDisplay(matchDate),
        eventUrl,
        detailPath: dataSrc || undefined,
      })
    })
  })

  return matches
}

const toAbsoluteUrl = (path?: string | null) => (path ? new URL(path, LAGET_BASE_URL).toString() : undefined)

const parseSingleEventDetails = (html: string) => {
  if (typeof window === "undefined") {
    return {}
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  const infoBlocks = Array.from(doc.querySelectorAll(".fullCalendar__info"))
  const firstBlockTexts = infoBlocks
    .flatMap((element) => Array.from(element.querySelectorAll(".fullCalendar__text")))
    .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .filter(Boolean)

  const venue = firstBlockTexts[0] ?? undefined
  const seriesText = firstBlockTexts.find((text) => /^serie:/i.test(text))
  const series = seriesText ? seriesText.replace(/^serie:\s*/i, "") : undefined

  const infoLink = doc.querySelector("a.fullCalendar__info[href]")
  const infoUrl = toAbsoluteUrl(infoLink?.getAttribute("href"))

  return { venue, series, infoUrl }
}

const parseMatchOverviewPage = (html: string) => {
  if (typeof window === "undefined") {
    return {}
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const overview = doc.querySelector(".overview")
  if (!overview) {
    return {}
  }

  const teamNames = Array.from(overview.querySelectorAll(".overview__name")).map((element) =>
    element.textContent?.replace(/\s+/g, " ").trim(),
  )
  const result = overview.querySelector(".overview__result")?.textContent?.replace(/\s+/g, " ").trim()

  const metaTexts = Array.from(overview.querySelectorAll(".overview__cellText"))
    .map((element) => element.textContent?.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  const venue = metaTexts[0]
  const dateText = metaTexts[1]
  const timeText = metaTexts[2]

  return {
    homeTeam: teamNames[0],
    awayTeam: teamNames[teamNames.length - 1],
    result,
    venue,
    dateText,
    timeText,
  }
}

const buildClubTeamName = (teamType: string) => {
  const trimmed = teamType.trim()
  if (!trimmed) {
    return "Härnösands HF"
  }
  return `Härnösands HF ${trimmed}`
}

const isClubTeamName = (name?: string | null) => {
  if (!name) {
    return false
  }
  return name.toLowerCase().includes(HARNOSAND_CLUB_NAME)
}

export const getMatchTeams = (match: UpcomingMatch) => {
  const fallbackClubName = buildClubTeamName(match.teamType)
  const homeName = match.homeTeam ?? (match.isHome ? fallbackClubName : match.opponent) ?? fallbackClubName
  const awayName = match.awayTeam ?? (match.isHome ? match.opponent : fallbackClubName) ?? fallbackClubName

  const clubTeamName = isClubTeamName(homeName) ? homeName : isClubTeamName(awayName) ? awayName : fallbackClubName
  const opponentName = clubTeamName === homeName ? awayName : homeName

  return {
    homeName,
    awayName,
    clubTeamName,
    opponentName,
  }
}

export const formatCountdownLabel = (target: Date, hasResult: boolean) => {
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()

  if (diffMs <= 0) {
    return hasResult ? "Matchen är spelad" : "Matchen är igång"
  }

  const diffMinutes = Math.floor(diffMs / 60000)
  const days = Math.floor(diffMinutes / (60 * 24))
  const hours = Math.floor((diffMinutes - days * 24 * 60) / 60)
  const minutes = diffMinutes % 60

  if (days > 0) {
    const dayLabel = days === 1 ? "dag" : "dagar"
    if (hours > 0) {
      const hourLabel = hours === 1 ? "timme" : "timmar"
      return `Om ${days} ${dayLabel} och ${hours} ${hourLabel}`
    }
    return `Om ${days} ${dayLabel}`
  }

  if (hours > 0) {
    const hourLabel = hours === 1 ? "timme" : "timmar"
    if (minutes > 0) {
      return `Om ${hours} ${hourLabel} och ${minutes} min`
    }
    return `Om ${hours} ${hourLabel}`
  }

  if (minutes > 0) {
    return `Om ${minutes} min`
  }

  return "Strax"
}

export const enrichMatchWithDetails = async (match: UpcomingMatch) => {
  if (typeof window === "undefined") {
    return match
  }

  let enriched: UpcomingMatch = { ...match }
  const detailUrl = toAbsoluteUrl(match.detailPath) ?? match.eventUrl

  try {
    if (detailUrl) {
      const detailResponse = await fetch(detailUrl)
      if (detailResponse.ok) {
        const detailHtml = await detailResponse.text()
        const { venue, series, infoUrl } = parseSingleEventDetails(detailHtml)
        enriched = {
          ...enriched,
          venue: venue ?? enriched.venue,
          series: series ?? enriched.series,
          infoUrl: infoUrl ?? enriched.infoUrl ?? detailUrl,
        }
      }
    }

    if (enriched.infoUrl) {
      const overviewResponse = await fetch(enriched.infoUrl)
      if (overviewResponse.ok) {
        const overviewHtml = await overviewResponse.text()
        const { homeTeam, awayTeam, result, venue: overviewVenue, dateText, timeText } =
          parseMatchOverviewPage(overviewHtml)

        enriched = {
          ...enriched,
          homeTeam: homeTeam ?? enriched.homeTeam,
          awayTeam: awayTeam ?? enriched.awayTeam,
          result: result ?? enriched.result,
          venue: overviewVenue ?? enriched.venue,
          fullDateText: dateText ?? enriched.fullDateText,
          time: timeText ?? enriched.time,
        }
      }
    }
  } catch (_error) {
    // Ignore errors and return existing enriched data
  }

  return enriched
}

export const refreshMatchResult = async (match: UpcomingMatch) => {
  if (typeof window === "undefined" || !match.infoUrl) {
    return match
  }

  try {
    const response = await fetch(match.infoUrl, { cache: "no-store" })
    if (!response.ok) {
      return match
    }

    const html = await response.text()
    const { homeTeam, awayTeam, result, venue, dateText, timeText } = parseMatchOverviewPage(html)

    return {
      ...match,
      homeTeam: homeTeam ?? match.homeTeam,
      awayTeam: awayTeam ?? match.awayTeam,
      result: result ?? match.result,
      venue: venue ?? match.venue,
      fullDateText: dateText ?? match.fullDateText,
      time: timeText ?? match.time,
    }
  } catch (_error) {
    return match
  }
}

type FetchOptions = {
  limit?: number | null
  maxMonthsAhead?: number
  onProgress?: (matches: UpcomingMatch[]) => void
}

export const fetchUpcomingMatches = async (options: FetchOptions = {}) => {
  if (typeof window === "undefined") {
    return [] as UpcomingMatch[]
  }

  const { limit = 10, maxMonthsAhead = DEFAULT_MAX_MONTHS_AHEAD, onProgress } = options
  const now = new Date()
  const candidateMatches: UpcomingMatch[] = []

  for (let offset = 0; offset < maxMonthsAhead; offset += 1) {
    const remainingSlots = typeof limit === "number" ? limit - candidateMatches.length : Number.POSITIVE_INFINITY
    if (remainingSlots <= 0) {
      break
    }

    const searchDate = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const searchYear = searchDate.getFullYear()
    const searchMonth = searchDate.getMonth()

    const response = await fetch(
      `https://www.laget.se/HarnosandsHF/Event/FilterEvents?Year=${searchYear}&Month=${searchMonth + 1}&PrintMode=False&SiteType=Club&Visibility=2&types=6`,
    )

    if (!response.ok) {
      continue
    }

    const html = await response.text()
    const matches = parseMatchesFromHtml(html, searchYear, searchMonth, now)

    const futureMatches = matches.filter((match) => match.date.getTime() >= now.getTime())
    const trimmedMatches =
      typeof limit === "number" ? futureMatches.slice(0, Math.max(remainingSlots, 0)) : futureMatches

    const enrichedChunk: UpcomingMatch[] = []
    for (const match of trimmedMatches) {
      const enriched = await enrichMatchWithDetails(match)
      enrichedChunk.push(enriched)
      candidateMatches.push(enriched)
      if (typeof limit === "number" && candidateMatches.length >= limit) {
        break
      }
    }

    if (enrichedChunk.length > 0 && typeof onProgress === "function") {
      const snapshot = [...candidateMatches].sort((a, b) => a.date.getTime() - b.date.getTime())
      onProgress(snapshot)
    }

    if (typeof limit === "number" && candidateMatches.length >= limit) {
      break
    }
  }

  return candidateMatches.sort((a, b) => a.date.getTime() - b.date.getTime())
}
