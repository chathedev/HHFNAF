import { NextRequest, NextResponse } from "next/server"

const ALLOWED_HOST_PATTERNS = [
  /\.cdninstagram\.com$/i,
  /\.fbcdn\.net$/i,
  /^scontent\./i,
]

const isAllowedInstagramHost = (hostname: string) => {
  return ALLOWED_HOST_PATTERNS.some((pattern) => pattern.test(hostname))
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url")?.trim()
  if (!source) {
    return NextResponse.json({ ok: false, error: "Missing url parameter" }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(source)
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid url" }, { status: 400 })
  }

  if (parsed.protocol !== "https:" || !isAllowedInstagramHost(parsed.hostname)) {
    return NextResponse.json({ ok: false, error: "Host not allowed" }, { status: 403 })
  }

  let upstream: Response
  try {
    upstream = await fetch(parsed.toString(), {
      headers: {
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: "https://www.instagram.com/",
        Origin: "https://www.instagram.com",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    })
  } catch {
    return NextResponse.redirect(parsed.toString(), 307)
  }

  if (!upstream.ok) {
    return NextResponse.redirect(parsed.toString(), 307)
  }

  const contentType = upstream.headers.get("content-type") || ""
  if (!contentType.toLowerCase().startsWith("image/")) {
    return NextResponse.redirect(parsed.toString(), 307)
  }

  const arrayBuffer = await upstream.arrayBuffer()
  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
    },
  })
}
