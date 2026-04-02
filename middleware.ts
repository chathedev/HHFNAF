import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const FINAL4_HOSTS = ["final4.harnosandshf.se"]

export function middleware(request: NextRequest) {
  const host = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  ).toLowerCase().split(":")[0]

  // Only apply to Final4 subdomain
  if (!FINAL4_HOSTS.includes(host)) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // Allow: root, Final4 page, static assets, API routes, _next
  if (
    pathname === "/" ||
    pathname.startsWith("/final4") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.match(/\.(webp|png|jpg|svg|ico|css|js|woff2?|json|txt|xml)$/)
  ) {
    return NextResponse.next()
  }

  // Redirect all other routes to Final4 homepage
  const url = request.nextUrl.clone()
  url.pathname = "/"
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
