import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const FINAL4_HOSTS = ["final4.harnosandshf.se"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── Final4 subdomain: only allow root + static assets ───
  const host = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  ).toLowerCase().split(":")[0]

  if (FINAL4_HOSTS.includes(host)) {
    // Allow root, static assets, API, _next, and static files
    if (
      pathname === "/" ||
      pathname.startsWith("/final4") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      /\.(webp|png|jpg|svg|ico|css|js|woff2?|json|txt|xml)$/.test(pathname)
    ) {
      return NextResponse.next()
    }
    // Redirect everything else to Final4 homepage
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  // ─── Regular site routing ───
  // Allow API routes, static assets, and public pages to pass through
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/logo.png") ||
    pathname.startsWith("/opengraph-image.png") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname === "/" ||
    pathname === "/shop" ||
    pathname === "/partners" ||
    pathname === "/lag" ||
    pathname === "/kontakt" ||
    pathname === "/kalender"
  ) {
    return NextResponse.next()
  }

  // For the /editor route, check for authentication cookie
  if (pathname.startsWith("/editor")) {
    const authCookie = request.cookies.get("editor-auth")

    // If no auth cookie or invalid, the editor page will handle login
    if (!authCookie || authCookie.value !== "authenticated") {
      // Let the editor page handle the login form
      return NextResponse.next()
    }

    // If authenticated, allow access
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.png|opengraph-image.png|robots.txt|sitemap.xml).*)"],
}
