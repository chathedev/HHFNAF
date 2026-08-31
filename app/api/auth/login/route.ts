"use server"

import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

/**
 * POST /api/auth/login
 * Body: { password: string, email?: string }
 * Sets the auth cookie when the password matches AUTH_PASSWORD (and, when
 * AUTH_EMAIL is configured, the email matches too). The cookie value is the
 * server-secret AUTH_COOKIE_TOKEN so it cannot be forged by setting a
 * well-known static string.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    const envEmail = process.env.AUTH_EMAIL
    const envPassword = process.env.AUTH_PASSWORD
    const cookieToken = process.env.AUTH_COOKIE_TOKEN || "authenticated"

    if (!envPassword) {
      return NextResponse.json({ success: false, error: "Login är inte konfigurerat." }, { status: 500 })
    }
    if (!password || password !== envPassword) {
      return NextResponse.json({ success: false, error: "Fel lösenord." }, { status: 401 })
    }
    if (envEmail && email && email !== envEmail) {
      return NextResponse.json({ success: false, error: "Fel uppgifter." }, { status: 401 })
    }

    const cookieStore = await cookies()
    cookieStore.set({
      name: "editor-auth",
      value: cookieToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Login API error:", error)
    return NextResponse.json({ success: false, error: "An unexpected error occurred." }, { status: 500 })
  }
}
