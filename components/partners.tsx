"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { useState } from "react"

interface Partner {
  id: string
  alt: string
  src: string
  tier: string
  linkUrl?: string
  benefits?: string[]
}

interface PartnersProps {
  partners: Partner[]
}

export default function Partners({ partners }: PartnersProps) {
  const [hoveredPartner, setHoveredPartner] = useState<string | null>(null)

  const partnersByTier = partners.reduce(
    (acc, partner) => {
      if (!acc[partner.tier]) {
        acc[partner.tier] = []
      }
      acc[partner.tier].push(partner)
      return acc
    },
    {} as Record<string, Partner[]>,
  )

  const tierOrder = ["Diamantpartner", "Platinapartner", "Guldpartner", "Silverpartner", "Bronspartner"]

  const getTierStyles = (tier: string) => {
    switch (tier) {
      case "Diamantpartner":
        return {
          gradient: "from-blue-600 via-cyan-500 to-blue-700",
          border: "border-blue-200",
          shadow: "shadow-blue-100",
          hoverShadow: "hover:shadow-blue-200",
          textColor: "text-blue-800",
        }
      case "Platinapartner":
        return {
          gradient: "from-gray-600 via-gray-400 to-gray-700",
          border: "border-gray-200",
          shadow: "shadow-gray-100",
          hoverShadow: "hover:shadow-gray-200",
          textColor: "text-gray-800",
        }
      case "Guldpartner":
        return {
          gradient: "from-yellow-500 via-amber-400 to-yellow-600",
          border: "border-yellow-200",
          shadow: "shadow-yellow-100",
          hoverShadow: "hover:shadow-yellow-200",
          textColor: "text-yellow-800",
        }
      case "Silverpartner":
        return {
          gradient: "from-slate-500 via-gray-300 to-slate-600",
          border: "border-slate-200",
          shadow: "shadow-slate-100",
          hoverShadow: "hover:shadow-slate-200",
          textColor: "text-slate-800",
        }
      case "Bronspartner":
        return {
          gradient: "from-orange-600 via-amber-500 to-orange-700",
          border: "border-orange-200",
          shadow: "shadow-orange-100",
          hoverShadow: "hover:shadow-orange-200",
          textColor: "text-orange-800",
        }
      default:
        return {
          gradient: "from-gray-500 to-gray-600",
          border: "border-gray-200",
          shadow: "shadow-gray-100",
          hoverShadow: "hover:shadow-gray-200",
          textColor: "text-gray-800",
        }
    }
  }

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-block">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-6">
              Våra Partners
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto mb-6 rounded-full"></div>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Vi är stolta över att ha fantastiska partners som stödjer vår verksamhet och gör det möjligt för oss att
            utveckla handbollen i Härnösand.
          </p>
        </div>

        <div className="space-y-16">
          {tierOrder.map((tier) => {
            const tiersPartners = partnersByTier[tier]
            if (!tiersPartners || tiersPartners.length === 0) return null

            const tierStyles = getTierStyles(tier)

            return (
              <div key={tier} className="text-center">
                <div className="inline-block mb-10">
                  <h3
                    className={`text-3xl font-bold bg-gradient-to-r ${tierStyles.gradient} bg-clip-text text-transparent mb-2`}
                  >
                    {tier}
                  </h3>
                  <div className={`h-0.5 bg-gradient-to-r ${tierStyles.gradient} rounded-full`}></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                  {tiersPartners.map((partner) => (
                    <div
                      key={partner.id}
                      className="group relative"
                      onMouseEnter={() => setHoveredPartner(partner.id)}
                      onMouseLeave={() => setHoveredPartner(null)}
                    >
                      <Card
                        className={`
                        ${tierStyles.border} ${tierStyles.shadow} ${tierStyles.hoverShadow}
                        hover:shadow-xl transition-all duration-500 ease-out
                        group-hover:scale-105 group-hover:-translate-y-2
                        bg-white/80 backdrop-blur-sm border-2
                        overflow-hidden relative
                      `}
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${tierStyles.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                        ></div>

                        <CardContent className="p-8 flex flex-col items-center justify-center relative z-10">
                          {partner.linkUrl ? (
                            <a
                              href={partner.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-20 relative group-hover:scale-110 transition-transform duration-300"
                            >
                              <Image
                                src={partner.src || "/placeholder.svg?height=80&width=120&query=partner logo"}
                                alt={partner.alt}
                                fill
                                className="object-contain filter group-hover:brightness-110 transition-all duration-300"
                                loading="lazy"
                                placeholder="blur"
                                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                              />
                            </a>
                          ) : (
                            <div className="w-full h-20 relative group-hover:scale-110 transition-transform duration-300">
                              <Image
                                src={partner.src || "/placeholder.svg?height=80&width=120&query=partner logo"}
                                alt={partner.alt}
                                fill
                                className="object-contain filter group-hover:brightness-110 transition-all duration-300"
                                loading="lazy"
                                placeholder="blur"
                                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                              />
                            </div>
                          )}

                          <h4
                            className={`mt-4 font-semibold ${tierStyles.textColor} text-center text-sm group-hover:text-opacity-80 transition-colors duration-300`}
                          >
                            {partner.alt}
                          </h4>
                        </CardContent>

                        {hoveredPartner === partner.id && partner.benefits && partner.benefits.length > 0 && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full z-20">
                            <div
                              className={`
                              bg-white border-2 ${tierStyles.border} rounded-lg shadow-xl p-3 min-w-48
                              before:content-[''] before:absolute before:top-full before:left-1/2 
                              before:transform before:-translate-x-1/2 before:border-4 
                              before:border-transparent before:border-t-white
                              animate-in fade-in-0 zoom-in-95 duration-200
                            `}
                            >
                              <div className="text-xs space-y-1">
                                {partner.benefits.map((benefit, index) => (
                                  <div key={index} className="flex items-center text-gray-700">
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${tierStyles.gradient} mr-2 flex-shrink-0`}
                                    ></div>
                                    <span>{benefit}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Vill du bli vår partner?</h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Tillsammans kan vi utveckla handbollen i Härnösand och skapa fantastiska upplevelser för våra spelare och
              supportrar.
            </p>
            <a
              href="/kontakt"
              className="inline-flex items-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors duration-300 shadow-lg hover:shadow-xl"
            >
              Kontakta oss
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
