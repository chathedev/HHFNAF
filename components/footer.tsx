"use client"

import Link from "next/link"
import { ArrowUpRight, ShoppingBag } from "lucide-react"
import { SHOP_URL, useShopStatus } from "@/components/shop-status-provider"

export default function Footer() {
  const { shopVisible } = useShopStatus()

  return (
    <footer className="bg-slate-950 text-white">
      {/* Extra bottom room so the floating chat button never covers the last row. */}
      <div className="mx-auto max-w-5xl px-5 pb-28 pt-14 sm:px-8">
        {/* Supporterbutik banner — always shown; link/label depend on live availability */}
        <div className="mb-12 border border-white/10 px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Supporterbutik</p>
            <p className="mt-1 text-base font-bold text-white">Beställ via webbutiken, hämta lokalt.</p>
            <p className="mt-1 text-sm text-white/50">Matchtröjor, supporterplagg och presenter.</p>
          </div>
          {shopVisible ? (
            <Link
              href={SHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-900 transition hover:bg-white/90 shrink-0"
            >
              <ShoppingBag className="h-4 w-4" />
              Öppna Butiken
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex items-center justify-center gap-2 border border-white/15 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white/30 shrink-0 cursor-not-allowed"
            >
              <ShoppingBag className="h-4 w-4" />
              Ej tillgänglig
            </span>
          )}
        </div>

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
              <li>
                {shopVisible ? (
                  <a
                    href={SHOP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    Butik
                  </a>
                ) : (
                  <span aria-disabled="true" className="text-sm text-white/25 cursor-not-allowed">
                    Butik (ej tillgänglig)
                  </span>
                )}
              </li>
              <li>
                <Link href="/lag" className="text-sm text-white/70 transition hover:text-white">Våra Lag</Link>
              </li>
              <li>
                <Link href="/matcher" className="text-sm text-white/70 transition hover:text-white">Matcher</Link>
              </li>
              <li>
                <Link href="/scout" className="text-sm text-white/70 transition hover:text-white">HHF Scout</Link>
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
              href="mailto:kontakt@harnosandshf.se"
              className="mt-2 block text-sm text-white/70 transition hover:text-white"
            >
              kontakt@harnosandshf.se
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold text-white/60">© {new Date().getFullYear()} Härnösands HF</p>
            <p className="mt-1 text-xs text-white/30">Org.nr 888000-3713 · Härnösand</p>
          </div>
          <a
            href="https://www.lyrio.se"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Byggd av Lyrio AB, öppnar lyrio.se"
            className="group flex w-full items-center gap-4 border border-white/10 px-4 py-3 transition hover:border-white/25 hover:bg-white/[0.03] sm:w-auto"
          >
            <img
              src="/lyrio-mark.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain opacity-80 transition duration-300 group-hover:-rotate-6 group-hover:opacity-100"
            />
            <span className="flex min-w-0 flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Byggd av</span>
              <span className="flex items-center gap-1 text-[15px] font-bold leading-tight text-white/85 transition group-hover:text-white">
                Lyrio AB
                <ArrowUpRight className="h-3.5 w-3.5 opacity-40 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </span>
              <span className="text-xs text-white/40">Webb, system och AI från Härnösand</span>
            </span>
          </a>
        </div>
      </div>
    </footer>
  )
}
