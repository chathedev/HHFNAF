import { headers } from "next/headers"
import { MatcherPageClient } from "./page-client"
import { getInitialMatchWindow } from "@/lib/get-initial-match-window"
import { isFinal4Variant } from "@/lib/site-variant"
import { fetchFinal4Data } from "@/lib/use-final4-data"

// Revalidate data every 60 seconds
export const revalidate = 60

export default async function MatcherPage() {
  let host: string
  try {
    const requestHeaders = await headers()
    host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost"
  } catch {
    host = "localhost"
  }

  const isFinal4 = isFinal4Variant(host)
  const initialData = isFinal4 ? undefined : await getInitialMatchWindow({
    minMatches: 16,
    maxDays: 21,
  })
  const final4InitialData = isFinal4 ? await fetchFinal4Data() : undefined

  return <MatcherPageClient initialData={initialData} isFinal4={isFinal4} final4InitialData={final4InitialData ?? undefined} />
}
