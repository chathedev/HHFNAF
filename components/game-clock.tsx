"use client"

import { useEffect, useState } from "react"
import type { GameClock as GameClockType } from "@/lib/use-match-data"

type GameClockProps = {
  gameClock: GameClockType | undefined
  className?: string
  showLabel?: boolean
  showSource?: boolean
  size?: "sm" | "md" | "lg"
}

export function GameClock({ 
  gameClock, 
  className = "", 
  showLabel = false, 
  showSource = false,
  size = "md" 
}: GameClockProps) {
  const [currentTime, setCurrentTime] = useState<string>("00:00")
  const [minutesLabel, setMinutesLabel] = useState<string>("00")
  const [secondsLabel, setSecondsLabel] = useState<string>("00")
  const [isInOvertime, setIsInOvertime] = useState<boolean>(false)
  const [overtimeMinutes, setOvertimeMinutes] = useState<number>(0)

  // Real-time interpolation function
  const getCurrentSeconds = (clock: GameClockType): number => {
    const elapsed = Math.floor((Date.now() - clock.serverTimestamp) / 1000)
    return Math.max(clock.totalSeconds + elapsed, 0)
  }

  const toDisplay = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return {
      minutesLabel: String(mins).padStart(2, '0'),
      secondsLabel: String(secs).padStart(2, '0'),
      display: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
  }

  useEffect(() => {
    if (!gameClock) {
      setCurrentTime("00:00")
      setMinutesLabel("00")
      setSecondsLabel("00")
      setIsInOvertime(false)
      return
    }

    if (!gameClock.isLive) {
      const display = gameClock.display || "00:00"
      setCurrentTime(display)
      const [mins, secs] = display.split(':')
      setMinutesLabel(mins || "00")
      setSecondsLabel(secs || "00")
      setIsInOvertime(Boolean(gameClock.overtime))
      return
    }

    // Render function for live updates
    const render = () => {
      const totalSeconds = getCurrentSeconds(gameClock)
      const { minutesLabel: mins, secondsLabel: secs, display } = toDisplay(totalSeconds)
      
      setCurrentTime(display)
      setMinutesLabel(mins)
      setSecondsLabel(secs)

      // Check for overtime (typically after 60 minutes in handball)
      const inOvertime = Boolean(gameClock.overtime || totalSeconds >= 3600)
      setIsInOvertime(inOvertime)
      
      if (inOvertime) {
        const overtimeMins = Math.max(Math.floor(totalSeconds / 60) - 60, 0)
        setOvertimeMinutes(overtimeMins)
      }
    }

    // Initial render
    render()

    // Update every second for smooth interpolation
    const interval = setInterval(render, 1000)

    return () => clearInterval(interval)
  }, [gameClock])

  if (!gameClock) {
    return null
  }

  // Size variants
  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg", 
    lg: "text-2xl md:text-3xl"
  }

  const labelSizeClasses = {
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm"
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className={`font-medium text-gray-500 uppercase tracking-wider ${labelSizeClasses[size]}`}>
          Speltid
        </span>
      )}
      
      <div className="text-center">
        {/* Main clock display */}
        <div className={`font-mono font-bold tabular-nums ${sizeClasses[size]} ${
          gameClock.isLive ? 'text-red-600' : 'text-gray-900'
        }`}>
          <span>{minutesLabel}</span>
          <span className={gameClock.isLive ? 'animate-pulse' : ''}>:</span>
          <span>{secondsLabel}</span>
        </div>

        {/* Overtime indicator */}
        {isInOvertime && (
          <div className="text-xs font-semibold text-orange-600 mt-1">
            +{overtimeMinutes} min
          </div>
        )}

        {/* Source indicator (estimated vs timeline) */}
        {showSource && gameClock.source === 'estimated' && (
          <div className="text-xs text-gray-400 mt-1">
            Est.
          </div>
        )}

      </div>
    </div>
  )
}
