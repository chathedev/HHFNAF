import type { Metadata } from "next"
import { MatcherPageClient } from "./page-client"
import { Suspense } from "react"
import { JsonLd } from "@/components/seo/json-ld"
import { fetchPublicMatchEvents, guessMatchTeams, parseMatchDateTimeIso } from "@/lib/match-events"
import { buildPageMetadata, buildSportsEventJsonLd } from "@/lib/seo"

// Revalidate data every 60 seconds
export const revalidate = 60

export const metadata: Metadata = buildPageMetadata({
  title: "Matcher",
  description: "Se kommande och aktuella matcher för Härnösands HF, inklusive hemmamatcher och biljettlänkar.",
  path: "/matcher",
  keywords: ["Härnösands HF matcher", "handboll matcher Härnösand", "Öbackahallen matcher"],
})

export default async function MatcherPage() {
  const matches = await fetchPublicMatchEvents(12)
  const eventSchema = buildSportsEventJsonLd(
    matches
      .map((match) => {
        const startDate = parseMatchDateTimeIso(match.date, match.time)
        if (!startDate) {
          return null
        }
        const teams = guessMatchTeams(match)
        return {
          name: match.title,
          startDate,
          locationName: match.location || undefined,
          homeTeam: teams.homeTeam,
          awayTeam: teams.awayTeam,
          url: "/matcher",
        }
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value)),
  )

  return (
    <>
      {eventSchema.length > 0 && <JsonLd id="matches-events-jsonld" data={eventSchema} />}
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <MatcherPageClient />
      </Suspense>
    </>
  )
}
