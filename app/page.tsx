import { headers } from "next/headers"
import { HomePageClient } from "./page-client"
import { getInitialMatchWindow } from "@/lib/get-initial-match-window"
import { isFinal4Variant } from "@/lib/site-variant"
import type { EnhancedMatchData, NormalizedMatch } from "@/lib/use-match-data"

// Revalidate data every 60 seconds
export const revalidate = 60

// Strip heavy timeline/event data from matches for the initial HTML payload.
// The client re-fetches full data on mount — this just makes the first paint faster
// by reducing the serialized HTML size by ~20-30KB.
function stripHeavyMatchData(data: EnhancedMatchData | undefined): EnhancedMatchData | undefined {
  if (!data) return data
  const strip = (m: NormalizedMatch): NormalizedMatch => ({
    ...m,
    matchFeed: undefined,
  })
  return {
    ...data,
    matches: data.matches.map(strip),
    recentResults: data.recentResults?.map(strip),
    groupedFeed: data.groupedFeed ? {
      live: data.groupedFeed.live.map(strip),
      upcoming: data.groupedFeed.upcoming.map(strip),
      finished: data.groupedFeed.finished.map(strip),
    } : data.groupedFeed,
  }
}

export default async function HomePage() {
  // Check if this is the Final4 subdomain
  let host: string
  try {
    const requestHeaders = await headers()
    host =
      requestHeaders.get("x-forwarded-host") ||
      requestHeaders.get("host") ||
      "localhost"
  } catch {
    host = "localhost"
  }

  if (isFinal4Variant(host)) {
    const { default: Final4Page } = await import("./final4/page")
    return <Final4Page />
  }

  const initialData = await getInitialMatchWindow({
    minMatches: 6,
    maxDays: 21,
  })

  return <HomePageClient initialData={stripHeavyMatchData(initialData)} />
}
