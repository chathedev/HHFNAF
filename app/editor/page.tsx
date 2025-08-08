import { builder } from '@/lib/builder'
import { BuilderComponent, Builder } from '@builder.io/react'
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Users, Trophy, Award, History, Heart, TrendingUp, Goal, CalendarDays, Clock } from "lucide-react"
import type { FullContent, HeroContent, StatsContent, AboutClubContent, Partner } from "@/lib/content-types"
import { defaultContent } from "@/lib/default-content"
import { allPartners } from "@/lib/partners-data"

// Hero Component for Builder.io
const EditableHero = ({ content }: { content?: HeroContent }) => {
  const heroData = content || defaultContent.hero
  
  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      <Image
        src={heroData.imageUrl || "/placeholder.svg"}
        alt="Härnösands HF Team"
        fill
        quality={90}
        priority
        className="object-cover z-0"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10" />
      <div className="relative z-20 text-white text-center px-4 max-w-5xl mx-auto">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold mb-4 leading-tight tracking-tight animate-fade-in-up text-shadow-outline">
          {heroData.title.split(" ")[0]}{" "}
          <span className="text-orange-400">{heroData.title.split(" ").slice(1).join(" ")}</span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl mb-10 max-w-3xl mx-auto animate-fade-in-up delay-200 text-shadow-md">
          {heroData.description}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-6 animate-fade-in-up delay-400">
          <Button
            asChild
            className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105"
          >
            <Link href={heroData.button1Link}>
              {heroData.button1Text}
              <ArrowRight className="ml-3 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            className="bg-green-700 hover:bg-green-800 text-white px-10 py-4 rounded-full text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105"
          >
            <Link href={heroData.button2Link}>{heroData.button2Text}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

// Stats Component for Builder.io
const EditableStats = ({ content }: { content?: StatsContent }) => {
  const statsData = content || defaultContent.stats
  
  return (
    <section className="bg-green-600 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="flex flex-col items-center">
            <Users className="w-12 h-12 mb-2" />
            <div className="text-4xl font-bold">{statsData.totalTeams}</div>
            <div className="text-sm">Totalt Lag</div>
          </div>
          <div className="flex flex-col items-center">
            <Trophy className="w-12 h-12 mb-2" />
            <div className="text-4xl font-bold">{statsData.aTeams}</div>
            <div className="text-sm">A-lag</div>
          </div>
          <div className="flex flex-col items-center">
            <Award className="w-12 h-12 mb-2" />
            <div className="text-4xl font-bold">{statsData.youthTeams}</div>
            <div className="text-sm">Ungdomslag</div>
          </div>
          <div className="flex flex-col items-center">
            <History className="w-12 h-12 mb-2" />
            <div className="text-4xl font-bold">{statsData.yearsHistory}</div>
            <div className="text-sm">År av Historia</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// About Club Component for Builder.io
const EditableAboutClub = ({ content }: { content?: AboutClubContent }) => {
  const aboutData = content || defaultContent.aboutClub
  
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-green-600 mb-2">{aboutData.title}</h2>
            <p className="text-gray-700 mb-6">{aboutData.paragraph1}</p>
            <p className="text-gray-700 mb-8">{aboutData.paragraph2}</p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <Heart className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium mb-1">Passion</h4>
                <p className="text-xs text-gray-600">{aboutData.passionText}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <TrendingUp className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <h4 className="font-medium mb-1">Utveckling</h4>
                <p className="text-xs text-gray-600">{aboutData.developmentText}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium mb-1">Gemenskap</h4>
                <p className="text-xs text-gray-600">{aboutData.communityText}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href={aboutData.button1Link}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                {aboutData.button1Text}
              </Link>
              <Link
                href={aboutData.button2Link}
                className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-2 rounded-md font-medium transition-colors"
              >
                {aboutData.button2Text}
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="relative h-[400px] rounded-lg overflow-hidden shadow-xl">
              <Image
                src={aboutData.imageSrc || "/placeholder.svg"}
                alt={aboutData.imageAlt}
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute -top-4 -right-4 bg-orange-500 text-white rounded-lg p-4 shadow-lg">
              <div className="text-3xl font-bold">{aboutData.statNumber}</div>
              <div className="text-sm">{aboutData.statLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Upcoming Events Component for Builder.io
const EditableUpcomingEvents = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <Card className="bg-white rounded-lg shadow-lg overflow-hidden max-w-2xl mx-auto">
          <CardHeader className="p-6 flex flex-col items-center text-center border-b border-gray-200">
            <Goal className="w-16 h-16 text-green-600 mb-4" />
            <CardTitle className="text-3xl font-bold text-green-600 mb-2">KOMMANDE MATCHER</CardTitle>
            <p className="text-gray-600 text-lg">Håll dig uppdaterad med våra nästa matcher!</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex-shrink-0 text-center">
                  <CalendarDays className="w-6 h-6 text-orange-500" />
                  <span className="block text-xs text-gray-600">Lör 15 Jan</span>
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-gray-800">HHF vs Sundsvall HK</h4>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>15:00</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <Button
                asChild
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-md text-lg font-semibold transition-colors"
              >
                <Link href="/matcher">
                  Visa Alla Matcher
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// Partners Carousel Component for Builder.io with proper error handling
const EditablePartnersCarousel = ({ partners }: { partners?: Partner[] }) => {
  // Safe array handling - prevent the "Cannot read properties of undefined (reading 'map')" error
  const partnerData = Array.isArray(partners) 
    ? partners 
    : Array.isArray(allPartners) 
    ? allPartners.filter(p => p.visibleInCarousel) 
    : []
  
  if (!partnerData.length) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-green-600 mb-12">Våra Partners</h2>
          <p className="text-center text-gray-600">Inga partners att visa för tillfället.</p>
        </div>
      </section>
    )
  }
  
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-green-600 mb-12">Våra Partners</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {partnerData.slice(0, 12).map((partner) => (
            <div key={partner.id} className="flex items-center justify-center p-4 bg-white rounded-lg shadow-sm">
              <Image
                src={partner.src}
                alt={partner.alt}
                width={120}
                height={60}
                className="object-contain max-h-12"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Complete Landing Page Component
const CompleteLandingPage = ({ content }: { content?: FullContent }) => {
  const pageContent = content || defaultContent
  
  return (
    <div className="min-h-screen">
      <EditableHero content={pageContent.hero} />
      <EditableStats content={pageContent.stats} />
      <EditableUpcomingEvents />
      <EditableAboutClub content={pageContent.aboutClub} />
      <EditablePartnersCarousel partners={pageContent.partners} />
    </div>
  )
}

// Server Component - no client-side fetching
export default async function EditorPage() {
  let builderContent = null
  let error = null
  
  const apiKey = process.env.BUILDER_PUBLIC_KEY || process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY
  const hasValidApiKey = apiKey && apiKey !== 'your-builder-public-key'

  if (hasValidApiKey) {
    try {
      // Server-side fetch from Builder.io
      builderContent = await builder
        .get('page', {
          url: '/editor',
        })
        .toPromise()
    } catch (err) {
      console.error('Error loading Builder.io content:', err)
      error = 'Failed to load content from Builder.io'
    }
  }

  return (
    <main className="min-h-screen">
      {hasValidApiKey && builderContent ? (
        <BuilderComponent 
          model="page" 
          content={builderContent}
        />
      ) : (
        <div>
          {!hasValidApiKey && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm">
                    <strong>Builder.io not configured:</strong> Set BUILDER_PUBLIC_KEY environment variable to enable visual editing.
                  </p>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm">
                    <strong>Error:</strong> {error}
                  </p>
                </div>
              </div>
            </div>
          )}
          <CompleteLandingPage content={defaultContent} />
        </div>
      )}
    </main>
  )
}
