import type React from "react"
import type { Metadata } from "next"

import kontaktContent from "@/content/kontakt.json"
import { buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Kontakt",
  description:
    kontaktContent.pageDescription ||
    "Kontakta Härnösands HF för frågor om handboll, lag, provträning, sponsring och föreningen.",
  path: "/kontakt",
  keywords: ["kontakt Härnösands HF", "Härnösands handboll kontakt", "provträning handboll Härnösand"],
})

export default function KontaktLayout({ children }: { children: React.ReactNode }) {
  return children
}
