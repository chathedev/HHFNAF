export const dynamic = "force-dynamic"

import Image from "next/image"
import Link from "next/link"
import { Star } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { defaultContent } from "@/lib/default-content"
import type { FullContent, Partner } from "@/lib/content-types" // Changed SiteContent to FullContent
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Header } from "@/components/header"
import Footer from "@/components/footer"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.nuredo.se"

async function getDynamicContent(): Promise<FullContent> {
  // Changed SiteContent to FullContent
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/content`, { cache: "no-store" })
    if (!res.ok) {
      console.error(`Failed to fetch content from backend: ${res.statusText}`)
      return defaultContent // Fallback to default content
    }
    const data = await res.json()
    // Merge fetched content with default to ensure all fields exist
    return { ...defaultContent, ...data, partners: data.partners || defaultContent.partners }
  } catch (error) {
    console.error("Error fetching dynamic content:", error)
    return defaultContent // Fallback to default content on error
  }
}

interface PartnersPageContentProps {
  partners: Partner[]
}

function PartnersPageContent({ partners }: PartnersPageContentProps) {
  const partnersByTier: Record<string, Partner[]> = partners.reduce(
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

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="h-24"></div> {/* Spacer for fixed header */}
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-4 text-gray-900 leading-tight">
            Våra <span className="text-orange-500">Partners</span>
          </h1>
          <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto text-base sm:text-lg px-2">
            Vi är djupt tacksamma för det ovärderliga stöd vi får från våra partners. Deras engagemang är avgörande för
            att vi ska kunna fortsätta utveckla handbollen i Härnösand och erbjuda en meningsfull fritidsaktivitet för
            alla åldrar.
          </p>

          {tierOrder.map(
            (tierName) =>
              partnersByTier[tierName] && (
                <section key={tierName} className="mb-12">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-700 mb-8 text-center leading-tight">{tierName}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {partnersByTier[tierName].map((partner) => {
                      const isDiamant = partner.tier === "Diamantpartner"
                      return (
                        <Card
                          key={partner.id}
                          className={`group relative overflow-hidden rounded-2xl border bg-white p-6 flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg
                            ${isDiamant ? "border-amber-200 shadow-sm hover:border-amber-300" : "border-gray-200 shadow-sm hover:border-gray-300"}
                          `}
                        >
                          {isDiamant && <Star className="absolute top-3 right-3 w-5 h-5 text-amber-400 fill-amber-400" />}
                          <div className="relative w-full h-20 mb-4">
                            <Image
                              src={partner.src || "/placeholder.svg"}
                              alt={partner.alt}
                              fill
                              className="object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">{partner.alt}</h3>
                          {partner.benefits && partner.benefits.length > 0 && (
                            <ul className="text-xs text-gray-500 space-y-1 mb-4">
                              {partner.benefits.map((benefit, index) => (
                                <li key={index} className="flex items-start gap-1.5">
                                  <span className="mt-1.5 w-1 h-1 rounded-full bg-green-500 shrink-0" />
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          )}
                          {partner.linkUrl && (
                            <Button asChild size="sm" className="mt-auto rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs">
                              <Link href={partner.linkUrl} target="_blank" rel="noopener noreferrer">
                                Besök hemsida
                              </Link>
                            </Button>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                </section>
              ),
          )}

          <section className="bg-green-700 text-white p-10 rounded-2xl shadow-sm text-center mt-16">
            <h2 className="text-4xl font-bold mb-4">Bli en del av Härnösands HF-familjen!</h2>
            <p className="text-xl mb-8">
              Är ditt företag intresserat av att stödja lokal idrott och synas tillsammans med oss? Vi erbjuder olika
              partnerskapspaket som kan anpassas efter era behov.
            </p>
            <Link
              href="/kontakt"
              className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-semibold shadow-lg transition-transform transform hover:scale-105"
            >
              Kontakta oss för mer information
            </Link>
          </section>

          <section className="mt-16">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 md:p-12 max-w-4xl mx-auto shadow-sm">
              <h2 className="text-3xl font-bold text-green-700 mb-2 text-center">Vanliga frågor om partnerskap</h2>
              <p className="text-center text-sm text-gray-500 mb-8">Information för företag som vill stödja oss.</p>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-base font-semibold text-gray-800 hover:no-underline">
                    Vilka partnerskapsnivåer finns det?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 text-sm leading-relaxed">
                    Vi erbjuder fem nivåer: Diamant, Platina, Guld, Silver och Brons. Varje nivå har olika
                    exponeringsmöjligheter och förmåner. Kontakta oss för att hitta det paket som passar ert företag bäst.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-base font-semibold text-gray-800 hover:no-underline">
                    Hur syns mitt företag som partner?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 text-sm leading-relaxed">
                    Beroende på nivå kan ert företag exponeras via logotyp på hemsida och matchprogram,
                    skyltning i hallen, omnämnande i sociala medier och mer. Diamant- och platinapartners
                    får mest synlighet.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-base font-semibold text-gray-800 hover:no-underline">
                    Hur lång är ett partneravtal?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 text-sm leading-relaxed">
                    Partnerskapsavtal löper normalt per säsong, men vi är flexibla och anpassar gärna
                    avtalet efter era önskemål. Vi erbjuder även möjlighet till korttidspartnerskap vid enskilda evenemang.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger className="text-base font-semibold text-gray-800 hover:no-underline">
                    Hur kommer jag igång som partner?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 text-sm leading-relaxed">
                    Kontakta oss via{" "}
                    <Link href="/kontakt" className="text-orange-500 hover:underline">kontaktformuläret</Link>{" "}
                    eller skicka ett mail till{" "}
                    <a href="mailto:marknad@harnosandshf.se" className="text-orange-500 hover:underline">marknad@harnosandshf.se</a>.
                    Vi bokar gärna ett möte för att diskutera möjligheterna.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default async function PartnersPage() {
  const content = await getDynamicContent()
  return <PartnersPageContent partners={content.partners} />
}
