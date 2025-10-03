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
          <h1 className="text-5xl font-extrabold text-center mb-4 text-gray-900">
            Våra <span className="text-orange-500">Partners</span>
          </h1>
          <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto text-lg">
            Vi är djupt tacksamma för det ovärderliga stöd vi får från våra partners. Deras engagemang är avgörande för
            att vi ska kunna fortsätta utveckla handbollen i Härnösand och erbjuda en meningsfull fritidsaktivitet för
            alla åldrar.
          </p>

          {tierOrder.map(
            (tierName) =>
              partnersByTier[tierName] && (
                <section key={tierName} className="mb-12">
                  <h2 className="text-4xl font-bold text-green-700 mb-8 text-center">{tierName}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                    {partnersByTier[tierName].map((partner) => {
                      const isDiamant = partner.tier === "Diamantpartner"
                      return (
                        <Card
                          key={partner.id}
                          className={`p-6 shadow-lg rounded-lg flex flex-col items-center text-center transition-all duration-300 hover:shadow-xl
                            ${isDiamant ? "border-4 border-yellow-500 bg-yellow-50" : "bg-white"}
                          `}
                        >
                          {isDiamant && <Star className="w-8 h-8 text-yellow-500 fill-yellow-500 mb-4" />}
                          <div className="relative w-full h-24 mb-4">
                            <Image
                              src={partner.src || "/placeholder.svg"}
                              alt={partner.alt}
                              fill
                              // Removed unoptimized to allow Next.js image optimization
                              className="object-contain"
                            />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{partner.alt}</h3>
                          {partner.benefits && partner.benefits.length > 0 && (
                            <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
                              {partner.benefits.map((benefit, index) => (
                                <li key={index}>{benefit}</li>
                              ))}
                            </ul>
                          )}
                          {partner.linkUrl && (
                            <Button asChild className="mt-auto bg-orange-500 hover:bg-orange-600 text-white">
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

          <section className="bg-green-700 text-white p-10 rounded-lg shadow-xl text-center mt-16">
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
            <div className="bg-white shadow-lg rounded-lg p-8 md:p-12 max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-green-700 mb-8 text-center">Vanliga frågor om att börja träna</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-lg font-semibold text-gray-800 hover:no-underline">
                    Hur börjar jag spela handboll i Härnösands HF?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700 text-base">
                    Det enklaste sättet att börja är att kontakta oss! Vi hjälper dig att hitta rätt lag baserat på din
                    ålder och erfarenhet. Du kan fylla i vårt kontaktformulär eller skicka ett mejl direkt till oss.
                    <Link href="/kontakt" className="text-orange-500 hover:underline ml-2">
                      Kontakta oss här.
                    </Link>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-lg font-semibold text-gray-800 hover:no-underline">
                    Vilken utrustning behöver jag?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700 text-base">
                    Till en början behöver du bara bekväma träningskläder, inomhusskor och en vattenflaska. Handbollar
                    finns att låna under träningarna. När du väl bestämmer dig för att fortsätta kan du behöva
                    klubbkläder.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-lg font-semibold text-gray-800 hover:no-underline">
                    Finns det provträningar?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700 text-base">
                    Absolut! Vi erbjuder alltid några kostnadsfria provträningar så att du kan känna efter om handboll
                    är något för dig. Detta ger dig en chans att träffa laget och tränarna innan du bestämmer dig.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger className="text-lg font-semibold text-gray-800 hover:no-underline">
                    Hur anmäler jag mig?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700 text-base">
                    Efter dina provträningar får du information om hur du enkelt anmäler dig och blir en fullvärdig
                    medlem i Härnösands HF. Vi ser fram emot att välkomna dig till vår handbollsfamilj!
                    <Link href="/kontakt" className="text-orange-500 hover:underline ml-2">
                      Anmäl dig via kontaktformuläret.
                    </Link>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="text-center mt-8">
                <Button
                  asChild
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-md text-lg font-semibold transition-colors"
                >
                  <Link href="/kontakt">Kontakta oss för mer information</Link>
                </Button>
              </div>
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
