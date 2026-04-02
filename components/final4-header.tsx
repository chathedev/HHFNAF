"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Final4Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 bg-[#0a1628]/95 text-white shadow-lg backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link
              href="https://www.harnosandshf.se"
              className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">harnosandshf.se</span>
            </Link>
            <div className="h-5 w-px bg-gray-700" />
            <div>
              <div className="font-bold text-lg tracking-tight">
                <span className="text-blue-400">FINAL4</span>{" "}
                <span className="text-amber-400">NORR</span>
              </div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest -mt-0.5">
                6–12 april 2026
              </div>
            </div>
          </div>

          <Button
            className="md:hidden p-2"
            size="icon"
            variant="ghost"
            aria-label="Meny"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#matcher" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Matcher
            </a>
            <a href="#lag" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Lag
            </a>
            <Link
              href="https://www.harnosandshf.se"
              className="text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors"
            >
              Tillbaka till HHF
            </Link>
          </nav>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={`fixed top-16 left-0 w-full z-40 md:hidden transition-[opacity,transform] duration-300 ease-in-out ${
          isMenuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="bg-[#0a1628]/95 border-t border-gray-800 shadow-xl backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col gap-1">
              <a
                href="#matcher"
                className="text-base font-medium py-3 px-4 rounded-lg text-white hover:bg-white/5"
                onClick={() => setIsMenuOpen(false)}
              >
                Matcher
              </a>
              <a
                href="#lag"
                className="text-base font-medium py-3 px-4 rounded-lg text-white hover:bg-white/5"
                onClick={() => setIsMenuOpen(false)}
              >
                Lag
              </a>
              <Link
                href="https://www.harnosandshf.se"
                className="text-base font-medium py-3 px-4 rounded-lg text-blue-300 hover:bg-white/5"
                onClick={() => setIsMenuOpen(false)}
              >
                Tillbaka till HHF
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  )
}
