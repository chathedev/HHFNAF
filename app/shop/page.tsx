"use client"

import Link from "next/link"
import { ArrowRight, ShoppingBag, ShieldAlert } from "lucide-react"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { SHOP_URL, useShopStatus } from "@/components/shop-status-provider"

export default function ShopPage() {
  const { loading, shopVisible, maintenanceMessage } = useShopStatus()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="h-20" />

        {/* Hero */}
        <section className="bg-slate-950 text-white">
          <div className="mx-auto max-w-3xl px-5 py-16 sm:py-20 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Supporterbutik</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">HHF Butiken</h1>
            <p className="mt-4 text-base text-white/60 max-w-lg mx-auto">
              Matchtröjor, supporterplagg och presenter. Beställ online, hämta lokalt. Betala snabbt med Swish.
            </p>

            {shopVisible && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <Link
                  href={SHOP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 bg-white px-8 py-4 text-base font-bold text-slate-900 transition hover:bg-white/90"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Öppna Butiken
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="flex items-center gap-4 text-sm text-white/40">
                  <span className="flex items-center gap-1.5">
                    <SwishMark className="h-4 w-auto text-emerald-400" />
                    Swish
                  </span>
                  <span>Kort</span>
                  <span>Endast upphämtning</span>
                </div>
              </div>
            )}

            {!shopVisible && (
              <div className="mt-8 mx-auto max-w-md border border-white/10 px-6 py-5 text-left">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-sm font-bold text-white">
                      {loading ? "Kontrollerar status…" : "Butiken är stängd"}
                    </p>
                    <p className="mt-1 text-sm text-white/50">
                      {loading
                        ? "Hämtar aktuell status."
                        : maintenanceMessage || "Tillfälligt stängd för underhåll. Försök igen om en stund."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-3xl px-5 py-16">
          <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
            {[
              { title: "Supporterplagg", text: "Hoodies, t-shirts och accessoarer som gör HHF synligt utanför hallen." },
              { title: "Endast upphämtning", text: "Beställ online och hämta lokalt. Ingen leverans — enkelt och tydligt." },
              { title: "Stöd föreningen", text: "Varje köp hjälper HHF bygga starkare verksamhet runt lagen." },
            ].map((item) => (
              <div key={item.title} className="bg-white p-6">
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Payment strip */}
        <section className="border-t border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-3xl px-5 py-10 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Betalning</p>
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <SwishMark className="h-5 w-auto text-emerald-600" />
                <span className="text-sm font-bold text-slate-900">Swish</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5">Snabbast</span>
              </div>
              <span className="text-sm text-slate-300">|</span>
              <span className="text-sm text-slate-400">Kort</span>
            </div>

            {shopVisible && (
              <Link
                href={SHOP_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Handla nu
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

function SwishMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="15" fontWeight="800" fill="currentColor" letterSpacing="-0.3">
        Swish
      </text>
    </svg>
  )
}
