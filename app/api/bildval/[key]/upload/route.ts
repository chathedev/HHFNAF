import { createHash } from "crypto"
import { promises as fs } from "fs"
import path from "path"
import { type NextRequest, NextResponse } from "next/server"
import sharp from "sharp"

import { BILDVAL_DIR, BILDVAL_KEY, imgUrl, type BildvalPhoto } from "@/lib/bildval"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_BYTES = 40 * 1024 * 1024
const OK_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif", ".heic", ".heif"])

function clean(value: string, max = 120) {
  return value.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max)
}

// One photo per request (the page sends them one by one). Same photo twice = same hash = kept once.
export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  if (key !== BILDVAL_KEY) return NextResponse.json({ error: "not found" }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Kunde inte läsa filen." }, { status: 400 })
  }
  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "Ingen fil." }, { status: 400 })
  const name = clean(path.basename(file.name || "bild.jpg")) || "bild.jpg"
  const album = clean(String(form.get("album") || ""), 80) || "Utan mapp"
  const ext = path.extname(name).toLowerCase()
  if (!OK_EXT.has(ext) && !String(file.type).startsWith("image/")) {
    return NextResponse.json({ error: `${name} är ingen bild.` }, { status: 415 })
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: `${name} är större än 40 MB.` }, { status: 413 })

  const buf = Buffer.from(await file.arrayBuffer())
  const id = createHash("sha256").update(buf).digest("hex").slice(0, 20)
  const metaPath = path.join(BILDVAL_DIR, "meta", `${id}.json`)
  try {
    const existing = JSON.parse(await fs.readFile(metaPath, "utf8")) as BildvalPhoto
    return NextResponse.json({ ok: true, duplicate: true, id: existing.id })
  } catch {
    // new photo
  }

  let width = 0
  let height = 0
  try {
    const base = sharp(buf, { failOn: "none" }).rotate()
    const web = await base.clone().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true })
    const thumb = await base.clone().resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true }).webp({ quality: 74 }).toBuffer()
    width = web.info.width
    height = web.info.height
    await fs.mkdir(path.join(BILDVAL_DIR, "web"), { recursive: true })
    await fs.mkdir(path.join(BILDVAL_DIR, "thumb"), { recursive: true })
    await fs.mkdir(path.join(BILDVAL_DIR, "orig"), { recursive: true })
    await fs.mkdir(path.join(BILDVAL_DIR, "meta"), { recursive: true })
    await fs.writeFile(path.join(BILDVAL_DIR, "web", `${id}.webp`), web.data)
    await fs.writeFile(path.join(BILDVAL_DIR, "thumb", `${id}.webp`), thumb)
    await fs.writeFile(path.join(BILDVAL_DIR, "orig", `${id}${ext || ".jpg"}`), buf)
  } catch {
    const heic = ext === ".heic" || ext === ".heif"
    return NextResponse.json(
      { error: heic ? `${name} är HEIC. Exportera som JPG och dra in igen.` : `${name} gick inte att läsa som bild.` },
      { status: 415 },
    )
  }

  const photo: BildvalPhoto = { id, name, album, width, height, bytes: buf.length, addedAt: Date.now() }
  // Write meta last and atomically, so a photo only shows once all its files exist.
  const tmp = `${metaPath}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(photo))
  await fs.rename(tmp, metaPath)
  return NextResponse.json({ ok: true, id, thumb: imgUrl("thumb", photo) })
}
