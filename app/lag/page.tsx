import Link from "next/link"

import lagContent from "@/public/content/lag.json"
import Footer from "@/components/footer"
import { Header } from "@/components/header"
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
    heroImage: team.heroImage || PLACEHOLDER_HERO,
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

          <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  <div className="flex flex-wrap gap-2">
                    {categoryTeams.map((team) => (
                      <Link
                        key={team.id}
                        href={`/lag/${team.id}`}
                        className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold tracking-[0.15em] text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700"
                      >
                        {team.displayName}
                      </Link>
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
