import { NextResponse } from "next/server"

export async function GET() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

    const response = await fetch("https://api.harnosandshf.se/api/news?limit=20", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HHF/1.0)",
        Accept: "application/json",
      },
      signal: controller.signal,
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`)
    }

    const newsData = await response.json()

    return NextResponse.json(newsData)
  } catch (error) {
    console.error("Error fetching news:", error)
    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      source: "fallback",
      count: 0,
      items: [],
    })
  }
}
