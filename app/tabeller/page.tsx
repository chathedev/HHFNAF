export const dynamic = "force-dynamic"

import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { TabellerClient } from "./tabeller-client"

const API_BASE_URL = process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "") || "https://api.harnosandshf.se"

async function getStandings() {
  try {
    // ?meta=1 also carries the season list, so the season picker is there on first
    // paint instead of popping in after the client's first fetch.
    const res = await fetch(`${API_BASE_URL}/matcher/standings?meta=1`, {
      cache: "no-store",
      next: { revalidate: 0 },
    })
    if (!res.ok) return { standings: {}, seasons: [], season: null, currentSeason: null }
    const payload = await res.json()
    if (payload && typeof payload === "object" && "standings" in payload) {
      return {
        standings: payload.standings ?? {},
        seasons: Array.isArray(payload.seasons) ? payload.seasons : [],
        season: typeof payload.season === "string" ? payload.season : null,
        currentSeason: typeof payload.currentSeason === "string" ? payload.currentSeason : null,
      }
    }
    return { standings: payload ?? {}, seasons: [], season: null, currentSeason: null }
  } catch {
    return { standings: {}, seasons: [], season: null, currentSeason: null }
  }
}

export default async function TabellerPage() {
  const { standings, seasons, season, currentSeason } = await getStandings()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_32%,#f8fafc_100%)]">
        <div className="h-24" />
        <TabellerClient
          initialData={standings}
          initialSeasons={seasons}
          initialSeason={season}
          initialCurrentSeason={currentSeason}
        />
      </main>
      <Footer />
    </>
  )
}
