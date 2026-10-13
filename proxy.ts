import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { getClubTeamsWithSource } from "@/lib/club-teams"
import { resolveLegacyTeamId } from "@/lib/team-display"

// Team pages render inside a loading boundary, so by the time the page knows a team id is
// old the 200 is already sent. Ids from earlier seasons get their real 308 here instead,
// to the same birth cohort's team.
const TEAM_PATH = /^\/lag\/([^/]+)\/?$/
const TEAM_LIST_TTL_MS = 5 * 60 * 1000
let teamList: { at: number; ids: Set<string>; teams: Awaited<ReturnType<typeof getClubTeamsWithSource>>["teams"]; live: boolean } | null = null

async function currentTeams() {
  if (!teamList || Date.now() - teamList.at > TEAM_LIST_TTL_MS) {
    const { teams, live } = await getClubTeamsWithSource()
    teamList = { at: Date.now(), ids: new Set(teams.map((team) => team.id)), teams, live }
  }
  return teamList
}

// request.nextUrl reports the internal listener (https://localhost:3001) behind the tunnel,
// so redirects are built from the Host header the visitor used.
const CANONICAL_ORIGIN = "https://www.harnosandshf.se"
function publicOrigin(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim()
  if (!host || /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)) return CANONICAL_ORIGIN
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return CANONICAL_ORIGIN
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0].trim()
  const proto = forwarded === "http" || forwarded === "https" ? forwarded : /^\d+\.\d+\.\d+\.\d+(:\d+)?$/.test(host) ? "http" : "https"
  return `${proto}://${host}`
}

async function teamRoute(request: NextRequest, rawId: string) {
  let id: string
  try {
    id = decodeURIComponent(rawId)
  } catch {
    return NextResponse.next()
  }
  const list = await currentTeams()
  if (list.ids.has(id)) return NextResponse.next()
  const current = resolveLegacyTeamId(id, list.teams)
  if (current && current !== id) {
    return NextResponse.redirect(`${publicOrigin(request)}/lag/${encodeURIComponent(current)}${request.nextUrl.search}`, 308)
  }
  // Unknown ids fall through to the page, which shows the site's not-found view.
  return NextResponse.next()
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

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

  const teamPath = TEAM_PATH.exec(pathname)
  if (teamPath) {
    return teamRoute(request, teamPath[1])
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
