import { NextResponse } from "next/server"

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"

  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/nyheter", priority: "0.9", changefreq: "daily" },
    { url: "/matcher", priority: "0.9", changefreq: "weekly" },
    { url: "/lag", priority: "0.8", changefreq: "monthly" },
    { url: "/kalender", priority: "0.8", changefreq: "weekly" },
    { url: "/kontakt", priority: "0.7", changefreq: "monthly" },
    { url: "/partners", priority: "0.6", changefreq: "monthly" },
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${staticPages
    .map(
      (page) => `
    <url>
      <loc>${baseUrl}${page.url}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>${page.changefreq}</changefreq>
      <priority>${page.priority}</priority>
      <mobile:mobile/>
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
