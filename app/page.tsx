import { HomePageClient } from "./page-client"
import { Suspense } from "react"
import { getInitialMatchWindow } from "@/lib/get-initial-match-window"

// Revalidate data every 60 seconds
export const revalidate = 60

export default async function HomePage() {
  const initialData = await getInitialMatchWindow()

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <HomePageClient initialData={initialData} />
    </Suspense>
  )
}
