import lagContent from "@/public/content/lag.json"

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
    heroImage: team.heroImage || "/placeholder.jpg",
    heroImageAlt: team.heroImageAlt || `Lagbild ${team.name}`,
  }))
)

export function generateStaticParams() {
  return teams.map((team) => ({ teamId: team.id }))
}

export function generateMetadata({ params }: { params: { teamId: string } }) {
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
