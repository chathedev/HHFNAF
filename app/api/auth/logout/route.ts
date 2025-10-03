"use server"

import { cookies } from "next/headers"
import { NextResponse } from "next/server"

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
export async function POST() {
  cookies().delete("editor-auth")
  return NextResponse.json({ success: true })
}
