import { apiFetch } from "@/lib/api-client"
import lagContent from "@/public/content/lag.json"
import { CLUB_TEAM_METADATA, type ClubTeamMetadata } from "@/lib/team-display"

// The club's teams, read from the API's live copy of laget.se (GET /teams, rediscovered
// every 30 minutes; the same source the club assistant reads). The fetch is cached for
// TEAMS_REVALIDATE_SECONDS, so a team added or renamed on laget.se shows up on the site
// within minutes and without a release. The static list in team-display.ts is only the
// fallback for when the API cannot be reached.

export const TEAMS_REVALIDATE_SECONDS = 300


const PLACEHOLDER_HERO = "/placeholder.jpg"
const PHOTO_DIR = "/HarnosandsHF/Gruppfoto/Härnösands HF - "

// Group photos are of a birth cohort, so they follow the players from class to class.
const COHORT_PHOTOS: Record<string, string> = {
  F2009: "F2009",
  F2010: "F2010",
  F2011: "F2011",
  F2012: "F2012",
  F2013: "F2013",
  F2014: "F2014",
  F2015: "F2015",
  F2016: "F2016",
  P2010: "P2009-2010",
  P2011: "P2011",
  P2012: "P2012",
  P2013: "P2013",
  P2015: "P2015",
  P2016: "P2016",
  P2017: "P2017",
}

const TEAM_PHOTOS: Record<string, string> = {
  "dam-utv": "Dam",
  "a-lag-herrar": "A-lag Herr",
  "f19-senior": "F19",
}

const COHORT_INSTAGRAM: Record<string, string> = {
  F2012: "https://www.instagram.com/harnosandshff2012/",
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

const encodeAssetPath = (path: string) =>
  path
    .split("/")
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join("/")

// Editable copy (descriptions, Instagram) from the CMS file, keyed by team id.
const contentById = new Map(
  lagContent.teamCategories.flatMap((category) =>
    (Array.isArray(category.teams) ? category.teams : []).map((team) => {
      const rawId = (team as { id?: string }).id?.trim()
      return [rawId || slugify(team.name), team as { description?: string; instagramLink?: string }] as const
    }),
  ),
)

const cohortKeys = (team: ClubTeamMetadata) => {
  const gender = team.name.trim().charAt(0).toUpperCase()
  if (gender !== "F" && gender !== "P") return []
  return (team.birthYears ?? []).map((year) => `${gender}${year}`)
}

const decorate = (team: ClubTeamMetadata): ClubTeamMetadata => {
  const cohorts = cohortKeys(team)
  const photo = TEAM_PHOTOS[team.id] ?? cohorts.map((key) => COHORT_PHOTOS[key]).find(Boolean)
  const content = contentById.get(team.id)
  const instagram =
    content?.instagramLink?.trim() || cohorts.map((key) => COHORT_INSTAGRAM[key]).find(Boolean) || ""
  return {
    ...team,
    description: content?.description?.trim() || team.description || "",
    instagramLink: instagram,
    heroImage: photo ? encodeAssetPath(`${PHOTO_DIR}${photo}.jpg`) : PLACEHOLDER_HERO,
    heroImageAlt: `Lagbild ${team.displayName}`,
  }
}

type ApiTeam = {
  id?: string
  name?: string
  displayName?: string
  category?: string
  birthYears?: number[]
  url?: string
  trainingPattern?: ClubTeamMetadata["trainingPattern"]
  leaders?: ClubTeamMetadata["leaders"]
}

const fromApi = (team: ApiTeam): ClubTeamMetadata | null => {
  if (!team?.id || !team.displayName) return null
  return {
    id: team.id,
    name: team.name || team.displayName,
    displayName: team.displayName,
    category: team.category || "Övrigt",
    birthYears: Array.isArray(team.birthYears) ? team.birthYears.filter(Number.isFinite) : [],
    link: team.url,
    trainingPattern: Array.isArray(team.trainingPattern) ? team.trainingPattern : [],
    leaders: Array.isArray(team.leaders) ? team.leaders : [],
  }
}

// Senior teams first, then youth from oldest to youngest.
const byAge = (a: ClubTeamMetadata, b: ClubTeamMetadata) => {
  const ageA = a.birthYears?.length ? Math.min(...a.birthYears) : 0
  const ageB = b.birthYears?.length ? Math.min(...b.birthYears) : 0
  return ageA - ageB
}

// Page ids must be unique; a second team with the same id gets a numbered one.
const withUniqueIds = (teams: ClubTeamMetadata[]) => {
  const seen = new Map<string, number>()
  return teams.map((team) => {
    const count = (seen.get(team.id) ?? 0) + 1
    seen.set(team.id, count)
    return count === 1 ? team : { ...team, id: `${team.id}-${count}` }
  })
}

// A yearless match label ("F19") belongs to the senior team when one shares the class,
// not to the youth team "F19 (2009)".
const withYearlessOwnership = (teams: ClubTeamMetadata[]) => {
  const classOf = (team: ClubTeamMetadata) => team.name.trim().toLowerCase().replace(/\s+/g, "")
  const seniorClasses = new Set(teams.filter((team) => !team.birthYears?.length).map(classOf))
  return teams.map((team) => ({
    ...team,
    matchesYearlessClass: !team.birthYears?.length || !seniorClasses.has(classOf(team)),
  }))
}

const finish = (teams: ClubTeamMetadata[]) => withYearlessOwnership(withUniqueIds(teams.map(decorate).sort(byAge)))

export async function getClubTeamsWithSource(): Promise<{ teams: ClubTeamMetadata[]; live: boolean }> {
  try {
    const response = await apiFetch(`/teams`, {
      next: { revalidate: TEAMS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok) {
      const body = (await response.json()) as { teams?: ApiTeam[] }
      const teams = (body.teams ?? []).map(fromApi).filter((team): team is ClubTeamMetadata => Boolean(team))
      // A near-empty answer is a backend hiccup, not a club without teams.
      if (teams.length >= 5) return { teams: finish(teams), live: true }
    }
  } catch {
    // Fall through to the static list.
  }
  return { teams: finish(CLUB_TEAM_METADATA), live: false }
}

export async function getClubTeams(): Promise<ClubTeamMetadata[]> {
  return (await getClubTeamsWithSource()).teams
}
