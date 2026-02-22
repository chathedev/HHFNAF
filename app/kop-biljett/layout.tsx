import type React from "react"
import type { Metadata } from "next"

import { buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Köp biljett",
  description: "Köp biljetter till Härnösands HF:s hemmamatcher via klubbens officiella biljettpartner Clubmate.",
  path: "/kop-biljett",
  keywords: ["Härnösands HF biljetter", "köp biljett handboll Härnösand", "Clubmate HHF"],
})

export default function KopBiljettLayout({ children }: { children: React.ReactNode }) {
  return children
}
