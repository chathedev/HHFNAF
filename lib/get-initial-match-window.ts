import { getMatchData, type EnhancedMatchData, type NormalizedMatch } from "@/lib/use-match-data"
import { compareMatchesByDateAscStable, compareMatchesByDateDescStable } from "@/lib/match-sort"
import type { MatchProvider } from "@/lib/use-match-data"

const STOCKHOLM_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const getStockholmToday = () => STOCKHOLM_DATE_FORMATTER.format(new Date())

const dedupeMatches = (matches: NormalizedMatch[]) => {
  const seen = new Set<string>()
  return matches.filter((match) => {
    if (seen.has(match.id)) {
      return false
    }
    seen.add(match.id)
    return true
  })
}

const buildGroupedFeed = (matches: NormalizedMatch[]) => ({
  live: dedupeMatches(matches.filter((match) => match.matchStatus === "live" || match.matchStatus === "halftime")).sort(compareMatchesByDateAscStable),
  upcoming: dedupeMatches(matches.filter((match) => match.matchStatus === "upcoming")).sort(compareMatchesByDateAscStable),
  finished: dedupeMatches(matches.filter((match) => match.matchStatus === "finished")).sort(compareMatchesByDateDescStable),
})

const mergeMatchWindows = (windows: EnhancedMatchData[]): EnhancedMatchData | undefined => {
  if (windows.length === 0) {
    return undefined
  }

  const matches = dedupeMatches(windows.flatMap((window) => window.matches ?? [])).sort(compareMatchesByDateAscStable)
  const recentResults = dedupeMatches(windows.flatMap((window) => window.recentResults ?? [])).sort(compareMatchesByDateDescStable)
  const groupedFeed = buildGroupedFeed(matches)
  const sources = windows.at(-1)?.sources
  const window = windows.at(-1)?.window

  return {
    matches,
    recentResults,
    groupedFeed,
    sources,
    window,
  }
}

type InitialMatchWindowOptions = {
  minMatches?: number
  maxDays?: number
  requireUpcomingProviders?: MatchProvider[]
}

export async function getInitialMatchWindow(options?: InitialMatchWindowOptions): Promise<EnhancedMatchData | undefined> {
  const minMatches = options?.minMatches ?? 8
  const maxDays = options?.maxDays ?? 3
  const requireUpcomingProviders = options?.requireUpcomingProviders ?? []

  try {
    const windows: EnhancedMatchData[] = []
    let nextCursorDate: string | null = getStockholmToday()
    let daysLoaded = 0

    while (nextCursorDate && daysLoaded < maxDays) {
      const payload = await getMatchData("liveUpcoming", true, {
        cursorDate: nextCursorDate,
        chunkDays: 1,
      })

      windows.push(payload)
      daysLoaded += 1

      const merged = mergeMatchWindows(windows)
      const matchCount = merged?.matches.length ?? 0
      const recentCount = merged?.recentResults?.length ?? 0
      const upcomingProviders = new Set((merged?.groupedFeed?.upcoming ?? []).map((match) => match.provider).filter(Boolean))
      const hasRequiredProviders = requireUpcomingProviders.every((provider) => upcomingProviders.has(provider))

      if ((matchCount >= minMatches || recentCount >= 4) && hasRequiredProviders) {
        return merged
      }

      nextCursorDate = payload.window?.nextCursorDate ?? null
    }

    return mergeMatchWindows(windows)
  } catch (error) {
    console.warn("Failed to load initial matcher window", error)
    return undefined
  }
}
