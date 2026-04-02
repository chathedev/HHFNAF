import type React from "react"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { Inter, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ScrollToTop } from "@/components/scroll-to-top"
import { VisitBeacon } from "@/components/visit-beacon"
import { ShopStatusProvider } from "@/components/shop-status-provider"
import { deriveSiteVariant, getThemeVariant } from "@/lib/site-variant"

const inter = Inter({ subsets: ["latin"], display: "swap" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" })

export async function generateMetadata(): Promise<Metadata> {
  let host: string
  try {
    const requestHeaders = await headers()
    host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "www.harnosandshf.se"
  } catch {
    host = "www.harnosandshf.se"
  }

  const isFinal4 = deriveSiteVariant(host) === "final4"

  if (isFinal4) {
    return {
      metadataBase: new URL("https://final4.harnosandshf.se"),
      title: "Final4 Norr 2026 — Härnösands HF",
      description: "Final4 Norr handbollturnering 11–12 april 2026 i Härnösand. F14, P14, F16, P16 — alla matcher och live-resultat.",
      keywords: ["Final4 Norr", "handboll", "Härnösand", "F14", "P14", "F16", "P16", "turnering", "Härnösands HF"],
      openGraph: {
        title: "Final4 Norr 2026",
        description: "Final4 Norr — 11–12 april 2026 i Härnösand. Alla matcher, live-resultat och lag.",
        url: "https://final4.harnosandshf.se",
        siteName: "Final4 Norr — Härnösands HF",
        images: [
          {
            url: "/final4-hero.webp",
            width: 1200,
            height: 630,
            alt: "Final4 Norr 2026",
          },
        ],
        locale: "sv_SE",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Final4 Norr 2026",
        description: "Final4 Norr — 11–12 april 2026 i Härnösand. Alla matcher och live-resultat.",
        images: ["/final4-hero.webp"],
      },
      robots: { index: true, follow: true },
      icons: [
        { rel: "icon", url: "/logo.png", sizes: "any" },
        { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
      ],
      alternates: { canonical: "https://final4.harnosandshf.se" },
    }
  }

  return {
    metadataBase: new URL("https://www.harnosandshf.se"),
    title: {
      default: "Härnösands HF – Officiell hemsida för handboll i Härnösand",
      template: "%s | Härnösands HF – Officiell hemsida för handboll i Härnösand",
    },
    description:
      "Härnösands HF – Officiell hemsida för handboll i Härnösand. Matcher, lag, ungdomsverksamhet och kontakt.",
    keywords: [
      "Härnösands HF", "Härnösands Handbollsförening", "HHF", "Härnösands",
      "Härnösand handboll", "handboll Härnösand", "handbollsklubb Härnösand",
      "sport Härnösand", "idrottsförening Härnösand", "Västernorrland handboll",
      "Ångermanland handboll", "Norrland handboll", "Öbackahallen",
      "A-lag handboll", "herrhandboll", "damhandboll", "ungdomshandboll",
      "juniorhandboll", "handbollsmatcher", "handbollsturnering",
      "handbollscup", "matcher Härnösand", "handbollsresultat",
      "svensk handboll", "elithandboll", "laget före allt",
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
        index: true, follow: true,
        "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1,
      },
    },
    icons: [
      { rel: "icon", url: "/logo.png", sizes: "any" },
      { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
    ],
    manifest: "/manifest.json",
    alternates: { canonical: "https://www.harnosandshf.se" },
    category: "Sports",
    classification: "Handbollsklubb",
    other: {
      "geo.region": "SE-Y", "geo.placename": "Härnösand",
      "geo.position": "62.6327;17.9378", ICBM: "62.6327, 17.9378",
      rating: "general", distribution: "global", "revisit-after": "1 days",
    },
    generator: "v0.dev",
  }
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
  const isFinal4 = siteVariant === "final4"
  const themeColor = isFinal4 ? "#1d4ed8" : themeVariant === "pink" ? "#db2777" : "#15803d"

  return (
    <html lang="sv" suppressHydrationWarning data-site-variant={siteVariant}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={themeColor} />
        <meta name="format-detection" content="telephone=no" />
        <link rel="preconnect" href="https://api.harnosandshf.se" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.harnosandshf.se" />
      </head>
      <body className={`${inter.className} ${spaceGrotesk.className} bg-white ${themeVariant === "pink" ? "hhf-staging" : ""}`}>
        {isFinal4 ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            name: "Final4 Norr 2026",
            description: "Final4 Norr — Handbollturnering 6-12 april 2026",
            startDate: "2026-04-06",
            endDate: "2026-04-12",
            location: { "@type": "Place", name: "Härnösand", address: { "@type": "PostalAddress", addressLocality: "Härnösand", addressCountry: "SE" } },
            organizer: { "@type": "SportsOrganization", name: "Härnösands HF", url: "https://www.harnosandshf.se" },
            sport: "Handball",
            url: "https://final4.harnosandshf.se",
            inLanguage: "sv-SE",
          }) }} />
        ) : (
          <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SportsOrganization",
              name: "Härnösands HF",
              alternateName: ["HHF", "Härnösands Handbollsförening"],
              description: "Härnösands Handbollsförening - Härnösands främsta handbollsklubb med A-lag, ungdomslag och träningar för alla åldrar",
              url: "https://www.harnosandshf.se",
              logo: "https://www.harnosandshf.se/logo.png",
              image: "https://www.harnosandshf.se/opengraph-image.png",
              sport: "Handball",
              slogan: "Laget Före Allt",
              foundingDate: "1970",
              address: { "@type": "PostalAddress", addressLocality: "Härnösand", addressRegion: "Västernorrlands län", addressCountry: "SE", postalCode: "871 30" },
              geo: { "@type": "GeoCoordinates", latitude: 62.6327, longitude: 17.9378 },
              sameAs: ["https://www.facebook.com/harnosandshf", "https://www.instagram.com/harnosandshf"],
              memberOf: { "@type": "Organization", name: "Svenska Handbollsförbundet", url: "https://www.handboll.se" },
              location: { "@type": "Place", name: "Öbackahallen" },
              contactPoint: { "@type": "ContactPoint", email: "kontakt@harnosandshf.se", contactType: "customer service" },
            }) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SportsTeam",
              name: "Härnösands HF",
              sport: "Handboll",
              url: "https://www.harnosandshf.se",
              foundingDate: "1970",
              location: { "@type": "Place", name: "Härnösand, Sverige" },
              memberOf: { "@type": "SportsOrganization", name: "Svenska Handbollsförbundet" },
            }) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Härnösands HF",
              url: "https://www.harnosandshf.se",
              description: "Officiell webbplats för Härnösands Handbollsförening",
              inLanguage: "sv-SE",
            }) }} />
          </>
        )}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ShopStatusProvider>
            <ScrollToTop />
            <VisitBeacon />
            {children}
          </ShopStatusProvider>
        </ThemeProvider>
        {/* Clean up Next.js streaming SSR duplicate DOM.
            The streaming SSR places page content in a hidden div (S:0) that gets
            swapped in by $RC. We use MutationObserver to catch it the moment it
            appears and empty it immediately after $RC moves its children out. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var cleaned=false;
            function cleanup(){
              if(cleaned)return;
              document.querySelectorAll('div[hidden]').forEach(function(el){
                if(el.querySelector('header,footer,main,nav')){
                  el.innerHTML='';
                  el.setAttribute('aria-hidden','true');
                }
              });
              cleaned=true;
            }
            var mo=new MutationObserver(function(){cleanup()});
            mo.observe(document.body,{childList:true,subtree:true});
            document.addEventListener('DOMContentLoaded',function(){cleanup();mo.disconnect()});
          })();
        `}} />
      </body>
    </html>
  )
}
