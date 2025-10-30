"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import Link from "next/link"
import confetti from "canvas-confetti"

import { Card } from "@/components/ui/card"
import { canShowTicketForMatch } from "@/lib/matches"
import { useMatchData, type NormalizedMatch } from "@/lib/use-match-data"
import { MatchFeedModal } from "@/components/match-feed-modal"

const normalizeTeamKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")

type MatchOutcome = {
  text: string
  label: "Vinst" | "Förlust" | "Oavgjort"
}

const getMatchOutcome = (rawResult?: string, isHome?: boolean, status?: string): MatchOutcome | null => {
  if (!rawResult) {
    return null
  }
  const scoreboardMatch = rawResult.match(/(\d+)\s*[–-]\s*(\d+)/)
  if (!scoreboardMatch) {
    return null
  }
  const homeScore = Number.parseInt(scoreboardMatch[1], 10)
  const awayScore = Number.parseInt(scoreboardMatch[2], 10)
  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return null
  }
  
  // Don't show outcome badges for live matches - only show for finished matches
  if (status === "live") {
    return null
  }
  
  const isAway = isHome === false
  const ourScore = isAway ? awayScore : homeScore
  const opponentScore = isAway ? homeScore : awayScore

  let label: MatchOutcome["label"] = "Oavgjort"
  if (ourScore > opponentScore) {
    label = "Vinst"
  } else if (ourScore < opponentScore) {
    label = "Förlust"
  }

  return {
    text: `${ourScore}\u2013${opponentScore}`,
    label,
  }
}

// Helper to get score in correct display order matching team display 
// For home matches: Härnösands HF vs Opponent → HHF score - Opponent score
// For away matches: Opponent vs Härnösands HF → Opponent score - HHF score
const getDisplayScore = (rawResult?: string, isHome?: boolean): string | null => {
  if (!rawResult) {
    return null
  }
  const scoreboardMatch = rawResult.match(/(\d+)\s*[–-]\s*(\d+)/)
  if (!scoreboardMatch) {
    return null
  }
  const homeScore = Number.parseInt(scoreboardMatch[1], 10)
  const awayScore = Number.parseInt(scoreboardMatch[2], 10)
  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return null
  }
  
  // Match the team display order:
  // If we're home: "Härnösands HF vs Opponent" → show homeScore–awayScore
  // If we're away: "Opponent vs Härnösands HF" → show homeScore–awayScore (opponent is home)
  // The API always returns homeScore–awayScore, so we keep it as is
  return `${homeScore}\u2013${awayScore}`
}

type TeamUpcomingMatchProps = {
  teamLabels: string | string[]
  ticketUrl?: string
}

export function TeamUpcomingMatch({ teamLabels, ticketUrl }: TeamUpcomingMatchProps) {
  const [selectedMatch, setSelectedMatch] = useState<NormalizedMatch | null>(null)
  
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  const { matches, loading, error, refresh } = useMatchData({ 
    refreshIntervalMs: 1_000,
    dataType: "current"
  })

  const teamKeys = useMemo(() => {
    const labels = Array.isArray(teamLabels) ? teamLabels : [teamLabels]
    return labels.map((label) => normalizeTeamKey(label)).filter(Boolean)
  }, [teamLabels])

  const upcomingMatches = useMemo(() => {
    return matches.filter((match) => match.matchStatus === "upcoming" || match.matchStatus === "live")
  }, [matches])

  const nextMatch = useMemo(() => {
    if (teamKeys.length === 0) {
      return null
    }
    return (
      upcomingMatches
        .filter((match) => teamKeys.includes(match.normalizedTeam))
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null
    )
  }, [upcomingMatches, teamKeys])

  // Track previous score to detect when Härnösands HF scores - MUST be before any returns
  const prevScoreRef = useRef<{ home: number; away: number; matchId: string } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const confettiTriggeredRef = useRef(false)

  // Confetti effect - MUST be before any returns
  useEffect(() => {
    if (!nextMatch || !nextMatch.result) {
      // Reset confetti trigger when no match or no result
      confettiTriggeredRef.current = false
      return
    }

    const now = Date.now()
    const kickoff = nextMatch.date.getTime()
    const liveWindowEnd = kickoff + 1000 * 60 * 60 * 2.5
    const calculatedStatus = now >= kickoff && now <= liveWindowEnd ? "live" : nextMatch.result ? "finished" : "upcoming"
    const status = nextMatch.matchStatus ?? calculatedStatus

    if (status !== "live") {
      // Reset confetti trigger when match is not live
      confettiTriggeredRef.current = false
      return
    }

    const scoreMatch = nextMatch.result.match(/(\d+)\s*[–-]\s*(\d+)/)
    if (!scoreMatch) return

    const currentHomeScore = Number.parseInt(scoreMatch[1], 10)
    const currentAwayScore = Number.parseInt(scoreMatch[2], 10)

    if (Number.isNaN(currentHomeScore) || Number.isNaN(currentAwayScore)) {
      return
    }

    // Initialize previous score on first load (don't trigger confetti)
    if (!prevScoreRef.current || prevScoreRef.current.matchId !== nextMatch.id) {
      prevScoreRef.current = {
        home: currentHomeScore,
        away: currentAwayScore,
        matchId: nextMatch.id
      }
      confettiTriggeredRef.current = false
      return
    }

    // Check if we have a previous score for this match
    const prevHome = prevScoreRef.current.home
    const prevAway = prevScoreRef.current.away

    // Determine if Härnösands HF scored
    let hhfScored = false
    if (nextMatch.isHome !== false) {
      // We're home team - check if home score increased
      hhfScored = currentHomeScore > prevHome
    } else {
      // We're away team - check if away score increased
      hhfScored = currentAwayScore > prevAway
    }

    // Trigger confetti if Härnösands HF scored AND we haven't triggered for this score yet
    if (hhfScored && cardRef.current && !confettiTriggeredRef.current) {
      confettiTriggeredRef.current = true
        // Add celebration animation to the card
        cardRef.current.classList.add('goal-celebration')
        setTimeout(() => cardRef.current?.classList.remove('goal-celebration'), 2000)

        const rect = cardRef.current.getBoundingClientRect()
        // Calculate position relative to the card's center
        const x = (rect.left + rect.width / 2) / window.innerWidth
        const y = (rect.top + rect.height / 2) / window.innerHeight
        
        // Calculate boundaries for confetti to stay within card
        const cardWidth = rect.width / window.innerWidth
        const cardHeight = rect.height / window.innerHeight

        // Main celebration burst from center - contained within card
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { x, y },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#ffffff', '#d1fae5'],
          startVelocity: 25,
          gravity: 1.2,
          ticks: 200,
          scalar: 0.9,
          shapes: ['circle'],
          drift: 0,
          decay: 0.92
        })

        // Sparkle effect - tighter spread
        setTimeout(() => {
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { x, y },
            colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
            startVelocity: 20,
            gravity: 1.0,
            ticks: 150,
            scalar: 0.7,
            shapes: ['circle'],
            decay: 0.93
          })
        }, 100)

        // Gentle side bursts - emerald theme
        setTimeout(() => {
          // Left burst
          confetti({
            particleCount: 40,
            angle: 70,
            spread: 45,
            origin: { x: x - 0.05, y },
            colors: ['#10b981', '#34d399', '#ffffff'],
            startVelocity: 20,
            gravity: 1.1,
            ticks: 180,
            scalar: 0.8,
            shapes: ['circle'],
            decay: 0.91
          })
          // Right burst
          confetti({
            particleCount: 40,
            angle: 110,
            spread: 45,
            origin: { x: x + 0.05, y },
            colors: ['#10b981', '#34d399', '#ffffff'],
            startVelocity: 20,
            gravity: 1.1,
            ticks: 180,
            scalar: 0.8,
            shapes: ['circle'],
            decay: 0.91
          })
        }, 200)
        
        // Top celebration - raining effect
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 90,
            spread: 80,
            origin: { x, y: y - 0.1 },
            colors: ['#10b981', '#6ee7b7', '#ffffff'],
            startVelocity: 15,
            gravity: 0.8,
            ticks: 220,
            scalar: 0.6,
            shapes: ['circle'],
            decay: 0.94
          })
        }, 300)
      
      // Update the previous score after confetti
      prevScoreRef.current = {
        home: currentHomeScore,
        away: currentAwayScore,
        matchId: nextMatch.id
      }
      
      // Reset confetti flag after a delay to allow for next goal
      setTimeout(() => {
        confettiTriggeredRef.current = false
      }, 3000)
    } else if (!hhfScored && (currentHomeScore !== prevHome || currentAwayScore !== prevAway)) {
      // Score changed but not our goal - update ref and reset confetti flag
      prevScoreRef.current = {
        home: currentHomeScore,
        away: currentAwayScore,
        matchId: nextMatch.id
      }
      confettiTriggeredRef.current = false
    }
  }, [nextMatch])

  // NOW we can do conditional returns AFTER all hooks
  if (!loading && !nextMatch) {
    return null
  }

  if (error) {
    return null
  }

  if (!nextMatch) {
    return null
  }

  const scheduleParts = [nextMatch.displayDate, nextMatch.time, nextMatch.venue]
    .filter((item): item is string => Boolean(item))
    .join(" • ")
    
  // Use matchStatus from backend if available, otherwise calculate it
  const now = Date.now()
  const kickoff = nextMatch.date.getTime()
  const liveWindowEnd = kickoff + 1000 * 60 * 60 * 2.5
  const calculatedStatus = now >= kickoff && now <= liveWindowEnd ? "live" : nextMatch.result ? "finished" : "upcoming"
  const status = nextMatch.matchStatus ?? calculatedStatus
  
  // Extract opponent name without (hemma)/(borta) suffix for display
  const opponentName = nextMatch.opponent.replace(/\s*\((hemma|borta)\)\s*$/i, '').trim()
  const homeAwayLabel = nextMatch.isHome === false ? 'borta' : 'hemma'
  const isHome = nextMatch.isHome !== false
  
  const isTicketEligibleBase = Boolean(ticketUrl) && canShowTicketForMatch(nextMatch)
  const outcomeInfo = getMatchOutcome(nextMatch.result, nextMatch.isHome, status)
  const displayScore = getDisplayScore(nextMatch.result, nextMatch.isHome)
  
  // Check if result is stale (0-0 shown when match should be live or finished)
  const minutesSinceKickoff = (now - kickoff) / (1000 * 60)
  const trimmedResult = typeof nextMatch.result === "string" ? nextMatch.result.trim() : null
  
  // Normalize the result to check for any variation of 0-0
  const normalizedResult = trimmedResult?.replace(/[–-]/g, '-').toLowerCase()
  const isZeroZero = normalizedResult === "0-0" || normalizedResult === "00" || trimmedResult === "0-0" || trimmedResult === "0–0"
  const isStaleZeroResult = isZeroZero && minutesSinceKickoff > 3 && (status === "live" || status === "finished")
  
  // Don't show LIVE badge if match has been 0-0 for more than 60 minutes (likely stale data)
  const shouldShowLive = status === "live" && !(isZeroZero && minutesSinceKickoff > 60)
  
  const isFutureOrLive = nextMatch.date.getTime() >= Date.now() || status === "live"
  const showTicket = isTicketEligibleBase && !outcomeInfo && isFutureOrLive

  // Only allow clicking timeline for live or finished matches
  const canOpenTimeline = status === "live" || status === "finished"

  return (
    <>
      <div 
        ref={cardRef} 
        className={`bg-white rounded-lg border border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all p-6 group relative ${
          canOpenTimeline ? "cursor-pointer" : ""
        }`}
        onClick={() => canOpenTimeline && setSelectedMatch(nextMatch)}
        role={canOpenTimeline ? "button" : undefined}
        tabIndex={canOpenTimeline ? 0 : undefined}
        onKeyDown={(e) => {
          if (canOpenTimeline && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            setSelectedMatch(nextMatch)
          }
        }}
      >
      {/* Click hint badge - only show if timeline is clickable */}
      {canOpenTimeline && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Se matchhändelser
          </span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-semibold text-emerald-700">
              {nextMatch.teamType}
            </span>
            {shouldShowLive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {isHome ? (
              <>Härnösands HF <span className="text-gray-400">vs</span> {opponentName} ({homeAwayLabel})</>
            ) : (
              <>{opponentName} <span className="text-gray-400">vs</span> Härnösands HF ({homeAwayLabel})</>
            )}
          </h3>
          {scheduleParts && (
            <p className="text-sm text-gray-600">{scheduleParts}</p>
          )}
          {nextMatch.series && (
            <p className="text-xs text-gray-500 mt-1">{nextMatch.series}</p>
          )}
        </div>
        
        {nextMatch.infoUrl && (
          <Link
            href={nextMatch.infoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:text-emerald-700 transition-colors"
            title="Matchsida"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        )}
      </div>

      {/* Result or Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4">
          {/* Show live scores - just the score, no badges */}
          {status === "live" && displayScore && !isStaleZeroResult && (
            <span className="text-2xl font-bold text-gray-900">{displayScore}</span>
          )}
          
          {/* Show 0-0 for live matches without any outcome badge */}
          {status === "live" && isZeroZero && !isStaleZeroResult && (
            <span className="text-2xl font-bold text-gray-900">0–0</span>
          )}
          
          {/* Show stale 0-0 with warning for finished matches */}
          {status === "finished" && isZeroZero && isStaleZeroResult && (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-gray-900">0–0</span>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Resultat ej tillgängligt</span>
              </div>
            </div>
          )}
          
          {/* Show results with outcome badge ONLY for finished matches (not live) */}
          {status === "finished" && outcomeInfo && displayScore && !isStaleZeroResult && (
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded ${
                outcomeInfo.label === "Vinst"
                  ? "bg-green-100 text-green-800"
                  : outcomeInfo.label === "Förlust"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
              }`}>
                {outcomeInfo.label}
              </span>
              <span className="text-2xl font-bold text-gray-900">
                {displayScore}
              </span>
            </div>
          )}

          {nextMatch.playUrl && nextMatch.playUrl !== "null" && (
            <a
              href={nextMatch.playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              title={status === "finished" ? "Se repris" : "Se matchen live"}
            >
              <img
                src="/handbollplay_mini.png"
                alt=""
                className="h-4 w-4 brightness-0 invert"
              />
              {status === "finished" ? "Se repris" : "Se live"}
            </a>
          )}
        </div>

        {showTicket && ticketUrl && (
          <Link
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            Köp biljett
          </Link>
        )}
      </div>
    </div>
    
    {/* Match Feed Modal */}
    {selectedMatch && (() => {
      // Use the actual display names from the match card
      const displayOpponentName = selectedMatch.opponent.replace(/\s*\((hemma|borta)\)\s*$/i, '').trim()
      const displayHomeTeam = selectedMatch.isHome !== false ? "Härnösands HF" : displayOpponentName
      const displayAwayTeam = selectedMatch.isHome !== false ? displayOpponentName : "Härnösands HF"
      
      return (
        <MatchFeedModal
          isOpen={true}
          onClose={() => setSelectedMatch(null)}
          matchFeed={selectedMatch.matchFeed || []}
          homeTeam={displayHomeTeam}
          awayTeam={displayAwayTeam}
          finalScore={selectedMatch.result}
          matchStatus={selectedMatch.matchStatus}
          matchId={selectedMatch.id}
          onRefresh={async () => {
            console.log('🔄 Team component: Starting refresh...')
            await refresh()
            console.log('🔄 Team component: Refresh complete, updating selectedMatch...')
            // Only update selectedMatch if modal is still open (selectedMatch is not null)
            setSelectedMatch(prevMatch => {
              if (!prevMatch) {
                console.log('🔄 Team component: Modal closed, skipping update')
                return null
              }
              const updatedMatch = matches.find(m => m.id === prevMatch.id)
              if (updatedMatch) {
                console.log('🔄 Team component: Found updated match:', {
                  matchFeedLength: updatedMatch.matchFeed?.length || 0,
                  result: updatedMatch.result,
                  status: updatedMatch.matchStatus
                })
              } else {
                console.log('⚠️ Team component: Match not found in matches array')
              }
              return updatedMatch || prevMatch
            })
          }}
        />
      )
    })()}
    </>
  )
}
