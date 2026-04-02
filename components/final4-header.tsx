"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Final4Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 50)
        ticking = false
      })
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { name: "Matcher", href: "#matcher" },
    { name: "Lag", href: "#lag" },
    { name: "harnosandshf.se", href: "https://www.harnosandshf.se" },
  ]

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 text-white shadow-lg transition-[background-color] duration-300 ${
          scrolled ? "bg-[#0f2847]/95 backdrop-blur-sm" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div>
              <div className="font-bold text-lg">
                <span className="text-blue-300">FINAL4</span>{" "}
                <span className="text-amber-400">NORR</span>
              </div>
            </div>
          </Link>

          <Button
            className="md:hidden p-2"
            size="icon"
            variant="ghost"
            aria-label="Meny"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </Button>

          <nav className="hidden md:flex items-center gap-6 ml-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-base font-medium py-2 text-white hover:text-gray-300 transition-colors duration-300 group"
              >
                {link.name}
                <span className="absolute bottom-0 left-0 h-[3px] bg-amber-400 transition-[width] duration-300 ease-out w-0 group-hover:w-full" />
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div
        className={`fixed top-20 left-0 w-full z-40 md:hidden transition-[opacity,transform] duration-300 ease-in-out ${
          isMenuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="bg-[#0f2847]/95 border-t border-white/10 shadow-xl backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-lg font-medium py-3 px-4 rounded-lg text-white hover:text-gray-300 hover:bg-white/5"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
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
