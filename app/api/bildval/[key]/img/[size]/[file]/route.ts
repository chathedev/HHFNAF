import { promises as fs } from "fs"
import path from "path"
import { type NextRequest, NextResponse } from "next/server"

import sharp from "sharp"

import { BILDVAL_DIR, BILDVAL_KEY, BILDVAL_SIZES } from "@/lib/bildval"

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
  if (key !== BILDVAL_KEY || !(BILDVAL_SIZES as readonly string[]).includes(size) || !/^[a-f0-9]{20}\.[a-z]{3,4}$/.test(file)) {
    return new NextResponse("not found", { status: 404 })
  }
  try {
    let data: Buffer
    try {
      data = await fs.readFile(path.join(BILDVAL_DIR, size, file))
    } catch (err) {
      // Photos uploaded before the 240px grid size existed: make it once from the 720px thumb.
      if (size !== "mini") throw err
      data = await sharp(await fs.readFile(path.join(BILDVAL_DIR, "thumb", file)))
        .resize({ width: 240, height: 240, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 62 })
        .toBuffer()
      await fs.mkdir(path.join(BILDVAL_DIR, "mini"), { recursive: true })
      const tmp = path.join(BILDVAL_DIR, "mini", `${file}.${process.pid}.tmp`)
      await fs.writeFile(tmp, data)
      await fs.rename(tmp, path.join(BILDVAL_DIR, "mini", file))
    }
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
