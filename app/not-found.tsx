import Link from "next/link"
import { headers } from "next/headers"
import { Home, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isFinal4Variant } from "@/lib/site-variant"

export default async function NotFound() {
  let host: string
  try {
    const requestHeaders = await headers()
    host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost"
  } catch {
    host = "localhost"
  }

  const isFinal4 = isFinal4Variant(host)

  if (isFinal4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-amber-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-blue-600 mb-4 drop-shadow-lg">404</h1>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Sidan hittades inte</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Denna sida finns inte under Final4 Norr.
            </p>
          </div>

          <div className="space-y-4">
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tillbaka till Final4 Norr
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent"
            >
              <Link href="https://www.harnosandshf.se">
                <Home className="w-4 h-4 mr-2" />
                Gå till harnosandshf.se
              </Link>
            </Button>
          </div>

          <div className="mt-8 text-sm text-gray-500">
            <p className="font-semibold">
              <span className="text-blue-700">FINAL4</span>{" "}
              <span className="text-amber-600">NORR</span>
            </p>
            <p className="mt-1">11 – 12 april 2026</p>
          </div>
        </div>
      </div>
    )
  }

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
