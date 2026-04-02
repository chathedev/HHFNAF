import { headers } from "next/headers"
import { MatcherPageClient } from "./page-client"
import { getInitialMatchWindow } from "@/lib/get-initial-match-window"
import { isFinal4Variant } from "@/lib/site-variant"

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

  return <MatcherPageClient initialData={initialData} isFinal4={isFinal4} />
}
