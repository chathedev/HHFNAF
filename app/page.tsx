export const dynamic = "force-dynamic"

import type { FullContent } from "@/lib/content-types"
import { defaultContent } from "@/lib/default-content"
import Hero from "@/components/hero"
import Stats from "@/components/stats"
import AboutClub from "@/components/about-club"
import { getUpcomingMatchesServer } from "@/lib/get-matches"
import UpcomingEvents from "@/components/upcoming-events"
import PartnersCarouselClient from "@/app/partners-carousel-client"
import LazySectionWrapper from "@/components/lazy-section-wrapper"

import { Suspense } from "react"
import type { JSX } from "react/jsx-runtime"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.nuredo.se"

/* -------------------------------------------------------------------------- */
/*                           DATA-FETCHING FUNCTION                           */
/* -------------------------------------------------------------------------- */
async function getDynamicContent(): Promise<FullContent> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/content`, { cache: "no-store" })
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

  // Define lightweight fallback components for Suspense
  const upcomingEventsFallback = (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-2xl mx-auto p-6 text-center text-gray-600">
          Laddar kommande matcher...
        </div>
      </div>
    </section>
  )

  const partnersCarouselFallback = (
    <section className="py-16 bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden p-6 text-center text-gray-600">
          Laddar partners...
        </div>
      </div>
    </section>
  )

  const sectionComponents: { [key: string]: JSX.Element } = {
    hero: <Hero content={content.hero} />,
    stats: <Stats content={content.stats} />,
    upcomingEvents: (
      <Suspense fallback={upcomingEventsFallback}>
        <UpcomingEvents upcomingMatches={upcomingMatches} loading={matchesLoading} error={matchesError} />
      </Suspense>
    ),
    aboutClub: <AboutClub content={content.aboutClub} />,
    partnersCarousel: (
      <Suspense fallback={partnersCarouselFallback}>
        <PartnersCarouselClient partners={content.partners} />
      </Suspense>
    ),
  }

  return (
    <div>
      {content.sections.map((sectionKey, index) => {
        const component = sectionComponents[sectionKey]
        // Wrap all sections in LazySectionWrapper for consistent fade-in animation
        return component ? (
          <LazySectionWrapper key={sectionKey} delay={index * 100}>
            {component}
          </LazySectionWrapper>
        ) : null
      })}
    </div>
  )
}
