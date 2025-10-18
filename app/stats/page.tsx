"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type StatsData = {
  overview: {
    totalMatches: number
    liveMatches: number
    matchesWithFeed: number
  }
  matchResults: {
    wins: number
    losses: number
    draws: number
    totalGoalsScored: number
    averageGoalsScored: string
  }
  playerStats: {
    topScorers: Array<{ rank: number; name: string; goals: number; matchesPlayed: number }>
    mostAssists: Array<{ rank: number; name: string; assists: number; matchesPlayed: number }>
    mostSuspensions: Array<{ rank: number; name: string; suspensions: number; matchesPlayed: number }>
    bestPenaltyTakers: Array<{ name: string; penaltyGoals: number; penaltyPercentage: string }>
  }
  eventStats: {
    goals: number
    suspensions: number
    timeouts: number
    sevenMeterGoals: number
    sevenMeterMisses: number
  }
  byTeam: Record<string, { wins: number; losses: number; withFeed: number }>
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>("all")

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const url = selectedTeam === "all" 
          ? "https://api.tivly.se/matcher/data/stats"
          : `https://api.tivly.se/matcher/data/stats?teamType=${encodeURIComponent(selectedTeam)}`
        
        const response = await fetch(url)
        if (!response.ok) throw new Error("Failed to fetch stats")
        
        const data = await response.json()
        setStats(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 10000) // Auto-update every 10 seconds
    
    return () => clearInterval(interval)
  }, [selectedTeam])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-24">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-emerald-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Hämtar statistik...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !stats) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-24">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center py-20 bg-red-50 rounded-2xl border-2 border-red-200">
            <p className="text-red-800 font-medium">{error || "Kunde inte ladda statistik"}</p>
          </div>
        </div>
      </main>
    )
  }

  const winRate = stats.matchResults.wins + stats.matchResults.losses + stats.matchResults.draws > 0
    ? ((stats.matchResults.wins / (stats.matchResults.wins + stats.matchResults.losses + stats.matchResults.draws)) * 100).toFixed(1)
    : "0.0"

  const sevenMeterSuccess = stats.eventStats.sevenMeterGoals + stats.eventStats.sevenMeterMisses > 0
    ? ((stats.eventStats.sevenMeterGoals / (stats.eventStats.sevenMeterGoals + stats.eventStats.sevenMeterMisses)) * 100).toFixed(1)
    : "0.0"

  const teamOptions = Object.keys(stats.byTeam).sort()

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-24">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tillbaka
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="text-5xl">📊</div>
            <div>
              <h1 className="text-5xl font-black text-gray-900">Statistik</h1>
              <p className="text-xl text-gray-600 mt-2">
                Live statistik för Härnösands HF
              </p>
            </div>
          </div>
        </div>

        {/* Team Filter */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
            Filtrera lag
          </label>
          <select
            className="w-full sm:w-auto min-w-[300px] rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 font-medium focus:border-emerald-400 focus:outline-none transition-colors"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            <option value="all">🏐 Alla lag</option>
            {teamOptions.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-100 text-sm font-bold uppercase tracking-wider">Totalt matcher</span>
              <span className="text-4xl">🏐</span>
            </div>
            <p className="text-5xl font-black">{stats.overview.totalMatches}</p>
            <p className="text-emerald-100 text-sm mt-2">{stats.overview.matchesWithFeed} med händelser</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100 text-sm font-bold uppercase tracking-wider">Live nu</span>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                <span className="text-4xl">🔴</span>
              </div>
            </div>
            <p className="text-5xl font-black">{stats.overview.liveMatches}</p>
            <p className="text-blue-100 text-sm mt-2">Pågående matcher</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-amber-100 text-sm font-bold uppercase tracking-wider">Vinstprocent</span>
              <span className="text-4xl">🏆</span>
            </div>
            <p className="text-5xl font-black">{winRate}%</p>
            <p className="text-amber-100 text-sm mt-2">{stats.matchResults.wins}V {stats.matchResults.losses}F {stats.matchResults.draws}O</p>
          </div>
        </div>

        {/* Match Results */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-3xl">⚽</span>
            Matchresultat
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-4xl font-black text-green-600 mb-2">{stats.matchResults.wins}</p>
              <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Vinster</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-red-600 mb-2">{stats.matchResults.losses}</p>
              <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Förluster</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-gray-600 mb-2">{stats.matchResults.draws}</p>
              <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Oavgjort</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-emerald-600 mb-2">{stats.matchResults.totalGoalsScored}</p>
              <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Totalt Mål</p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              <span className="font-bold text-emerald-600 text-2xl">{stats.matchResults.averageGoalsScored}</span>
              <span className="text-sm ml-2">mål i snitt per match</span>
            </p>
          </div>
        </div>

        {/* Top Scorers */}
        {stats.playerStats.topScorers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 mb-12">
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <span className="text-3xl">🏅</span>
              Skyttekung
            </h2>
            <div className="space-y-4">
              {stats.playerStats.topScorers.slice(0, 5).map((scorer) => (
                <div key={scorer.rank} className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-transparent p-4 rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {scorer.rank === 1 ? "🥇" : scorer.rank === 2 ? "🥈" : scorer.rank === 3 ? "🥉" : `#${scorer.rank}`}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{scorer.name}</p>
                      <p className="text-sm text-gray-500">{scorer.matchesPlayed} matcher</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-emerald-600">{scorer.goals}</p>
                    <p className="text-xs text-gray-500 font-semibold">MÅL</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assists and Penalties Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Most Assists */}
          {stats.playerStats.mostAssists.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8">
              <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                Flest Assist
              </h2>
              <div className="space-y-3">
                {stats.playerStats.mostAssists.slice(0, 3).map((player) => (
                  <div key={player.rank} className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                    <p className="font-bold text-gray-900">{player.name}</p>
                    <span className="text-xl font-black text-blue-600">{player.assists}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Best Penalty Takers */}
          {stats.playerStats.bestPenaltyTakers.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8">
              <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <span className="text-2xl">🎪</span>
                Bästa 7-m skyttar
              </h2>
              <div className="space-y-3">
                {stats.playerStats.bestPenaltyTakers.slice(0, 3).map((player, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
                    <div>
                      <p className="font-bold text-gray-900">{player.name}</p>
                      <p className="text-xs text-gray-500">{player.penaltyGoals} mål</p>
                    </div>
                    <span className="text-xl font-black text-amber-600">{player.penaltyPercentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Event Stats */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-3xl">📈</span>
            Händelsestatistik
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <p className="text-4xl mb-2">⚽</p>
              <p className="text-3xl font-black text-gray-900">{stats.eventStats.goals}</p>
              <p className="text-sm font-bold text-gray-600 mt-1">Mål</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <p className="text-4xl mb-2">🟥</p>
              <p className="text-3xl font-black text-gray-900">{stats.eventStats.suspensions}</p>
              <p className="text-sm font-bold text-gray-600 mt-1">2 minuter</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <p className="text-4xl mb-2">⏸️</p>
              <p className="text-3xl font-black text-gray-900">{stats.eventStats.timeouts}</p>
              <p className="text-sm font-bold text-gray-600 mt-1">Timeouts</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-xl">
              <p className="text-4xl mb-2">🎯</p>
              <p className="text-3xl font-black text-gray-900">{stats.eventStats.sevenMeterGoals}</p>
              <p className="text-sm font-bold text-gray-600 mt-1">7m-mål</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-4xl mb-2">📊</p>
              <p className="text-3xl font-black text-gray-900">{sevenMeterSuccess}%</p>
              <p className="text-sm font-bold text-gray-600 mt-1">7m-träff</p>
            </div>
          </div>
        </div>

        {/* Suspensions */}
        {stats.playerStats.mostSuspensions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8">
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <span className="text-3xl">🟨</span>
              Utvisningar (2 min)
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {stats.playerStats.mostSuspensions.slice(0, 6).map((player) => (
                <div key={player.rank} className="flex items-center justify-between p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="font-bold text-gray-900">{player.name}</p>
                  <span className="text-xl font-black text-yellow-700">{player.suspensions}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto-update indicator */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Uppdateras automatiskt var 10:e sekund
          </p>
        </div>
      </div>
    </main>
  )
}
