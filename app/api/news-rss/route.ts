import { NextResponse } from "next/server"

interface NewsApiResponse {
  updatedAt: string
  count: number
  items: NewsItem[]
}

interface NewsItem {
  title: string
  link: string
  guid: string
  pubDate: string
  description: string
  enclosure: string | null
  categories: string[]
}

function cleanHtmlContent(html: string): string {
  if (!html) return ""

  let cleaned = html

  // Remove all HTML tags including self-closing ones
  cleaned = cleaned.replace(/<[^>]*\/?>/gi, "")

  // Remove any remaining angle brackets that might be malformed
  cleaned = cleaned.replace(/[<>]/g, "")

  // Decode HTML entities more comprehensively
  const entities: { [key: string]: string } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&hellip;": "...",
    "&mdash;": "—",
    "&ndash;": "–",
    "&rsquo;": "'",
    "&lsquo;": "'",
    "&rdquo;": '"',
    "&ldquo;": '"',
    "&#8217;": "'",
    "&#8216;": "'",
    "&#8221;": '"',
    "&#8220;": '"',
  }

  // Apply entity decoding
  Object.entries(entities).forEach(([entity, char]) => {
    cleaned = cleaned.replace(new RegExp(entity, "gi"), char)
  })

  // Clean up multiple spaces, line breaks, and trim
  cleaned = cleaned.replace(/\s+/g, " ").trim()

  // Remove any remaining HTML-like artifacts
  cleaned = cleaned.replace(/&[a-zA-Z0-9#]+;?/g, "")

  return cleaned
}

export async function GET() {
  try {
    const response = await fetch("https://api.harnosandshf.se/api/news?limit=20", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HHF/1.0)",
        Accept: "application/json",
      },
      next: { revalidate: 1800 }, // Revalidate every 30 minutes
    })

    if (!response.ok) {
      console.error(`Failed to fetch news: ${response.statusText}`)
      return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 })
    }

    const newsData: NewsApiResponse = await response.json()

    // Transform to match expected format
    const transformedNews = newsData.items.map((item) => ({
      guid: item.guid,
      title: item.title,
      link: item.link,
      description: item.description,
      cleanDescription: cleanHtmlContent(item.description),
      pubDate: item.pubDate,
      image: item.enclosure,
    }))

    return NextResponse.json(transformedNews)
  } catch (error) {
    console.error("Error fetching news:", error)
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 })
  }
}
