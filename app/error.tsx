"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Något gick fel</h1>
          <p className="text-gray-600 mb-8">Ett oväntat fel inträffade. Vi ber om ursäkt för besväret.</p>
        </div>

        <div className="space-y-4">
          <Button onClick={reset} className="w-full bg-red-600 hover:bg-red-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Försök igen
          </Button>

          <Button asChild variant="outline" className="w-full bg-transparent">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Tillbaka till startsidan
            </Link>
          </Button>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Härnösands HF - Handboll i Härnösand</p>
        </div>
      </div>
    </div>
  )
}
