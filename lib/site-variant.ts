export type SiteVariant = "production" | "staging" | "development" | "final4"

const STAGING_HOSTS = ["hhf.wby.se"]
const PRODUCTION_HOSTS = ["harnosandshf.se", "www.harnosandshf.se"]
const FINAL4_HOSTS = ["final4.harnosandshf.se"]

const normalizeHost = (host?: string | null) => host?.toLowerCase().split(":")[0] ?? ""

export const deriveSiteVariant = (host?: string | null): SiteVariant => {
  const normalizedHost = normalizeHost(host)
  const envOverride = process.env.NEXT_PUBLIC_SITE_VARIANT?.toLowerCase()

  // Final4 host check MUST come before env override — the env is "production"
  // globally but the Final4 subdomain should always resolve to "final4"
  if (normalizedHost && FINAL4_HOSTS.includes(normalizedHost)) {
    return "final4"
  }

  if (envOverride === "staging") return "staging"
  if (envOverride === "production") return "production"
  if (envOverride === "final4") return "final4"

  if (normalizedHost && STAGING_HOSTS.includes(normalizedHost)) {
    return "staging"
  }

  if (normalizedHost && PRODUCTION_HOSTS.includes(normalizedHost)) {
    return "production"
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "staging"
  }

  return process.env.NODE_ENV === "production" ? "production" : "development"
}

export const isStagingVariant = (host?: string | null) => deriveSiteVariant(host) === "staging"

export type ThemeVariant = "pink" | "orange" | "final4"

const MEMORIAL_THEME_END_DATE = new Date("2026-01-18T22:00:00Z")

const isMemorialThemeRequested = () => process.env.NEXT_PUBLIC_MEMORIAL_THEME === "pink"

export const isMemorialThemeActive = (): boolean => {
  if (!isMemorialThemeRequested()) {
    return false
  }
  const now = new Date()
  return now < MEMORIAL_THEME_END_DATE
}

/**
 * Production sites use the pink memorial theme (and hero) when the memorial
 * flag is enabled until 2026-01-18 23:00 CET / 22:00 UTC. Staging and other
 * variants always stay on the standard orange/green look.
 */
const isFinal4Host = (host?: string | null) => FINAL4_HOSTS.includes(normalizeHost(host))
const isStagingHost = (host?: string | null) => STAGING_HOSTS.includes(normalizeHost(host))
const isProductionHost = (host?: string | null) => PRODUCTION_HOSTS.includes(normalizeHost(host))

const isProductionEnvironment = () =>
  process.env.NEXT_PUBLIC_SITE_VARIANT === "production" || process.env.VERCEL_ENV === "production"

export const getThemeVariant = (host?: string | null): ThemeVariant => {
  const siteVariant = deriveSiteVariant(host)

  if (isFinal4Host(host) || siteVariant === "final4") {
    return "final4"
  }

  if (isStagingHost(host) || siteVariant === "staging") {
    return "orange"
  }

  const productionCandidate =
    isProductionHost(host) || (!host && isProductionEnvironment()) || siteVariant === "production"
  if (productionCandidate && isMemorialThemeActive()) {
    return "pink"
  }

  return "orange"
}

export type HeroImages = {
  mobile: string
  desktop: string
}

/**
 * Get hero images based on theme variant
 * Pink theme: Memorial hero images
 * Orange theme: Default hero image
 */
export const getHeroImages = (host?: string | null): HeroImages => {
  const themeVariant = getThemeVariant(host)

  if (themeVariant === "final4") {
    return {
      mobile: "/final4-hero.webp",
      desktop: "/final4-hero.webp"
    }
  }

  if (themeVariant === "pink") {
    return {
      mobile: "/c38715eb-2128-43e0-b80b-48cc95620ffa.webp",
      desktop: "/7ea5a4bb-f938-43ea-b514-783a8fa1b236.webp"
    }
  }

  return {
    mobile: "/heropic-mobile.webp",
    desktop: "/heropic.webp"
  }
}

export const isFinal4Variant = (host?: string | null) => deriveSiteVariant(host) === "final4"
