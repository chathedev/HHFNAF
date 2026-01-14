export type SiteVariant = "production" | "staging" | "development"

const STAGING_HOSTS = ["hhf.wby.se"]
const PRODUCTION_HOSTS = ["harnosandshf.se", "www.harnosandshf.se"]

const normalizeHost = (host?: string | null) => host?.toLowerCase().split(":")[0] ?? ""

export const deriveSiteVariant = (host?: string | null): SiteVariant => {
  const normalizedHost = normalizeHost(host)
  const envOverride = process.env.NEXT_PUBLIC_SITE_VARIANT?.toLowerCase()

  if (envOverride === "staging") return "staging"
  if (envOverride === "production") return "production"

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

/**
 * Check if themes should be swapped (temporary until 2026-01-18 23:00 CET)
 * During swap: production gets pink, staging gets orange
 */
export const shouldSwapThemes = (): boolean => {
  // End date: 2026-01-18 23:00 CET (which is 22:00 UTC)
  const swapEndDate = new Date("2026-01-18T22:00:00Z")
  const now = new Date()
  return now < swapEndDate
}

export type ThemeVariant = "pink" | "orange"

/**
 * Get the theme variant based on site variant and swap status
 * Normal: production = orange, staging = pink
 * Swapped: production = pink, staging = orange
 */
export const getThemeVariant = (host?: string | null): ThemeVariant => {
  const siteVariant = deriveSiteVariant(host)
  const swapped = shouldSwapThemes()

  if (siteVariant === "staging") {
    // Staging normally gets pink, but during swap gets orange
    return swapped ? "orange" : "pink"
  } else {
    // Production normally gets orange, but during swap gets pink
    return swapped ? "pink" : "orange"
  }
}
