"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import type { NumberedPhoto } from "@/lib/bildval"

export type SitePhoto = { code: string; where: string; label: string; src: string }

type Pending = { file: File; album: string }

const IMAGE_EXT = /\.(jpe?g|png|webp|tiff?|avif|heic|heif)$/i

// Walk a dropped folder (Finder drag) and collect its images, keeping the folder name as album.
async function filesFromEntry(entry: FileSystemEntry, album: string, out: Pending[]) {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject))
    if (IMAGE_EXT.test(file.name) || file.type.startsWith("image/")) out.push({ file, album })
    return
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    const name = album || entry.name
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject))
      if (!batch.length) break
      for (const child of batch) await filesFromEntry(child, name, out)
    }
  }
}

export function BildvalClient({ uploadKey, photos, site }: { uploadKey: string; photos: NumberedPhoto[]; site: SitePhoto[] }) {
  const router = useRouter()
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number; errors: string[] } | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [openSite, setOpenSite] = useState<SitePhoto | null>(null)
  const folderInput = useRef<HTMLInputElement>(null)

  const albums = useMemo(() => {
    const map = new Map<string, NumberedPhoto[]>()
    for (const p of photos) {
      if (!map.has(p.album)) map.set(p.album, [])
      map.get(p.album)!.push(p)
    }
    return Array.from(map.entries())
  }, [photos])

  const upload = useCallback(
    async (items: Pending[]) => {
      if (!items.length) return
      const state = { done: 0, total: items.length, errors: [] as string[] }
      setProgress({ ...state })
      let next = 0
      const worker = async () => {
        while (next < items.length) {
          const item = items[next++]
          const body = new FormData()
          body.append("file", item.file)
          body.append("album", item.album)
          try {
            const res = await fetch(`/api/bildval/${uploadKey}/upload`, { method: "POST", body })
            if (!res.ok) {
              const data = await res.json().catch(() => null)
              state.errors.push(data?.error || `${item.file.name}: fel ${res.status}`)
            }
          } catch {
            state.errors.push(`${item.file.name}: nätverksfel`)
          }
          state.done += 1
          setProgress({ ...state, errors: [...state.errors] })
        }
      }
      await Promise.all([worker(), worker(), worker()])
      router.refresh()
    },
    [router, uploadKey],
  )

  const onDrop = async (event: React.DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const out: Pending[] = []
    const entries = Array.from(event.dataTransfer.items)
      .map((item) => (item.kind === "file" ? item.webkitGetAsEntry?.() : null))
      .filter(Boolean) as FileSystemEntry[]
    if (entries.length) {
      for (const entry of entries) await filesFromEntry(entry, "", out)
    } else {
      for (const file of Array.from(event.dataTransfer.files)) out.push({ file, album: "Utan mapp" })
    }
    upload(out)
  }

  const onPick = (list: FileList | null) => {
    if (!list) return
    const out: Pending[] = []
    for (const file of Array.from(list)) {
      if (!(IMAGE_EXT.test(file.name) || file.type.startsWith("image/"))) continue
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || ""
      const parts = rel.split("/")
      out.push({ file, album: parts.length > 1 ? parts[parts.length - 2] : "Utan mapp" })
    }
    upload(out)
  }

  // Keyboard in the viewer: arrows step, Escape closes.
  useEffect(() => {
    if (open == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null)
      if (e.key === "ArrowRight") setOpen((i) => (i == null ? i : Math.min(photos.length - 1, i + 1)))
      if (e.key === "ArrowLeft") setOpen((i) => (i == null ? i : Math.max(0, i - 1)))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, photos.length])

  const current = open != null ? photos[open] : null
  const busy = progress != null && progress.done < progress.total

  return (
    <main
      className="min-h-screen bg-white px-4 pb-16 pt-8"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Härnösands HF</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Bildval</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Nya bilder har ett nummer, bilderna på sajten nu har en kod (S1, S2 …). Säg till exempel <span className="font-semibold text-slate-950">”byt S1 mot 12”</span>, så byter
          jag. Sidan är inte länkad någonstans och syns inte på Google.
        </p>

        <div
          className={`mt-6 flex flex-col items-center justify-center gap-3 border-2 border-dashed px-4 py-8 text-center transition ${
            dragging ? "border-emerald-600 bg-emerald-50" : "border-slate-300 bg-slate-50"
          }`}
        >
          <p className="text-sm font-semibold text-slate-950">Dra in mappar eller bilder här</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => folderInput.current?.click()}
              className="bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Välj mapp
            </button>
            <label className="cursor-pointer border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-slate-950">
              Välj bilder
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPick(e.target.files)} />
            </label>
            <input
              ref={folderInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            />
          </div>
          {progress && (
            <div className="w-full max-w-sm">
              <div className="h-1.5 w-full bg-slate-200">
                <div className="h-1.5 bg-emerald-600 transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {busy ? `Laddar upp ${progress.done} av ${progress.total}` : `Klart: ${progress.total - progress.errors.length} av ${progress.total} bilder`}
              </p>
              {progress.errors.length > 0 && (
                <ul className="mt-1 text-left text-xs text-rose-700">
                  {progress.errors.slice(0, 8).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <section className="mt-10">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Nya bilder · {photos.length}</h2>
          {!photos.length && <p className="mt-3 text-sm text-slate-500">Inga bilder än. Dra in mapparna ovanför.</p>}
          {albums.map(([album, list]) => (
            <div key={album} className="mt-5">
              <p className="mb-2 text-sm font-semibold text-slate-950">
                {album} <span className="font-normal text-slate-400">· {list.length}</span>
              </p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setOpen(photos.indexOf(p))} className="group relative block w-full overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.thumb} alt={p.name} loading="lazy" className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]" />
                      <span className="absolute left-1.5 top-1.5 bg-slate-950 px-2 py-0.5 text-sm font-black tabular-nums text-white">{p.no}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Bilderna på sajten nu</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {site.map((s) => (
              <li key={s.code}>
                <button type="button" onClick={() => setOpenSite(s)} className="relative block w-full overflow-hidden bg-slate-100 text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt={s.label} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 bg-emerald-700 px-2 py-0.5 text-sm font-black text-white">{s.code}</span>
                </button>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="text-slate-400">{s.where} · </span>
                  {s.label}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {current && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <p className="min-w-0 truncate text-sm">
              <span className="mr-2 bg-white px-2 py-0.5 font-black tabular-nums text-slate-950">{current.no}</span>
              <span className="text-white/70">
                {current.album} · {current.name}
              </span>
            </p>
            <div className="flex shrink-0 items-center gap-4 text-sm">
              <a href={current.orig} target="_blank" rel="noreferrer" className="text-white/70 underline-offset-2 hover:text-white hover:underline">
                Original
              </a>
              <button type="button" onClick={() => setOpen(null)} className="text-white/70 hover:text-white">
                Stäng
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.web} alt={current.name} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
            {open! > 0 && (
              <button
                type="button"
                aria-label="Föregående"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(open! - 1)
                }}
                className="absolute left-0 top-0 h-full w-1/4 text-left text-4xl text-white/40 hover:text-white"
              >
                <span className="pl-3">‹</span>
              </button>
            )}
            {open! < photos.length - 1 && (
              <button
                type="button"
                aria-label="Nästa"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(open! + 1)
                }}
                className="absolute right-0 top-0 h-full w-1/4 text-right text-4xl text-white/40 hover:text-white"
              >
                <span className="pr-3">›</span>
              </button>
            )}
          </div>
        </div>
      )}

      {openSite && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setOpenSite(null)}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
            <p className="min-w-0 truncate text-sm">
              <span className="mr-2 bg-emerald-600 px-2 py-0.5 font-black">{openSite.code}</span>
              <span className="text-white/70">
                {openSite.where} · {openSite.label}
              </span>
            </p>
            <button type="button" className="text-sm text-white/70 hover:text-white">
              Stäng
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={openSite.src} alt={openSite.label} className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      )}
    </main>
  )
}
