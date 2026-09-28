import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { TRACKING_STAGING } from "@/lib/tracking-release"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { AnalysisList } from "./analysis-list"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Matchanalys",
  robots: { index: false, follow: false },
}

export default function AnalysPage() {
  // the analysis pages are the club's review tool: staging only (released analyses
  // are shown on their own match on the public site)
  if (!TRACKING_STAGING) notFound()
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-24">
        <h1 className="text-2xl font-bold text-slate-900">Matchanalys</h1>
        <p className="mt-1 text-sm text-slate-500">Spelarnas positioner i 2D, live och i efterhand. Bara i staging.</p>
        <AnalysisList />
      </main>
      <Footer />
    </>
  )
}
