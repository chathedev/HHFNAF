import Link from "next/link"
import { Header } from "@/components/header"
import { Home, Ticket, Instagram, ExternalLink } from "lucide-react"

export default function LinksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-green-50 to-orange-50 py-16">
        <div className="container mx-auto px-4 max-w-md">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-green-700 mb-4">Snabblänkar</h1>
            <p className="text-gray-600">Hitta snabbt till våra viktigaste sidor</p>
          </div>

          <div className="space-y-6">
            {/* Homepage Link */}
            <Link href="https://harnosandshf.se" className="block w-full">
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-100 p-3 rounded-full">
                      <Home className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-green-600">Hemsida</h3>
                      <p className="text-gray-600 text-sm">Besök vår huvudsida</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </Link>

            {/* Tickets Link */}
            <Link
              href="https://clubs.clubmate.se/harnosandshf/overview/"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500 hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-orange-100 p-3 rounded-full">
                      <Ticket className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-orange-600">Köp Biljetter</h3>
                      <p className="text-gray-600 text-sm">Biljetter till matcher</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </Link>

            {/* Instagram Link */}
            <Link
              href="https://instagram.com/harnosandshf"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-pink-500 hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-pink-100 p-3 rounded-full">
                      <Instagram className="w-6 h-6 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-pink-600">Instagram</h3>
                      <p className="text-gray-600 text-sm">@harnosandshf</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
      {/* Removed Footer component */}
    </div>
  )
}
