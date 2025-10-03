import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("editor-auth")

  if (authCookie && authCookie.value === "authenticated") {
    return NextResponse.json({ authenticated: true })
  } else {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
