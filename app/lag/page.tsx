import Link from "next/link"

import lagContent from "@/public/content/lag.json"
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

type RawTeam = (typeof lagContent)["teamCategories"][number]["teams"][number]

const PLACEHOLDER_HERO = "/placeholder.jpg"

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

const encodeAssetPath = (path: string) => {
  if (!path) {
    return PLACEHOLDER_HERO
  }
  const segments = path.split("/").map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
  return segments.join("/")
}

// Use only new team names for lag page
const teams = [
  { id: "dam-utv", name: "Dam/utv", displayName: "Dam/utv" },
  { id: "a-lag-herrar", name: "A-lag Herrar", displayName: "A-lag Herrar" },
  { id: "fritids-teknikskola", name: "Fritids-Teknikskola", displayName: "Fritids-Teknikskola" },
  { id: "f19-senior", name: "F19-Senior", displayName: "F19-Senior" },
  { id: "f16-2009", name: "F16 (2009)", displayName: "F16 (2009)" },
  { id: "f15-2010", name: "F15 (2010)", displayName: "F15 (2010)" },
  { id: "f14-2011", name: "F14 (2011)", displayName: "F14 (2011)" },
  { id: "f13-2012", name: "F13 (2012)", displayName: "F13 (2012)" },
  { id: "f12-2013", name: "F12 (2013)", displayName: "F12 (2013)" },
  { id: "f11-2014", name: "F11 (2014)", displayName: "F11 (2014)" },
  { id: "f10-2015", name: "F10 (2015)", displayName: "F10 (2015)" },
  { id: "f9-2016", name: "F9 (2016)", displayName: "F9 (2016)" },
  { id: "f8-2017", name: "F8 (2017)", displayName: "F8 (2017)" },
  { id: "f7-2018", name: "F7 (2018)", displayName: "F7 (2018)" },
  { id: "f6-2019", name: "F6 (2019)", displayName: "F6 (2019)" },
  { id: "p16-2009-2010", name: "P16 (2009/2010)", displayName: "P16 (2009/2010)" },
  { id: "p14-2011", name: "P14 (2011)", displayName: "P14 (2011)" },
  { id: "p13-2012", name: "P13 (2012)", displayName: "P13 (2012)" },
  { id: "p12-2013-2014", name: "P12 (2013/2014)", displayName: "P12 (2013/2014)" },
  { id: "p10-2015", name: "P10 (2015)", displayName: "P10 (2015)" },
  { id: "p9-2016", name: "P9 (2016)", displayName: "P9 (2016)" },
  { id: "p8-2017", name: "P8 (2017)", displayName: "P8 (2017)" },
  { id: "p7-2018", name: "P7 (2018)", displayName: "P7 (2018)" }
]

const categoryStats = lagContent.teamCategories.map((category) => ({
  name: category.name,
  count:
    typeof category.count === "number"
      ? category.count
      : Array.isArray(category.teams)
      ? category.teams.length
      : 0,
  description: category.description,
}))

const totalTeams = categoryStats.reduce((sum, category) => sum + category.count, 0)

export default function LagPage() {
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
            <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-3">
              {categoryStats.map((stat) => (
                <Card
                  key={stat.name}
                  className="flex h-full flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-6 text-center shadow-sm"
                >
                  <p className="text-4xl font-black text-emerald-700">{stat.count}</p>
                  <p className="mt-2 text-base font-semibold text-gray-900">{stat.name}</p>
                  {stat.description && <p className="mt-1 text-sm text-gray-500">{stat.description}</p>}
                </Card>
              ))}
              <Card className="flex h-full flex-col items-center justify-center rounded-2xl border border-orange-100 bg-gradient-to-br from-white via-white to-orange-50 p-6 text-center shadow-sm">
                <p className="text-4xl font-black text-orange-500">{totalTeams}</p>
                <p className="mt-2 text-base font-semibold text-gray-900">Totalt antal lag</p>
                <p className="mt-1 text-sm text-gray-500">Alla lag i föreningen</p>
              </Card>
            </div>
          </section>

          <section className="mt-12 space-y-8">
            {lagContent.teamCategories.map((category) => {
              const categoryTeams = teams.filter((team) => team.category === category.name)
              if (categoryTeams.length === 0) {
                return null
              }

              return (
                <div key={category.name} className="space-y-4">
                  <div className="flex flex-col justify-between gap-3 text-center md:flex-row md:items-center md:text-left">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-emerald-600">
                        {category.name}
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-gray-900 md:text-2xl">
                        Lag i {category.name.toLowerCase()}
                      </h2>
                    </div>
                    {category.description && (
                      <p className="max-w-sm text-xs text-gray-500 md:text-right">{category.description}</p>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    {categoryTeams.map((team) => (
                      <Card
                        key={team.id}
                        className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
                      >
                        <div className="relative h-32 w-full overflow-hidden bg-gray-200">
                          <div
                            className="h-full w-full transition group-hover:scale-[1.02]"
                            style={{
                              backgroundImage: `url(${team.heroImage})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                            aria-hidden
                          />
                          <Link
                            href={`/lag/${team.id}`}
                            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-emerald-800/85 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100"
                          >
                            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700 shadow">
                              Läs mer →
                            </span>
                          </Link>
                        </div>
                        <div className="px-4 py-4 space-y-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-600">
                            {team.category}
                          </p>
                          <h3 className="text-sm font-semibold tracking-tight text-gray-900">{team.displayName}</h3>
                          {team.link ? (
                            <Link
                              href={team.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-emerald-700"
                            >
                              Till laget.se
                            </Link>
                          ) : (
                            <span className="inline-flex w-full items-center justify-center rounded-full border border-dashed border-gray-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                              Länk kommer snart
                            </span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>

          {/* Render all teams in a single grid, each linking to its lag page */}
          <section className="mt-12">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {teams.map((team) => (
                <Card
                  key={team.id}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
                >
                  <div className="relative h-32 w-full overflow-hidden bg-gray-200">
                    <div
                      className="h-full w-full transition group-hover:scale-[1.02]"
                      style={{
                        backgroundImage: `url(${team.heroImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                      aria-hidden
                    />
                    <Link
                      href={`/lag/${team.id}`}
                      className="pointer-events-none absolute inset-0 flex items-center justify-center bg-emerald-800/85 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100"
                    >
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700 shadow">
                        Läs mer →
                      </span>
                    </Link>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <h3 className="text-sm font-semibold tracking-tight text-gray-900">{team.displayName}</h3>
                    {team.link ? (
                      <Link
                        href={team.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-emerald-700"
                      >
                        Till laget.se
                      </Link>
                    ) : (
                      <span className="inline-flex w-full items-center justify-center rounded-full border border-dashed border-gray-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                        Länk kommer snart
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-16">
            <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 text-gray-700 shadow-lg shadow-emerald-50 md:p-10">
              <h2 className="text-center text-3xl font-bold text-emerald-700">Vanliga frågor om att börja träna</h2>
              <p className="mt-2 text-center text-sm text-gray-500">
                Här hittar du svar på de vanligaste frågorna från nya spelare och vårdnadshavare.
              </p>
              <Accordion type="single" collapsible className="mt-6 w-full">
                {lagContent.faq.map((faqItem, index) => (
                  <AccordionItem key={faqItem.question} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left text-base font-semibold text-gray-900">
                      {faqItem.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-gray-600">
                      {faqItem.answer}
                      {faqItem.question.includes("anmäler") && (
                        <Link href="/kontakt" className="ml-2 text-orange-500 hover:underline">
                          Anmäl dig via kontaktformuläret.
                        </Link>
                      )}
                      {faqItem.question.includes("börjar") && (
                        <Link href="/kontakt" className="ml-2 text-orange-500 hover:underline">
                          Kontakta oss här.
                        </Link>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
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
