"use client"

import Link from "next/link"
import { Mail, MapPin, ShoppingBag } from "lucide-react"
import { SHOP_URL, useShopStatus } from "@/components/shop-status-provider"

export default function Footer() {
  const { shopVisible } = useShopStatus()

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {shopVisible && (
          <div className="mb-10 rounded-xl border border-emerald-400/20 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-400 p-6 text-black shadow-[0_20px_60px_rgba(74,222,128,0.12)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-black/65">Supporterbutik</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">Sälj läktarstöd också utanför matchdag.</h3>
                <p className="mt-3 text-sm text-black/75">
                  Beställ via webbutiken och hämta lokalt. Ingen leverans. Perfekt för matchtröjor,
                  supporterplagg och presenter.
                </p>
              </div>
              <Link
                href={SHOP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white hover:text-black"
              >
                <ShoppingBag className="h-4 w-4" />
                Öppna Butiken
              </Link>
            </div>
          </div>
        )}

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Club Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Härnösands HF Logo" 
                className="w-12 h-12 object-contain"
              />
              <h3 className="text-xl font-bold">Härnösands HF</h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Härnösands Handbollsförening - En förening för alla som älskar handboll i Härnösand.
            </p>
            <p className="text-xs text-gray-500 italic">
              Medlem i Svenska Handbollförbundet
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-400 uppercase tracking-wider">Navigation</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://clubs.clubmate.se/harnosandshf/overview/"
                  className="text-gray-300 hover:text-emerald-400 transition-colors text-sm flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Köp biljett
                </a>
              </li>
              {shopVisible && (
                <li>
                  <a
                    href={SHOP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-emerald-400 transition-colors text-sm flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Butik
                  </a>
                </li>
              )}
              <li>
                <Link href="/lag" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm flex items-center gap-2 group">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Våra Lag
                </Link>
              </li>
              <li>
                <Link href="/matcher" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm flex items-center gap-2 group">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Matcher
                </Link>
              </li>
              <li>
                <Link href="/kontakt" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm flex items-center gap-2 group">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Kontakt
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-400 uppercase tracking-wider">Kontakt</h3>
            <div className="space-y-3">
              <a 
                href="mailto:kontakt@harnosandshf.se"
                className="flex items-start gap-3 text-gray-300 hover:text-emerald-400 transition-colors text-sm group"
              >
                <Mail size={18} className="mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span>kontakt@harnosandshf.se</span>
              </a>
              <div className="flex items-start gap-3 text-gray-400 text-sm">
                <MapPin size={18} className="mt-0.5 flex-shrink-0" />
                <span>Härnösand, Sverige</span>
              </div>
            </div>
          </div>

          {/* Tips & Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-400 uppercase tracking-wider">Feedback</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Har du förslag eller idéer för hemsidan? Vi uppskattar dina synpunkter!
            </p>
            <a 
              href="mailto:styrelsen@harnosandshf.se"
              className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-emerald-400 transition-colors group"
            >
              <Mail size={16} className="group-hover:scale-110 transition-transform" />
              <span>styrelsen@harnosandshf.se</span>
            </a>
          </div>
        </div>

        {/* Bottom Section */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-gray-400 text-sm mb-1">
                © {new Date().getFullYear()} Härnösands HF. Alla rättigheter förbehållna.
              </p>
              <p className="text-gray-600 text-xs">
                Officiell hemsida för Härnösands Handbollsförening
              </p>
              <p className="text-gray-400 text-xs font-semibold mt-1">
                HÄRNÖSANDS HANDBOLLSFÖRENING · 888000-3713
              </p>
            </div>

            {/* Websites By You Badge */}
            <a
              href="https://wby.se"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-4 py-3 bg-black border border-gray-700 rounded-lg hover:bg-white hover:border-black transition-all duration-200"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-medium tracking-[1.5px] uppercase text-gray-400 group-hover:text-gray-600 transition-colors">
                  BYGGD AV
                </span>
                <span className="text-[15px] font-semibold tracking-tight text-white group-hover:text-black transition-colors">
                  Websites By You
                </span>
              </div>
              <svg 
                className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
