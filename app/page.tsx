import type { FullContent } from "@/lib/content-types"
import { defaultContent } from "@/lib/default-content"
import { Suspense, lazy } from "react"
import Hero from "@/components/hero"
import Stats from "@/components/stats"
import UpcomingEvents from "@/components/upcoming-events"
import AboutClub from "@/components/about-club"
import PartnersCarouselClient from "@/app/partners-carousel-client"
import { getUpcomingMatchesServer } from "@/lib/get-matches"
import LoadingSkeleton from "@/components/loading-skeleton"

// Static generation with revalidation every 300 seconds (5 minutes)
export const revalidate = 300

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.nuredo.se"

/* -------------------------------------------------------------------------- */
/*                           DATA-FETCHING FUNCTION                           */
/* -------------------------------------------------------------------------- */
async function getDynamicContent(): Promise<FullContent> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/content`, {
      cache: "force-cache",
      next: { revalidate: 300 } // Cache for 5 minutes
    })
    if (!res.ok) {
      console.error(`Failed to fetch content from backend: ${res.statusText}`)
      return defaultContent
    }
    const data = (await res.json()) as Partial<FullContent>

    // Guarantee partners is an array
    const fetchedPartners = Array.isArray(data.partners) ? data.partners : defaultContent.partners

    // Merge with defaults to ensure all fields exist
    return { ...defaultContent, ...data, partners: fetchedPartners }
  } catch (err) {
    console.error("Error fetching dynamic content:", err)
    return defaultContent
  }
}

/* -------------------------------------------------------------------------- */
/*                                PAGE LAYOUT                                */
/* -------------------------------------------------------------------------- */
export default async function HomePage() {
  const content = await getDynamicContent()

  // Fetch upcoming matches on the server for the homepage
  let upcomingMatches = []
  let matchesLoading = true
  let matchesError: string | null = null
  try {
    upcomingMatches = await getUpcomingMatchesServer()
    matchesLoading = false
  } catch (e: any) {
    matchesError = e.message || "Failed to fetch upcoming matches."
    matchesLoading = false
    console.error("Server-side fetch error for homepage upcoming matches:", e)
  }

  return (
    <div>
      {/* Load Hero immediately - critical above-the-fold content */}
      <Hero content={content.hero} />

      {/* Load Stats immediately - simple component */}
      <Stats content={content.stats} />

      {/* Lazy load heavy components with suspense boundaries */}
      <Suspense fallback={<LoadingSkeleton />}>
        <UpcomingEvents upcomingMatches={upcomingMatches} loading={matchesLoading} error={matchesError} />
      </Suspense>

      <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse" />}>
        <AboutClub content={content.aboutClub} />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-gray-50 animate-pulse" />}>
        <PartnersCarouselClient partners={content.partners} />
      </Suspense>
    </div>
  )
}
