import { NextRequest } from "next/server"
import { GET as instagramImage } from "../../../api/instagram-image/route"

// Short URL for an Instagram post image: /ig/<width>/<shortcode>. Same answer as
// /api/instagram-image?shortcode=...&w=..., just a cleaner row in the network tab.
export async function GET(request: NextRequest, { params }: { params: Promise<{ w: string; code: string }> }) {
  const { w, code } = await params
  const target = new URL("/api/instagram-image", request.url)
  target.searchParams.set("shortcode", code)
  if (/^\d{1,4}$/.test(w)) target.searchParams.set("w", w)
  return instagramImage(new NextRequest(target, { headers: request.headers }))
}
