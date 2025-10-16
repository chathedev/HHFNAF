import { NextResponse } from "next/server"

export async function GET() {
  const baseUrl = "https://www.harnosandshf.se"

  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/nyheter", priority: "0.9", changefreq: "daily" },
    { url: "/lag", priority: "0.8", changefreq: "weekly" },
    { url: "/matcher", priority: "0.8", changefreq: "daily" },
    { url: "/kop-biljett", priority: "0.8", changefreq: "daily" },
    { url: "/kontakt", priority: "0.7", changefreq: "monthly" },
    { url: "/links", priority: "0.6", changefreq: "monthly" },
  ]

  // Add team pages
  const teamPages = [
    { url: "/lag/dam-utv", priority: "0.9", changefreq: "weekly" },
    { url: "/lag/a-lag-herrar", priority: "0.9", changefreq: "weekly" },
    { url: "/lag/f19", priority: "0.85", changefreq: "weekly" },
    { url: "/lag/fritids-teknikskola", priority: "0.6", changefreq: "monthly" },
    { url: "/lag/flickor-16-f08-09", priority: "0.8", changefreq: "weekly" },
    { url: "/lag/f-10", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/f-11", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/f-12", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/f-13", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/f-14", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/f-15", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/f-16", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/f-17", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/f-18", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/pojkar-16-p08-09", priority: "0.8", changefreq: "weekly" },
    { url: "/lag/p16-09-10", priority: "0.85", changefreq: "weekly" },
    { url: "/lag/p-11", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/p-12", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/p-13", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/p-14", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/p-15", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/p-16", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/p-17", priority: "0.7", changefreq: "weekly" },
    { url: "/lag/p-18", priority: "0.7", changefreq: "weekly" }
  ];

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
