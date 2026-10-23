import Link from "@/components/quiet-link"

import lagContent from "@/public/content/lag.json"
import { getClubTeams } from "@/lib/club-teams"
import Footer from "@/components/footer"
import { Header } from "@/components/header"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Follows laget.se through lib/club-teams.ts (API fetch cached a few minutes).

const CATEGORY_ORDER = ["Dam", "Herr", "Övrigt"]

export default async function LagPage() {
  const teams = await getClubTeams()
  const totalTeams = teams.length
  const teamsByCategory = CATEGORY_ORDER
    .map((cat) => ({
      category: cat,
      description: cat === "Dam" ? "Damlag och flicklag" : cat === "Herr" ? "Herrlag och pojklag" : "Övriga lag och verksamheter",
      items: teams.filter((t) => t.category === cat),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <>
      <Header />
      <main className="flex-1 bg-white">
        <div className="h-24" />
        <div className="container px-4 md:px-6 py-8 md:py-12 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-emerald-600">
              Härnösands HF
            </p>
            <h1 className="mt-3 text-4xl font-black text-gray-900 md:text-5xl">{lagContent.pageTitle}</h1>
            <p className="mt-3 text-base text-gray-600 md:text-lg">{lagContent.pageDescription}</p>
          </div>

          <section className="mt-12 flex justify-center">
            <div className="grid w-full max-w-3xl gap-4 grid-cols-3">
              <Card className="flex h-full flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-6 text-center shadow-sm">
                <p className="text-4xl font-black text-emerald-700">{totalTeams}</p>
                <p className="mt-2 text-base font-semibold text-gray-900">Lag totalt</p>
              </Card>
              <Card className="flex h-full flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-6 text-center shadow-sm">
                <p className="text-4xl font-black text-emerald-700">{teams.filter((t) => t.category === "Dam").length}</p>
                <p className="mt-2 text-base font-semibold text-gray-900">Dam / Flick</p>
              </Card>
              <Card className="flex h-full flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-6 text-center shadow-sm">
                <p className="text-4xl font-black text-emerald-700">{teams.filter((t) => t.category === "Herr").length}</p>
                <p className="mt-2 text-base font-semibold text-gray-900">Herr / Pojk</p>
              </Card>
            </div>
          </section>

          <section className="mt-12 space-y-8">
            {teamsByCategory.map(({ category, description, items }) => (
              <div key={category} className="space-y-4">
                <div className="flex flex-col justify-between gap-3 text-center md:flex-row md:items-center md:text-left">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-emerald-600">
                      {category}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-gray-900 md:text-2xl">
                      {category === "Övrigt" ? "Övriga lag" : `Lag i ${category.toLowerCase()}`}
                    </h2>
                  </div>
                  {description && (
                    <p className="max-w-sm text-xs text-gray-500 md:text-right">{description}</p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  {items.map((team) => (
                    <Link key={team.id} href={`/lag/${team.id}`} className="block group">
                      <Card className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition group-hover:-translate-y-1 group-hover:border-emerald-300 group-hover:shadow-lg h-full">
                        <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                          <div
                            className="h-full w-full transition group-hover:scale-[1.02]"
                            style={{
                              backgroundImage: `url(${team.heroImage})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center top",
                              backgroundRepeat: "no-repeat",
                            }}
                            aria-hidden
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-emerald-800/85 opacity-0 transition group-hover:opacity-100">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700 shadow">
                              Visa lag →
                            </span>
                          </div>
                        </div>
                        <div className="px-4 py-4 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-600">
                            {team.category}
                          </p>
                          <h3 className="text-sm font-semibold tracking-tight text-gray-900">
                            {team.displayName}
                          </h3>
                          {team.link && (
                            <span className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white">
                              Till laget.se
                            </span>
                          )}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="mt-16">
            <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm md:p-10">
              <h2 className="text-center text-3xl font-bold text-emerald-700">Vanliga frågor om våra lag</h2>
              <p className="mt-2 text-center text-sm text-gray-500">
                Svar på vanliga frågor om lag, träning och hur du kommer igång.
              </p>
              <Accordion type="single" collapsible className="mt-6 w-full">
                <AccordionItem value="lag-1">
                  <AccordionTrigger className="text-left text-base font-semibold text-gray-900">
                    Hur vet jag vilket lag mitt barn ska spela i?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    Lagen är indelade efter födelseår. Kontakta oss så hjälper vi dig att hitta rätt lag.
                    Du hittar alla lag och åldersgrupper ovan på sidan.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="lag-2">
                  <AccordionTrigger className="text-left text-base font-semibold text-gray-900">
                    Hur ofta tränar lagen?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    Träningsfrekvensen varierar beroende på ålder och nivå. Yngre lag tränar ofta 1–2 gånger per vecka,
                    medan äldre lag och seniorlag tränar 2–4 gånger per vecka. Se respektive lags sida för aktuella tider.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="lag-3">
                  <AccordionTrigger className="text-left text-base font-semibold text-gray-900">
                    Kan jag prova på handboll utan att binda mig?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    Absolut! Vi erbjuder kostnadsfria provträningar. Kom som du är med träningskläder och
                    inomhusskor. Handbollar finns att låna.
                    <Link href="/kontakt" className="ml-1 text-orange-500 hover:underline">Kontakta oss för att boka.</Link>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="lag-4">
                  <AccordionTrigger className="text-left text-base font-semibold text-gray-900">
                    Vad kostar det att spela?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    Medlemsavgiften varierar beroende på åldersgrupp. Kontakta oss för aktuella avgifter.
                    Vi vill att alla ska kunna spela handboll, hör av dig om du har frågor om ekonomiskt stöd.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="mt-8 text-center">
                <Button
                  asChild
                  className="rounded-full bg-orange-500 px-8 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  <Link href="/kontakt">Kontakta oss</Link>
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
