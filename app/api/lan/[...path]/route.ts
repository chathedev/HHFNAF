// Plain-http fallback for the encrypted API channel. Browsers only have WebCrypto on https, so
// on staging (`next dev`) and when the site is opened over lyrnet (http://10.44.0.11, where
// nginx adds X-Lyrnet-Secret) the call is forwarded here, server side, instead of through /_v.
// Everywhere else (the public site) this route answers 404. Same route list as the vault.
import { timingSafeEqual } from "crypto"
import { NextRequest } from "next/server"
import { apiFetch } from "@/lib/api-client"
import { browserRouteAllowed } from "@/lib/api-routes"

export const dynamic = "force-dynamic"

function fromLyrnet(request: NextRequest): boolean {
  const expected = process.env.LYRNET_PROXY_SECRET || ""
  const given = request.headers.get("x-lyrnet-secret") || ""
  if (expected.length < 16 || given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

async function forward(request: NextRequest, params: Promise<{ path: string[] }>) {
  if (process.env.NODE_ENV !== "development" && !fromLyrnet(request)) return new Response(null, { status: 404 })
  const { path } = await params
  const target = `/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`
  if (!browserRouteAllowed(request.method, target)) return new Response(null, { status: 400 })
  const body = request.method === "POST" ? await request.text() : undefined
  const upstream = await apiFetch(target, {
    method: request.method,
    body,
    headers: { "content-type": request.headers.get("content-type") || "application/json" },
    cache: "no-store",
  })
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json", "cache-control": "no-store" },
  })
}

export function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, context.params)
}
export function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, context.params)
}
