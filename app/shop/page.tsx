"use client"

import Link from "next/link"
import { ArrowRight, Package, ShieldAlert, ShoppingBag, Store } from "lucide-react"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { SHOP_URL, useShopStatus } from "@/components/shop-status-provider"

const shopHighlights = [
  {
    title: "Supporterplagg",
    description: "Hoodies, t-shirts och accessoarer som gör HHF synligt även utanför hallen.",
  },
  {
    title: "Endast upphämtning",
    description: "Beställ online och hämta upp lokalt. Ingen leverans, tydligt och enkelt.",
  },
  {
    title: "Direkt till föreningen",
    description: "Varje köp hjälper HHF att bygga starkare verksamhet runt lagen och ungdomarna.",
  },
]

export default function ShopPage() {
  const { loading, shopVisible, maintenanceMessage } = useShopStatus()

  return (
    <>
      <Header />
      <main className="bg-white">
        <div className="h-24" />
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white via-emerald-50 to-lime-50 shadow-[0_30px_90px_rgba(15,23,42,0.06)]">
            <div className="grid gap-10 px-6 py-10 md:grid-cols-[1.2fr_0.8fr] md:px-10">
              <div className="space-y-6">
                <p className="text-sm font-semibold uppercase tracking-[0.4em] text-emerald-600">Butik</p>
                <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">Härnösands HF Supporterbutik</h1>
                <p className="text-lg text-gray-600">
                  Köp HHF-produkter på <span className="font-semibold text-gray-900">shop.harnosandshf.se</span>. Shoppen
                  är byggd för snabba köp och lokal upphämtning, så det är enkelt att stötta föreningen utan leveranssteg.
                </p>

                <div className="flex flex-wrap gap-3 text-sm font-medium text-gray-700">
                  <div className="rounded-md border border-emerald-200 bg-white px-4 py-2">Ingen leverans</div>
                  <div className="rounded-md border border-emerald-200 bg-white px-4 py-2">Endast upphämtning</div>
                  <div className="rounded-md border border-emerald-200 bg-white px-4 py-2">Officiella HHF-produkter</div>
                </div>

                {shopVisible && (
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <Link
                      href={SHOP_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-emerald-500"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Öppna Butiken
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <p className="text-sm text-gray-500">Hämtas lokalt efter köp. Leverans erbjuds inte.</p>
                  </div>
                )}

                {!shopVisible && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-left">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
                          {loading ? "Kontrollerar shopstatus" : "Shoppen är stängd"}
                        </p>
                        <p className="mt-2 text-sm text-amber-900">
                          {loading
                            ? "Vi hämtar aktuell status från shopen. Länken visas bara när underhåll är avstängt."
                            : maintenanceMessage || "Shopen är tillfälligt stängd för underhåll. Försök igen om en stund."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-slate-950 p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Varför shop</p>
                <div className="mt-6 space-y-5">
                  <div className="flex items-start gap-3">
                    <Store className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                    <div>
                      <h2 className="font-semibold">Mer försäljning runt matchdag</h2>
                      <p className="mt-1 text-sm text-slate-300">Lägg till produkter i flödet där besökarna redan följer matcher och köper biljetter.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Package className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                    <div>
                      <h2 className="font-semibold">Tydlig logistik</h2>
                      <p className="mt-1 text-sm text-slate-300">Endast upphämtning gör beställningen enkel att förstå direkt på sidan.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {shopHighlights.map((item) => (
              <article key={item.title} className="rounded-lg border border-gray-100 bg-gradient-to-br from-white via-slate-50 to-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                <p className="mt-3 text-sm text-gray-600">{item.description}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" /> HHF Butik
                </div>
              </article>
            ))}
          </div>

          {shopVisible && (
            <div className="mt-12 rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Endast upphämtning</p>
              <p className="mt-3 text-base text-gray-700">
                Beställ i webbutiken och hämta lokalt. Det håller köpresan enkel och gör det tydligt att shop.harnosandshf.se
                inte erbjuder hemleverans.
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
