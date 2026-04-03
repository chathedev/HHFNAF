"use client"

import { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import {
  adminFetchMatches,
  adminCreateMatch,
  adminEndMatch,
  adminDeleteMatch,
} from "@/lib/lottery-api"
import { Loader2, Plus, Trophy, Trash2, StopCircle, ShieldCheck, LogIn } from "lucide-react"

function formatSEK(ore: number) {
  return `${(ore / 100).toLocaleString("sv-SE")} kr`
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    upcoming: "bg-blue-100 text-blue-700",
    live: "bg-green-100 text-green-800",
    ended: "bg-slate-100 text-slate-600",
  }
  const labels: Record<string, string> = {
    upcoming: "Kommande",
    live: "Pågår",
    ended: "Avslutad",
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || ""}`}>
      {labels[status] || status}
    </span>
  )
}

export default function LotteryAdminPage() {
  const [secret, setSecret] = useState("")
  const [authed, setAuthed] = useState(false)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [newMatchName, setNewMatchName] = useState("")
  const [newTicketPrice, setNewTicketPrice] = useState("20")
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [message, setMessage] = useState("")

  // Check if secret was saved
  useEffect(() => {
    const saved = localStorage.getItem("lottery_admin_secret")
    if (saved) {
      setSecret(saved)
    }
  }, [])

  const loadMatches = useCallback(async () => {
    if (!secret) return
    setLoading(true)
    try {
      const data = await adminFetchMatches(secret)
      setMatches(data)
      setAuthed(true)
      localStorage.setItem("lottery_admin_secret", secret)
    } catch {
      setAuthed(false)
      setMessage("Fel lösenord")
    } finally {
      setLoading(false)
    }
  }, [secret])

  useEffect(() => {
    if (secret) loadMatches()
  }, [secret, loadMatches])

  async function handleCreate() {
    if (!newMatchName.trim()) return
    setCreating(true)
    setMessage("")
    try {
      await adminCreateMatch(secret, newMatchName.trim(), Number(newTicketPrice) * 100 || 2000)
      setNewMatchName("")
      await loadMatches()
      setMessage("Match skapad!")
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Kunde inte skapa match")
    } finally {
      setCreating(false)
    }
  }

  async function handleEnd(matchId: number, matchName: string) {
    if (!confirm(`Avsluta "${matchName}" och dra vinnare?`)) return
    setActionLoading(matchId)
    setMessage("")
    try {
      const result = await adminEndMatch(secret, matchId)
      if (result.winner) {
        setMessage(
          `Vinnare: ${result.winner.user_name} (${result.winner.ticket_number}) – ${formatSEK(result.winner.winnings_ore)}. ` +
            `${result.emails_sent} mail skickade. Utbetalning: ${result.winner.payout_success ? "OK" : "Misslyckades"}`
        )
      } else {
        setMessage(result.message || "Match avslutad")
      }
      await loadMatches()
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Fel")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(matchId: number) {
    if (!confirm("Radera denna match?")) return
    setActionLoading(matchId)
    try {
      await adminDeleteMatch(secret, matchId)
      await loadMatches()
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Kunde inte radera")
    } finally {
      setActionLoading(null)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="w-full max-w-sm mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="text-center mb-5">
                <ShieldCheck className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h1 className="text-lg font-bold text-slate-900">Lottning – Admin</h1>
              </div>
              <div className="space-y-3">
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Admin-lösenord"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  onKeyDown={(e) => e.key === "Enter" && loadMatches()}
                />
                {message && <p className="text-red-600 text-sm">{message}</p>}
                <button
                  onClick={loadMatches}
                  disabled={loading || !secret}
                  className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Logga in
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 py-6 sm:py-10">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Lottning – Admin</h1>
            <button
              onClick={loadMatches}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Uppdatera"}
            </button>
          </div>

          {message && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-xl mb-4">
              {message}
            </div>
          )}

          {/* Create new match */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Skapa ny lottning</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newMatchName}
                onChange={(e) => setNewMatchName(e.target.value)}
                placeholder="Matchnamn (t.ex. F14 Semifinal 1)"
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <input
                type="number"
                value={newTicketPrice}
                onChange={(e) => setNewTicketPrice(e.target.value)}
                placeholder="Pris (kr)"
                className="w-24 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newMatchName.trim()}
                className="px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Skapa
              </button>
            </div>
          </div>

          {/* Match list */}
          <div className="space-y-3">
            {matches.map((m: any) => (
              <div key={m.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <StatusBadge status={m.status} />
                    <h3 className="font-semibold text-slate-900 mt-1">{m.match_name}</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-500">Pott</div>
                    <div className="text-lg font-bold text-blue-700">
                      {formatSEK(m.pot?.pot_share_ore || 0)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-sm bg-slate-50 rounded-lg p-3 mb-3">
                  <div>
                    <div className="text-xs text-slate-500">Lotter</div>
                    <div className="font-semibold">{m.ticket_count || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Deltagare</div>
                    <div className="font-semibold">{m.unique_users || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Totalt insamlat</div>
                    <div className="font-semibold">{formatSEK(m.pot?.total_collected_ore || 0)}</div>
                  </div>
                </div>

                {m.winner && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-green-800">
                      <Trophy className="h-4 w-4" />
                      <span className="text-sm font-semibold">Vinnare: {m.winner.user_name}</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      {m.winner.user_email} &middot; Lott: {m.winner.ticket_number} &middot;
                      Utbetalt: {m.pot?.paid_out ? "Ja" : "Nej"}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  {m.status === "live" && (
                    <button
                      onClick={() => handleEnd(m.id, m.match_name)}
                      disabled={actionLoading === m.id}
                      className="flex-1 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {actionLoading === m.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <StopCircle className="h-3.5 w-3.5" />
                      )}
                      Avsluta & dra vinnare
                    </button>
                  )}
                  {m.status === "upcoming" && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={actionLoading === m.id}
                      className="py-2 px-3 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Radera
                    </button>
                  )}
                </div>
              </div>
            ))}

            {matches.length === 0 && !loading && (
              <div className="text-center py-8 text-slate-400">Inga lottningar skapade ännu</div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
