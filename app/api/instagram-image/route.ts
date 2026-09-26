import { NextRequest, NextResponse } from "next/server"

const ALLOWED_HOST_PATTERNS = [
  /\.cdninstagram\.com$/i,
  /\.fbcdn\.net$/i,
  /^scontent\./i,
]

const isAllowedInstagramHost = (hostname: string) => {
  return ALLOWED_HOST_PATTERNS.some((pattern) => pattern.test(hostname))
}

const API_BASE =
  process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "") || "https://api.harnosandshf.se"
const SHORTCODE_PATTERN = /^[A-Za-z0-9_-]{5,40}$/

export async function GET(request: NextRequest) {
  // Preferred: the post's shortcode. The API keeps a durable copy of each post image, so
  // this keeps working after Instagram's signed CDN links expire (they do within days).
  const shortcode = request.nextUrl.searchParams.get("shortcode")?.trim()
  const source = request.nextUrl.searchParams.get("url")?.trim()

  let parsed: URL
  if (shortcode) {
    if (!SHORTCODE_PATTERN.test(shortcode)) {
      return NextResponse.json({ ok: false, error: "Invalid shortcode" }, { status: 400 })
    }
    parsed = new URL(`${API_BASE}/instagram/image/${shortcode}`)
  } else {
    if (!source) {
      return NextResponse.json({ ok: false, error: "Missing url parameter" }, { status: 400 })
    }
    try {
      parsed = new URL(source)
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid url" }, { status: 400 })
    }
    if (parsed.protocol !== "https:" || !isAllowedInstagramHost(parsed.hostname)) {
      return NextResponse.json({ ok: false, error: "Host not allowed" }, { status: 403 })
    }
  }

  let upstream: Response
  try {
    upstream = await fetch(parsed.toString(), {
      headers: {
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
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

  // Instagram serves full-resolution JPEGs (often 0.5-1MB each) — re-encode to a
  // sized webp so the feed doesn't dominate the page weight. Falls back to the
  // original bytes if processing fails (e.g. animated/unsupported formats).
  const widthParam = Number(request.nextUrl.searchParams.get("w") || 640)
  const targetWidth = Math.min(Math.max(Number.isFinite(widthParam) ? widthParam : 640, 160), 1280)
  const lowerType = contentType.toLowerCase()
  if (!lowerType.includes("gif") && !lowerType.includes("svg")) {
    try {
      const sharp = (await import("sharp")).default
      const optimized = await sharp(Buffer.from(arrayBuffer))
        .resize({ width: targetWidth, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer()
      return new NextResponse(new Uint8Array(optimized), {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800, immutable",
        },
      })
    } catch {
      // fall through to the original bytes
    }
  }

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=7200, stale-while-revalidate=86400, immutable",
    },
  })
}

