import { HomePageClient } from "./page-client"
import { Suspense } from "react"

// Revalidate data every 60 seconds
export const revalidate = 60

export default async function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <HomePageClient />
    </Suspense>
  )
}
