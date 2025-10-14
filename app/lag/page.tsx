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

const teams = lagContent.teamCategories.flatMap((category) =>
  (category.teams ?? []).map((team: RawTeam) => ({
    id: typeof team.id === "string" && team.id.trim().length > 0 ? team.id : slugify(team.name),
    category: category.name,
    displayName:
      typeof team.displayName === "string" && team.displayName.trim().length > 0
        ? team.displayName
        : team.name,
    name: team.name,
    link: team.link,
    heroImage: encodeAssetPath(team.heroImage || PLACEHOLDER_HERO),
    heroImageAlt: team.heroImageAlt || `Lagbild ${team.name}`,
  })),
)

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

          <section className="mt-12">
            <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categoryStats.map((stat) => (
                <Card
                  key={stat.name}
                  className="flex h-full flex-col items-center justify-center rounded-xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-5 text-center shadow-sm"
                >
                  <p className="text-3xl font-bold text-emerald-700">{stat.count}</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{stat.name}</p>
                  {stat.description && <p className="mt-1 text-xs text-gray-500">{stat.description}</p>}
                </Card>
              ))}
              <Card className="flex h-full flex-col items-center justify-center rounded-xl border border-orange-100 bg-gradient-to-br from-white via-white to-orange-50 p-5 text-center shadow-sm">
                <p className="text-3xl font-bold text-orange-500">{totalTeams}</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">Totalt antal lag</p>
                <p className="mt-1 text-xs text-gray-500">Alla lag i föreningen</p>
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
                        <div
                          className="h-32 w-full bg-gray-200 transition group-hover:scale-[1.02]"
                          style={{
                            backgroundImage: `url(${team.heroImage})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                          aria-hidden
                        />
                        <div className="px-4 py-3 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-600">
                            {team.category}
                          </p>
                          <h3 className="text-sm font-semibold tracking-tight text-gray-900">{team.displayName}</h3>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/lag/${team.id}`}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                            >
                              Läs mer
                            </Link>
                            {team.link && (
                              <Link
                                href={team.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500"
                              >
                                Till laget.se
                              </Link>
                            )}
                          </div>
                        </div>
                        <div className="pointer-events-none absolute inset-0 flex items-end justify-end pb-3 pr-4 opacity-0 transition group-hover:opacity-100">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white shadow">
                            Läs mer →
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
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
