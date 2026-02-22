import type { MetadataRoute } from "next"
import fs from "fs"
import path from "path"

import lagContent from "@/content/lag.json"
import { SITE_URL } from "@/lib/seo"

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

const getLastModified = (...relativePaths: string[]) => {
  const times = relativePaths
    .map((relativePath) => {
      try {
        return fs.statSync(path.join(process.cwd(), relativePath)).mtime
      } catch {
        return null
      }
    })
    .filter((value): value is Date => value instanceof Date)

  if (times.length === 0) {
    return new Date()
  }

  return new Date(Math.max(...times.map((time) => time.getTime())))
}

export default function sitemap(): MetadataRoute.Sitemap {
  const sharedContentUpdated = getLastModified("content/home.json", "content/matcher.json", "content/kontakt.json")
  const lagUpdated = getLastModified("content/lag.json")

  const coreRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: sharedContentUpdated,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/lag`,
      lastModified: lagUpdated,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/matcher`,
      lastModified: sharedContentUpdated,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/kontakt`,
      lastModified: getLastModified("content/kontakt.json"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/kop-biljett`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/sok`,
      lastModified: sharedContentUpdated,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ]

  const teamRoutes = lagContent.teamCategories.flatMap((category) =>
    (category.teams ?? []).map((team) => {
      const rawId = typeof (team as { id?: string }).id === "string" ? (team as { id?: string }).id?.trim() : ""
      const teamId = rawId || slugify(team.name)
      return {
        url: `${SITE_URL}/lag/${teamId}`,
        lastModified: lagUpdated,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      }
    }),
  )

  return [...coreRoutes, ...teamRoutes]
}
