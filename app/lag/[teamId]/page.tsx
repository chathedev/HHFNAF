"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
import { useEffect, useState } from "react"

import lagContent from "@/public/content/lag.json"
import Footer from "@/components/footer"
import { Card } from "@/components/ui/card"
import { MatchFeedModal } from "@/components/match-feed-modal"

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
          // Match on teamType or any team name variant
          return (
            home.startsWith(normalizedTeamName) ||
            away.startsWith(normalizedTeamName) ||
            home.startsWith(normalizedDisplayName) ||
            away.startsWith(normalizedDisplayName) ||
            type === normalizedTeamType
          );
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

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">Matcher</p>
                <h2 className="text-2xl font-bold text-emerald-900">{team.displayName}</h2>
                <p className="text-sm text-emerald-700">Vi visar de 2 mest relevanta matcherna för laget, inklusive live-feed.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {matches.length === 0 ? (
                  <div className="text-slate-400 text-center py-8">
                    <svg className="mx-auto mb-2 h-8 w-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="block text-sm">Inga relevanta matcher just nu.</span>
                  </div>
                ) : (
                  matches.map((match, idx) => (
                    <Card key={match.id || idx} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-emerald-400 hover:shadow-lg transition-all group relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${match.matchStatus === "live" ? "bg-red-100 text-red-700 animate-pulse" : match.matchStatus === "finished" ? "bg-gray-100 text-gray-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {match.matchStatus === "live" ? "LIVE" : match.matchStatus === "finished" ? "Avslutad" : "Kommande"}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{match.teamType}</span>
                      </div>
                      <h3 className="text-lg font-bold text-emerald-900 mb-1">{match.homeTeam} <span className="text-gray-400">vs</span> {match.awayTeam}</h3>
                      <p className="text-sm text-gray-600 mb-2">{match.date} {match.time} • {match.venue}</p>
                      {match.result && (
                        <span className="text-2xl font-bold text-gray-900">{match.result}</span>
                      )}
                      <button
                        className="mt-4 rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        onClick={() => { setSelectedMatch(match); setModalOpen(true); }}
                      >
                        Visa live-feed
                      </button>
                    </Card>
                  ))
                )}
              </div>
            </div>

            <Card className="overflow-hidden rounded-2xl border border-emerald-100/70 bg-white shadow-lg shadow-emerald-50">
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
        {selectedMatch && modalOpen && (
          <MatchFeedModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            matchFeed={selectedMatch.feed ?? []}
            homeTeam={selectedMatch.homeTeam}
            awayTeam={selectedMatch.awayTeam}
            finalScore={selectedMatch.finalScore}
            matchStatus={selectedMatch.matchStatus}
            matchId={selectedMatch.id}
            onRefresh={undefined} // If you want live refresh, pass a function to refetch feed
          />
        )}
      </main>
      <Footer />
    </>
  )
}
