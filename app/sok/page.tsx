import type { Metadata } from "next"

import SearchPageClient from "@/app/sok/search-page-client"
import { buildSearchIndex } from "@/lib/search-index"
import { buildPageMetadata } from "@/lib/seo"

export const revalidate = 300

export const metadata: Metadata = buildPageMetadata({
  title: "Sök",
  description: "Sök bland lag, matcher, biljetter och kontaktuppgifter på Härnösands HF:s hemsida.",
  path: "/sok",
  keywords: ["sök Härnösands HF", "lag", "matcher", "kontakt"],
})

export default async function SokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const rawQuery = params.q
  const initialQuery = typeof rawQuery === "string" ? rawQuery : Array.isArray(rawQuery) ? rawQuery[0] ?? "" : ""
  const docs = await buildSearchIndex()

  return <SearchPageClient docs={docs} initialQuery={initialQuery} />
}
