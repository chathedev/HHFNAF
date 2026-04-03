"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { confirmPayment } from "@/lib/lottery-api"
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react"

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
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md mx-auto px-4">
          {status === "loading" && (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-3" />
              <p className="text-slate-600">Bekräftar din betalning...</p>
            </div>
          )}

          {status === "success" && (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-green-300 p-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">Tack för ditt köp!</h1>
              {matchName && <p className="text-sm text-slate-500 mb-4">{matchName}</p>}
              <div className="space-y-2 mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {tickets.length === 1 ? "Ditt lottnummer" : "Dina lottnummer"}
                </p>
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="relative bg-gradient-to-r from-green-50 to-orange-50 border-2 border-green-200 rounded-xl p-4 text-center"
                  >
                    <div className="absolute top-1.5 left-3 text-[9px] font-medium text-green-600 uppercase tracking-widest">
                      Lott
                    </div>
                    <span className="font-mono text-2xl font-black tracking-widest text-slate-900">
                      {t.ticket_number}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mb-4">En bekräftelse skickas till din e-post</p>
              <Link
                href="/"
                className="inline-block py-2.5 px-6 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-colors"
              >
                Tillbaka till startsidan
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-red-200 p-6 text-center">
              <AlertTriangle className="h-10 w-10 text-orange-400 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-slate-900 mb-1">Något gick fel</h1>
              <p className="text-sm text-slate-500 mb-4">{errorMsg}</p>
              <Link
                href="/"
                className="inline-block py-2.5 px-6 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-colors"
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
