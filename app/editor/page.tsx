"use client"

import { Builder, builder, BuilderComponent } from "@builder.io/react"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Users, Trophy, Award, History, Heart, TrendingUp, Goal, CalendarDays, Clock } from "lucide-react"
import type { FullContent, HeroContent, StatsContent, AboutClubContent, Partner } from "@/lib/content-types"
import { defaultContent } from "@/lib/default-content"
import { allPartners } from "@/lib/partners-data"

// Configure Builder.io
if (typeof window !== 'undefined') {
  builder.init(process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || '')
}

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

// Partners Carousel Component for Builder.io  
const EditablePartnersCarousel = ({ partners }: { partners?: Partner[] }) => {
  const partnerData = partners || allPartners.filter(p => p.visibleInCarousel)
  
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

// Register all components with Builder.io
Builder.registerComponent(EditableHero, {
  name: 'Hero Section',
  inputs: [
    {
      name: 'content',
      type: 'object',
      subFields: [
        { name: 'imageUrl', type: 'file', allowedFileTypes: ['jpeg', 'jpg', 'png', 'svg'] },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'longText' },
        { name: 'button1Text', type: 'string' },
        { name: 'button1Link', type: 'string' },
        { name: 'button2Text', type: 'string' },
        { name: 'button2Link', type: 'string' }
      ]
    }
  ]
})

Builder.registerComponent(EditableStats, {
  name: 'Stats Section',
  inputs: [
    {
      name: 'content',
      type: 'object',
      subFields: [
        { name: 'totalTeams', type: 'number' },
        { name: 'aTeams', type: 'number' },
        { name: 'youthTeams', type: 'number' },
        { name: 'yearsHistory', type: 'string' }
      ]
    }
  ]
})

Builder.registerComponent(EditableAboutClub, {
  name: 'About Club Section',
  inputs: [
    {
      name: 'content',
      type: 'object',
      subFields: [
        { name: 'title', type: 'string' },
        { name: 'paragraph1', type: 'longText' },
        { name: 'paragraph2', type: 'longText' },
        { name: 'passionText', type: 'string' },
        { name: 'developmentText', type: 'string' },
        { name: 'communityText', type: 'string' },
        { name: 'button1Text', type: 'string' },
        { name: 'button1Link', type: 'string' },
        { name: 'button2Text', type: 'string' },
        { name: 'button2Link', type: 'string' },
        { name: 'imageSrc', type: 'file', allowedFileTypes: ['jpeg', 'jpg', 'png', 'svg'] },
        { name: 'imageAlt', type: 'string' },
        { name: 'statNumber', type: 'number' },
        { name: 'statLabel', type: 'string' }
      ]
    }
  ]
})

Builder.registerComponent(EditableUpcomingEvents, {
  name: 'Upcoming Events Section'
})

Builder.registerComponent(EditablePartnersCarousel, {
  name: 'Partners Carousel Section',
  inputs: [
    {
      name: 'partners',
      type: 'list',
      subFields: [
        { name: 'id', type: 'string' },
        { name: 'src', type: 'file', allowedFileTypes: ['jpeg', 'jpg', 'png', 'svg'] },
        { name: 'alt', type: 'string' },
        { name: 'tier', type: 'string' },
        { name: 'visibleInCarousel', type: 'boolean' },
        { name: 'linkUrl', type: 'string' }
      ]
    }
  ]
})

export default function EditorPage() {
  const [builderContent, setBuilderContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadBuilderContent() {
      try {
        if (!builder.apiKey) {
          builder.init(process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || '')
        }

        // Try to fetch existing content
        const content = await builder
          .get('page', {
            url: '/editor',
          })
          .toPromise()

        if (content) {
          setBuilderContent(content)
        } else {
          // Create default content structure matching the landing page
          const defaultBuilderContent = {
            data: {
              blocks: [
                {
                  '@type': '@builder.io/sdk:Element',
                  component: {
                    name: 'Hero Section',
                    options: {
                      content: defaultContent.hero
                    }
                  }
                },
                {
                  '@type': '@builder.io/sdk:Element',
                  component: {
                    name: 'Stats Section',
                    options: {
                      content: defaultContent.stats
                    }
                  }
                },
                {
                  '@type': '@builder.io/sdk:Element',
                  component: {
                    name: 'Upcoming Events Section'
                  }
                },
                {
                  '@type': '@builder.io/sdk:Element',
                  component: {
                    name: 'About Club Section',
                    options: {
                      content: defaultContent.aboutClub
                    }
                  }
                },
                {
                  '@type': '@builder.io/sdk:Element',
                  component: {
                    name: 'Partners Carousel Section',
                    options: {
                      partners: defaultContent.partners.filter(p => p.visibleInCarousel)
                    }
                  }
                }
              ]
            }
          }
          setBuilderContent(defaultBuilderContent)
        }
      } catch (err) {
        console.error('Error loading Builder.io content:', err)
        setError('Failed to load content from Builder.io. Please check your BUILDER_PUBLIC_KEY.')
      } finally {
        setLoading(false)
      }
    }

    loadBuilderContent()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading landing page content...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <div className="text-sm text-gray-500">
            Make sure NEXT_PUBLIC_BUILDER_PUBLIC_KEY environment variable is set correctly.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {builderContent ? (
        <BuilderComponent 
          model="page" 
          content={builderContent}
        />
      ) : (
        <div className="py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            No content found
          </h2>
          <p className="text-gray-600">
            Create content in Builder.io or check your configuration.
          </p>
        </div>
      )}
    </div>
  )
}
