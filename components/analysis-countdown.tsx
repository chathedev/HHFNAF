"use client"

import { useEffect, useRef, useState } from "react"

// Live countdown for an analysis that is still running on the tracking server.
// Speed is measured from how fast the analysed video time advances (last ~2 min),
// so the estimate follows the real machine load instead of a fixed guess.

type Meta = {
  status?: string
  progress?: number | null
  lastT?: number | null
  duration?: number | null
  updatedAt?: number | null
  startedAt?: number | null
  live?: boolean
}

type Sample = { at: number; t: number } // server seconds, analysed video seconds

const fmt = (s: number) => {
  const v = Math.max(0, Math.round(s))
  const h = Math.floor(v / 3600)
  const m = Math.floor((v % 3600) / 60)
  const sec = v % 60
  const mm = String(m).padStart(h ? 2 : 1, "0")
  return h ? `${h}:${mm}:${String(sec).padStart(2, "0")}` : `${mm}:${String(sec).padStart(2, "0")}`
}

const clock = (d: Date) => d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })

export function AnalysisCountdown({ id, compact = false }: { id: string; compact?: boolean }) {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const samples = useRef<Sample[]>([])
  const skew = useRef(0) // server clock minus browser clock, seconds
  const speedRef = useRef(0)
  const finishRef = useRef<number | null>(null) // server time (s) when the analysis should be done

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch(`/api/tracking/${encodeURIComponent(id)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: { meta?: Meta; serverTime?: number }) => {
          if (cancelled || !d.meta) return
          if (typeof d.serverTime === "number") skew.current = d.serverTime - Date.now() / 1000
          const m = d.meta
          if (typeof m.updatedAt === "number" && typeof m.lastT === "number") {
            const list = samples.current
            if (!list.length || list[list.length - 1].at !== m.updatedAt) list.push({ at: m.updatedAt, t: m.lastT })
            while (list.length > 2 && m.updatedAt - list[0].at > 180) list.shift()
            // speed = analysed video seconds per real second: the whole run's average,
            // blended with the last minutes once there are enough of them
            let whole = 0
            if (m.startedAt && m.updatedAt > m.startedAt + 20) whole = m.lastT / (m.updatedAt - m.startedAt)
            let recent = 0
            const a = list[0]
            const b = list[list.length - 1]
            if (b.at - a.at >= 60) recent = (b.t - a.t) / (b.at - a.at)
            const v = recent > 0 && whole > 0 ? 0.5 * recent + 0.5 * whole : recent || whole
            if (v > 0 && m.duration) {
              speedRef.current = v
              const target = m.updatedAt + (m.duration - m.lastT) / v   // server time when done
              const cur = finishRef.current
              // glide towards a new estimate so the clock keeps ticking evenly
              finishRef.current = cur === null ? target : cur + Math.max(-8, Math.min(8, target - cur))
            }
          }
          setMeta(m)
        })
        .catch(() => undefined)
    load()
    const poll = setInterval(load, 4000)
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      cancelled = true
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [id])

  if (!meta) return null
  const running = meta.status === "processing" || meta.status === "starting"
  if (!running) return null

  const duration = meta.duration ?? 0
  const lastT = meta.lastT ?? 0
  const serverNow = now / 1000 + skew.current
  const stale = meta.updatedAt ? serverNow - meta.updatedAt > 45 : false
  const speed = speedRef.current
  const remaining = finishRef.current !== null ? finishRef.current - serverNow : null
  const pct = Math.min(100, Math.max(0, duration > 0 ? (lastT / duration) * 100 : (meta.progress ?? 0) * 100))
  const done = remaining !== null ? new Date(now + Math.max(0, remaining) * 1000) : null

  if (compact) {
    return (
      <span className="tabular-nums">
        {remaining !== null ? `${fmt(remaining)} kvar` : "Beräknar tid"} · {Math.round(pct)} %
      </span>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">{stale ? "Analysen svarar inte just nu" : "Analyseras"}</p>
        <p className="text-3xl font-bold tabular-nums text-slate-900">
          {remaining !== null && !stale ? fmt(remaining) : "--:--"}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500 tabular-nums">
        {Math.round(pct)} % klart. {fmt(lastT)} av {fmt(duration)} video analyserad
        {speed > 0 ? `, ${speed.toFixed(2)} gånger realtid` : ""}
        {done && !stale ? `. Klar cirka ${clock(done)}` : ""}
      </p>
    </div>
  )
}
