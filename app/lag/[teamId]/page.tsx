import { notFound } from "next/navigation"

import { getClubTeams } from "@/lib/club-teams"
import TeamPageClient from "./team-page-client"

// Follows laget.se like /lag: new or renamed teams get a page without a release. Ids from
// earlier seasons are 308-redirected in proxy.ts before rendering starts.

type TeamPageProps = {
  params: Promise<{ teamId: string }>
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params
  const team = (await getClubTeams()).find((item) => item.id === teamId)
  if (!team) notFound()
  return <TeamPageClient team={team} />
}
