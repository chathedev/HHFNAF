import { NextResponse } from "next/server"

interface Event {
  date: string // YYYY-MM-DD
  time: string // HH:MM or "Heldag"
  title: string // Event description
}

async function fetchEventsFromAPI(): Promise<Event[]> {
  const url = `https://api.harnosandshf.se/api/events`

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HHF/1.0)",
        Accept: "application/json",
      },
      next: { revalidate: 3600 }, // Revalidate every hour
    })

    if (!response.ok) {
      console.warn(`Failed to fetch events from API: ${response.statusText}`)
      return []
    }

    const data = await response.json()

    // Transform the API response to match our Event interface
    // Assuming the API returns an array of events with similar structure
    const events: Event[] = data
      .map((event: any) => ({
        date: event.date || event.startDate || event.eventDate,
        time: event.time || event.startTime || "Okänd tid",
        title: event.title || event.name || event.description || "",
      }))
      .filter((event: Event) => event.title) // Filter out events without titles

    return events
  } catch (err) {
    console.error(`Error fetching from API ${url}:`, err)
    return []
  }
}

export async function GET(request: Request) {
  try {
    const allEvents = await fetchEventsFromAPI()

    // Sort all events by date and time
    allEvents.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time.replace("Okänd tid", "00:00").replace("Heldag", "00:00")}`)
      const dateTimeB = new Date(`${b.date}T${b.time.replace("Okänd tid", "00:00").replace("Heldag", "00:00")}`)
      return dateTimeA.getTime() - dateTimeB.getTime()
    })

    return NextResponse.json(allEvents)
  } catch (error) {
    console.error("Error in GET /api/kalender-events:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}
