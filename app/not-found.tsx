import Link from "next/link"
import { Home, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-green-600 mb-4 drop-shadow-lg">404</h1>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Sidan hittades inte</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Tyvärr kunde vi inte hitta sidan du letar efter. Den kanske har flyttats, tagits bort eller så skrev du fel
            adress.
          </p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Tillbaka till startsidan
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full border-green-600 text-green-600 hover:bg-green-50 bg-transparent"
          >
            <Link href="/kontakt">
              <Mail className="w-4 h-4 mr-2" />
              Kontakta oss
            </Link>
          </Button>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p className="font-medium">Härnösands HF - Handboll i Härnösand</p>
          <p className="mt-1">
            LAGET <span className="text-orange-500">FÖRE ALLT</span>
          </p>
        </div>
      </div>
    </div>
  )
}
