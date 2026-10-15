import { NextResponse } from "next/server"
import { getServerBuildId } from "@/lib/build-id"

// The build this server process is running. Open pages compare it with the build they
// loaded and reload themselves after a release (components/build-refresh.tsx).
export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json(
    { buildId: getServerBuildId() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  )
}
