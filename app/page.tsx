import { getMatchData } from "@/lib/use-match-data"
import { HomePageClient } from "./page-client"
import { Suspense } from "react"

// Revalidate data every 60 seconds
export const revalidate = 60

export default async function HomePage() {
  let initialData = undefined
  try {
    // Fetch initial data on the server to prevent layout shift and show content immediately
    initialData = await getMatchData("current", true, { limit: 10 })
  } catch (error) {
    console.error("Failed to fetch match data on server:", error)
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <HomePageClient initialData={initialData} />
    </Suspense>
  )
}
