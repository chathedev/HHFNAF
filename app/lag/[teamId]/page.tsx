import { notFound, permanentRedirect } from "next/navigation"

import { getClubTeams } from "@/lib/club-teams"
import { resolveLegacyTeamId } from "@/lib/team-display"
import TeamPageClient from "./team-page-client"

// Follows laget.se like /lag: new or renamed teams get a page without a release.
export const revalidate = 300

type TeamPageProps = {
  params: Promise<{ teamId: string }>
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params
  const teams = await getClubTeams()
  const team = teams.find((item) => item.id === teamId)
  if (!team) {
    const current = resolveLegacyTeamId(decodeURIComponent(teamId), teams)
    if (current && current !== teamId) permanentRedirect(`/lag/${current}`)
    notFound()
  }
  return <TeamPageClient team={team} />
}
