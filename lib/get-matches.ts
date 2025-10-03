interface Match {
  date: string // YYYY-MM-DD
  time: string // HH:MM or "Heldag" or "HH:MM - HH:MM"
  title: string // Match title
}

/**
 * Fetches and parses match events for a given month and year from laget.se.
 * This function is designed to run on the server.
 */
async function fetchMatchesForMonth(year: number, month: number): Promise<Match[]> {
  const paddedMonth = month.toString().padStart(2, "0")
  const url = `https://www.laget.se/HarnosandsHF/Event/FilterEvents?Year=${year}&Month=${paddedMonth}&PrintMode=False&SiteType=Club&Visibility=2&types=6`

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HHF/1.0)" },
      next: { revalidate: 3600 }, // Revalidate every hour
    })
    if (!response.ok) {
      console.warn(`Failed to fetch matches for ${year}-${month}: ${response.statusText}`)
      return []
    }

    const html = await response.text()
    // Using DOMParser on the server side (Node.js environment)
    // Note: In a true Node.js environment, you'd typically use a library like `jsdom`
    // or a headless browser for full DOM parsing. For Next.js server components,
    // if the HTML is simple enough, regex or a lightweight parser might suffice.
    // Given the previous client-side DOMParser, we'll simulate it here.
    // For robust scraping, consider a dedicated backend service or a library like `cheerio`.

    const matches: Match[] = []

    // Regex to find each day-group block and extract its date
    const dayGroupRegex =
      /<div[^>]+class="day-group"[^>]+data-day="(?<date>\d{4}-\d{2}-\d{2})"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi

    let dayGroupMatch
    while ((dayGroupMatch = dayGroupRegex.exec(html)) !== null) {
      const date = dayGroupMatch.groups!.date
      const dayContent = dayGroupMatch[0] // Get the full matched day group HTML

      // Regex to find each event item within the day group
      const eventItemRegex = /<li[^>]+class="event-item"[^>]*>(?<eventContent>[\s\S]*?)<\/li>/gi
      let eventItemMatch

      while ((eventItemMatch = eventItemRegex.exec(dayContent)) !== null) {
        const eventHtml = eventItemMatch.groups!.eventContent

        let time = "Okänd tid"
        let title = ""

        // Check for "Heldag" (Full day) events first
        if (eventHtml.includes("Heldag")) {
          time = "Heldag"
          // Extract title by removing "Heldag" and any HTML tags
          title = eventHtml
            .replace(/<[^>]*>/g, " ")
            .replace(/Heldag/i, "")
            .replace(/\s+/g, " ")
            .trim()
        } else {
          // Extract time from <time> tag
          const timeMatch = eventHtml.match(/<time[^>]*>(\d{2}:\d{2})<\/time>/i)
          time = timeMatch ? timeMatch[1] : "Okänd tid"

          // Extract title: get all text, then remove time and other known unwanted strings
          title = eventHtml
            .replace(/<[^>]*>/g, " ") // Remove all HTML tags
            .replace(time, "") // Remove the time string
            .replace(/Läs mer/i, "") // Remove "Läs mer"
            .replace(/v\.\d+/i, "") // Remove week numbers like "v.14"
            .replace(/\s+/g, " ") // Replace multiple spaces with single space
            .trim()
        }

        if (title && !title.toLowerCase().includes("träning")) {
          // Filter out trainings
          matches.push({ date, time, title })
        }
      }
    }

    return matches
  } catch (err) {
    console.error(`Error fetching ${url}:`, err)
    return []
  }
}

/**
 * Server-side function to get all upcoming matches for the next 4 months.
 */
export async function getUpcomingMatchesServer(): Promise<Match[]> {
  const now = new Date()
  const allMatches: Match[] = []

  // Loop over the current month and the next 3 months (total 4 months)
  for (let i = 0; i < 4; i++) {
    let currentYear = now.getFullYear()
    let currentMonth = now.getMonth() + 1 + i // 1-indexed month

    if (currentMonth > 12) {
      currentMonth -= 12
      currentYear++
    }

    const monthMatches = await fetchMatchesForMonth(currentYear, currentMonth)
    allMatches.push(...monthMatches)
  }

  // Filter out past matches and sort by date and time
  const nowDateTime = new Date()
  const filteredAndSortedMatches = allMatches
    .filter((match) => {
      if (match.time === "Heldag") {
        const dateOnly = new Date(match.date)
        return dateOnly >= new Date(nowDateTime.getFullYear(), nowDateTime.getMonth(), nowDateTime.getDate())
      }
      const dateTime = new Date(`${match.date}T${match.time.split(" ")[0].replace("Okänd tid", "00:00")}`)
      return dateTime >= nowDateTime
    })
    .sort((a, b) => {
      const dateA = new Date(
        `${a.date}T${a.time.split(" ")[0].replace("Okänd tid", "00:00").replace("Heldag", "00:00")}`,
      )
      const dateB = new Date(
        `${b.date}T${b.time.split(" ")[0].replace("Okänd tid", "00:00").replace("Heldag", "00:00")}`,
      )
      return dateA.getTime() - dateB.getTime()
    })

  return filteredAndSortedMatches
}
