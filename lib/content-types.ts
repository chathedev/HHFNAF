/**
 * Central place for all editable-content typings
 * ───────────────────────────────────────────────
 * You can extend these interfaces later from the
 * editor if you need more fields.
 */

/* ----------  HERO  ---------- */
export interface HeroContent {
  imageUrl: string
  title: string
  description: string
  button1Text: string
  button1Link: string
  button2Text: string
  button2Link: string
}

/* ----------  STATS  ---------- */
export interface StatsContent {
  totalTeams: number
  aTeams: number
  youthTeams: number
  yearsHistory: string
}

/* ----------  ABOUT THE CLUB  ---------- */
export interface AboutClubContent {
  title: string
  paragraph1: string
  paragraph2: string
  passionText: string
  developmentText: string
  communityText: string
  button1Text: string
  button1Link: string
  button2Text: string
  button2Link: string
  imageSrc: string
  imageAlt: string
  statNumber: number
  statLabel: string
}

/* ----------  PARTNERS  ---------- */
export interface Partner {
  id: string
  /** Company name or short label shown under the logo */
  alt: string
  /** Public URL (or local path) to the logo */
  src: string
  /** “Diamantpartner”, “Platinapartner”, “Guldpartner”, “Silverpartner”, “Bronspartner” */
  tier: string
  /** Where to send visitors on click (optional) */
  linkUrl?: string
  /** Extra copy shown on partner cards (keep short) */
  benefits: string[]
  /** Should this partner be visible in the homepage carousel? */
  visibleInCarousel: boolean
}

/* ----------  COMPLETE SITE CONTENT  ---------- */
export interface FullContent {
  // Renamed from SiteContent for consistency
  hero: HeroContent
  stats: StatsContent
  aboutClub: AboutClubContent
  partners: Partner[]
  /**
   * Order of the home-page sections –
   * e.g. ["hero","stats","aboutClub","partnersCarousel"]
   */
  sections: string[]
}
