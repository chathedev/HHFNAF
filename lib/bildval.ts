import { promises as fs } from "fs"
import path from "path"

// Hidden photo picker (/bildval-<KEY>): Charlie drops photo folders in, sees them all numbered
// next to the photos the site uses now, and says which to swap. Open to anyone with the link,
// so the link itself is the key. Files live outside the app so releases never touch them.
export const BILDVAL_KEY = "dx3w0rny"
export const BILDVAL_PATH = `/bildval-${BILDVAL_KEY}`
export const BILDVAL_DIR = process.env.BILDVAL_DIR || "/srv/hhf-bildval"

export type BildvalPhoto = {
  id: string // content hash, also the file name stem
  name: string // original file name
  album: string // folder it came from
  width: number
  height: number
  bytes: number
  addedAt: number
}

export type NumberedPhoto = BildvalPhoto & { no: number; web: string; thumb: string; orig: string }

export function imgUrl(size: "web" | "thumb" | "orig", photo: Pick<BildvalPhoto, "id" | "name">) {
  const ext = size === "orig" ? path.extname(photo.name).toLowerCase() || ".jpg" : ".webp"
  return `/api/bildval/${BILDVAL_KEY}/img/${size}/${photo.id}${ext}`
}

/** Every uploaded photo, numbered 1..n by upload time (then name), so numbers never move. */
export async function listPhotos(): Promise<NumberedPhoto[]> {
  let files: string[] = []
  try {
    files = await fs.readdir(path.join(BILDVAL_DIR, "meta"))
  } catch {
    return []
  }
  const photos: BildvalPhoto[] = []
  for (const file of files) {
    if (!file.endsWith(".json")) continue
    try {
      photos.push(JSON.parse(await fs.readFile(path.join(BILDVAL_DIR, "meta", file), "utf8")))
    } catch {
      // half-written or broken meta file: skip it
    }
  }
  photos.sort((a, b) => a.addedAt - b.addedAt || a.album.localeCompare(b.album, "sv") || a.name.localeCompare(b.name, "sv", { numeric: true }))
  return photos.map((photo, i) => ({ ...photo, no: i + 1, web: imgUrl("web", photo), thumb: imgUrl("thumb", photo), orig: imgUrl("orig", photo) }))
}
