export const dynamic = "force-dynamic"

import type { FullContent } from "@/lib/content-types"
import { defaultContent } from "@/lib/default-content"
import Hero from "@/components/hero"
import Stats from "@/components/stats"
import UpcomingEvents from "@/components/upcoming-events"
import AboutClub from "@/components/about-club"
import PartnersCarouselClient from "@/app/partners-carousel-client" // Client component for carousel

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.nuredo.se"

/* -------------------------------------------------------------------------- */
/*                           DATA-FETCHING FUNCTION                           */
/* -------------------------------------------------------------------------- */
async function getDynamicContent(): Promise<FullContent> {
  // Temporarily disabled external API to fix dev server stability
  // TODO: Re-enable when BACKEND_API_URL is properly configured
  console.log("Using default content (external API disabled)")
  return defaultContent

  // try {
  //   const res = await fetch(`${BACKEND_API_URL}/api/content`, { cache: "no-store" })
  //   if (!res.ok) {
  //     console.error(`Failed to fetch content from backend: ${res.statusText}`)
  //     return defaultContent
  //   }
  //   const data = (await res.json()) as Partial<FullContent>

  //   // Guarantee partners is an array
  //   const fetchedPartners = Array.isArray(data.partners) ? data.partners : defaultContent.partners

  //   // Merge with defaults to ensure all fields exist
  //   return { ...defaultContent, ...data, partners: fetchedPartners }
  // } catch (err) {
  //   console.error("Error fetching dynamic content:", err)
  //   return defaultContent
  // }
}

/* -------------------------------------------------------------------------- */
/*                                PAGE LAYOUT                                */
/* -------------------------------------------------------------------------- */
export default async function HomePage() {
  const content = await getDynamicContent()

  const sectionComponents: { [key: string]: JSX.Element } = {
    hero: <Hero content={content.hero} />,
    stats: <Stats content={content.stats} />,
    upcomingEvents: <UpcomingEvents />, // UpcomingEvents fetches its own data
    aboutClub: <AboutClub content={content.aboutClub} />,
    partnersCarousel: <PartnersCarouselClient partners={content.partners} />,
  }

  return (
    <div>
      {content.sections.map((sectionKey) => {
        const component = sectionComponents[sectionKey]
        return component ? <div key={sectionKey}>{component}</div> : null
      })}
    </div>
  )
}
