import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { TRACKING_STAGING } from "@/lib/tracking-release"
import Link from "next/link"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { TrackingCourt2D } from "@/components/tracking-court-2d"
import { AnalysisCountdown } from "@/components/analysis-countdown"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Matchanalys",
  robots: { index: false, follow: false },
}

export default async function AnalysMatchPage({ params }: { params: Promise<{ id: string }> }) {
  if (!TRACKING_STAGING) notFound()   // staging review tool; the public site shows released analyses on the match
  const { id } = await params
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24">
        <Link href="/analys" className="text-sm font-semibold text-emerald-700 hover:underline">
          Alla analyser
        </Link>
        <div className="mt-3">
          <AnalysisCountdown id={id} />
        </div>
        <div className="mt-3">
          <TrackingCourt2D id={id} />
        </div>
      </main>
      <Footer />
    </>
  )
}
