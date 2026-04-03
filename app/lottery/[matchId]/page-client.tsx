"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import {
  fetchMatch,
  buyTickets,
  confirmPayment,
  fetchMyTickets,
  type LotteryMatch,
  type LotteryTicket,
} from "@/lib/lottery-api"
import { Loader2, Ticket, ArrowLeft, Minus, Plus, CheckCircle2 } from "lucide-react"

function formatSEK(ore: number) {
  return `${(ore / 100).toLocaleString("sv-SE")} kr`
}

type Step = "form" | "processing" | "confirming" | "done"

export function LotteryMatchClient({ matchId }: { matchId: number }) {
  const [match, setMatch] = useState<LotteryMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [ticketCount, setTicketCount] = useState(1)
  const [step, setStep] = useState<Step>("form")

  // Result state
  const [tickets, setTickets] = useState<{ id: number; ticket_number: string }[]>([])
  const [myTickets, setMyTickets] = useState<LotteryTicket[]>([])

  const loadMatch = useCallback(() => {
    fetchMatch(matchId)
      .then(setMatch)
      .catch(() => setError("Kunde inte ladda matchdata"))
      .finally(() => setLoading(false))
  }, [matchId])

  useEffect(() => {
    loadMatch()
    const interval = setInterval(loadMatch, 15000)
    return () => clearInterval(interval)
  }, [loadMatch])

  // Load existing tickets if email is set (from localStorage)
  useEffect(() => {
    const saved = localStorage.getItem("lottery_user")
    if (saved) {
      try {
        const { name: n, email: e, phone: p } = JSON.parse(saved)
        if (n) setName(n)
        if (e) setEmail(e)
        if (p) setPhone(p)
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (email && matchId) {
      fetchMyTickets(matchId, email).then(setMyTickets).catch(() => {})
    }
  }, [email, matchId, step])

  async function handleBuy() {
    if (!name.trim() || !email.trim()) {
      setError("Fyll i namn och e-post")
      return
    }
    setError("")
    setStep("processing")

    // Save user info
    localStorage.setItem("lottery_user", JSON.stringify({ name, email, phone }))

    try {
      const result = await buyTickets(matchId, name.trim(), email.trim(), ticketCount, phone.trim() || undefined)

      // For now without Stripe.js Swish flow (test mode), confirm directly
      setStep("confirming")
      const confirmation = await confirmPayment(matchId, result.payment_intent_id)
      setTickets(confirmation.tickets)
      loadMatch()
      setStep("done")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Något gick fel"
      setError(message)
      setStep("form")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        </main>
        <Footer />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-700">Matchen hittades inte</h2>
            <Link href="/lottery" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
              Tillbaka till lottningar
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const totalPrice = ticketCount * match.ticket_price_ore
  const isEnded = match.status === "ended"

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 py-6 sm:py-10">
        <div className="container mx-auto px-4 sm:px-6 max-w-lg">
          <Link
            href="/lottery"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Alla lottningar
          </Link>

          {/* Match info card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-[#0f2847] to-[#1d4ed8] px-5 py-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="h-4 w-4 opacity-75" />
                <span className="text-xs font-medium opacity-75 uppercase tracking-wider">Matchlottning</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold">{match.match_name}</h1>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-100">
              <div className="p-4 text-center">
                <div className="text-xs text-slate-500">Pott</div>
                <div className="text-lg font-bold text-blue-700">{formatSEK(match.pot_share_ore)}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-xs text-slate-500">Lotter</div>
                <div className="text-lg font-bold text-slate-900">{match.ticket_count}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-xs text-slate-500">Pris / lott</div>
                <div className="text-lg font-bold text-slate-900">{formatSEK(match.ticket_price_ore)}</div>
              </div>
            </div>
          </div>

          {isEnded ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
              <p className="text-slate-600 font-medium">Denna lottning är avslutad</p>
              <p className="text-sm text-slate-400 mt-1">Vinnaren har dragits</p>
            </div>
          ) : step === "done" ? (
            /* Confirmation */
            <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-6">
              <div className="text-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <h2 className="text-lg font-bold text-slate-900">Köp genomfört!</h2>
                <p className="text-sm text-slate-500 mt-1">Dina lottnummer:</p>
              </div>
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
              <p className="text-xs text-slate-400 text-center">
                En bekräftelse skickas till {email}
              </p>
              <button
                onClick={() => {
                  setStep("form")
                  setTickets([])
                  setTicketCount(1)
                  loadMatch()
                }}
                className="w-full mt-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Köp fler lotter
              </button>
            </div>
          ) : (
            /* Purchase form */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Köp lotter</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Namn</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ditt namn"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    disabled={step !== "form"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">E-post</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@email.se"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    disabled={step !== "form"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Telefon (valfritt)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="070-123 45 67"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    disabled={step !== "form"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Antal lotter</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                      disabled={ticketCount <= 1 || step !== "form"}
                      className="h-10 w-10 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-2xl font-bold text-slate-900 w-8 text-center">{ticketCount}</span>
                    <button
                      type="button"
                      onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                      disabled={ticketCount >= 10 || step !== "form"}
                      className="h-10 w-10 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-slate-600">Totalt</span>
                  <span className="text-xl font-bold text-slate-900">{formatSEK(totalPrice)}</span>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>
                )}

                <button
                  onClick={handleBuy}
                  disabled={step !== "form"}
                  className="w-full py-3 bg-gradient-to-r from-[#0f2847] to-[#1d4ed8] text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {step === "processing" || step === "confirming" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {step === "processing" ? "Bearbetar..." : "Bekräftar..."}
                    </>
                  ) : (
                    <>
                      <Ticket className="h-4 w-4" />
                      Köp {ticketCount} {ticketCount === 1 ? "lott" : "lotter"} – {formatSEK(totalPrice)}
                    </>
                  )}
                </button>

                <p className="text-xs text-slate-400 text-center mt-3">
                  50% går till potten, 50% till Härnösands HF
                </p>
              </div>
            </div>
          )}

          {/* Show existing tickets */}
          {myTickets.length > 0 && step !== "done" && (
            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Dina lotter för denna match</h3>
              <div className="flex flex-wrap gap-2">
                {myTickets.map((t) => (
                  <span
                    key={t.id}
                    className="inline-block bg-blue-50 border border-blue-200 rounded px-3 py-1 font-mono text-sm font-medium text-blue-700"
                  >
                    {t.ticket_number}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
