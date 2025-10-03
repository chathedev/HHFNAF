import { NextResponse } from "next/server"

interface Match {
  id: string
  title: string
  date: string
  time: string
  opponent: string
  location: string
  isHome: boolean
  eventType: string
}

async function fetchMatchesFromAPI(): Promise<Match[]> {
  const url = `https://api.harnosandshf.se/api/events?limit=25&days=365`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HHF/1.0)",
        Accept: "application/json",
      },
      signal: controller.signal,
      next: { revalidate: 3600 }, // Revalidate every hour
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`Failed to fetch matches from API: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      console.warn("API returned non-array data:", typeof data)
      return []
    }

    const matches: Match[] = data
      .filter(
        (event: any) =>
          event.type === "match" ||
          event.eventType === "match" ||
          (event.title &&
            (event.title.toLowerCase().includes("vs") ||
              event.title.toLowerCase().includes("mot") ||
              event.title.toLowerCase().includes("-"))),
      )
      .map((event: any, index: number) => ({
        id: event.id || `match-${index}`,
        title: event.title || event.name || "",
        date: event.date || event.startDate || event.eventDate,
        time: event.time || event.startTime || "Okänd tid",
        opponent: extractOpponent(event.title || event.name || ""),
        location: event.location || event.venue || "",
        isHome: determineIfHome(event.title || event.name || "", event.location || ""),
        eventType: event.type || event.eventType || "match",
      }))
      .filter((match: Match) => match.title) // Filter out matches without titles

    return matches
  } catch (err) {
    console.error(`Error fetching matches from API ${url}:`, err)
    return []
  }
}

// Helper function to extract opponent from match title
function extractOpponent(title: string): string {
  const vsMatch = title.match(/vs\.?\s+(.+)/i) || title.match(/mot\s+(.+)/i)
  if (vsMatch) return vsMatch[1].trim()

  const dashMatch = title.match(/(.+?)\s*-\s*(.+)/)
  if (dashMatch) {
    const [, team1, team2] = dashMatch
    return team2.trim()
  }

  const parts = title.split(/\s+vs\.?\s+|\s+mot\s+/i)
  if (parts.length > 1) return parts[1].trim()

  return title
}

// Helper function to determine if match is home or away
function determineIfHome(title: string, location: string): boolean {
  const homeIndicators = ["hemma", "home", "härnösand", "sporthallen"]
  const awayIndicators = ["borta", "away"]

  const titleLower = title.toLowerCase()
  const locationLower = location.toLowerCase()

  if (homeIndicators.some((indicator) => titleLower.includes(indicator) || locationLower.includes(indicator))) {
    return true
  }
  if (awayIndicators.some((indicator) => titleLower.includes(indicator) || locationLower.includes(indicator))) {
    return false
  }

  return locationLower.includes("härnösand") || locationLower.includes("sporthall")
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") // 'home', 'away', or null for all

    const matches = await fetchMatchesFromAPI()

    if (!Array.isArray(matches)) {
      console.error("fetchMatchesFromAPI did not return an array")
      return NextResponse.json([])
    }

    const now = new Date()
    let upcomingMatches = matches
      .filter((match) => {
        try {
          const matchDate = new Date(
            `${match.date}T${match.time.replace("Okänd tid", "00:00").replace("Heldag", "00:00")}`,
          )
          return matchDate >= now
        } catch {
          return false
        }
      })
      .sort((a, b) => {
        try {
          const dateA = new Date(`${a.date}T${a.time.replace("Okänd tid", "00:00").replace("Heldag", "00:00")}`)
          const dateB = new Date(`${b.date}T${b.time.replace("Okänd tid", "00:00").replace("Heldag", "00:00")}`)
          return dateA.getTime() - dateB.getTime()
        } catch {
          return 0
        }
      })

    if (filter === "home") {
      upcomingMatches = upcomingMatches.filter((match) => match.isHome)
    } else if (filter === "away") {
      upcomingMatches = upcomingMatches.filter((match) => !match.isHome)
    }

    return NextResponse.json(upcomingMatches)
  } catch (error) {
    console.error("Error in GET /api/matches:", error)
    return NextResponse.json([])
  }
}
