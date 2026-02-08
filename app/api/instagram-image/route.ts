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
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    })
  } catch {
    return NextResponse.json({ ok: false, error: "Upstream fetch failed" }, { status: 502 })
  }

  if (!upstream.ok) {
    return NextResponse.json({ ok: false, error: `Upstream returned ${upstream.status}` }, { status: 502 })
  }

  const contentType = upstream.headers.get("content-type") || ""
  if (!contentType.toLowerCase().startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "Upstream did not return image content" }, { status: 502 })
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

