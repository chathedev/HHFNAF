import { promises as fs } from "fs"
import path from "path"
import type { Metadata } from "next"

import { BILDVAL_KEY, listPhotos } from "@/lib/bildval"
import { BildvalClient, type SitePhoto } from "./bildval-client"

// Hidden photo picker. Open (no login) but unlisted: not linked, not in the sitemap, noindex.
export const metadata: Metadata = {
  title: "Bildval · Härnösands HF",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export const dynamic = "force-dynamic"

async function sitePhotos(): Promise<SitePhoto[]> {
  const out: SitePhoto[] = [
    { code: "S1", where: "Startsidan", label: "Stora bilden, dator", src: "/heropic.webp" },
    { code: "S2", where: "Startsidan", label: "Stora bilden, mobil", src: "/heropic-mobile.webp" },
  ]
  try {
    const home = JSON.parse(await fs.readFile(path.join(process.cwd(), "public/content/home.json"), "utf8"))
    if (home?.aboutClub?.imageSrc) out.push({ code: "S3", where: "Startsidan", label: "Om klubben", src: home.aboutClub.imageSrc })
  } catch {
    // content file missing: skip
  }
  return out
}

export default async function BildvalPage() {
  const [photos, site] = await Promise.all([listPhotos(), sitePhotos()])
  return <BildvalClient uploadKey={BILDVAL_KEY} photos={photos} site={site} />
}
