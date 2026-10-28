import { promises as fs } from "fs"
import path from "path"
import { type NextRequest, NextResponse } from "next/server"

import { BILDVAL_DIR, BILDVAL_KEY } from "@/lib/bildval"

export const runtime = "nodejs"

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".avif": "image/avif",
  ".heic": "image/heic",
  ".heif": "image/heif",
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string; size: string; file: string }> }) {
  const { key, size, file } = await params
  if (key !== BILDVAL_KEY || !["web", "thumb", "orig"].includes(size) || !/^[a-f0-9]{20}\.[a-z]{3,4}$/.test(file)) {
    return new NextResponse("not found", { status: 404 })
  }
  try {
    const data = await fs.readFile(path.join(BILDVAL_DIR, size, file))
    const ext = path.extname(file)
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext] || "application/octet-stream",
        // Content-addressed: the same name always means the same bytes.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Robots-Tag": "noindex",
        ...(size === "orig" ? { "Content-Disposition": `inline; filename="${file}"` } : {}),
      },
    })
  } catch {
    return new NextResponse("not found", { status: 404 })
  }
}
