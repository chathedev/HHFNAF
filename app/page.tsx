import { HomePageClient } from "./page-client"
import { Suspense } from "react"
import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"

// Revalidate data every 60 seconds
export const revalidate = 60

export const metadata: Metadata = buildPageMetadata({
  title: "Start",
  description:
    "Härnösands HF:s officiella hemsida. Hitta matcher, lag, biljetter och kontakt för handboll i Härnösand.",
  path: "/",
  keywords: ["Härnösands HF", "Härnösands handbollsförening", "handboll Härnösand", "Öbackahallen"],
})

export default async function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <HomePageClient />
    </Suspense>
  )
}
