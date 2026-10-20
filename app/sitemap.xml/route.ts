import { NextResponse } from "next/server"

import { getClubTeams } from "@/lib/club-teams"

export const revalidate = 3600

export async function GET() {
  const baseUrl = "https://www.harnosandshf.se"

  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/lag", priority: "0.8", changefreq: "weekly" },
    { url: "/matcher", priority: "0.8", changefreq: "daily" },
    { url: "/kontakt", priority: "0.7", changefreq: "monthly" },
    { url: "/tabeller", priority: "0.7", changefreq: "daily" },
    { url: "/scout", priority: "0.7", changefreq: "daily" },
    { url: "/partners", priority: "0.5", changefreq: "monthly" },
    { url: "/links", priority: "0.6", changefreq: "monthly" },
  ]

  // Team pages follow laget.se (see lib/club-teams.ts).
  const teamPages = (await getClubTeams()).map((team) => ({
    url: `/lag/${team.id}`,
    priority: team.category === "Övrigt" ? "0.6" : "0.7",
    changefreq: "weekly",
  }))

  // Combine static and dynamic pages
  const allPages = [...staticPages, ...teamPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${allPages
    .map(
      (page) => `
    <url>
      <loc>${baseUrl}${page.url}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>${page.changefreq}</changefreq>
      <priority>${page.priority}</priority>
    </url>`,
    )
    .join("")}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
