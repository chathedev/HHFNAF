import { apiFetch } from "@/lib/api-client"
import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// Cookie-gated proxy to the SERVERF analytics admin endpoints. The
// ANALYTICS_ADMIN_TOKEN never reaches the browser — it is attached here,
// server-side, after the editor-auth cookie has been validated.

const ALLOWED = new Set(["overview", "minutely", "live", "matches"])

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const cookieToken = process.env.AUTH_COOKIE_TOKEN || "authenticated"
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("editor-auth")
  if (!authCookie || authCookie.value !== cookieToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { slug } = await params
  const endpoint = slug?.[0]
  if (!endpoint || slug.length !== 1 || !ALLOWED.has(endpoint)) {
    return NextResponse.json({ error: "unknown endpoint" }, { status: 404 })
  }

  const adminToken = process.env.ANALYTICS_ADMIN_TOKEN
  if (!adminToken) {
    return NextResponse.json({ error: "analytics token not configured" }, { status: 500 })
  }

  const query = new URLSearchParams()
  request.nextUrl.searchParams.forEach((value, key) => query.set(key, value))
  const upstream = `/analytics/admin/${endpoint}${query.size ? `?${query.toString()}` : ""}`

  try {
    const response = await apiFetch(upstream, {
      headers: { "x-admin-token": adminToken },
      cache: "no-store",
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "upstream failed" }, { status: 502 })
  }
}
