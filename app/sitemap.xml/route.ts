import { NextResponse } from "next/server"

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"
  const staticPages = ["/", "/nyheter", "/partners", "/lag", "/kontakt", "/kalender", "/matcher"]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map(
      (url) => `
    <url>
      <loc>${baseUrl}${url}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <priority>${url === "/" ? "1.0" : "0.8"}</priority>
    </url>
  `,
    )
    .join("")}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  })
}
