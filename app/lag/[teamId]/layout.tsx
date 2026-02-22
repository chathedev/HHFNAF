import type React from "react"
import type { Metadata } from "next"

import lagContent from "@/content/lag.json"
import { JsonLd } from "@/components/seo/json-ld"
import { buildBreadcrumbJsonLd, buildPageMetadata } from "@/lib/seo"

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

const teams = lagContent.teamCategories.flatMap((category) =>
  (category.teams ?? []).map((team) => ({
    id: (typeof (team as { id?: string }).id === "string" && (team as { id?: string }).id?.trim()) || slugify(team.name),
    name: team.name,
    displayName: ((team as { displayName?: string }).displayName || team.name).trim(),
    description: typeof team.description === "string" ? team.description : "",
    category: category.name,
  })),
)

export async function generateMetadata({ params }: { params: Promise<{ teamId: string }> }): Promise<Metadata> {
  const { teamId } = await params
  const team = teams.find((item) => item.id === teamId)
  if (!team) {
    return buildPageMetadata({
      title: "Lag",
      description: "Här hittar du lagen i Härnösands HF.",
      path: `/lag/${teamId}`,
      noIndex: true,
    })
  }

  return buildPageMetadata({
    title: `${team.displayName}`,
    description:
      team.description || `Information om ${team.displayName} i Härnösands HF (${team.category.toLowerCase()}).`,
    path: `/lag/${team.id}`,
    keywords: [team.displayName, `Härnösands HF ${team.displayName}`, "handbollslag Härnösand"],
  })
}

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  const team = teams.find((item) => item.id === teamId)

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Hem", path: "/" },
    { name: "Lag", path: "/lag" },
    { name: team?.displayName || "Lag", path: `/lag/${teamId}` },
  ])

  return (
    <>
      <JsonLd data={breadcrumb} id="team-breadcrumb-jsonld" />
      {children}
    </>
  )
}
