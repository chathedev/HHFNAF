import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { MatcherPageClient } from "./page-client"
import { getInitialMatchWindow } from "@/lib/get-initial-match-window"
import { isFinal4Variant } from "@/lib/site-variant"

// Revalidate data every 60 seconds
export const revalidate = 60

export default async function MatcherPage() {
  // On Final4 subdomain, redirect to homepage (all matches are shown there)
  let host: string
  try {
    const requestHeaders = await headers()
    host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost"
  } catch {
    host = "localhost"
  }

  if (isFinal4Variant(host)) {
    redirect("/")
  }

  const initialData = await getInitialMatchWindow({
    minMatches: 16,
    maxDays: 21,
  })

  return <MatcherPageClient initialData={initialData} />
}
