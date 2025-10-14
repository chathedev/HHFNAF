import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

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
    name: team.name,
    displayName:
      typeof team.displayName === "string" && team.displayName.trim().length > 0
        ? team.displayName
        : team.name,
    category: category.name,
    description: typeof team.description === "string" ? team.description : "",
    link: team.link,
    instagramLink: team.instagramLink,
    heroImage: team.heroImage || PLACEHOLDER_HERO,
    heroImageAlt: team.heroImageAlt || `Lagbild ${team.name}`,
  })),
)

type TeamPageProps = {
  params: { teamId: string }
}

export function generateStaticParams() {
  return teams.map((team) => ({ teamId: team.id }))
}

export function generateMetadata({ params }: TeamPageProps) {
  const team = teams.find((item) => item.id === params.teamId)
  if (!team) {
    return {
      title: "Lag | Härnösands HF",
    }
  }

  return {
    title: `${team.displayName} | Härnösands HF`,
    description: team.description || "Information om laget i Härnösands HF.",
  }
}

export default function TeamPage({ params }: TeamPageProps) {
  const team = teams.find((item) => item.id === params.teamId)
  if (!team) {
    notFound()
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-white">
        <div className="h-24" />
        <div className="min-h-[70vh]">
          <section className="relative h-[55vh] overflow-hidden rounded-b-[2rem] bg-gray-900">
            <Image
              src={team.heroImage}
              alt={team.heroImageAlt}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
            <div className="relative mx-auto flex h-full max-w-5xl flex-col justify-end px-4 pb-16 text-white md:px-6">
              <Link href="/lag" className="w-fit rounded-full border border-white/40 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-white">
                Tillbaka
              </Link>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.4em] text-white/75">
                {team.category}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">
                {team.displayName}
              </h1>
              {team.description && (
                <p className="mt-4 max-w-2xl text-base text-white/85 md:text-lg">{team.description}</p>
              )}
            </div>
          </section>

          <div className="px-4 pb-16 pt-10 md:px-6">
            <div className="mx-auto max-w-5xl space-y-10">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="rounded-xl border border-emerald-100/80 bg-white p-5 text-center shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">
                    Laget.se
                  </p>
                  {team.link ? (
                    <Link
                      href={team.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                    >
                      Öppna laget.se
                    </Link>
                  ) : (
                    <p className="mt-3 text-xs text-gray-500">Länk läggs till snart.</p>
                  )}
                </Card>

                <Card className="rounded-xl border border-emerald-100/70 bg-white p-5 text-center shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">
                    Instagram
                  </p>
                  {team.instagramLink ? (
                    <Link
                      href={team.instagramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                    >
                      Följ laget
                    </Link>
                  ) : (
                    <p className="mt-3 text-xs text-gray-500">Instagram uppdateras snart.</p>
                  )}
                </Card>

                <Card className="rounded-xl border border-orange-200/80 bg-white p-5 text-center shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-600">
                    Kontakt
                  </p>
                  <Link
                    href="/kontakt"
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500"
                  >
                    Kontakta föreningen
                  </Link>
                </Card>
              </div>

              <Card className="overflow-hidden rounded-2xl border border-emerald-100/70 bg-white shadow-lg shadow-emerald-50">
                <div className="relative flex h-[420px] w-full items-center justify-center bg-white md:h-[520px]">
                  <Image
                    src={team.heroImage}
                    alt={team.heroImageAlt}
                    fill
                    className="object-contain"
                    style={{ borderRadius: "inherit", padding: "1.5rem" }}
                    sizes="(min-width: 1024px) 1000px, 100vw"
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
