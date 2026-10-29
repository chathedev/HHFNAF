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
    const name = album ? `${album}/${entry.name}` : entry.name
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

  const [big, setBig] = useState(false)
  useEffect(() => {
    try {
      setBig(localStorage.getItem("bildval-size") === "big")
    } catch {
      // storage blocked: keep small
    }
  }, [])
  const toggleSize = () =>
    setBig((v) => {
      try {
        localStorage.setItem("bildval-size", v ? "small" : "big")
      } catch {
        // storage blocked: still switch for this visit
      }
      return !v
    })

  // Top level of every album path is the team folder (P16, F16 …), shown as tabs. Teams are
  // ordered by their oldest photo, so a new team folder lands after the existing ones.
  const teams = useMemo(() => {
    const first = new Map<string, { count: number; minNo: number }>()
    for (const p of photos) {
      const t = p.album.split("/")[0] || "Utan mapp"
      const cur = first.get(t) || { count: 0, minNo: Infinity }
      first.set(t, { count: cur.count + 1, minNo: Math.min(cur.minNo, p.no) })
    }
    return Array.from(first.entries())
      .sort((a, b) => a[1].minNo - b[1].minNo)
      .map(([name, v]) => ({ name, count: v.count }))
  }, [photos])

  const [teamPick, setTeamPick] = useState<string | null>(null)
  useEffect(() => {
    try {
      setTeamPick(localStorage.getItem("bildval-team"))
    } catch {
      // storage blocked: start on the first team
    }
  }, [])
  const team = teams.some((t) => t.name === teamPick) ? teamPick! : teams[0]?.name || ""
  const pickTeam = (name: string) => {
    setTeamPick(name)
    setOpen(null)
    try {
      localStorage.setItem("bildval-team", name)
    } catch {
      // storage blocked: still switch for this visit
    }
  }

  // Inside the team: main folder -> sub folders -> photos. Folders sort by name,
  // so "Pojkar" comes before "Pojkar 2" and "Dag 1" before "Dag 2".
  const groups = useMemo(() => {
    const mains = new Map<string, Map<string, NumberedPhoto[]>>()
    for (const p of photos) {
      const [t, ...path] = p.album.split("/")
      if ((t || "Utan mapp") !== team) continue
      const [main = "Övrigt", ...rest] = path.length ? path : ["Övrigt"]
      const sub = rest.join(" / ")
      if (!mains.has(main)) mains.set(main, new Map())
      const subs = mains.get(main)!
      if (!subs.has(sub)) subs.set(sub, [])
      subs.get(sub)!.push(p)
    }
    return Array.from(mains.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "sv", { numeric: true }))
      .map(([main, subs]) => {
      const list = Array.from(subs.entries())
        .sort((a, b) => a[0].localeCompare(b[0], "sv", { numeric: true }))
        .map(([sub, items]) => ({ sub, items }))
      return { main, subs: list, count: list.reduce((n, s) => n + s.items.length, 0) }
    })
  }, [photos, team])

  // The viewer steps through photos in the order they are shown on the page.
  const ordered = useMemo(() => groups.flatMap((g) => g.subs.flatMap((s) => s.items)), [groups])
  const position = useMemo(() => new Map(ordered.map((p, i) => [p.id, i])), [ordered])
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
          // A dropped folder already named after a team (e.g. "F16") keeps its own path.
          const own = teams.some((t) => t.name === item.album.split("/")[0])
          body.append("album", team && !own ? `${team}/${item.album}` : item.album)
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
    [router, uploadKey, team, teams],
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
      out.push({ file, album: parts.length > 1 ? parts.slice(0, -1).join("/") : "Utan mapp" })
    }
    upload(out)
  }

  const total = ordered.length
  const step = useCallback((d: number) => setOpen((i) => (i == null ? i : Math.min(total - 1, Math.max(0, i + d)))), [total])

  // Viewer: arrows step, Escape closes, page behind does not scroll.
  useEffect(() => {
    if (open == null && openSite == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null)
        setOpenSite(null)
      }
      if (open != null && e.key === "ArrowRight") step(1)
      if (open != null && e.key === "ArrowLeft") step(-1)
    }
    window.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
  }, [open, openSite, step])

  const current = open != null ? ordered[open] : null

  // Load the neighbours in the background so stepping is instant.
  useEffect(() => {
    if (open == null) return
    for (const d of [1, -1, 2]) {
      const p = ordered[open + d]
      if (p) new window.Image().src = p.web
    }
  }, [open, ordered])

  const touchX = useRef<number | null>(null)
  const busy = progress != null && progress.done < progress.total
  const grid = big ? "grid-cols-3 sm:grid-cols-5 lg:grid-cols-7" : "grid-cols-5 sm:grid-cols-8 lg:grid-cols-12"

  return (
    <main
      className="min-h-screen bg-white px-3 pb-16 pt-6 sm:px-4"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Härnösands HF</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Bildval</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => folderInput.current?.click()}
              className="bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Lägg till mapp
            </button>
            <label className="cursor-pointer border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:border-slate-950">
              Lägg till bilder
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
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Nya bilder har ett nummer, bilderna på sajten nu har en kod (S1, S2 …). Säg till exempel <span className="font-semibold text-slate-950">”byt S1 mot 12”</span>. Klicka på
          en bild för helskärm och bläddra med pilarna eller genom att svepa. Du kan också dra in mappar var som helst på sidan, de hamnar under fliken du står på (P16, F16 …).
        </p>

        {(dragging || progress) && (
          <div className={`mt-4 border-2 border-dashed px-4 py-4 text-center ${dragging ? "border-emerald-600 bg-emerald-50" : "border-slate-300 bg-slate-50"}`}>
            {dragging && <p className="text-sm font-semibold text-slate-950">Släpp för att ladda upp</p>}
            {progress && (
              <div className="mx-auto w-full max-w-sm">
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
        )}

        {teams.length > 0 && (
          <div className="mt-5 flex gap-1" role="tablist" aria-label="Lag">
            {teams.map((t) => (
              <button
                key={t.name}
                type="button"
                role="tab"
                aria-selected={t.name === team}
                onClick={() => pickTeam(t.name)}
                className={`px-3 py-1.5 text-sm font-bold transition ${
                  t.name === team ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t.name} <span className={`font-normal ${t.name === team ? "text-white/60" : "text-slate-500"}`}>{t.count}</span>
              </button>
            ))}
          </div>
        )}

        <nav className="sticky top-0 z-20 -mx-3 mt-2 flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4">
          {groups.map((g, gi) => (
            <a key={g.main} href={`#mapp-${gi}`} className="shrink-0 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200">
              {g.main} <span className="font-normal text-slate-500">{g.count}</span>
            </a>
          ))}
          <a href="#pa-sajten" className="shrink-0 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
            På sajten nu <span className="font-normal text-emerald-700/70">{site.length}</span>
          </a>
          <button type="button" onClick={toggleSize} className="ml-auto shrink-0 border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-950">
            {big ? "Mindre bilder" : "Större bilder"}
          </button>
        </nav>

        {!total && <p className="mt-6 text-sm text-slate-500">Inga bilder än. Dra in mappar på sidan.</p>}

        {groups.map((g, gi) => (
          <details key={g.main} id={`mapp-${gi}`} open className="group/main mt-6 scroll-mt-14">
            <summary className="flex cursor-pointer list-none items-baseline gap-2 select-none">
              <span className="text-slate-400 transition group-open/main:rotate-90">›</span>
              <span className="text-lg font-black tracking-tight text-slate-950">{g.main}</span>
              <span className="text-sm text-slate-500">{g.count} bilder</span>
            </summary>
            {g.subs.map((s) => (
              <section key={s.sub} className="mt-3" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 400px" }}>
                {s.sub && (
                  <p className="mb-1.5 text-xs font-semibold text-slate-700">
                    {s.sub} <span className="font-normal text-slate-400">· {s.items.length}</span>
                  </p>
                )}
                <ul className={`grid gap-1 ${grid}`}>
                  {s.items.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setOpen(position.get(p.id) ?? 0)}
                        className="relative block w-full overflow-hidden bg-slate-100 outline-offset-2 hover:opacity-90"
                        title={`${p.no} · ${p.album}/${p.name}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={big ? p.thumb : p.mini} alt={p.name} loading="lazy" decoding="async" width={240} height={240} className="aspect-square w-full object-cover" />
                        <span className="absolute left-0 top-0 bg-slate-950/85 px-1 text-[10px] font-bold leading-4 tabular-nums text-white">{p.no}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </details>
        ))}

        <section id="pa-sajten" className="mt-10 scroll-mt-14">
          <h2 className="text-lg font-black tracking-tight text-slate-950">
            Bilderna på sajten nu <span className="text-sm font-normal text-slate-500">{site.length}</span>
          </h2>
          <ul className={`mt-2 grid gap-1 ${big ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6" : "grid-cols-3 sm:grid-cols-6 lg:grid-cols-8"}`}>
            {site.map((s) => (
              <li key={s.code}>
                <button type="button" onClick={() => setOpenSite(s)} className="relative block w-full overflow-hidden bg-slate-100 text-left hover:opacity-90">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt={s.label} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
                  <span className="absolute left-0 top-0 bg-emerald-700 px-1 text-[10px] font-bold leading-4 text-white">{s.code}</span>
                </button>
                <p className="mt-0.5 truncate text-[11px] text-slate-600">
                  <span className="text-slate-400">{s.where} · </span>
                  {s.label}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {current && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black"
          onClick={() => setOpen(null)}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current == null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            touchX.current = null
            if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1)
          }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-white" onClick={(e) => e.stopPropagation()}>
            <p className="flex min-w-0 items-center gap-2 text-sm">
              <span className="shrink-0 bg-white px-2 py-0.5 font-black tabular-nums text-slate-950">{current.no}</span>
              <span className="truncate text-white/60">
                {open! + 1} / {total}
              </span>
            </p>
            <div className="flex shrink-0 items-center gap-4 text-sm">
              <a href={current.orig} target="_blank" rel="noreferrer" className="text-white/70 underline-offset-2 hover:text-white hover:underline">
                Öppna fil
              </a>
              <button type="button" onClick={() => setOpen(null)} className="text-white/70 hover:text-white">
                Stäng
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={current.id} src={current.web} alt={current.name} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
            {open! > 0 && (
              <button
                type="button"
                aria-label="Föregående"
                onClick={(e) => {
                  e.stopPropagation()
                  step(-1)
                }}
                className="absolute left-0 top-0 hidden h-full w-1/5 text-left text-5xl text-white/30 hover:text-white sm:block"
              >
                <span className="pl-4">‹</span>
              </button>
            )}
            {open! < total - 1 && (
              <button
                type="button"
                aria-label="Nästa"
                onClick={(e) => {
                  e.stopPropagation()
                  step(1)
                }}
                className="absolute right-0 top-0 hidden h-full w-1/5 text-right text-5xl text-white/30 hover:text-white sm:block"
              >
                <span className="pr-4">›</span>
              </button>
            )}
          </div>
          <div className="grid gap-x-6 gap-y-0.5 px-4 py-2.5 text-xs text-white/60 sm:grid-cols-[auto_1fr]" onClick={(e) => e.stopPropagation()}>
            <span className="text-white/40">Mapp</span>
            <span className="truncate text-white/85">{current.album}</span>
            <span className="text-white/40">Fil</span>
            <span className="truncate">
              {current.name} · {current.width}×{current.height}
            </span>
            <span className="text-white/40">På servern</span>
            <span className="truncate font-mono text-[11px]">
              /srv/hhf-bildval/orig/{current.id}
              {(current.name.match(/\.[a-z0-9]+$/i)?.[0] || ".jpg").toLowerCase()}
            </span>
          </div>
        </div>
      )}

      {openSite && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={() => setOpenSite(null)}>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-white">
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
          <p className="px-4 pb-3 font-mono text-[11px] text-white/50">/root/HHFNAF/public{decodeURIComponent(openSite.src)}</p>
        </div>
      )}
    </main>
  )
}
