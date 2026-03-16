"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, Instagram, Facebook, ShoppingBag } from "lucide-react"
import { usePathname } from "next/navigation"
import { SHOP_URL, useShopStatus } from "@/components/shop-status-provider"

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const { shopVisible } = useShopStatus()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const visiblePaths = ["/", "/lag", "/matcher", "/kontakt", "/kop-biljett", "/shop"]
  if (!visiblePaths.includes(pathname)) return null

  const navLinks = [
    { name: "Hem", href: "/" },
    { name: "Lag", href: "/lag" },
    { name: "Matcher", href: "/matcher" },
    { name: "Biljetter", href: "https://clubs.clubmate.se/harnosandshf/overview/" },
    { name: "Kontakt", href: "/kontakt" },
  ]

  const isHome = pathname === "/"
  const headerBg = isHome
    ? scrolled
      ? "bg-neutral-950/95 backdrop-blur-xl border-b border-white/5"
      : "bg-transparent"
    : "bg-neutral-950/95 backdrop-blur-xl border-b border-white/5"

  return (
    <>
      <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${headerBg}`}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-[72px]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <div className="relative w-10 h-10 sm:w-11 sm:h-11">
                <Image
                  src="/logo.png"
                  alt="Härnösands HF"
                  fill
                  className="object-contain"
                  priority
                  quality={100}
                  sizes="44px"
                />
              </div>
              <span className="text-white font-bold text-sm tracking-tight hidden sm:block">
                Härnösands HF
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                    pathname === link.href
                      ? "text-white bg-white/10"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Desktop right section */}
            <div className="hidden md:flex items-center gap-3">
              {shopVisible && (
                <Link
                  href={SHOP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-emerald-400"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Butik
                </Link>
              )}
              <div className="flex items-center gap-1 ml-1">
                <Link
                  href="https://www.instagram.com/harnosandshf/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </Link>
                <Link
                  href="https://www.facebook.com/harnosandshf/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label="Öppna meny"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={`fixed inset-x-0 top-16 z-40 md:hidden transition-all duration-300 ease-out ${
          isMenuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="bg-neutral-950/98 backdrop-blur-xl border-b border-white/5 shadow-2xl">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col gap-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                    pathname === link.href
                      ? "text-white bg-white/10"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {shopVisible && (
              <Link
                href={SHOP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
                onClick={() => setIsMenuOpen(false)}
              >
                <ShoppingBag className="h-4 w-4" />
                Supporterbutik
              </Link>
            )}

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
              <Link
                href="https://www.instagram.com/harnosandshf/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-xl text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href="https://www.facebook.com/harnosandshf/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-xl text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  )
}

export { Header }
