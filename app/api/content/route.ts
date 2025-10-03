import { NextResponse } from "next/server"
import { getAllContentFiles } from "@/lib/content-loader"

export async function GET() {
  try {
    const files = getAllContentFiles()
    return NextResponse.json({ files })
  } catch (error) {
    console.error("Error listing content files:", error)
    return NextResponse.json({ error: "Failed to list content files" }, { status: 500 })
  }
}
