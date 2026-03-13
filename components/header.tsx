"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, Instagram, Facebook, ShoppingBag } from "lucide-react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SHOP_URL, useShopStatus } from "@/components/shop-status-provider"

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const { shopVisible } = useShopStatus()

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  const visiblePaths = ["/", "/lag", "/matcher", "/kontakt", "/kop-biljett", "/shop"]

  if (!visiblePaths.includes(pathname)) {
    return null
  }

  const navLinks = [
    { name: "Hem", href: "/" },
    { name: "Lag", href: "/lag" },
    { name: "Matcher", href: "/matcher" },
    { name: "Köp biljett", href: "https://clubs.clubmate.se/harnosandshf/overview/" },
    { name: "Kontakt", href: "/kontakt" },
  ]

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 text-white shadow-lg transition-all duration-300
          ${
            pathname === "/"
              ? scrolled
                ? "bg-black/90 backdrop-blur-md"
                : "bg-transparent backdrop-blur-none"
              : "bg-black/90 backdrop-blur-md"
          }
        `}
      >
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-16 h-16">
              <Image
                src="/logo.png"
                alt="Härnösands HF Logo"
                fill
                className="object-contain"
                priority
                quality={100}
                sizes="56px"
              />
            </div>
            <div>
              <div className="font-bold text-lg">Härnösands HF</div>
            </div>
          </Link>

          <Button
            className="md:hidden p-2"
            size="icon"
            variant="ghost"
            aria-label="Toggle navigation menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </Button>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-6 ml-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-base font-medium py-2 group transition-colors duration-300
                  ${pathname === link.href ? "text-orange-500" : "text-white hover:text-gray-300"}
                `}
              >
                {link.name}
                <span
                  className={`absolute bottom-0 left-0 h-[3px] bg-orange-500 transition-all duration-300 ease-out
                    ${pathname === link.href ? "w-full" : "w-0 group-hover:w-full"}
                  `}
                />
              </Link>
            ))}
            {shopVisible && (
              <Link
                href={SHOP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-md border border-emerald-300/25 bg-emerald-400 px-4 py-2 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(74,222,128,0.18)] transition hover:bg-emerald-300"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Butik</span>
                <span className="rounded-sm bg-black/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-black/70">
                  Endast upphämtning
                </span>
              </Link>
            )}
            {/* Social links moved inside this flex container for right alignment */}
            <div className="flex items-center space-x-4">
              <Link href="https://www.instagram.com/harnosandshf/" target="_blank" rel="noopener noreferrer">
                <Instagram className="h-6 w-6 text-gray-400 hover:text-white" />
              </Link>
              <Link href="https://www.facebook.com/harnosandshf/" target="_blank" rel="noopener noreferrer">
                <Facebook className="h-6 w-6 text-gray-400 hover:text-white" />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <div
        className={`fixed top-20 left-0 w-full z-40 md:hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="bg-black/95 backdrop-blur-md border-t border-gray-800 shadow-xl">
          <div className="container mx-auto px-4 py-6">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-lg font-medium py-3 px-4 rounded-lg transition-all duration-200
                    ${
                      pathname === link.href
                        ? "text-orange-500 bg-orange-500/10"
                        : "text-white hover:text-gray-300 hover:bg-white/5"
                    }
                  `}
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
                className="mt-4 flex items-center justify-between rounded-lg border border-emerald-400/20 bg-emerald-400 px-4 py-4 text-black shadow-[0_14px_40px_rgba(74,222,128,0.14)] transition hover:bg-emerald-300"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="flex items-start gap-3">
                  <ShoppingBag className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-black/70">Supporterbutik</div>
                    <div className="text-base font-bold">Handla HHF-produkter</div>
                    <div className="text-sm text-black/70">Endast upphämtning i shop.harnosandshf.se</div>
                  </div>
                </div>
                <span className="text-sm font-semibold">Öppen</span>
              </Link>
            )}

            <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-gray-800">
              <Link href="https://www.instagram.com/harnosandshf/" target="_blank" rel="noopener noreferrer">
                <Instagram className="h-6 w-6 text-gray-400 hover:text-white transition-colors" />
              </Link>
              <Link href="https://www.facebook.com/harnosandshf/" target="_blank" rel="noopener noreferrer">
                <Facebook className="h-6 w-6 text-gray-400 hover:text-white transition-colors" />
              </Link>
            </div>
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

export { Header }
