"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type ApiMatch = {
  teamType?: string | null
  opponent?: string | null
  date?: string | null
  time?: string | null
  venue?: string | null
  series?: string | null
  infoUrl?: string | null
  result?: string | null
  isHome?: boolean | null
  playUrl?: string | null
}

export type NormalizedMatch = {
  id: string
  teamType: string
  opponent: string
  normalizedTeam: string
  date: Date
  displayDate: string
  time?: string
  venue?: string
  series?: string
  infoUrl?: string
  result?: string
  isHome?: boolean
  playUrl?: string
}

const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "")) ||
  "https://api.tivly.se/matcher"

type DataType = "current" | "old" | "both"

const getDataEndpoint = (type: DataType) => {
  switch (type) {
    case "current":
      return `${API_BASE_URL}/data/current`
    case "old":
      return `${API_BASE_URL}/data/old`
    case "both":
    default:
      return `${API_BASE_URL}/data`
  }
}

const createNormalizedTeamKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")

const formatDisplayDate = (date: Date) =>
  new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(date)

const toDate = (dateString?: string | null, timeString?: string | null) => {
  if (!dateString) {
    return null
  }
  const timePart = timeString && timeString.trim().length > 0 ? timeString.trim() : "00:00"
  const parsed = new Date(`${dateString}T${timePart}`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

const normalizeMatch = (match: ApiMatch): NormalizedMatch | null => {
  const teamType = match.teamType?.trim()
  const opponent = match.opponent?.trim()
  const parsedDate = toDate(match.date, match.time)

  if (!teamType || !opponent || !parsedDate) {
    return null
  }

  const normalizedTeam = createNormalizedTeamKey(teamType)
  const id = [normalizedTeam, match.date, match.time ?? "", opponent, match.series ?? ""].join("|")

  let derivedIsHome = typeof match.isHome === "boolean" ? match.isHome : undefined
  const homeAwaySuffix = opponent.match(/\((hemma|borta)\)\s*$/i)
  if (homeAwaySuffix) {
    derivedIsHome = homeAwaySuffix[1].toLowerCase() === "hemma"
  }

  return {
    id,
    teamType,
    opponent,
    normalizedTeam,
    date: parsedDate,
    displayDate: formatDisplayDate(parsedDate),
    time: match.time ?? undefined,
    venue: match.venue ?? undefined,
    series: match.series ?? undefined,
    infoUrl: match.infoUrl ?? undefined,
    result: match.result ?? undefined,
    isHome: derivedIsHome,
    playUrl: match.playUrl && match.playUrl !== "null" ? match.playUrl : undefined,
  }
}

const normalizeMatches = (matches: ApiMatch[]) =>
  matches
    .map(normalizeMatch)
    .filter((match): match is NormalizedMatch => Boolean(match))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const fetchFromApi = async (dataType: DataType = "both") => {
  const endpoint = getDataEndpoint(dataType)
  let attempt = 0
  let delay = 2000

  while (attempt < 3) {
    const response = await fetch(endpoint, { cache: "no-store" })
    if (response.status === 503) {
      attempt += 1
      await sleep(delay)
      delay = Math.min(delay * 1.5, 8000)
      continue
    }

    if (!response.ok) {
      throw new Error(`Kunde inte hämta matcher (HTTP ${response.status})`)
    }

    const payload = await response.json()
    
    // Handle both array and object responses
    const matches = Array.isArray(payload) ? payload : []
    
    return normalizeMatches(matches)
  }

  throw new Error("Matchdata är inte tillgänglig just nu")
}

export const useMatchData = (options?: { refreshIntervalMs?: number; dataType?: DataType }) => {
  const refreshIntervalMs = options?.refreshIntervalMs ?? 30_000
  const dataType = options?.dataType ?? "both"

  const [matches, setMatches] = useState<NormalizedMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchFromApi(dataType)
      setMatches(data)
      setError(null)
      setLoading(false)
      return data
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Kunde inte hämta matchdata just nu. Försök igen om en liten stund."
      setError(message)
      setLoading(false)
      throw caught
    }
  }, [dataType])

  useEffect(() => {
    let isMounted = true
    const run = async () => {
      setLoading(true)
      try {
        const data = await fetchFromApi(dataType)
        if (!isMounted) {
          return
        }
        setMatches(data)
        setError(null)
      } catch (caught) {
        if (!isMounted) {
          return
        }
        const message =
          caught instanceof Error ? caught.message : "Kunde inte hämta matchdata just nu. Försök igen om en liten stund."
        setError(message)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      isMounted = false
    }
  }, [dataType])

  useEffect(() => {
    if (!refreshIntervalMs || refreshIntervalMs <= 0) {
      return
    }

    const id = window.setInterval(() => {
      void refresh()
    }, refreshIntervalMs)

    return () => {
      window.clearInterval(id)
    }
  }, [refresh, refreshIntervalMs])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh()
      }
    }

    const handleFocus = () => {
      void refresh()
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [refresh])

  return {
    matches,
    loading,
    error,
    refresh,
  }
}
