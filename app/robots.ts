import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/lag", "/matcher", "/kontakt", "/kop-biljett", "/sok"],
        disallow: ["/admin", "/editor", "/login", "/api/", "/_next/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
