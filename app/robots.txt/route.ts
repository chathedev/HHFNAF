import { NextResponse } from "next/server"

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"

  const robotsTxt = `User-agent: *
Allow: /
Allow: /nyheter
Allow: /lag
Allow: /kontakt
Allow: /matcher
Allow: /kalender
Allow: /partners

# Block editor and admin areas
Disallow: /editor
Disallow: /api/
Disallow: /login

# Allow search engines to crawl images and CSS
Allow: /*.css$
Allow: /*.js$
Allow: /*.png$
Allow: /*.jpg$
Allow: /*.jpeg$
Allow: /*.gif$
Allow: /*.svg$
Allow: /*.webp$

# Crawl delay
Crawl-delay: 1

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Additional sitemaps (if needed in future)
# Sitemap: ${baseUrl}/sitemap-news.xml
# Sitemap: ${baseUrl}/sitemap-images.xml`

  return new NextResponse(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
    },
  })
}
