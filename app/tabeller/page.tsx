export const dynamic = "force-dynamic"

import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { TabellerClient } from "./tabeller-client"

const API_BASE_URL = process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "") || "https://api.harnosandshf.se"

async function getStandings() {
  try {
    const res = await fetch(`${API_BASE_URL}/matcher/standings`, {
      cache: "no-store",
      next: { revalidate: 0 },
    })
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}

export default async function TabellerPage() {
  const data = await getStandings()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_32%,#f8fafc_100%)]">
        <div className="h-24" />
        <TabellerClient initialData={data} />
      </main>
      <Footer />
    </>
  )
}
