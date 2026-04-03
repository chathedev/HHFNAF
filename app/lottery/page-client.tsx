"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { fetchMatches, type LotteryMatch } from "@/lib/lottery-api"
import { Loader2, Ticket, Trophy } from "lucide-react"

function formatSEK(ore: number) {
  return `${(ore / 100).toLocaleString("sv-SE")} kr`
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        Pågår
      </span>
    )
  if (status === "ended")
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Avslutad</span>
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Kommande</span>
}

export function LotteryIndexClient() {
  const [matches, setMatches] = useState<LotteryMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMatches()
      .then(setMatches)
      .catch(console.error)
      .finally(() => setLoading(false))

    const interval = setInterval(() => {
      fetchMatches().then(setMatches).catch(console.error)
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const liveMatches = matches.filter((m) => m.status === "live")
  const endedMatches = matches.filter((m) => m.status === "ended")

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <Ticket className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Matchlottning</h1>
            </div>
            <p className="text-sm text-slate-500">
              Köp lotter och vinn potten! 50% till vinnaren, 50% till klubben.
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
            </div>
          )}

          {!loading && matches.length === 0 && (
            <div className="py-16 text-center">
              <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-1">Inga lottningar just nu</h3>
              <p className="text-sm text-slate-400">Kommer snart!</p>
            </div>
          )}

          {liveMatches.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Aktiva lottningar</h2>
              <div className="space-y-3">
                {liveMatches.map((m) => (
                  <Link
                    key={m.id}
                    href={`/lottery/${m.id}`}
                    className="block bg-white border-2 border-blue-200 rounded-xl p-4 sm:p-5 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={m.status} />
                        </div>
                        <h3 className="font-semibold text-slate-900 truncate">{m.match_name}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {m.ticket_count} lotter sålda &middot; {formatSEK(m.ticket_price_ore)} / lott
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-slate-500">Pott</div>
                        <div className="text-lg font-bold text-blue-700">{formatSEK(m.pot_share_ore)}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {endedMatches.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Avslutade</h2>
              <div className="space-y-2">
                {endedMatches.map((m) => (
                  <div
                    key={m.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 opacity-75"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <StatusBadge status={m.status} />
                        <h3 className="font-medium text-slate-700 truncate mt-1">{m.match_name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{m.ticket_count} lotter</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-slate-400">Pott</div>
                        <div className="text-base font-semibold text-slate-600">{formatSEK(m.pot_share_ore)}</div>
                      </div>
                    </div>
                  </div>
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
