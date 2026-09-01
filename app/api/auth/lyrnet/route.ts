import { type NextRequest, NextResponse } from "next/server"
import { cookies, headers } from "next/headers"

// Automatic login for lyrnet member DEVICES (headscale tag:admin — phone,
// laptop). The X-Lyrnet-* headers are only ever set by the lyrnet-only nginx
// vhost bound to 10.44.0.11; the public vhost force-clears them. Servers on
// lyrnet (tag:server) and everything else are rejected by the roster check.

const API_BASE = (process.env.NEXT_PUBLIC_MATCH_API_BASE || "https://api.harnosandshf.se").replace(/\/$/, "")

export async function GET(request: NextRequest) {
  const headerStore = await headers()
  const secret = headerStore.get("x-lyrnet-secret")
  const clientIp = headerStore.get("x-lyrnet-client")
  const expectedSecret = process.env.LYRNET_PROXY_SECRET

  const deny = () =>
    NextResponse.redirect(new URL("/admin?denied=1", request.url), { status: 302 })

  if (!expectedSecret || !secret || secret !== expectedSecret || !clientIp) {
    return deny()
  }

  const adminToken = process.env.ANALYTICS_ADMIN_TOKEN
  if (!adminToken) return deny()

  try {
    const verify = await fetch(
      `${API_BASE}/analytics/lyrnet-verify?ip=${encodeURIComponent(clientIp)}`,
      { headers: { "x-admin-token": adminToken }, cache: "no-store" },
    )
    const result = await verify.json()
    if (!result?.allowed) return deny()
  } catch {
    return deny()
  }

  const cookieStore = await cookies()
  cookieStore.set({
    name: "editor-auth",
    value: process.env.AUTH_COOKIE_TOKEN || "authenticated",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 1 day; the device re-authenticates instantly anyway
    path: "/",
  })
  return NextResponse.redirect(new URL("/admin", request.url), { status: 302 })
}
