import { MatcherPageClient } from "./page-client"
import { getInitialMatchWindow } from "@/lib/get-initial-match-window"

// Revalidate data every 60 seconds
export const revalidate = 60

export default async function MatcherPage() {
  const initialData = await getInitialMatchWindow({
    minMatches: 16,
    maxDays: 14,
  })

  return <MatcherPageClient initialData={initialData} />
}
