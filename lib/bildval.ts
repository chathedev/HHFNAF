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
  no?: number // fixed display number, written the first time the photo is listed
}

export type NumberedPhoto = BildvalPhoto & { no: number; mini: string; web: string; thumb: string; orig: string }

// Sizes on disk: mini 240px (grid), thumb 720px, web 2400px (viewer), orig (as uploaded).
export const BILDVAL_SIZES = ["mini", "web", "thumb", "orig"] as const
export type BildvalSize = (typeof BILDVAL_SIZES)[number]

export function imgUrl(size: BildvalSize, photo: Pick<BildvalPhoto, "id" | "name">) {
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
  // A photo keeps the number it was first shown with (stored in its meta file), so removing
  // photos never renumbers the rest. New photos get the next free numbers, in folder then
  // file-name order. Both web processes compute the same order, so a race writes the same value.
  const byOrder = (a: BildvalPhoto, b: BildvalPhoto) =>
    a.addedAt - b.addedAt || a.album.localeCompare(b.album, "sv", { numeric: true }) || a.name.localeCompare(b.name, "sv", { numeric: true })
  const numbered = photos.filter((p) => Number.isInteger(p.no)).sort((a, b) => a.no! - b.no!)
  const fresh = photos.filter((p) => !Number.isInteger(p.no)).sort(byOrder)
  let next = numbered.reduce((max, p) => Math.max(max, p.no!), 0)
  for (const photo of fresh) {
    photo.no = ++next
    try {
      const target = path.join(BILDVAL_DIR, "meta", `${photo.id}.json`)
      const tmp = `${target}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
      await fs.writeFile(tmp, JSON.stringify(photo))
      await fs.rename(tmp, target)
    } catch {
      // read-only or racing: the number is still shown, and written on the next load
    }
  }
  return [...numbered, ...fresh].map((photo) => ({
    ...photo,
    no: photo.no!,
    mini: imgUrl("mini", photo),
    web: imgUrl("web", photo),
    thumb: imgUrl("thumb", photo),
    orig: imgUrl("orig", photo),
  }))
}
