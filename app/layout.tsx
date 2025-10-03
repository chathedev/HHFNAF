import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ScrollToTop } from "@/components/scroll-to-top"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"),
  title: {
    default: "Härnösands HF – Officiell hemsida för handboll i Härnösand",
    template: "%s | Härnösands HF – Officiell hemsida för handboll i Härnösand",
  },
  description:
    "Härnösands HF – Officiell hemsida för handboll i Härnösand. Matcher, nyheter, lag, ungdomsverksamhet och kontakt.",
  keywords: [
    "Härnösands HF",
    "Härnösands Handbollsförening",
    "HHF",
    "Härnösands",
    "Härnösand handboll",
    "handboll Härnösand",
    "handbollsklubb Härnösand",
    "sport Härnösand",
    "idrottsförening Härnösand",
    "Västernorrland handboll",
    "Ångermanland handboll",
    "Norrland handboll",
    "Öbackahallen",
    "A-lag handboll",
    "herrhandboll",
    "damhandboll",
    "ungdomshandboll",
    "juniorhandboll",
    "P10 handboll",
    "P11 handboll",
    "P12 handboll",
    "P13 handboll",
    "P14 handboll",
    "P15 handboll",
    "P16 handboll",
    "F10 handboll",
    "F11 handboll",
    "F12 handboll",
    "F13 handboll",
    "F14 handboll",
    "F15 handboll",
    "F16 handboll",
    "handbollsmatcher",
    "handbollsträning",
    "handbollslag",
    "handbollsturnering",
    "handbollscup",
    "matcher Härnösand",
    "träningar Härnösand",
    "handbollsevenemang",
    "handbollsresultat",
    "idrottsförening",
    "idrottsklubb",
    "ungdomsidrott",
    "lagsport",
    "bollsport",
    "hallidrott",
    "Svenska handbollsförbundet",
    "handbollsförbundet",
    "svensk handboll",
    "elithandboll",
    "gemenskap",
    "passion",
    "stolthet",
    "laget före allt",
    "tillsammans",
    "handbollsfamilj",
    "ungdomsverksamhet",
    "träning barn",
    "handboll för alla",
    "inkluderande idrott",
    "handbollsserie",
    "handbollsliga",
    "division handboll",
    "slutspel handboll",
    "playoff handboll",
    "cupmatcher",
    "tävlingshandboll",
    "elitserie handboll",
    "regionala serier",
    "handbollshall",
    "idrottshall Härnösand",
    "träningslokal",
    "hemmamatcher",
    "hemmaplan",
  ],
  authors: [{ name: "Härnösands HF", url: "https://www.harnosandshf.se" }],
  creator: "Härnösands HF",
  publisher: "Härnösands HF",
  openGraph: {
    title: "Härnösands HF – Officiell hemsida för handboll i Härnösand",
    description:
      "Härnösands Handbollsförening (HHF) – Härnösands främsta handbollsklubb med stolthet, gemenskap och passion för sporten. A-lag, ungdomslag, träningar och matcher.",
    url: "https://www.harnosandshf.se",
    siteName: "Härnösands HF",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Härnösands HF - Laget Före Allt - Handbollsklubb Härnösand",
      },
    ],
    locale: "sv_SE",
    type: "website",
    countryName: "Sweden",
  },
  twitter: {
    card: "summary_large_image",
    title: "Härnösands HF – Officiell hemsida för handboll i Härnösand",
    description:
      "Härnösands Handbollsförening (HHF) – Härnösands främsta handbollsklubb med stolthet, gemenskap och passion för sporten. A-lag, ungdomslag, träningar och matcher.",
    images: ["/opengraph-image.png"],
    creator: "@HarnosandsHF",
    site: "@HarnosandsHF",
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
  icons: [
    { rel: "icon", url: "/favicon.png", sizes: "any" },
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
  ],
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://harnosandshf.se",
  },
  category: "Sports",
  classification: "Handbollsklubb",
  other: {
    "google-site-verification": "your-google-verification-code",
    "msvalidate.01": "your-bing-verification-code",
    "yandex-verification": "your-yandex-verification-code",
    "geo.region": "SE-Y",
    "geo.placename": "Härnösand",
    "geo.position": "62.6327;17.9378",
    ICBM: "62.6327, 17.9378",
    rating: "general",
    distribution: "global",
    "revisit-after": "1 days",
  },
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#15803d" />
        <meta name="format-detection" content="telephone=no" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "SportsOrganization",
                name: "Härnösands HF",
                alternateName: ["HHF", "Härnösands Handbollsförening"],
                description:
                  "Härnösands Handbollsförening - Härnösands främsta handbollsklubb med A-lag, ungdomslag och träningar för alla åldrar",
                url: "https://www.harnosandshf.se",
                logo: "https://www.harnosandshf.se/logo.png",
                image: "https://www.harnosandshf.se/opengraph-image.png",
                sport: "Handball",
                slogan: "Laget Före Allt",
                foundingDate: "1970",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: "Härnösand",
                  addressRegion: "Västernorrlands län",
                  addressCountry: "SE",
                  postalCode: "871 30",
                },
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: 62.6327,
                  longitude: 17.9378,
                },
                sameAs: [
                  "https://www.facebook.com/harnosandshf",
                  "https://www.instagram.com/harnosandshf",
                  "https://www.profixio.com/app/tournaments?klubbid=26031",
                ],
                memberOf: {
                  "@type": "Organization",
                  name: "Svenska Handbollsförbundet",
                  url: "https://www.handboll.se",
                },
                location: {
                  "@type": "Place",
                  name: "Öbackahallen",
                },
                contactPoint: {
                  "@type": "ContactPoint",
                  email: "kontakt@harnosandshf.se",
                  contactType: "customer service",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "SportsTeam",
                name: "Härnösands HF",
                sport: "Handboll",
                url: "https://harnosandshf.se",
                foundingDate: "2024",
                location: {
                  "@type": "Place",
                  name: "Härnösand, Sverige",
                },
                memberOf: {
                  "@type": "SportsOrganization",
                  name: "Svenska Handbollsförbundet",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "Härnösands HF",
                url: "https://www.harnosandshf.se",
                description: "Officiell webbplats för Härnösands Handbollsförening",
                inLanguage: "sv-SE",
                potentialAction: {
                  "@type": "SearchAction",
                  target: "https://www.harnosandshf.se/search?q={search_term_string}",
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Hem",
                    item: "https://www.harnosandshf.se",
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Lag",
                    item: "https://www.harnosandshf.se/lag",
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: "Nyheter",
                    item: "https://www.harnosandshf.se/nyheter",
                  },
                  {
                    "@type": "ListItem",
                    position: 4,
                    name: "Bli Medlem",
                    item: "https://www.harnosandshf.se/bli-medlem",
                  },
                  {
                    "@type": "ListItem",
                    position: 5,
                    name: "Köp Biljett",
                    item: "https://www.harnosandshf.se/kop-biljett",
                  },
                ],
              },
            ]),
          }}
        />
      </head>
      <body className={`${inter.className} bg-white`}>
        <div style={{ display: "none", visibility: "hidden", position: "absolute", left: "-9999px" }}>
          <h1>Härnösands HF Handbollsförening</h1>
          <p>
            Härnösands HF är Härnösands främsta handbollsklubb med A-lag herr, A-lag dam och ungdomslag för alla åldrar.
            Vi tränar i Öbackahallen och spelar matcher i svenska handbollsserier.
          </p>
          <span>
            handboll härnösand, härnösands hf, hhf, handbollsklubb, a-lag handboll, ungdomshandboll, träning, matcher,
            västernorrland, ångermanland, öbackahallen, laget före allt
          </span>
        </div>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ScrollToTop />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
