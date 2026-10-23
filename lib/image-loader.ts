// Short image URLs: /i/<width>/<file> for our own files and /i/<width>/<host code>/<file> for
// the partner and laget.se hosts below, instead of /_next/image?url=https%3A%2F%2F...&w=..&q=..
// next.config.mjs rewrites them back to the Next image optimizer, so the output is the same.
// Anything that does not fit (other hosts, query strings, odd characters) keeps the old URL.

export const IMAGE_HOSTS: Record<string, string> = {
  l1: "az316141.cdn.laget.se",
  l2: "az729104.cdn.laget.se",
  lb: "laget001.blob.core.windows.net",
  ib: "i.ibb.co",
  hc: "highcon.se",
  wl: "westerlinds.nu",
  cf: "d3sjey3kqst1or.cloudfront.net",
  bm: "files.builder.misssite.com",
  us: "images.unsplash.com",
  up: "plus.unsplash.com",
  va: "assets.vercel.com",
  gh: "avatars.githubusercontent.com",
  gg: "lh3.googleusercontent.com",
}

const CODE_OF: Record<string, string> = Object.fromEntries(Object.entries(IMAGE_HOSTS).map(([code, host]) => [host, code]))
const SAFE_PATH = /^[A-Za-z0-9._~\-/]+$/

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  // Next 16 only allows quality 75 unless configured, so every image is served at 75 anyway.
  const fallback = `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`
  if (src.startsWith("data:") || src.startsWith("blob:")) return src
  if (src.startsWith("/") && !src.startsWith("//")) {
    const path = src.slice(1)
    // A local folder named like a host code would be ambiguous: keep the long form there.
    if (!SAFE_PATH.test(path) || path.split("/")[0] in IMAGE_HOSTS || path.startsWith("_next/")) return fallback
    return `/i/${width}/${path}`
  }
  try {
    const url = new URL(src)
    const code = CODE_OF[url.hostname]
    const path = url.pathname.slice(1)
    if (url.protocol !== "https:" || !code || url.search || url.hash || !path || !SAFE_PATH.test(path)) return fallback
    return `/i/${width}/${code}/${path}`
  } catch {
    return fallback
  }
}
