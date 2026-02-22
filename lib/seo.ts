import type { Metadata } from "next"

export const SITE_URL = "https://www.harnosandshf.se"
export const SITE_NAME = "Härnösands HF"
export const SITE_LOCALE = "sv_SE"

export const SOCIAL_LINKS = [
  "https://www.facebook.com/harnosandshf/",
  "https://www.instagram.com/harnosandshf/",
] as const

export const DEFAULT_DESCRIPTION =
  "Härnösands HF:s officiella hemsida med matcher, lag, biljetter och kontakt för handboll i Härnösand."

export const DEFAULT_KEYWORDS = [
  "Härnösands HF",
  "Härnösands handbollsförening",
  "handboll Härnösand",
  "matcher Härnösand",
  "Öbackahallen",
] as const

const OG_IMAGE = "/opengraph-image"

const toTitleText = (title?: string) => (title && title.trim().length > 0 ? title.trim() : undefined)

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString()
}

export function buildCanonical(path: string) {
  return path.startsWith("http") ? path : absoluteUrl(path)
}

type PageMetadataInput = {
  title?: string
  description?: string
  path: string
  keywords?: string[]
  noIndex?: boolean
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const description = input.description?.trim() || DEFAULT_DESCRIPTION
  const title = toTitleText(input.title)
  const canonical = buildCanonical(input.path)
  const keywords = input.keywords?.length ? input.keywords : [...DEFAULT_KEYWORDS]

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title: title ? `${title} | ${SITE_NAME}` : SITE_NAME,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: "website",
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} handboll i Härnösand`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: title ? `${title} | ${SITE_NAME}` : SITE_NAME,
      description,
      images: [OG_IMAGE],
    },
    robots: input.noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  }
}

export function getVerificationMetadata() {
  const google = process.env.GOOGLE_SITE_VERIFICATION || process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  if (!google) {
    return undefined
  }

  return {
    other: {
      "google-site-verification": google,
    },
  } satisfies Pick<Metadata, "other">
}

export function buildOrganizationJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      alternateName: "Härnösands Handbollsförening",
      url: SITE_URL,
      logo: absoluteUrl("/logo.png"),
      address: {
        "@type": "PostalAddress",
        addressLocality: "Härnösand",
        addressCountry: "SE",
      },
      sameAs: [...SOCIAL_LINKS],
    },
    {
      "@context": "https://schema.org",
      "@type": "SportsTeam",
      name: SITE_NAME,
      url: SITE_URL,
      sport: "Handball",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Härnösand",
        addressCountry: "SE",
      },
      sameAs: [...SOCIAL_LINKS],
    },
  ]
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "sv-SE",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/sok?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }
}

type BreadcrumbItem = {
  name: string
  path: string
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildCanonical(item.path),
    })),
  }
}

export type SeoMatchEvent = {
  name: string
  startDate: string
  locationName?: string
  homeTeam?: string
  awayTeam?: string
  url?: string
}

export function buildSportsEventJsonLd(events: SeoMatchEvent[]) {
  return events
    .filter((event) => Boolean(event.name && event.startDate))
    .map((event) => ({
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: event.name,
      startDate: event.startDate,
      eventStatus: "https://schema.org/EventScheduled",
      sport: "Handball",
      url: event.url ? buildCanonical(event.url) : undefined,
      location: event.locationName
        ? {
            "@type": "Place",
            name: event.locationName,
            address: {
              "@type": "PostalAddress",
              addressLocality: "Härnösand",
              addressCountry: "SE",
            },
          }
        : undefined,
      homeTeam: event.homeTeam
        ? {
            "@type": "SportsTeam",
            name: event.homeTeam,
          }
        : undefined,
      awayTeam: event.awayTeam
        ? {
            "@type": "SportsTeam",
            name: event.awayTeam,
          }
        : undefined,
      organizer: {
        "@type": "SportsTeam",
        name: SITE_NAME,
        url: SITE_URL,
      },
    }))
}
