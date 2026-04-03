"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { confirmPayment } from "@/lib/lottery-api"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

export default function ConfirmationPage({ params }: { params: Promise<{ matchId: string }> }) {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [tickets, setTickets] = useState<{ id: number; ticket_number: string }[]>([])
  const [matchName, setMatchName] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    async function confirm() {
      const paymentIntentId = searchParams.get("payment_intent")
      const { matchId } = await params
      if (!paymentIntentId) {
        setStatus("error")
        setErrorMsg("Ingen betalningsreferens")
        return
      }
      try {
        const result = await confirmPayment(Number(matchId), paymentIntentId)
        setTickets(result.tickets)
        setMatchName(result.match_name)
        setStatus("success")
      } catch {
        setStatus("error")
        setErrorMsg("Kunde inte bekräfta betalningen")
      }
    }
    confirm()
  }, [searchParams, params])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md mx-auto px-4">
          {status === "loading" && (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-slate-600">Bekräftar din betalning...</p>
            </div>
          )}

          {status === "success" && (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-slate-900 mb-1">Tack för ditt köp!</h1>
              {matchName && <p className="text-sm text-slate-500 mb-4">{matchName}</p>}
              <div className="space-y-2 mb-4">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 text-center font-mono text-xl font-bold text-blue-700"
                  >
                    {t.ticket_number}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mb-4">En bekräftelse skickas till din e-post</p>
              <Link
                href="/"
                className="inline-block py-2.5 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tillbaka till lottningar
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-red-200 p-6 text-center">
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-slate-900 mb-1">Något gick fel</h1>
              <p className="text-sm text-slate-500 mb-4">{errorMsg}</p>
              <Link
                href="/"
                className="inline-block py-2.5 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tillbaka
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
