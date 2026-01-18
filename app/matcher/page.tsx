import { getMatchData } from "@/lib/use-match-data"
import { MatcherPageClient } from "./page-client"
import { Suspense } from "react"

// Revalidate data every 60 seconds
export const revalidate = 60

export default async function MatcherPage() {
  let initialData = undefined
  try {
    // Fetch initial data on the server
    initialData = await getMatchData("enhanced", true)
  } catch (error) {
    console.error("Failed to fetch match data on server:", error)
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <MatcherPageClient initialData={initialData} />
    </Suspense>
  )
}
