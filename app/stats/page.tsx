import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { StatsPageClient } from "./page-client"

export const metadata = {
  title: "Statistik — Härnösands HF",
  description:
    "Spelarstatistik för alla Härnösands HF-lag: mål, utvisningar, 7-meter och matchhistorik. Topplistor, lagöversikt och hela truppen — uppdaterat efter varje match.",
}

export const revalidate = 60

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-20">
        <StatsPageClient />
      </main>
      <Footer />
    </div>
  )
}
