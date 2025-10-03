import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
    pathname === "/nyheter" ||
    pathname === "/partners" ||
    pathname === "/lag" ||
    pathname === "/kontakt" ||
    pathname === "/kalender" ||
    pathname === "/matcher"
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
