"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import {
  fetchMatch,
  fetchMatchByExternalId,
  buyTickets,
  confirmPayment,
  fetchMyTickets,
  type LotteryMatch,
  type LotteryTicket,
} from "@/lib/lottery-api"
import { Loader2, ArrowLeft, Minus, Plus, Shield, CheckCircle2, AlertTriangle } from "lucide-react"

function formatSEK(ore: number) {
  return `${(ore / 100).toLocaleString("sv-SE")} kr`
}

type Step = "form" | "processing" | "done" | "error"

export function LotteryMatchClient({ matchId: matchIdParam }: { matchId: string }) {
  const [match, setMatch] = useState<LotteryMatch | null>(null)
  const [resolvedId, setResolvedId] = useState<number | null>(null)
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
  const [potAfterPurchase, setPotAfterPurchase] = useState<number>(0)

  // Resolve internal lottery ID: try external ID first, then internal
  const loadMatch = useCallback(async () => {
    try {
      if (resolvedId) {
        const m = await fetchMatch(resolvedId)
        setMatch(m)
        return
      }
      const byExternal = await fetchMatchByExternalId(matchIdParam)
      if (byExternal) {
        setResolvedId(byExternal.id)
        setMatch(byExternal)
        return
      }
      const numId = Number(matchIdParam)
      if (!isNaN(numId)) {
        const m = await fetchMatch(numId)
        setResolvedId(m.id)
        setMatch(m)
        return
      }
      setError("Kunde inte hitta lottningen")
    } catch {
      setError("Kunde inte ladda matchdata")
    } finally {
      setLoading(false)
    }
  }, [matchIdParam, resolvedId])

  useEffect(() => {
    loadMatch()
    const interval = setInterval(loadMatch, 15000)
    return () => clearInterval(interval)
  }, [loadMatch])

  // Restore saved user info
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

  // Load existing tickets
  useEffect(() => {
    if (email && resolvedId) {
      fetchMyTickets(resolvedId, email).then(setMyTickets).catch(() => {})
    }
  }, [email, resolvedId, step])

  async function handleBuy() {
    if (!resolvedId || !name.trim() || !email.trim()) {
      setError("Fyll i namn och e-post")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Ange en giltig e-postadress")
      return
    }
    setError("")
    setStep("processing")

    localStorage.setItem("lottery_user", JSON.stringify({ name, email, phone }))

    try {
      const result = await buyTickets(resolvedId, name.trim(), email.trim(), ticketCount, phone.trim() || undefined)

      // Test mode: tickets come directly in buy response
      if ((result as any).test_mode && (result as any).tickets) {
        setTickets((result as any).tickets)
        setPotAfterPurchase((result as any).pot_share_ore || 0)
        loadMatch()
        setStep("done")
        return
      }

      // Live mode: confirm via Stripe
      const confirmation = await confirmPayment(resolvedId, result.payment_intent_id)
      setTickets(confirmation.tickets)
      setPotAfterPurchase(confirmation.pot_share_ore || 0)
      loadMatch()
      setStep("done")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Något gick fel"
      setError(message)
      setStep("error")
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-green-600" />
        </main>
        <Footer />
      </div>
    )
  }

  // ── Not found ──
  if (!match) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center">
            <AlertTriangle className="h-10 w-10 text-orange-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-700">Matchen hittades inte</h2>
            <Link href="/" className="text-green-700 text-sm hover:underline mt-2 inline-block">
              Tillbaka till startsidan
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
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header />
      <main className="flex-1 py-6 sm:py-10">
        <div className="container mx-auto px-4 sm:px-6 max-w-lg">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-700 mb-5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Tillbaka
          </Link>

          {/* ── Match info header ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden mb-5">
            <div className="bg-gradient-to-r from-green-800 to-green-700 px-5 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-green-200 mb-1">
                50/50 Matchlottning
              </p>
              <h1 className="text-lg sm:text-xl font-bold leading-tight">{match.match_name}</h1>
            </div>

            <div className="grid grid-cols-3 divide-x divide-stone-100">
              <div className="p-3.5 text-center">
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Pott</div>
                <div className="text-lg font-bold text-green-700">{formatSEK(match.pot_share_ore)}</div>
              </div>
              <div className="p-3.5 text-center">
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Sålda</div>
                <div className="text-lg font-bold text-slate-900">{match.ticket_count}</div>
              </div>
              <div className="p-3.5 text-center">
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Pris/st</div>
                <div className="text-lg font-bold text-slate-900">{formatSEK(match.ticket_price_ore)}</div>
              </div>
            </div>
          </div>

          {/* ── How it works ── */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-5">
            <p className="text-xs font-semibold text-orange-800 mb-1">Så fungerar det</p>
            <ul className="text-xs text-orange-700 space-y-0.5 list-disc list-inside">
              <li>Köp en eller flera lotter med unikt lottnummer</li>
              <li>50% av alla insamlade pengar delas ut till en vinnare</li>
              <li>50% går till Härnösands HF</li>
              <li>Vinnaren dras efter matchen</li>
            </ul>
          </div>

          {isEnded ? (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 text-center">
              <p className="text-slate-600 font-semibold">Denna lottning är avslutad</p>
              <p className="text-sm text-slate-400 mt-1">Vinnaren har dragits</p>
            </div>
          ) : step === "done" ? (
            /* ── Success ── */
            <div className="bg-white rounded-2xl shadow-sm border-2 border-green-300 p-5 sm:p-6">
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Tack, {name.split(" ")[0]}!</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {tickets.length === 1 ? "Din lott" : `Dina ${tickets.length} lotter`} är registrerad{tickets.length > 1 ? "e" : ""}
                </p>
              </div>

              <div className="space-y-2 mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center">
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
                    <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-slate-900">
                      {t.ticket_number}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-stone-50 rounded-lg px-4 py-3 mb-4 text-center">
                <p className="text-xs text-slate-500">Aktuell pott</p>
                <p className="text-lg font-bold text-green-700">{formatSEK(potAfterPurchase || match.pot_share_ore)}</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 mb-4">
                <p className="text-xs text-green-800">
                  <strong>Bekräftelse skickas till</strong> {email}
                </p>
              </div>

              <button
                onClick={() => {
                  setStep("form")
                  setTickets([])
                  setTicketCount(1)
                  setError("")
                  loadMatch()
                }}
                className="w-full py-2.5 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
              >
                Köp fler lotter
              </button>
            </div>
          ) : (
            /* ── Purchase form ── */
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">Köp lotter</h2>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Namn *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ditt fullständiga namn"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                    disabled={step === "processing"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-post *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@email.se"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                    disabled={step === "processing"}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Lottnummer och bekräftelse skickas hit</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefon (valfritt)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="070-123 45 67"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                    disabled={step === "processing"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Antal lotter</label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                      disabled={ticketCount <= 1 || step === "processing"}
                      className="h-11 w-11 rounded-xl border border-stone-300 flex items-center justify-center hover:bg-stone-50 disabled:opacity-30 transition-colors"
                    >
                      <Minus className="h-4 w-4 text-slate-700" />
                    </button>
                    <span className="text-3xl font-black text-slate-900 w-10 text-center tabular-nums">{ticketCount}</span>
                    <button
                      type="button"
                      onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                      disabled={ticketCount >= 10 || step === "processing"}
                      className="h-11 w-11 rounded-xl border border-stone-300 flex items-center justify-center hover:bg-stone-50 disabled:opacity-30 transition-colors"
                    >
                      <Plus className="h-4 w-4 text-slate-700" />
                    </button>
                    <div className="ml-auto text-right">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Totalt</div>
                      <div className="text-xl font-bold text-slate-900">{formatSEK(totalPrice)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Preview: what you'll get ── */}
              <div className="mt-5 bg-stone-50 rounded-xl p-4 border border-stone-200">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Du får</p>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1">
                    {Array.from({ length: Math.min(ticketCount, 5) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-8 h-10 rounded bg-gradient-to-b from-green-100 to-orange-50 border border-green-200 flex items-center justify-center text-[9px] font-bold text-green-700"
                        style={{ zIndex: 5 - i }}
                      >
                        #{i + 1}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {ticketCount} {ticketCount === 1 ? "lott" : "lotter"} med unikt nummer
                    </p>
                    <p className="text-xs text-slate-500">
                      Varje lott ger en chans att vinna potten
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-stone-100">
                {(error || step === "error") && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Något gick fel</p>
                      <p className="text-xs mt-0.5">{error || "Försök igen eller kontakta oss"}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (step === "error") setStep("form")
                    handleBuy()
                  }}
                  disabled={step === "processing"}
                  className="w-full py-3.5 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-[15px] shadow-sm"
                >
                  {step === "processing" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Bearbetar...
                    </>
                  ) : (
                    <>
                      Köp {ticketCount} {ticketCount === 1 ? "lott" : "lotter"} &mdash; {formatSEK(totalPrice)}
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <Shield className="h-3.5 w-3.5 text-green-600" />
                  <p className="text-[11px] text-slate-500">
                    Säker betalning &middot; 50% till potten, 50% till HHF
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Existing tickets ── */}
          {myTickets.length > 0 && step !== "done" && (
            <div className="mt-5 bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                Dina lotter ({myTickets.length} st)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {myTickets.map((t) => (
                  <div
                    key={t.id}
                    className="bg-gradient-to-r from-green-50 to-orange-50 border border-green-200 rounded-lg px-3 py-2 text-center"
                  >
                    <span className="font-mono text-sm font-bold text-slate-900 tracking-wider">
                      {t.ticket_number}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Trust footer ── */}
          <div className="mt-6 text-center">
            <p className="text-[11px] text-slate-400">
              Arrangeras av Härnösands HF &middot; Org.nr 888000-3713
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
