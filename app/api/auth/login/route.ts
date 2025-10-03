"use server"

import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Sets a signed cookie if the email and password match the env vars.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // These environment variables should be set in your Vercel project settings
    // or .env.local for local development.
    const envEmail = process.env.AUTH_EMAIL
    const envPassword = process.env.AUTH_PASSWORD

    if (!email || !password || email !== envEmail || password !== envPassword) {
      return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 })
    }

    cookies().set({
      name: "editor-auth",
      value: "authenticated",
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
