import type React from "react"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { Inter, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { JsonLd } from "@/components/seo/json-ld"
import { ThemeProvider } from "@/components/theme-provider"
import { ScrollToTop } from "@/components/scroll-to-top"
import { VisitBeacon } from "@/components/visit-beacon"
import { deriveSiteVariant, getThemeVariant } from "@/lib/site-variant"
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  SITE_NAME,
  SITE_URL,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  getVerificationMetadata,
} from "@/lib/seo"

const inter = Inter({ subsets: ["latin"], display: "swap" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Härnösands HF",
    template: "%s | Härnösands HF",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [...DEFAULT_KEYWORDS],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Härnösands HF handboll i Härnösand",
      },
    ],
    locale: "sv_SE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: [{ url: "/favicon.png" }],
    apple: [{ url: "/favicon.png" }],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  category: "Sports",
  ...getVerificationMetadata(),
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let host: string
  try {
    const requestHeaders = await headers()
    host =
      requestHeaders.get("x-forwarded-host") ||
      requestHeaders.get("host") ||
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      "localhost:3000"
  } catch (error) {
    // Fallback for static generation or edge cases
    host = process.env.NEXT_PUBLIC_VERCEL_URL || "www.harnosandshf.se"
  }

  const siteVariant = deriveSiteVariant(host)
  const themeVariant = getThemeVariant(host)
  const themeColor = themeVariant === "pink" ? "#db2777" : "#15803d"

  return (
    <html lang="sv" suppressHydrationWarning data-site-variant={siteVariant}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={themeColor} />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={`${inter.className} ${spaceGrotesk.className} bg-white ${themeVariant === "pink" ? "hhf-staging" : ""}`}>
        <JsonLd id="site-organization-jsonld" data={buildOrganizationJsonLd()} />
        <JsonLd id="site-website-jsonld" data={buildWebsiteJsonLd()} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ScrollToTop />
          <VisitBeacon />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
