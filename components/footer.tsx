"use client"

import Link from "next/link"
import { Mail, MapPin, ShoppingBag, ArrowUpRight } from "lucide-react"
import { SHOP_URL, useShopStatus } from "@/components/shop-status-provider"

export default function Footer() {
  const { shopVisible } = useShopStatus()

  return (
    <footer className="bg-neutral-950 text-white">
      {/* Shop banner */}
      {shopVisible && (
        <div className="border-b border-white/5">
          <div className="container mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-400 mb-1">Supporterbutik</p>
                <p className="text-lg font-bold text-white">Beställ online, hämta lokalt.</p>
                <p className="text-sm text-neutral-400 mt-1">Matchtröjor, supporterplagg och presenter.</p>
              </div>
              <Link
                href={SHOP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 shrink-0"
              >
                <ShoppingBag className="h-4 w-4" />
                Öppna butiken
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-12">
          {/* Club info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="Härnösands HF" className="w-10 h-10 object-contain" />
              <div>
                <p className="font-bold text-sm">Härnösands HF</p>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">Handbollsförening</p>
              </div>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed mb-3">
              En förening för alla som älskar handboll i Härnösand.
            </p>
            <p className="text-[11px] text-neutral-600">
              Medlem i Svenska Handbollförbundet
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-4">Navigation</h3>
            <ul className="space-y-2.5">
              {[
                { name: "Biljetter", href: "https://clubs.clubmate.se/harnosandshf/overview/" },
                ...(shopVisible ? [{ name: "Butik", href: SHOP_URL }] : []),
                { name: "Våra lag", href: "/lag" },
                { name: "Matcher", href: "/matcher" },
                { name: "Kontakt", href: "/kontakt" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-4">Kontakt</h3>
            <div className="space-y-3">
              <a
                href="mailto:kontakt@harnosandshf.se"
                className="flex items-center gap-2.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4 shrink-0" />
                kontakt@harnosandshf.se
              </a>
              <div className="flex items-center gap-2.5 text-sm text-neutral-500">
                <MapPin className="h-4 w-4 shrink-0" />
                Härnösand, Sverige
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-4">Feedback</h3>
            <p className="text-sm text-neutral-400 leading-relaxed mb-3">
              Förslag eller idéer? Vi uppskattar alla synpunkter.
            </p>
            <a
              href="mailto:styrelsen@harnosandshf.se"
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4 shrink-0" />
              styrelsen@harnosandshf.se
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm text-neutral-500">
                &copy; {new Date().getFullYear()} Härnösands HF. Alla rättigheter förbehållna.
              </p>
              <p className="text-[11px] text-neutral-600 font-medium mt-1">
                HÄRNÖSANDS HANDBOLLSFÖRENING &middot; 888000-3713
              </p>
            </div>

            <a
              href="https://wby.se"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-white/5 hover:border-white/15 transition-all"
            >
              <div>
                <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-neutral-600 group-hover:text-neutral-400 transition-colors">
                  Byggd av
                </p>
                <p className="text-[13px] font-semibold text-neutral-400 group-hover:text-white transition-colors">
                  Websites By You
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
