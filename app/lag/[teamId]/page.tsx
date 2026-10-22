import { notFound } from "next/navigation"

import { getClubTeams } from "@/lib/club-teams"
import { matchLabelFitsTeam } from "@/lib/team-display"
import { scoutFetch, type OverviewPayload } from "@/lib/scout"
import { TeamPageClientSealed } from "./team-page-client"
import { Seal } from "@/lib/seal-server"

// Follows laget.se like /lag: new or renamed teams get a page without a release. Ids from
// earlier seasons are 308-redirected in proxy.ts before rendering starts.

type TeamPageProps = {
  params: Promise<{ teamId: string }>
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params
  const team = (await getClubTeams()).find((item) => item.id === teamId)
  if (!team) notFound()
  // HHF Scout pages for this team (several when the club fields more than one team in a class).
  let scoutLinks: { slug: string; label: string }[] = []
  try {
    const overview = await scoutFetch<OverviewPayload>("/overview")
    scoutLinks = (overview?.teams ?? [])
      .filter((t) => {
        if (/\(\d{4}/.test(t.teamType)) return matchLabelFitsTeam(t.teamType, team)
        if (t.classKey === "HERR") return /herr/i.test(team.name)
        if (t.classKey === "DAM") return /dam/i.test(team.name)
        return new RegExp(`\\b${t.classKey}\\b`, "i").test(team.name)
      })
      .map((t) => ({ slug: t.slug, label: t.label }))
  } catch {
    scoutLinks = []
  }
  return <Seal as={TeamPageClientSealed} team={team} scoutLinks={scoutLinks} />
}
