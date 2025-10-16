"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type ApiMatch = {
  teamType: string
  opponent: string
  date: string
  time?: string | null
  venue?: string | null
  series?: string | null
  infoUrl?: string | null
  result?: string | null
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
}

const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "")) ||
  "https://api.tivly.se/matcher"
const DATA_ENDPOINT = `${API_BASE_URL}/data`
const CACHE_KEY = "hhf-upcoming-matches"

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

const toDate = (dateString: string, timeString?: string | null) => {
  if (!dateString) {
    return null
  }
  const timePart = timeString && timeString.trim().length > 0 ? timeString.trim() : "00:00"
  const isoCandidate = `${dateString}T${timePart}`
  const parsed = new Date(isoCandidate)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

const normalizeMatch = (match: ApiMatch): NormalizedMatch | null => {
  const parsedDate = toDate(match.date, match.time)
  if (!parsedDate) {
    return null
  }

  const normalizedTeam = createNormalizedTeamKey(match.teamType || "")
  const idParts = [normalizedTeam, match.date, match.time ?? "", match.opponent ?? "", match.series ?? ""]
  const id = idParts.join("|")

  return {
    id,
    teamType: match.teamType || "Härnösands HF",
    opponent: match.opponent || "Motståndare",
    normalizedTeam,
    date: parsedDate,
    displayDate: formatDisplayDate(parsedDate),
    time: match.time ?? undefined,
    venue: match.venue ?? undefined,
    series: match.series ?? undefined,
    infoUrl: match.infoUrl ?? undefined,
    result: match.result ?? undefined,
  }
}

const normalizeMatches = (matches: ApiMatch[]) =>
  matches
    .map(normalizeMatch)
    .filter((match): match is NormalizedMatch => Boolean(match))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const loadFromCache = () => {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    const withDates = parsed
      .map((item) => {
        const parsedDate = item.date ? new Date(item.date) : null
        if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
          return null
        }
        return {
          ...item,
          date: parsedDate,
        }
      })
      .filter((item): item is NormalizedMatch => Boolean(item))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    return withDates
  } catch {
    return []
  }
}

const persistToCache = (matches: NormalizedMatch[]) => {
  if (typeof window === "undefined") {
    return
  }

  try {
    const payload = matches.slice(0, 20).map((match) => ({
      ...match,
      date: match.date.toISOString(),
    }))
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // ignore cache write failures
  }
}

const fetchFromApi = async () => {
  let attempt = 0
  let delay = 2000

  while (attempt < 3) {
    const response = await fetch(DATA_ENDPOINT, { cache: "no-store" })
    if (response.status === 503) {
      attempt += 1
      await sleep(delay)
      delay = Math.min(delay * 1.5, 8000)
      continue
    }

    if (!response.ok) {
      throw new Error(`Kunde inte hämta matcher (HTTP ${response.status})`)
    }

    const payload = (await response.json()) as ApiMatch[]
    return normalizeMatches(payload)
  }

  throw new Error("Matchdata är inte tillgänglig just nu")
}

export const useMatchData = (options?: { refreshIntervalMs?: number }) => {
  const refreshIntervalMs = options?.refreshIntervalMs ?? 30_000

  const [matches, setMatches] = useState<NormalizedMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cacheHydratedRef = useRef(false)

  const applyMatches = useCallback((incoming: NormalizedMatch[]) => {
    setMatches(incoming)
    persistToCache(incoming)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const data = await fetchFromApi()
      cacheHydratedRef.current = true
      applyMatches(data)
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
  }, [applyMatches])

  useEffect(() => {
    const cached = loadFromCache()
    if (cached.length > 0) {
      cacheHydratedRef.current = true
      setMatches(cached)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const run = async () => {
      if (!cacheHydratedRef.current) {
        setLoading(true)
      }
      try {
        const data = await fetchFromApi()
        if (!isMounted) {
          return
        }
        cacheHydratedRef.current = true
        applyMatches(data)
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
  }, [applyMatches])

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

  const upcomingMatches = useMemo(() => {
    const now = Date.now()
    return matches.filter((match) => match.date.getTime() >= now - 1000 * 60 * 60 * 4)
  }, [matches])

  return {
    matches: upcomingMatches,
    loading,
    error,
    refresh,
  }
}
