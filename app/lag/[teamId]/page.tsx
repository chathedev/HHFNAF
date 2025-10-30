"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
import { useEffect, useState } from "react"

import lagContent from "@/public/content/lag.json"
import Footer from "@/components/footer"
import { Card } from "@/components/ui/card"

const PLACEHOLDER_HERO = "/placeholder.jpg"
const TICKET_URL = "https://clubs.clubmate.se/harnosandshf/overview/"

const encodeAssetPath = (path: string) => {
  if (!path) {
    return PLACEHOLDER_HERO
  }
  const segments = path.split("/").map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
  return segments.join("/")
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

const teams = lagContent.teamCategories.flatMap((category) =>
  (category.teams ?? []).map((team) => ({
    id: (team as any).id?.trim() ? (team as any).id : slugify(team.name),
    name: team.name,
    displayName: (team as any).displayName?.trim() ? (team as any).displayName : team.name,
    category: category.name,
    description: typeof team.description === "string" ? team.description : "",
    link: team.link,
    instagramLink: team.instagramLink,
    heroImage: encodeAssetPath(team.heroImage || PLACEHOLDER_HERO),
    heroImageAlt: team.heroImageAlt || `Lagbild ${team.name}`,
  }))
)

type TeamPageProps = {
  params: { teamId: string }
}

export default function TeamPage({ params }: TeamPageProps) {
  const team = teams.find((item) => item.id === params.teamId)
  if (!team) {
    notFound()
  }

  const [matches, setMatches] = useState<any[]>([])
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!team) return;
    let intervalId: NodeJS.Timeout;
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[0-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "")
        .trim();
    const normalizedTeamName = normalize(team.name);
    const normalizedDisplayName = normalize(team.displayName);
    const normalizedTeamType = normalize(team.category);
    async function fetchMatches() {
      try {
        const res = await fetch("https://api.harnosandshf.se/matcher/data");
        const raw = await res.json();
        const data = Array.isArray(raw.current) ? raw.current : Array.isArray(raw) ? raw : [];
        let filtered = data.filter((m: any) => {
          const home = normalize(m.homeTeam ?? "");
          const away = normalize(m.awayTeam ?? "");
          const type = normalize(m.teamType ?? "");
          // Require exact teamType match
          if (type !== normalizedTeamType) return false;
          // Require home or away to match team name or displayName (exact)
          const isHome = home === normalizedTeamName || home === normalizedDisplayName;
          const isAway = away === normalizedTeamName || away === normalizedDisplayName;
          return isHome || isAway;
        });
        // Sort: live first, then upcoming, then finished (but keep finished for 1 hour)
        const now = Date.now();
        filtered = filtered.filter((m: any) => {
          if (m.matchStatus === "finished" && m.finishedAt) {
            const finishedTime = new Date(m.finishedAt).getTime();
            return now - finishedTime < 3600 * 1000; // keep for 1 hour
          }
          return true;
        });
        filtered.sort((a: any, b: any) => {
          if (a.matchStatus === "live" && b.matchStatus !== "live") return -1;
          if (b.matchStatus === "live" && a.matchStatus !== "live") return 1;
          if (a.matchStatus === "upcoming" && b.matchStatus === "finished") return -1;
          if (b.matchStatus === "upcoming" && a.matchStatus === "finished") return 1;
          return new Date(a.startTime || `${a.date}T${a.time}` ).getTime() - new Date(b.startTime || `${b.date}T${b.time}` ).getTime();
        });
        setMatches(filtered.slice(0, 2));
      } catch (e) {
        setMatches([]);
      }
    }
    fetchMatches();
    intervalId = setInterval(fetchMatches, 3000);
    return () => clearInterval(intervalId);
  }, [team?.name, team?.displayName, team?.category])

  const descriptionFallback =
    "Härnösands HF samlar spelare, ledare och supportrar i ett starkt lagbygge. Följ laget via våra kanaler och uppdateringar nedan."

  return (
    <>
      <main className="flex-1 bg-white">

        <section className="relative overflow-hidden rounded-b-[3rem] bg-gradient-to-br from-emerald-600 via-emerald-500 to-orange-400">
          <div className="pointer-events-none absolute -left-36 top-8 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-44 bottom-[-140px] h-80 w-80 rounded-full bg-emerald-900/30 blur-3xl" />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center text-white md:px-6 md:py-24">
            <Link
              href="/lag"
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-600 shadow transition hover:bg-emerald-50"
            >
              Tillbaka till alla lag
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/80">{team.category}</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">{team.displayName}</h1>
            <p className="mt-5 max-w-2xl text-sm text-white/85 md:text-base">
              {team.description && team.description.trim().length > 0
                ? team.description
                : descriptionFallback}
            </p>
          </div>
        </section>

        <div className="px-4 pb-16 pt-12 md:px-6">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="rounded-xl border border-emerald-100/80 bg-white p-5 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Laget.se</p>
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
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Instagram</p>
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
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-600">Kontakt</p>
                <Link
                  href="/kontakt"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500"
                >
                  Kontakta föreningen
                </Link>
              </Card>
            </div>

            {/* Minimalistic matcher button */}
            <div className="mt-8 flex justify-center">
              <a
                href={`/matcher?team=${encodeURIComponent(team.id)}`}
                className="px-4 py-2 rounded bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition"
              >
                {`Visa matcher för ${team.displayName}`}
              </a>
            </div>
            {/* Team photo restored below */}
            <Card className="overflow-hidden rounded-2xl border border-emerald-100/70 bg-white shadow-lg shadow-emerald-50 mt-8">
              <div
                className="h-[420px] w-full rounded-2xl bg-gray-200 md:h-[520px]"
                style={{
                  backgroundImage: `url(${team.heroImage})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
                role="img"
                aria-label={team.heroImageAlt}
              />
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
