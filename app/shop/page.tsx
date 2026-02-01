"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import Footer from "@/components/footer"

const placeholderItems = [
  {
    title: "Matchtröjor",
    description: "Senaste HHF-stilen, redo för både match och vardag.",
  },
  {
    title: "Halsdukar & mössor",
    description: "Stöd laget med värmande accessoarer under kalla kvällar.",
  },
  {
    title: "Retro & collector",
    description: "Limited edition-plagg för riktiga hängivna supportrar.",
  },
]

export default function ShopPage() {
  return (
    <>
      <Header />
      <main className="bg-white">
        <div className="h-24" />
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-emerald-600">Shop</p>
            <h1 className="text-4xl font-black text-gray-900 sm:text-5xl">Härnösands HF Merch</h1>
            <p className="text-lg text-gray-600">
              Vi bygger just nu en ny merch-shop med matchkläder, halsdukar och supporterprylar.
              Under tiden hittar du ett första sortiment på <span className="font-semibold text-gray-900">shop.harnosandshf.se</span> – vi öppnar den officiella webbutiken snart!
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="https://shop.harnosandshf.se"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-emerald-500"
              >
                Gå till externa butiken
              </Link>
              <span className="text-xs uppercase tracking-[0.4em] text-gray-400">placeholder</span>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {placeholderItems.map((item) => (
              <article key={item.title} className="rounded-[24px] border border-gray-100 bg-gradient-to-br from-white via-slate-50 to-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                <p className="mt-3 text-sm text-gray-600">{item.description}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" /> Kommer snart
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-[32px] border border-dashed border-gray-200 bg-white/60 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-400">Merch</p>
            <p className="mt-3 text-base text-gray-600">
              Samla på dig supporterprylar, presentkort och exklusiva releases. Vi släpper information här på hemsidan och via våra sociala kanaler så fort vi har mer att visa.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
