export type PublicMatchEvent = {
  id: string
  title: string
  date: string
  time: string
  opponent: string
  location: string
  isHome: boolean
}

const API_URL = "https://api.harnosandshf.se/api/events?limit=40&days=365"

function extractOpponent(title: string) {
  const vsMatch = title.match(/vs\.?\s+(.+)/i) || title.match(/mot\s+(.+)/i)
  if (vsMatch?.[1]) return vsMatch[1].trim()

  const dashMatch = title.match(/(.+?)\s*-\s*(.+)/)
  if (dashMatch?.[2]) return dashMatch[2].trim()

  return title.trim()
}

function determineHome(title: string, location: string) {
  const titleLower = title.toLowerCase()
  const locationLower = location.toLowerCase()
  if (/\bborta\b/.test(titleLower) || /\baway\b/.test(titleLower)) return false
  if (/\bhemma\b/.test(titleLower) || /\bhome\b/.test(titleLower)) return true
  return locationLower.includes("härnösand") || locationLower.includes("öbacka")
}

function normalizeDateTime(date: string | undefined, time: string | undefined) {
  if (!date) return null
  const normalizedTime = (time || "00:00")
    .replace("Okänd tid", "00:00")
    .replace("Heldag", "00:00")
    .trim()
  const value = new Date(`${date}T${normalizedTime}`)
  return Number.isNaN(value.getTime()) ? null : value
}

export async function fetchPublicMatchEvents(limit = 20): Promise<PublicMatchEvent[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const response = await fetch(API_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return []
    }

    const payload: unknown = await response.json()
    if (!Array.isArray(payload)) {
      return []
    }

    const now = Date.now()

    const matches = payload
      .map((event, index): PublicMatchEvent | null => {
        if (!event || typeof event !== "object") return null
        const record = event as Record<string, unknown>
        const title = String(record.title || record.name || "").trim()
        const date = String(record.date || record.startDate || record.eventDate || "").trim()
        const time = String(record.time || record.startTime || "Okänd tid").trim()
        const location = String(record.location || record.venue || "").trim()

        if (!title || !date) return null

        const maybeMatch =
          String(record.type || record.eventType || "").toLowerCase() === "match" ||
          /\b(vs\.?|mot)\b/i.test(title) ||
          title.includes("-")

        if (!maybeMatch) return null

        return {
          id: String(record.id || `match-${index}`),
          title,
          date,
          time,
          opponent: extractOpponent(title),
          location,
          isHome: determineHome(title, location),
        }
      })
      .filter((value): value is PublicMatchEvent => Boolean(value))
      .filter((match) => {
        const dt = normalizeDateTime(match.date, match.time)
        return dt ? dt.getTime() >= now - 1000 * 60 * 60 * 6 : true
      })
      .sort((a, b) => {
        const aTime = normalizeDateTime(a.date, a.time)?.getTime() ?? Number.MAX_SAFE_INTEGER
        const bTime = normalizeDateTime(b.date, b.time)?.getTime() ?? Number.MAX_SAFE_INTEGER
        return aTime - bTime
      })
      .slice(0, limit)

    return matches
  } catch {
    return []
  }
}

export function parseMatchDateTimeIso(date: string, time: string) {
  const dt = normalizeDateTime(date, time)
  return dt ? dt.toISOString() : null
}

export function guessMatchTeams(match: PublicMatchEvent) {
  const hhfName = "Härnösands HF"
  const cleanOpponent = match.opponent || match.title
  return match.isHome
    ? { homeTeam: hhfName, awayTeam: cleanOpponent }
    : { homeTeam: cleanOpponent, awayTeam: hhfName }
}
