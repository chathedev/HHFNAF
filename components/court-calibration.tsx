"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

// Click calibration: pair known court points (in metres) with where they are in a
// video frame. Four or more well spread pairs give the court-to-image mapping; the
// court is drawn on the frame at once so a wrong click is visible immediately.

type Pair = { key: string; world: [number, number]; px: [number, number] }
export type CalibrationKeyframe = { t: number; image: string; width: number; height: number; pairs: Pair[] }

type Landmark = { key: string; label: string; world: [number, number] }

const LANDMARKS: Landmark[] = [
  { key: "mid-f", label: "Mittlinjen vid bortre sidlinjen", world: [20, 0] },
  { key: "mid-n", label: "Mittlinjen vid närmre sidlinjen", world: [20, 20] },
  { key: "gl-n", label: "Vänster mål, närmre stolpen (golvet)", world: [0, 11.5] },
  { key: "gl-f", label: "Vänster mål, bortre stolpen (golvet)", world: [0, 8.5] },
  { key: "gr-n", label: "Höger mål, närmre stolpen (golvet)", world: [40, 11.5] },
  { key: "gr-f", label: "Höger mål, bortre stolpen (golvet)", world: [40, 8.5] },
  { key: "6l-f", label: "Vänster 6 m möter mållinjen, bortre", world: [0, 2.5] },
  { key: "6l-n", label: "Vänster 6 m möter mållinjen, närmre", world: [0, 17.5] },
  { key: "6r-f", label: "Höger 6 m möter mållinjen, bortre", world: [40, 2.5] },
  { key: "6r-n", label: "Höger 6 m möter mållinjen, närmre", world: [40, 17.5] },
  { key: "c-fl", label: "Bortre vänstra hörnet", world: [0, 0] },
  { key: "c-nl", label: "Närmre vänstra hörnet", world: [0, 20] },
  { key: "c-fr", label: "Bortre högra hörnet", world: [40, 0] },
  { key: "c-nr", label: "Närmre högra hörnet", world: [40, 20] },
  { key: "9l-f", label: "Vänster 9 m möter bortre sidlinjen", world: [2.958, 0] },
  { key: "9l-n", label: "Vänster 9 m möter närmre sidlinjen", world: [2.958, 20] },
  { key: "9r-f", label: "Höger 9 m möter bortre sidlinjen", world: [37.042, 0] },
  { key: "9r-n", label: "Höger 9 m möter närmre sidlinjen", world: [37.042, 20] },
  { key: "6l-sf", label: "Vänster 6 m, raka delens bortre ände", world: [6, 8.5] },
  { key: "6l-sn", label: "Vänster 6 m, raka delens närmre ände", world: [6, 11.5] },
  { key: "6r-sf", label: "Höger 6 m, raka delens bortre ände", world: [34, 8.5] },
  { key: "6r-sn", label: "Höger 6 m, raka delens närmre ände", world: [34, 11.5] },
  { key: "7l", label: "Vänster 7-metersstreck (mitten)", world: [7, 10] },
  { key: "7r", label: "Höger 7-metersstreck (mitten)", world: [33, 10] },
  { key: "4l", label: "Vänster 4-metersstreck", world: [4, 10] },
  { key: "4r", label: "Höger 4-metersstreck", world: [36, 10] },
]

// ---- homography (court metres -> image px) by normalised DLT, least squares ----
type Mat3 = number[]

function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    if (Math.abs(M[p][c]) < 1e-12) return null
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((row, i) => row[n] / row[i])
}

function normaliser(pts: [number, number][]) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  const d = pts.reduce((s, p) => s + Math.hypot(p[0] - cx, p[1] - cy), 0) / pts.length || 1
  const s = Math.SQRT2 / d
  return { apply: (p: [number, number]): [number, number] => [(p[0] - cx) * s, (p[1] - cy) * s], s, cx, cy }
}

export function homography(pairs: Pair[]): Mat3 | null {
  if (pairs.length < 4) return null
  const nw = normaliser(pairs.map((p) => p.world))
  const ni = normaliser(pairs.map((p) => p.px))
  const AtA = Array.from({ length: 8 }, () => new Array(8).fill(0))
  const Atb = new Array(8).fill(0)
  for (const p of pairs) {
    const [x, y] = nw.apply(p.world)
    const [u, v] = ni.apply(p.px)
    const rows: [number[], number][] = [
      [[x, y, 1, 0, 0, 0, -u * x, -u * y], u],
      [[0, 0, 0, x, y, 1, -v * x, -v * y], v],
    ]
    for (const [r, t] of rows) {
      for (let i = 0; i < 8; i++) {
        Atb[i] += r[i] * t
        for (let j = 0; j < 8; j++) AtA[i][j] += r[i] * r[j]
      }
    }
  }
  const h = solve(AtA, Atb)
  if (!h) return null
  const Hn = [...h, 1]
  // undo the normalisation: H = Ti^-1 * Hn * Tw
  const Tw = [nw.s, 0, -nw.s * nw.cx, 0, nw.s, -nw.s * nw.cy, 0, 0, 1]
  const TiInv = [1 / ni.s, 0, ni.cx, 0, 1 / ni.s, ni.cy, 0, 0, 1]
  const mul = (a: Mat3, b: Mat3): Mat3 => {
    const o = new Array(9).fill(0)
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j]
    return o
  }
  return mul(TiInv, mul(Hn, Tw))
}

function apply(H: Mat3, x: number, y: number): [number, number] | null {
  const w = H[6] * x + H[7] * y + H[8]
  if (!(w > 1e-9)) return null   // behind the camera: skip
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]
}

function courtLines(): [number, number][][] {
  const L: [number, number][][] = [
    [[0, 0], [40, 0], [40, 20], [0, 20], [0, 0]],
    [[20, 0], [20, 20]],
  ]
  for (const [gx, dir] of [
    [0, 1],
    [40, -1],
  ] as const) {
    for (const r of [6, 9]) {
      const pts: [number, number][] = []
      for (let i = 0; i <= 24; i++) {
        const a = (Math.PI / 2) * (1 - i / 24)
        pts.push([gx + dir * r * Math.cos(a), Math.max(0, 8.5 - r * Math.sin(a))])
      }
      for (let i = 0; i <= 24; i++) {
        const a = (Math.PI / 2) * (i / 24)
        pts.push([gx + dir * r * Math.cos(a), Math.min(20, 11.5 + r * Math.sin(a))])
      }
      L.push(pts)
    }
  }
  return L
}

export function captureFrame(video: HTMLVideoElement): CalibrationKeyframe | null {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return null
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, w, h)
  return { t: video.currentTime, image: c.toDataURL("image/jpeg", 0.9), width: w, height: h, pairs: [] }
}

export function CourtCalibration({
  id,
  keyframes,
  setKeyframes,
  onClose,
}: {
  id: string
  keyframes: CalibrationKeyframe[]
  setKeyframes: (k: CalibrationKeyframe[]) => void
  onClose: () => void
}) {
  const [active, setActive] = useState(keyframes.length - 1)
  const [landmark, setLandmark] = useState<string>("mid-f")
  const [status, setStatus] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const kf = keyframes[active]
  const H = useMemo(() => (kf ? homography(kf.pairs) : null), [kf])

  // mean distance between clicks and where the fitted court puts them (px)
  const fitError = useMemo(() => {
    if (!kf || !H || kf.pairs.length < 5) return null
    const d = kf.pairs.map((p) => {
      const q = apply(H, p.world[0], p.world[1])
      return q ? Math.hypot(q[0] - p.px[0], q[1] - p.px[1]) : 999
    })
    return d.reduce((a, b) => a + b, 0) / d.length
  }, [kf, H])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !kf || !img.complete) return
    const w = canvas.clientWidth
    const scale = w / kf.width
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(kf.height * scale * dpr)
    canvas.style.height = `${kf.height * scale}px`
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const k = scale * dpr
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    if (H) {
      ctx.strokeStyle = "rgba(236, 72, 153, 0.95)"
      ctx.lineWidth = 2 * dpr
      for (const line of courtLines()) {
        ctx.beginPath()
        let pen = false
        for (const [x, y] of line) {
          const q = apply(H, x, y)
          if (!q || Math.abs(q[0]) > 20000 || Math.abs(q[1]) > 20000) {
            pen = false
            continue
          }
          if (pen) ctx.lineTo(q[0] * k, q[1] * k)
          else ctx.moveTo(q[0] * k, q[1] * k)
          pen = true
        }
        ctx.stroke()
      }
    }
    kf.pairs.forEach((p, i) => {
      ctx.fillStyle = p.key === landmark ? "#f59e0b" : "#22c55e"
      ctx.beginPath()
      ctx.arc(p.px[0] * k, p.px[1] * k, 6 * dpr, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#ffffff"
      ctx.font = `700 ${11 * dpr}px ui-sans-serif, system-ui, sans-serif`
      ctx.fillText(String(i + 1), p.px[0] * k + 8 * dpr, p.px[1] * k - 8 * dpr)
    })
  }, [kf, H, landmark])

  useEffect(() => {
    draw()
    const onResize = () => draw()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [draw])

  const onClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!kf) return
    const rect = event.currentTarget.getBoundingClientRect()
    const scale = rect.width / kf.width
    const px: [number, number] = [(event.clientX - rect.left) / scale, (event.clientY - rect.top) / scale]
    const lm = LANDMARKS.find((l) => l.key === landmark)
    if (!lm) return
    const pairs = [...kf.pairs.filter((p) => p.key !== lm.key), { key: lm.key, world: lm.world, px }]
    const next = keyframes.map((k, i) => (i === active ? { ...k, pairs } : k))
    setKeyframes(next)
    // go on to the next point in the list that is not placed yet
    const done = new Set(pairs.map((p) => p.key))
    const from = LANDMARKS.findIndex((l) => l.key === lm.key)
    const nextLm = [...LANDMARKS.slice(from + 1), ...LANDMARKS.slice(0, from)].find((l) => !done.has(l.key))
    if (nextLm) setLandmark(nextLm.key)
  }

  const save = async () => {
    const ready = keyframes.filter((k) => k.pairs.length >= 4)
    if (!ready.length) return
    setStatus("Sparar…")
    try {
      const res = await fetch(`/api/tracking/${encodeURIComponent(id)}/calibration`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          frameSize: [ready[0].width, ready[0].height],
          keyframes: ready.map((k) => ({ t: k.t, points: k.pairs.map((p) => ({ world: p.world, px: p.px })) })),
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setStatus("Sparat. Matchen analyseras om med 2D-planen, sidan laddas om strax.")
      setTimeout(() => window.location.reload(), 5000)
    } catch {
      setStatus("Det gick inte att spara. Försök igen.")
    }
  }

  if (!kf) return null
  const placed = new Set(kf.pairs.map((p) => p.key))
  const current = LANDMARKS.find((l) => l.key === landmark)
  const X = (x: number) => 4 + x * 5
  const Y = (y: number) => 4 + y * 5

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Kalibrera 2D-planen">
      <div className="w-full max-w-6xl rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900">Kalibrera 2D-planen</h3>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Stäng
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Välj en punkt i planen till höger och klicka på samma punkt i bilden. Minst fyra punkter, gärna spridda över planen. Rosa linjer visar hur planen hamnar.
        </p>
        {keyframes.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {keyframes.map((k, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${i === active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                Bild {i + 1} ({k.pairs.length} punkter)
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[3fr_1fr]">
          <div className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={kf.image} alt="" className="hidden" onLoad={draw} />
            <canvas ref={canvasRef} onClick={onClick} className="block w-full cursor-crosshair rounded-lg" />
            <p className="mt-2 text-sm font-semibold text-slate-800">
              Klicka nu på: <span className="text-amber-700">{current?.label}</span>
            </p>
            {fitError != null && (
              <p className={`text-xs ${fitError < 8 ? "text-emerald-700" : "text-red-600"}`}>
                {fitError < 8 ? "Punkterna stämmer bra med varandra." : "Någon punkt verkar fel: kontrollera de rosa linjerna."}
              </p>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <svg viewBox="0 0 208 108" className="w-full rounded-lg bg-slate-50" aria-label="Plan: välj en punkt">
              <rect x={X(0)} y={Y(0)} width={200} height={100} fill="#e2e8f0" stroke="#94a3b8" />
              <line x1={X(20)} y1={Y(0)} x2={X(20)} y2={Y(20)} stroke="#94a3b8" />
              {[0, 40].map((gx) => (
                <g key={gx}>
                  <path
                    d={`M ${X(gx)} ${Y(2.5)} A 30 30 0 0 ${gx ? 0 : 1} ${X(gx ? 34 : 6)} ${Y(8.5)} L ${X(gx ? 34 : 6)} ${Y(11.5)} A 30 30 0 0 ${gx ? 0 : 1} ${X(gx)} ${Y(17.5)}`}
                    fill="none"
                    stroke="#94a3b8"
                  />
                </g>
              ))}
              {LANDMARKS.map((l) => (
                <circle
                  key={l.key}
                  cx={X(l.world[0])}
                  cy={Y(l.world[1])}
                  r={l.key === landmark ? 4.2 : 3}
                  className="cursor-pointer"
                  fill={l.key === landmark ? "#f59e0b" : placed.has(l.key) ? "#22c55e" : "#ffffff"}
                  stroke="#0f172a"
                  strokeWidth={0.8}
                  onClick={() => setLandmark(l.key)}
                >
                  <title>{l.label}</title>
                </circle>
              ))}
            </svg>
            <select
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              aria-label="Punkt att klicka"
            >
              {LANDMARKS.map((l) => (
                <option key={l.key} value={l.key}>
                  {placed.has(l.key) ? "✓ " : ""}
                  {l.label}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setKeyframes(keyframes.map((k, i) => (i === active ? { ...k, pairs: k.pairs.slice(0, -1) } : k)))}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Ångra
              </button>
              <button
                type="button"
                onClick={() => setKeyframes(keyframes.map((k, i) => (i === active ? { ...k, pairs: [] } : k)))}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Rensa
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Panorerar kameran? Stäng, spola till en vinkel där andra delen av planen syns och öppna igen: då läggs en bild till.
            </p>
            <button
              type="button"
              disabled={!keyframes.some((k) => k.pairs.length >= 4)}
              onClick={save}
              className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Spara och analysera om
            </button>
            {status && <p className="text-xs text-slate-600">{status}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
