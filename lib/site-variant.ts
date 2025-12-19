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
