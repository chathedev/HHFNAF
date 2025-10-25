"use client"

import { useEffect, useState } from "react"
import type { GameClock as GameClockType } from "@/lib/use-match-data"

type GameClockProps = {
  gameClock: GameClockType | undefined
  className?: string
  showLabel?: boolean
}

export function GameClock({ gameClock, className = "", showLabel = false }: GameClockProps) {
  const [currentTime, setCurrentTime] = useState<string>("00:00")

  useEffect(() => {
    if (!gameClock || !gameClock.isLive) {
      setCurrentTime(gameClock?.display || "00:00")
      return
    }

    // Update function to calculate current time
    const updateTime = () => {
      // Time elapsed since server sent this data
      const elapsedMs = Date.now() - gameClock.serverTimestamp
      const elapsedSeconds = Math.floor(elapsedMs / 1000)
      
      // Current game time = base + elapsed
      const currentSeconds = gameClock.totalSeconds + elapsedSeconds
      
      // Format as MM:SS
      const minutes = Math.floor(currentSeconds / 60)
      const seconds = currentSeconds % 60
      const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      
      setCurrentTime(display)
    }

    // Initial update
    updateTime()

    // Update every second for smooth ticking
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [gameClock])

  if (!gameClock) {
    return null
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Speltid
        </span>
      )}
      <div className="font-mono font-bold tabular-nums">
        {currentTime}
      </div>
    </div>
  )
}
