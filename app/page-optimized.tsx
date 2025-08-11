import type { FullContent } from "@/lib/content-types"
import { defaultContent } from "@/lib/default-content"
import Hero from "@/components/hero"
import Stats from "@/components/stats"
import AboutClub from "@/components/about-club"
import { getUpcomingMatchesServer } from "@/lib/get-matches"
import dynamic from 'next/dynamic'
import FastLazyWrapper from "@/components/fast-lazy-wrapper"

// Dynamic imports for non-critical components
const UpcomingEvents = dynamic(() => import("@/components/upcoming-events"), {
  loading: () => (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-2xl mx-auto p-6 text-center text-gray-600">
          Laddar kommande matcher...
        </div>
      </div>
    </section>
  )
})

const PartnersCarouselClient = dynamic(() => import("@/app/partners-carousel-client"), {
  loading: () => (
    <section className="py-16 bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden p-6 text-center text-gray-600">
          Laddar partners...
        </div>
      </div>
    </section>
  )
})

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.nuredo.se"

async function getDynamicContent(): Promise<FullContent> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/content`, { 
      next: { revalidate: 3600 },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    if (!res.ok) {
      console.error(`Failed to fetch content from backend: ${res.statusText}`)
      return defaultContent
    }
    const data = (await res.json()) as Partial<FullContent>

    const fetchedPartners = Array.isArray(data.partners) ? data.partners : defaultContent.partners
    return { ...defaultContent, ...data, partners: fetchedPartners }
  } catch (err) {
    console.error("Error fetching dynamic content:", err)
    return defaultContent
  }
}

export default async function HomePage() {
  // Get content and matches in parallel for faster loading
  const [content, matchesResult] = await Promise.allSettled([
    getDynamicContent(),
    getUpcomingMatchesServer().catch(() => [])
  ])
  
  const finalContent = content.status === 'fulfilled' ? content.value : defaultContent
  const upcomingMatches = matchesResult.status === 'fulfilled' ? matchesResult.value : []

  const sectionComponents = [
    {
      key: "hero",
      component: <Hero content={finalContent.hero} />,
      priority: true
    },
    {
      key: "stats", 
      component: <Stats content={finalContent.stats} />,
      priority: false
    },
    {
      key: "upcomingEvents",
      component: <UpcomingEvents upcomingMatches={upcomingMatches} loading={false} error={null} />,
      priority: false
    },
    {
      key: "aboutClub",
      component: <AboutClub content={finalContent.aboutClub} />,
      priority: false
    },
    {
      key: "partnersCarousel",
      component: <PartnersCarouselClient partners={finalContent.partners} />,
      priority: false
    }
  ]

  return (
    <div>
      {finalContent.sections.map((sectionKey, index) => {
        const section = sectionComponents.find(s => s.key === sectionKey)
        if (!section) return null
        
        return (
          <FastLazyWrapper 
            key={sectionKey} 
            priority={section.priority}
            threshold={0.1}
            rootMargin="100px"
          >
            {section.component}
          </FastLazyWrapper>
        )
      })}
    </div>
  )
}
