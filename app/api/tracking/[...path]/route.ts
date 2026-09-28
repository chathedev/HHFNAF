import { NextRequest, NextResponse } from "next/server"
import { TRACKING_RELEASED, TRACKING_STAGING } from "@/lib/tracking-release"

// Same-origin proxy to the tracking service on lyrnet. Staging passes everything
// through (video and review frames included, for the club's own review). Production
// only serves RELEASED analyses and only what the 2D plan needs: the match list
// (filtered), an analysis' identities, its frames and its live stream.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Analysis runs on the tivly compute node over lyrnet.
const TRACKING_BASE = process.env.TRACKING_SERVICE_URL || "http://10.44.0.9:3020"
const SEGMENT = /^[A-Za-z0-9_-]{1,64}$/
const PUBLIC_PARTS = new Set(["frames", "stream"])

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  if (!path?.length || path.length > 4 || !path.every((segment) => SEGMENT.test(segment))) {
    return NextResponse.json({ error: "bad_path" }, { status: 400 })
  }
  if (!TRACKING_STAGING) {
    if (path.length === 1 && path[0] === "matches") return releasedMatches()
    const allowed = TRACKING_RELEASED.has(path[0]) && (path.length === 1 || (path.length === 2 && PUBLIC_PARTS.has(path[1])))
    if (!allowed) return NextResponse.json({ error: "not_available" }, { status: 404 })
  }
  const upstreamUrl = new URL(`${TRACKING_BASE}/tracking/${path.join("/")}`)
  for (const key of ["from", "to", "offset", "tail"]) {
    const value = request.nextUrl.searchParams.get(key)
    if (value !== null && /^-?\d+(\.\d+)?$/.test(value)) upstreamUrl.searchParams.set(key, value)
  }

  const isStream = path[path.length - 1] === "stream" || path[1] === "video"
  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      signal: isStream ? request.signal : AbortSignal.timeout(15000),
      headers: {
        "accept-encoding": "identity",
        // lets the service resume a dropped live stream exactly where it stopped
        ...(/^\d{1,12}$/.test(request.headers.get("last-event-id") ?? "")
          ? { "last-event-id": request.headers.get("last-event-id") as string }
          : {}),
        // video seeking: byte ranges straight through
        ...(/^bytes=\d*-\d*$/.test(request.headers.get("range") ?? "") ? { range: request.headers.get("range") as string } : {}),
      },
    })
  } catch {
    return NextResponse.json({ error: "tracking_unavailable" }, { status: 503 })
  }

  // only a delivered image may be cached: a 404 (live frame not written yet) must be retried
  const isImage = path[1] === "img" && upstream.status === 200
  const isVideo = path[1] === "video" && (upstream.status === 200 || upstream.status === 206)
  const headers = new Headers({
    "Cache-Control": isImage ? "private, max-age=86400, immutable" : isVideo ? "private, max-age=3600" : "no-store, no-transform",
  })
  for (const key of ["content-type", "x-frames-offset", "content-range", "accept-ranges", ...(isVideo ? ["content-length"] : [])]) {
    const value = upstream.headers.get(key)
    if (value) headers.set(key, value)
  }
  if (isStream) {
    headers.set("X-Accel-Buffering", "no")
    headers.set("Connection", "keep-alive")
  }
  return new Response(upstream.body, { status: upstream.status, headers })
}

// the analysis list on production: released, non-test analyses only
async function releasedMatches() {
  try {
    const upstream = await fetch(`${TRACKING_BASE}/tracking/matches`, { cache: "no-store", signal: AbortSignal.timeout(15000) })
    if (!upstream.ok) return NextResponse.json({ matches: [] }, { headers: { "Cache-Control": "no-store" } })
    const data = (await upstream.json()) as { matches?: Array<{ id?: string; test?: boolean }> }
    const matches = (data.matches ?? []).filter((m) => m.id && TRACKING_RELEASED.has(m.id) && !m.test)
    return NextResponse.json({ matches }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ matches: [] }, { status: 503 })
  }
}

// Only one write exists: saving a click calibration, which re-runs that analysis (staging only).
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!TRACKING_STAGING) {
    return NextResponse.json({ error: "not_available" }, { status: 404 })
  }
  const { path } = await context.params
  if (path?.length !== 2 || !SEGMENT.test(path[0]) || path[1] !== "calibration") {
    return NextResponse.json({ error: "bad_path" }, { status: 400 })
  }
  const body = await request.text()
  if (body.length > 200000) {
    return NextResponse.json({ error: "too_large" }, { status: 413 })
  }
  try {
    const upstream = await fetch(`${TRACKING_BASE}/tracking/${path[0]}/calibration`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: AbortSignal.timeout(15000),
    })
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    })
  } catch {
    return NextResponse.json({ error: "tracking_unavailable" }, { status: 503 })
  }
}
