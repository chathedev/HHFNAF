import Link from "next/link"
import { Mail, MapPin, ExternalLink } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
          {/* Club Info - Simplified on mobile */}
          <div className="space-y-3 md:space-y-4 text-center md:text-left">
            <h3 className="text-lg md:text-xl font-bold text-orange-400">Härnösands HF</h3>
            <p className="text-gray-300 text-sm md:text-base hidden md:block">
              Härnösands Handbollsförening - En förening för alla som älskar handboll.
            </p>
            <p className="text-sm text-gray-400 hidden md:block">Härnösands HF – Handboll i Härnösand</p>
          </div>

          <div className="space-y-4 hidden md:block">
            <h3 className="text-xl font-bold text-orange-400">Snabblänkar</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/nyheter" className="text-gray-300 hover:text-white transition-colors">
                  Läs nyheter från Härnösands HF
                </Link>
              </li>
              <li>
                <Link href="/lag" className="text-gray-300 hover:text-white transition-colors">
                  Våra handbollslag i Härnösand
                </Link>
              </li>
              <li>
                <Link href="/kontakt" className="text-gray-300 hover:text-white transition-colors">
                  Kontakta Härnösands HF
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info - Simplified on mobile */}
          <div className="space-y-3 md:space-y-4 text-center md:text-left">
            <h3 className="text-lg md:text-xl font-bold text-orange-400">Kontakt</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-center md:justify-start space-x-2 text-gray-300 text-sm md:text-base">
                <Mail size={16} />
                <span>kontakt@harnosandshf.se</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300 hidden md:flex">
                <MapPin size={16} />
                <span>Härnösand, Sverige</span>
              </div>
              <p className="text-sm text-gray-400 mt-2 hidden md:block">Medlem i Svenska Handbollförbundet</p>
            </div>
          </div>

          <div className="space-y-4 hidden md:block">
            <h3 className="text-xl font-bold text-orange-400">Tips & Idéer</h3>
            <div className="space-y-2">
              <p className="text-gray-300 text-sm">Har du förslag eller idéer för hemsidan?</p>
              <div className="flex items-center space-x-2 text-gray-300">
                <Mail size={16} />
                <a href="mailto:styrelsen@harnosandshf.se" className="hover:text-orange-400 transition-colors">
                  styrelsen@harnosandshf.se
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-6 md:mt-8 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-gray-400 text-sm mb-2">© 2024 Härnösands HF</p>
            <p className="text-gray-500 text-xs hidden md:block">
              Detta är Härnösands HF:s officiella hemsida. Tidigare låg hemsidan på laget.se men från 2025 hittar du all
              information här på harnosandshf.se.
            </p>
          </div>

          {/* WBY Credit - Smaller on mobile */}
          <div className="mt-2 md:mt-0">
            <Link
              href="https://wby.se"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center space-x-1 text-xs md:text-sm transition-all duration-300 hover:scale-105"
            >
              <span className="text-gray-400">Byggd av</span>
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent font-bold group-hover:from-blue-300 group-hover:to-blue-500 transition-all duration-300">
                Websites by you
              </span>
              <ExternalLink
                size={10}
                className="text-blue-400 group-hover:text-blue-300 transition-colors duration-300 md:hidden"
              />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
