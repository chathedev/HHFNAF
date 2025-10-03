// app/api/revalidate/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret")

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 })
  }

  try {
    revalidatePath("/")
    console.log("ℹ️ ISR revalidated for /")
    return NextResponse.json({ revalidated: true, now: Date.now() })
  } catch (err) {
    console.error("❌ Revalidate error:", err)
    return NextResponse.json({ revalidated: false, message: "Error revalidating" }, { status: 500 })
  }
}
