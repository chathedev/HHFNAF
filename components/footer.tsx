"use client"

import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import { SHOP_URL, useShopStatus } from "@/components/shop-status-provider"

export default function Footer() {
  const { shopVisible: shopVisibleRaw } = useShopStatus()
  const isFinal4 = typeof window !== "undefined" && window.location.hostname === "final4.harnosandshf.se"
  const shopVisible = shopVisibleRaw && !isFinal4

  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        {/* Supporterbutik banner */}
        {shopVisible && (
          <div className="mb-12 border border-white/10 px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Supporterbutik</p>
              <p className="mt-1 text-base font-bold text-white">Beställ via webbutiken, hämta lokalt.</p>
              <p className="mt-1 text-sm text-white/50">Matchtröjor, supporterplagg och presenter.</p>
            </div>
            <Link
              href={SHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-900 transition hover:bg-white/90 shrink-0"
            >
              <ShoppingBag className="h-4 w-4" />
              Öppna Butiken
            </Link>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Club */}
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Härnösands HF" className="h-10 w-10 object-contain" />
              <p className="text-lg font-black tracking-tight">Härnösands HF</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/40">
              En förening för alla som älskar handboll i Härnösand.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Navigation</p>
            <ul className="mt-3 space-y-2">
              {!isFinal4 && (
                <li>
                  <a
                    href="https://clubs.clubmate.se/harnosandshf/overview/"
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    Köp biljett
                  </a>
                </li>
              )}
              {shopVisible && (
                <li>
                  <a
                    href={SHOP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    Butik
                  </a>
                </li>
              )}
              <li>
                <Link href="/lag" className="text-sm text-white/70 transition hover:text-white">Våra Lag</Link>
              </li>
              <li>
                <Link href="/matcher" className="text-sm text-white/70 transition hover:text-white">Matcher</Link>
              </li>
              <li>
                <Link href="/kontakt" className="text-sm text-white/70 transition hover:text-white">Kontakt</Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Kontakt</p>
            <div className="mt-3 space-y-2">
              <a
                href="mailto:kontakt@harnosandshf.se"
                className="block text-sm text-white/70 transition hover:text-white"
              >
                kontakt@harnosandshf.se
              </a>
              <p className="text-sm text-white/40">Härnösand, Sverige</p>
            </div>
          </div>

          {/* Feedback */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Feedback</p>
            <p className="mt-3 text-sm text-white/40">Har du förslag eller idéer för hemsidan?</p>
            <a
              href="mailto:styrelsen@harnosandshf.se"
              className="mt-2 block text-sm text-white/70 transition hover:text-white"
            >
              styrelsen@harnosandshf.se
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <div>
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} Härnösands HF · 888000-3713
            </p>
          </div>
          <a
            href="https://wby.se"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/25 transition group-hover:text-white/50">
              Byggd av
            </span>
            <span className="text-sm font-bold text-white/50 transition group-hover:text-white">
              Websites By You
            </span>
          </a>
        </div>
      </div>
    </footer>
  )
}
