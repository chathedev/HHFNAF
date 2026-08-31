import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const authCookie = cookieStore.get("editor-auth")
    const cookieToken = process.env.AUTH_COOKIE_TOKEN || "authenticated"

    if (authCookie && authCookie.value === cookieToken) {
      return NextResponse.json({ authenticated: true })
    }

    return NextResponse.json({ authenticated: false }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
