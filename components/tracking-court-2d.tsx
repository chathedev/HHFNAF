"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pause, Play, Radio, Video, VideoOff } from "lucide-react"

// 2D replay/live view of an analysed match. The browser only ever receives
// court coordinates (metres), shirt numbers and names from the tracking
// service; video stays on the analysis server.

type Side = "home" | "away"

// i = index of the annotated review image for this frame (when video review is on)
// bx = player boxes in the review image (960 px wide): [tid, x1, y1, x2, y2]
type Frame = {
  t: number
  c?: number
  i?: number
  bx?: [number, number, number, number, number][]
  bb?: [number, number]
  p: [number, number, number][]
  // ball, only when it was really seen: [x, y, 0]
  b?: [number, number, number]
  // people just outside the court (bench, sideline, table): [x, y, side, x1, y1, x2, y2]
  o?: [number, number, string, number, number, number, number][]
  // goals in the picture: [left, right] (1 = visible)
  gv?: [number, number]
}

type Ident = {
  side: Side | null
  // bench: standing still at the sideline (coach, substitute); ignore: not a person (goal post)
  role: "player" | "keeper" | "official" | "bench" | "ignore"
  number: number | null
  numberConf: number
  playerId: number | null
  name: string | null
  n: number
  kitConf?: number
}

type TrackingEvent = {
  clock: number | null
  v: number | null
  type?: string
  side?: Side | null
  player?: string | null
  playerId?: number | null
  number?: string | null
  score?: string | null
  time?: string | null
  // goals: the goal the ball went into; suspensions: match clock / video time when they end
  goal?: "left" | "right"
  until?: number
  vUntil?: number | null
}

type Meta = {
  matchId?: string
  status?: "starting" | "processing" | "live" | "done" | "stopped" | "error"
  live?: boolean
  home?: string
  away?: string
  label?: string | null
  test?: boolean
  duration?: number | null
  lastT?: number | null
  progress?: number | null
  teamColours?: Partial<Record<Side, [number, number, number]>>
  sideSource?: string
  video?: boolean
  ballModel?: boolean
  // match clock anchors [video_t, clock_s, running] (from Profixio or the broadcast scoreboard)
  clock?: [number, number, boolean][]
  score?: [number, number]
  result?: string | null
  lineupSource?: string | null
  roleModel?: boolean
  autoCalibration?: boolean
  // false: the camera could not be calibrated yet; only the tracked video is shown
  calibrated?: boolean
  // the source video can be streamed for smooth playback under the overlay
  videoFile?: string
  // which goal each team defends per half: {"1": {"home": "left", "away": "right"}, ...}
  defending?: Record<string, Partial<Record<Side, "left" | "right">>> | null
  periodSeconds?: number | null
}

type LineupPlayer = { id?: number; name?: string; number?: string; isKeeper?: boolean; isCaptain?: boolean }
type PlayerStat = { playerId?: number; name?: string; number?: string; side?: string; goals?: number; suspensions?: number }

type Info = {
  meta: Meta
  // splits: a track the tracker swapped between two people at time T continues as a new id
  tracks: { alias: Record<string, number>; players: Record<string, Ident>; splits?: Record<string, [number, number]> }
  events: TrackingEvent[]
  lineup: { home?: LineupPlayer[]; away?: LineupPlayer[] }
  playerStats: PlayerStat[]
}

const BASE = "/api/tracking"
const COURT_W = 40
const COURT_H = 20
const PAD = 3.2   // room around the court for the benches
const HHF_GREEN = "#15803d"
const SPEEDS = [1, 2, 4, 8] as const

const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s))
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`
}

const parseFrames = (text: string): Frame[] => {
  const out: Frame[] = []
  for (const line of text.split("\n")) {
    if (!line) continue
    try {
      out.push(JSON.parse(line) as Frame)
    } catch {
      // a half-written last line is skipped; the stream delivers it later
    }
  }
  return out
}

// index of the last frame with t <= time
const frameIndexAt = (frames: Frame[], time: number) => {
  let lo = 0
  let hi = frames.length - 1
  if (hi < 0 || time < frames[0].t) return -1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (frames[mid].t <= time) lo = mid
    else hi = mid - 1
  }
  return lo
}

const isHhf = (name?: string) => /härnösand/i.test(name ?? "")

const SUSPENSION = /utvisning|diskvalificering|rött kort/i

// match clock (s) at a video time from the anchors [video_t, clock_s, running]
const clockAt = (anchors: [number, number, boolean][] | undefined, time: number): number | null => {
  let prev: [number, number, boolean] | null = null
  for (const a of anchors ?? []) {
    if (a[0] > time) break
    prev = a
  }
  if (!prev) return null
  return prev[2] ? prev[1] + (time - prev[0]) : prev[1]
}

type Suspension = { side: Side; number: string | null; player: string | null; left: number }

// suspensions running at a match clock value (2 minutes of playing time each)
const activeSuspensions = (events: TrackingEvent[] | undefined, clock: number | null): Suspension[] => {
  if (clock == null) return []
  const out: Suspension[] = []
  for (const e of events ?? []) {
    if (!SUSPENSION.test(e.type ?? "") || e.clock == null || (e.side !== "home" && e.side !== "away")) continue
    const end = e.until ?? e.clock + 120
    if (clock >= e.clock && clock < end) out.push({ side: e.side, number: e.number ?? null, player: e.player ?? null, left: end - clock })
  }
  return out
}

// a team may have at most 7 on court (6 + keeper or 7 field players), one fewer per suspension
const capOf = (susp: Suspension[], side: Side) => Math.max(4, 7 - susp.filter((x) => x.side === side).length)

const strengthOf = (ident: Ident | null) =>
  (ident?.kitConf ?? 0.5) * (ident?.number != null ? 2 : 1) * Math.log(2 + (ident?.n ?? 0))

function useTracking(id: string) {
  const [info, setInfo] = useState<Info | null>(null)
  const [error, setError] = useState<string | null>(null)
  const framesRef = useRef<Frame[]>([])
  const [frameCount, setFrameCount] = useState(0)
  // bumped to reload everything (engine restarted, or we fell too far behind)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    let source: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retries = 0
    let lastOffset = "0"
    framesRef.current = []
    setFrameCount(0)
    setError(null)

    const append = (list: Frame[]) => {
      const frames = framesRef.current
      let added = 0
      for (const f of list) {
        const last = frames.length ? frames[frames.length - 1].t : -Infinity
        if (f.t > last) {
          frames.push(f)
          added += 1
        }
      }
      if (added) setFrameCount(frames.length)
    }

    const reload = () => {
      if (!cancelled) setReloadKey((k) => k + 1)
    }

    const openStream = () => {
      if (cancelled) return
      source = new EventSource(`${BASE}/${encodeURIComponent(id)}/stream?offset=${encodeURIComponent(lastOffset)}`)
      source.onopen = () => {
        retries = 0
      }
      source.addEventListener("frames", (event) => {
        const message = event as MessageEvent
        if (message.lastEventId) lastOffset = message.lastEventId
        try {
          append(JSON.parse(message.data) as Frame[])
        } catch {}
      })
      source.addEventListener("tracks", (event) => {
        try {
          const tracks = JSON.parse((event as MessageEvent).data) as Info["tracks"]
          setInfo((prev) => (prev ? { ...prev, tracks } : prev))
        } catch {}
      })
      source.addEventListener("meta", (event) => {
        try {
          const meta = JSON.parse((event as MessageEvent).data) as Meta
          setInfo((prev) => (prev ? { ...prev, meta } : prev))
        } catch {}
      })
      source.addEventListener("events", (event) => {
        try {
          const events = JSON.parse((event as MessageEvent).data) as TrackingEvent[]
          setInfo((prev) => (prev ? { ...prev, events } : prev))
        } catch {}
      })
      source.addEventListener("reset", reload)
      source.addEventListener("resync", reload)
      // The browser retries transient drops itself (sending Last-Event-ID), but a
      // non-200 answer (proxy 503 while the service restarts) closes it for good.
      source.onerror = () => {
        if (!source || source.readyState !== EventSource.CLOSED || cancelled) return
        source.close()
        const wait = Math.min(15000, 1000 * 2 ** retries)
        retries += 1
        retryTimer = setTimeout(openStream, wait)
      }
    }

    // everything before the newest frames, fetched after the page is already live
    const backfill = async () => {
      const first = framesRef.current[0]?.t
      if (first === undefined) return
      try {
        const res = await fetch(`${BASE}/${encodeURIComponent(id)}/frames?to=${first}`, { cache: "no-store" })
        if (!res.ok) return
        const older = parseFrames(await res.text()).filter((f) => f.t < (framesRef.current[0]?.t ?? first))
        if (cancelled || !older.length) return
        framesRef.current = [...older, ...framesRef.current]
        setFrameCount(framesRef.current.length)
      } catch {}
    }

    ;(async () => {
      try {
        const infoRes = await fetch(`${BASE}/${encodeURIComponent(id)}`, { cache: "no-store" })
        if (!infoRes.ok) throw new Error("Analysen kunde inte läsas in.")
        const nextInfo = (await infoRes.json()) as Info
        const status = nextInfo.meta.status
        const running = status === "live" || status === "processing" || status === "starting"
        // a running analysis opens on its live edge at once (the newest two minutes);
        // the rest of the match follows in the background for scrubbing back
        const framesRes = await fetch(`${BASE}/${encodeURIComponent(id)}/frames${running ? "?tail=120" : ""}`, { cache: "no-store" })
        if (!framesRes.ok) throw new Error("Analysen kunde inte läsas in.")
        const text = await framesRes.text()
        if (cancelled) return
        framesRef.current = parseFrames(text)
        setFrameCount(framesRef.current.length)
        setInfo(nextInfo)
        lastOffset = framesRes.headers.get("x-frames-offset") ?? "0"
        if (running) {
          openStream()
          void backfill()
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Analysen kunde inte läsas in.")
      }
    })()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      source?.close()
    }
  }, [id, reloadKey])

  return { info, error, framesRef, frameCount }
}

type Resolved = { key: string; x: number; y: number; ident: Ident | null; tid: number }

function TrackingCourt2DInner({ id, compact = false }: { id: string; compact?: boolean }) {
  const { info, error, framesRef, frameCount } = useTracking(id)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const timeRef = useRef(0)
  const [displayTime, setDisplayTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(0)
  const [follow, setFollow] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [ballSimulated, setBallSimulated] = useState(true)
  const hitRef = useRef<Resolved[]>([])
  const videoRef = useRef<HTMLCanvasElement | null>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement | null>(null)
  const imgCacheRef = useRef<Map<number, { img: HTMLImageElement; ok: boolean; failedAt?: number; fails: number }>>(new Map())
  // bumps whenever identities change so a paused video frame is relabelled
  const tracksVersionRef = useRef(0)
  useEffect(() => {
    tracksVersionRef.current += 1
  }, [info?.tracks])
  const shownImgRef = useRef<string | null>(null)
  const videoBoxesRef = useRef<{ key: string; box: [number, number, number, number] }[]>([])
  const [showVideo, setShowVideo] = useState(true)
  const initialisedRef = useRef(false)

  const meta = info?.meta
  const isLive = meta?.status === "live"
  const useRealVideo = Boolean(meta?.videoFile) && !compact && !isLive
  const isProcessing = meta?.status === "processing" || meta?.status === "starting"
  const hhfSide: Side | null = isHhf(meta?.home) ? "home" : isHhf(meta?.away) ? "away" : null

  const frames = framesRef.current
  const firstT = frames.length ? frames[0].t : 0
  const lastT = frames.length ? frames[frames.length - 1].t : 0

  // start: live -> follow the live edge; finished -> from the beginning
  useEffect(() => {
    if (!info || initialisedRef.current || !frameCount) return
    initialisedRef.current = true
    // anything still being analysed is watched live, like a broadcast
    const st = info.meta.status
    if (st === "live" || st === "processing" || st === "starting") {
      setFollow(true)
      setPlaying(true)
    } else {
      timeRef.current = framesRef.current[0]?.t ?? 0
      setDisplayTime(timeRef.current)
    }
  }, [info, frameCount, framesRef])

  const colours = useMemo(() => {
    const opp = (side: Side) => {
      const rgb = meta?.teamColours?.[side]
      if (!rgb) return "#334155"
      const [r, g, b] = rgb
      const light = (r * 299 + g * 587 + b * 114) / 1000
      const greenish = g > r + 25 && g > b + 10
      // keep HHF green unique and the dot readable on the light court
      if (greenish || light > 200) return "#334155"
      return `rgb(${Math.round(r * 0.8)}, ${Math.round(g * 0.8)}, ${Math.round(b * 0.8)})`
    }
    const home = hhfSide === "home" ? HHF_GREEN : hhfSide === "away" ? opp("home") : "#1d4ed8"
    const away = hhfSide === "away" ? HHF_GREEN : hhfSide === "home" ? opp("away") : "#b91c1c"
    return { home, away } as Record<Side, string>
  }, [meta?.teamColours, hhfSide])

  // people on the bench / right next to the court: dashed, dimmed, labelled
  const paintOffCourt = useCallback(
    (ctx: CanvasRenderingContext2D, off: Frame["o"], k2: number, dpr: number) => {
      if (!off?.length) return
      const font = Math.max(10, Math.round(10 * dpr))
      ctx.font = `600 ${font}px ui-sans-serif, system-ui, sans-serif`
      ctx.textBaseline = "middle"
      ctx.lineWidth = 1.5 * dpr
      ctx.setLineDash([4 * dpr, 3 * dpr])
      for (const [, , sd, x1, y1, x2, y2] of off) {
        const X1 = x1 * k2
        const Y1 = y1 * k2
        ctx.strokeStyle = sd === "home" || sd === "away" ? colours[sd as Side] : "rgba(148, 163, 184, 0.95)"
        ctx.globalAlpha = 0.75
        ctx.strokeRect(X1, Y1, (x2 - x1) * k2, (y2 - y1) * k2)
        ctx.globalAlpha = 1
        const tw = ctx.measureText("Bänk").width + 6 * dpr
        ctx.fillStyle = "rgba(71, 85, 105, 0.8)"
        ctx.fillRect(X1, Y1 - 13 * dpr, tw, 12 * dpr)
        ctx.fillStyle = "#ffffff"
        ctx.fillText("Bänk", X1 + 3 * dpr, Y1 - 7 * dpr)
      }
      ctx.setLineDash([])
    },
    [colours],
  )

  // the track id that holds the identity at a given time (after a split, the new part)
  const effectiveTid = useCallback(
    (tid: number, time: number) => {
      const split = info?.tracks.splits?.[String(tid)]
      return split && time >= split[0] ? split[1] : tid
    },
    [info?.tracks.splits],
  )

  const identOf = useCallback(
    (tid: number, time = Number.POSITIVE_INFINITY): Ident | null => {
      if (!info) return null
      const eff = effectiveTid(tid, time)
      const root = info.tracks.alias[String(eff)]
      return (root !== undefined ? info.tracks.players[String(root)] : info.tracks.players[String(eff)]) ?? null
    },
    [info, effectiveTid],
  )

  const goals = useMemo(
    () => (info?.events ?? []).filter((e) => e.v !== null && e.v !== undefined && /^mål( |$)/i.test(e.type ?? "")),
    [info?.events],
  )

  const resolveAt = useCallback(
    (time: number) => {
      const list = framesRef.current
      const i = frameIndexAt(list, time)
      if (i < 0)
        return {
          players: [] as Resolved[],
          bench: [] as Resolved[],
          ball: null as null | [number, number, number],
          frame: null as Frame | null,
          susp: [] as Suspension[],
        }
      const a = list[i]
      const b = list[i + 1]
      const span = b ? b.t - a.t : 0
      const k = b && span > 0 && span < 1.5 ? Math.min(1, Math.max(0, (time - a.t) / span)) : 0
      const nextPos = new Map<number, [number, number]>()
      if (b) for (const [tid, x, y] of b.p) nextPos.set(tid, [x, y])
      const players: Resolved[] = []
      const bench: Resolved[] = []
      const seen = new Set<string>()
      // a player the detector missed for a frame or two (fast pans) stays on the plan:
      // seen just before and just after, drawn in between
      const pts: [number, number, number][] = [...a.p]
      const before = list[i - 1]
      if (before && b && b.t - before.t < 0.8) {
        const inA = new Set(a.p.map((q) => q[0]))
        const prevPos = new Map(before.p.map((q) => [q[0], q] as const))
        for (const [tid] of b.p) {
          const q = prevPos.get(tid)
          // from where it was last seen; the loop below glides it to the next frame
          if (q && !inA.has(tid)) pts.push([tid, q[1], q[2]])
        }
      }
      for (const [tid, x, y] of pts) {
        const n = nextPos.get(tid)
        const px = n ? x + (n[0] - x) * k : x
        const py = n ? y + (n[1] - y) * k : y
        const ident = identOf(tid, time)
        if (ident?.role === "ignore") continue
        const eff = effectiveTid(tid, time)
        const key = ident?.playerId ? `p${ident.playerId}` : `t${info?.tracks.alias[String(eff)] ?? eff}`
        if (seen.has(key)) continue
        seen.add(key)
        if (ident?.role === "bench") bench.push({ key, x: px, y: py, ident, tid })
        else players.push({ key, x: px, y: py, ident, tid })
      }
      // the rules: never more on court than a team may have (7, minus suspensions),
      // never two keepers of one team; the weakest identities give way
      const susp = activeSuspensions(info?.events, clockAt(info?.meta.clock, time))
      for (const side of ["home", "away"] as Side[]) {
        const mine = players.filter((p) => p.ident?.side === side && (p.ident.role === "player" || p.ident.role === "keeper"))
        const drop = new Set<Resolved>()
        const keepers = mine.filter((p) => p.ident?.role === "keeper").sort((p, q) => strengthOf(q.ident) - strengthOf(p.ident))
        for (const p of keepers.slice(1)) drop.add(p)
        const rest = mine.filter((p) => !drop.has(p)).sort((p, q) => strengthOf(q.ident) - strengthOf(p.ident))
        for (const p of rest.slice(capOf(susp, side))) drop.add(p)
        drop.forEach((p) => {
          p.ident = p.ident ? { ...p.ident, side: null, number: null, name: null, playerId: null, role: "player" } : null
        })
      }
      let ball: [number, number, number] | null = a.b ?? null
      if (a.b && b?.b && k > 0) ball = [a.b[0] + (b.b[0] - a.b[0]) * k, a.b[1] + (b.b[1] - a.b[1]) * k, 0]
      // goals from the official feed: the ball flies from the scorer into the net
      for (const g of goals) {
        const v = g.v as number
        if (time >= v - 0.9 && time <= v + 0.6) {
          const scorer = players.find((p) => p.ident?.playerId && p.ident.playerId === g.playerId)
          if (!scorer && !ball && !g.goal) break
          // the goal the scoring team attacks (from the engine); otherwise the nearer one
          const goalX = g.goal === "left" ? 0 : g.goal === "right" ? COURT_W : null
          const from: [number, number] = scorer
            ? [scorer.x, scorer.y]
            : ball
              ? [ball[0], ball[1]]
              : [goalX === 0 ? 7 : COURT_W - 7, 10]
          const gx = goalX ?? (from[0] < COURT_W / 2 ? 0 : COURT_W)
          const f = Math.min(1, Math.max(0, (time - (v - 0.9)) / 0.9))
          const e = f * f * (3 - 2 * f)
          ball = [from[0] + (gx - 0.4 * Math.sign(gx - from[0] || 1) - from[0]) * e, from[1] + (10 - from[1]) * e, 1]
          break
        }
      }
      return { players, bench, ball, frame: a, susp }
    },
    [framesRef, identOf, effectiveTid, goals, info?.tracks.alias],
  )

  // ---- drawing ----
  const draw = useCallback(
    (time: number) => {
      const canvas = canvasRef.current
      const wrap = wrapRef.current
      if (!canvas || !wrap) return
      const cssW = wrap.clientWidth
      const cssH = (cssW * (COURT_H + 2 * PAD)) / (COURT_W + 2 * PAD)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr)
        canvas.height = Math.round(cssH * dpr)
        canvas.style.height = `${cssH}px`
      }
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const s = (cssW / (COURT_W + 2 * PAD)) * dpr
      const X = (x: number) => (x + PAD) * s
      const Y = (y: number) => (y + PAD) * s
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // floor
      ctx.fillStyle = "#f8fafc"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "#eef2f6"
      ctx.fillRect(X(0), Y(0), COURT_W * s, COURT_H * s)
      ctx.strokeStyle = "#94a3b8"
      ctx.lineWidth = Math.max(1, 0.08 * s)
      ctx.strokeRect(X(0), Y(0), COURT_W * s, COURT_H * s)
      ctx.beginPath()
      ctx.moveTo(X(20), Y(0))
      ctx.lineTo(X(20), Y(20))
      ctx.stroke()
      ctx.save()
      ctx.beginPath()
      ctx.rect(X(0), Y(0), COURT_W * s, COURT_H * s)
      ctx.clip()
      // 6 m / 9 m lines: quarter circles around each post joined by a straight part
      const areaLine = (gx: number, dir: number, radius: number) => {
        const pts: [number, number][] = []
        for (let i = 0; i <= 24; i++) {
          const a = (Math.PI / 2) * (1 - i / 24)
          pts.push([gx + dir * radius * Math.cos(a), 8.5 - radius * Math.sin(a)])
        }
        for (let i = 0; i <= 24; i++) {
          const a = (Math.PI / 2) * (i / 24)
          pts.push([gx + dir * radius * Math.cos(a), 11.5 + radius * Math.sin(a)])
        }
        return pts
      }
      for (const [gx, dir] of [
        [0, 1],
        [COURT_W, -1],
      ] as const) {
        const six = areaLine(gx, dir, 6)
        ctx.fillStyle = "#e2e8f0"
        ctx.beginPath()
        six.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))))
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        six.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))))
        ctx.stroke()
        ctx.setLineDash([0.45 * s, 0.35 * s])
        ctx.beginPath()
        areaLine(gx, dir, 9).forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))))
        ctx.stroke()
        ctx.setLineDash([])
        // 7 m line and 4 m keeper mark
        ctx.beginPath()
        ctx.moveTo(X(gx + dir * 7), Y(9.5))
        ctx.lineTo(X(gx + dir * 7), Y(10.5))
        ctx.moveTo(X(gx + dir * 4), Y(9.925))
        ctx.lineTo(X(gx + dir * 4), Y(10.075))
        ctx.stroke()
      }
      ctx.restore()
      // goals
      ctx.strokeStyle = "#64748b"
      ctx.lineWidth = Math.max(1.5, 0.14 * s)
      ctx.strokeRect(X(-0.8), Y(8.5), 0.8 * s, 3 * s)
      ctx.strokeRect(X(COURT_W), Y(8.5), 0.8 * s, 3 * s)

      const { players, bench, ball } = resolveAt(time)
      hitRef.current = players
      {
        const fl = framesRef.current
        const fi = frameIndexAt(fl, time)
        const off = fi >= 0 && Math.abs(fl[fi].t - time) < 1.0 ? [...(fl[fi].o ?? [])] : []
        // people the analysis found standing still at the sideline count as bench too
        for (const b of bench) off.push([b.x, b.y < COURT_H / 2 ? -1 : COURT_H + 1, b.ident?.side ?? "", 0, 0, 0, 0])
        const rr = Math.max(6 * dpr, 0.4 * s)
        ctx.lineWidth = Math.max(1.5, 0.12 * s)
        for (const [x, y, sd] of off) {
          const cx = X(Math.min(COURT_W + PAD - 0.5, Math.max(-PAD + 0.5, x)))
          const cy = Y(Math.min(COURT_H + PAD - 0.5, Math.max(-PAD + 0.5, y)))
          ctx.strokeStyle = sd === "home" || sd === "away" ? colours[sd as Side] : "#94a3b8"
          ctx.fillStyle = "rgba(248, 250, 252, 0.9)"
          ctx.beginPath()
          ctx.arc(cx, cy, rr, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
      }
      const r = Math.max(8 * dpr, 0.55 * s)
      // officials first (under players)
      const ordered = [...players].sort((a, b) => Number(a.ident?.role === "official") - Number(b.ident?.role === "official")).reverse()
      for (const p of ordered) {
        const ident = p.ident
        const role = ident?.role ?? "player"
        const side = ident?.side ?? null
        const isSel = selected === p.key
        const cx = X(p.x)
        const cy = Y(p.y)
        if (role === "official") {
          ctx.fillStyle = "#cbd5e1"
          ctx.beginPath()
          ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2)
          ctx.fill()
          continue
        }
        const fill = side ? colours[side] : "#94a3b8"
        if (isSel) {
          ctx.fillStyle = "rgba(245, 158, 11, 0.28)"
          ctx.beginPath()
          ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = fill
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.lineWidth = Math.max(1.5, r * 0.18)
        ctx.strokeStyle = role === "keeper" ? "#f59e0b" : "#ffffff"
        ctx.stroke()
        ctx.fillStyle = "#ffffff"
        ctx.font = `700 ${Math.round(r * 1.02)}px ui-sans-serif, system-ui, sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(ident?.number != null ? String(ident.number) : "", cx, cy + r * 0.06)
        if (isSel && ident?.name) {
          const label = ident.name
          ctx.font = `600 ${Math.round(r * 0.95)}px ui-sans-serif, system-ui, sans-serif`
          const w = ctx.measureText(label).width + r
          const ly = cy - r * 2.3
          ctx.fillStyle = "rgba(15, 23, 42, 0.86)"
          ctx.beginPath()
          ctx.roundRect(cx - w / 2, ly - r * 0.75, w, r * 1.5, r * 0.4)
          ctx.fill()
          ctx.fillStyle = "#ffffff"
          ctx.fillText(label, cx, ly + r * 0.02)
        }
      }
      if (ball) {
        const br = Math.max(4 * dpr, 0.3 * s)
        ctx.fillStyle = "#fbbf24"
        ctx.beginPath()
        ctx.arc(X(ball[0]), Y(ball[1]), br, 0, Math.PI * 2)
        ctx.fill()
        ctx.lineWidth = Math.max(1, br * 0.3)
        ctx.strokeStyle = "#78350f"
        if (ball[2] === 1) ctx.setLineDash([br * 0.5, br * 0.4])
        ctx.stroke()
        ctx.setLineDash([])
      }
    },
    [resolveAt, colours, selected],
  )

  // ---- annotated review video: the image for the frame on screen, synced to the plan ----
  const loadImg = useCallback(
    (idx: number) => {
      const cache = imgCacheRef.current
      const hit = cache.get(idx)
      // live: the engine may not have written the image yet; retry with backoff, then give up
      if (hit && (hit.ok || !hit.failedAt || hit.fails >= 5 || performance.now() - hit.failedAt < 400 * 2 ** hit.fails)) return hit
      const img = new Image()
      const entry: { img: HTMLImageElement; ok: boolean; failedAt?: number; fails: number } = { img, ok: false, fails: hit?.fails ?? 0 }
      img.decoding = "async"
      img.onload = () => {
        entry.ok = true
      }
      img.onerror = () => {
        entry.failedAt = performance.now()
        entry.fails += 1
      }
      img.src = `${BASE}/${encodeURIComponent(id)}/img/${idx}`
      cache.set(idx, entry)
      if (cache.size > 60) {
        const first = cache.keys().next().value
        if (first !== undefined) cache.delete(first)
      }
      return entry
    },
    [id],
  )

  // boxes, labels and ball on top of a video frame; box coordinates are in the
  // 960 px wide review image and are scaled by k2 to the canvas
  const paintBoxes = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      boxes: [number, number, number, number, number][],
      k2: number,
      dpr: number,
      ft: number,
      bb?: [number, number],
      inHand?: boolean,
    ) => {
      // the same identities as the plan at this moment (rules applied)
      const { players: shown, bench: benchNow } = resolveAt(ft)
      const capped = new Map<number, Ident | null>()
      for (const p of shown) capped.set(p.tid, p.ident)
      const benchTids = new Set(benchNow.map((b) => b.tid))
      const font = Math.max(11, Math.round(12 * dpr))
      ctx.font = `700 ${font}px ui-sans-serif, system-ui, sans-serif`
      ctx.textBaseline = "middle"
      const hits: { key: string; box: [number, number, number, number] }[] = []
      for (const [tid, x1, y1, x2, y2] of boxes) {
        const raw = identOf(tid, ft)
        if (raw?.role === "ignore") continue
        if (benchTids.has(tid)) {
          paintOffCourt(ctx, [[0, 0, raw?.side ?? "", x1, y1, x2, y2]], k2, dpr)
          continue
        }
        const ident = capped.has(tid) ? (capped.get(tid) ?? null) : raw
        const role = ident?.role ?? "player"
        const side = ident?.side ?? null
        const eff = effectiveTid(tid, ft)
        const pkey = ident?.playerId ? `p${ident.playerId}` : `t${info?.tracks.alias[String(eff)] ?? eff}`
        const colour = role === "official" ? "#94a3b8" : side ? colours[side] : "#cbd5e1"
        const isSel = selected === pkey
        const X1 = x1 * k2
        const Y1 = y1 * k2
        const W = (x2 - x1) * k2
        const Hh = (y2 - y1) * k2
        ctx.lineWidth = (isSel ? 3.5 : 2) * dpr
        ctx.strokeStyle = isSel ? "#f59e0b" : colour
        ctx.strokeRect(X1, Y1, W, Hh)
        if (role === "keeper") {
          ctx.lineWidth = 1 * dpr
          ctx.strokeStyle = "#f59e0b"
          ctx.strokeRect(X1 - 3 * dpr, Y1 - 3 * dpr, W + 6 * dpr, Hh + 6 * dpr)
        }
        let label = ""
        if (role === "official") label = "Domare"
        else if (ident?.number != null) {
          const parts = (ident.name ?? "").trim().split(/\s+/).filter(Boolean)
          const short = parts.length ? `${parts[0]}${parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : ""}` : ""
          label = `#${ident.number}${short ? ` ${short}` : ""}`
        } else if (role === "keeper") label = "MV"
        if (label) {
          const tw = ctx.measureText(label).width + 8 * dpr
          const th = font + 6 * dpr
          const ly = Math.max(0, Y1 - th - 2 * dpr)
          ctx.fillStyle = isSel ? "#f59e0b" : colour
          ctx.fillRect(X1, ly, tw, th)
          ctx.fillStyle = "#ffffff"
          ctx.fillText(label, X1 + 4 * dpr, ly + th / 2 + 0.5)
        }
        hits.push({ key: pkey, box: [X1 / dpr, Y1 / dpr, W / dpr, Hh / dpr] })
      }
      if (bb) {
        ctx.lineWidth = 2.5 * dpr
        ctx.strokeStyle = "#fbbf24"
        if (inHand) ctx.setLineDash([4 * dpr, 3 * dpr])
        ctx.beginPath()
        ctx.arc(bb[0] * k2, bb[1] * k2, (inHand ? 14 : 9) * dpr, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
      return hits
    },
    [identOf, effectiveTid, colours, selected, info?.tracks.alias, resolveAt, paintOffCourt],
  )

  // the real video plays underneath; boxes are interpolated between analysed
  // frames so they glide with the players at the display's refresh rate
  const drawOverlay = useCallback(
    (time: number) => {
      const canvas = overlayRef.current
      if (!canvas) return
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const list = framesRef.current
      let k = frameIndexAt(list, time)
      while (k >= 0 && !list[k].bx) k -= 1
      if (k < 0 || time - list[k].t > 1.0) {
        videoBoxesRef.current = []
        return
      }
      const a = list[k]
      let b: Frame | undefined
      for (let j = k + 1; j < list.length && j < k + 4; j++) {
        if (list[j].bx) {
          b = list[j]
          break
        }
      }
      const span = b ? b.t - a.t : 0
      const r = b && span > 0 && span < 1.0 ? Math.min(1, Math.max(0, (time - a.t) / span)) : 0
      const next = new Map((b?.bx ?? []).map((x) => [x[0], x]))
      const boxes = (a.bx ?? []).map(([tid, x1, y1, x2, y2]) => {
        const q = next.get(tid)
        return (q
          ? [tid, x1 + (q[1] - x1) * r, y1 + (q[2] - y1) * r, x2 + (q[3] - x2) * r, y2 + (q[4] - y2) * r]
          : [tid, x1, y1, x2, y2]) as [number, number, number, number, number]
      })
      let bb = a.bb
      if (a.bb && b?.bb && r > 0) bb = [a.bb[0] + (b.bb[0] - a.bb[0]) * r, a.bb[1] + (b.bb[1] - a.bb[1]) * r]
      paintOffCourt(ctx, a.o, canvas.width / 960, dpr)
      videoBoxesRef.current = paintBoxes(ctx, boxes, canvas.width / 960, dpr, time, bb, a.b?.[2] === 1)
    },
    [framesRef, paintBoxes, paintOffCourt],
  )

  const drawVideo = useCallback(
    (time: number) => {
      const canvas = videoRef.current
      if (!canvas) return
      const list = framesRef.current
      let k = frameIndexAt(list, time)
      while (k >= 0 && list[k].i === undefined) k -= 1
      if (k < 0) return
      const idx = list[k].i as number
      // prefetch the next second so playback never waits on the network
      for (let j = k + 1, n = 0; j < list.length && n < 10; j++) {
        const nextIdx = list[j].i
        if (nextIdx !== undefined) {
          loadImg(nextIdx)
          n += 1
        }
      }
      // newest loaded image at or before idx
      let entry = loadImg(idx)
      let drawIdx = idx
      if (!entry.ok) {
        for (let back = 1; back < 30; back++) {
          const e = imgCacheRef.current.get(idx - back)
          if (e?.ok) {
            entry = e
            drawIdx = idx - back
            break
          }
        }
      }
      if (!entry.ok) return
      // boxes belong to the frame whose image is on screen
      let fk = k
      while (fk > 0 && list[fk].i !== drawIdx) fk -= 1
      const boxes = list[fk]?.i === drawIdx ? list[fk].bx ?? [] : []
      const key = `${drawIdx}|${fk}|${selected ?? ""}|${tracksVersionRef.current}|${canvas.clientWidth}`
      if (shownImgRef.current === key) return
      const { img } = entry
      const w = canvas.clientWidth
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const h = (w * img.naturalHeight) / Math.max(1, img.naturalWidth)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        canvas.style.height = `${h}px`
      }
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const k2 = canvas.width / Math.max(1, img.naturalWidth)
      const bb = list[fk]?.i === drawIdx ? list[fk].bb : undefined
      if (list[fk]?.i === drawIdx) paintOffCourt(ctx, list[fk].o, k2 * (img.naturalWidth / 960), dpr)
      const hits = paintBoxes(ctx, boxes, k2, dpr, list[fk]?.t ?? time, bb, list[fk]?.b?.[2] === 1)
      videoBoxesRef.current = hits
      shownImgRef.current = key
    },
    [framesRef, loadImg, paintBoxes, paintOffCourt, selected],
  )

  // ---- clock: playback + live follow at display refresh rate ----
  useEffect(() => {
    let raf = 0
    let prev = performance.now()
    let lastUi = 0
    const tick = (now: number) => {
      const dt = Math.min(0.25, (now - prev) / 1000)
      prev = now
      const list = framesRef.current
      if (list.length) {
        const edge = list[list.length - 1].t
        const vid = useRealVideo ? videoElRef.current : null
        if (vid && !follow) {
          // the real video is the clock: smooth playback at its own frame rate
          vid.playbackRate = SPEEDS[speedIndex]
          if (playing) {
            if (vid.paused && !vid.ended) vid.play().catch(() => setPlaying(false))
            timeRef.current = vid.currentTime
            if ((isProcessing && timeRef.current >= edge) || vid.ended) {
              vid.pause()
              setPlaying(false)
            }
          } else {
            if (!vid.paused) vid.pause()
            if (Math.abs(vid.currentTime - timeRef.current) > 0.15) vid.currentTime = timeRef.current
          }
        } else if (follow && vid) {
          // live edge with the real video underneath: the video plays and is nudged
          // to stay just behind the newest analysed frame
          const target = Math.max(list[0].t, edge - 0.6)
          if (Math.abs(vid.currentTime - target) > 2) vid.currentTime = target
          vid.playbackRate = vid.currentTime < target - 0.3 ? 1.1 : vid.currentTime > target ? 0.9 : 1
          if (vid.paused && !vid.ended) vid.play().catch(() => {})
          timeRef.current = vid.currentTime
        } else if (follow) {
          // stay a few hundred ms behind the newest frame so motion stays smooth
          const target = Math.max(list[0].t, edge - 0.35)
          timeRef.current = timeRef.current < target - 3 ? target : timeRef.current + (target - timeRef.current) * Math.min(1, dt * 6)
        } else if (playing) {
          timeRef.current = Math.min(edge, timeRef.current + dt * SPEEDS[speedIndex])
          if (timeRef.current >= edge && !(isLive || isProcessing)) setPlaying(false)
        }
      }
      draw(timeRef.current)
      if (showVideo) {
        if (useRealVideo) drawOverlay(timeRef.current)
        else drawVideo(timeRef.current)
      }
      if (now - lastUi > 120) {
        lastUi = now
        setDisplayTime(timeRef.current)
        const f = list[frameIndexAt(list, timeRef.current)]
        if (f) setBallSimulated(!f.b || f.b[2] === 1)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [draw, drawVideo, drawOverlay, useRealVideo, showVideo, follow, playing, speedIndex, framesRef, isLive, isProcessing])

  const seek = useCallback(
    (time: number) => {
      const list = framesRef.current
      if (!list.length) return
      timeRef.current = Math.min(list[list.length - 1].t, Math.max(list[0].t, time))
      const vid = videoElRef.current
      if (vid) vid.currentTime = timeRef.current
      setDisplayTime(timeRef.current)
      setFollow(false)
    },
    [framesRef],
  )

  const goLive = useCallback(() => {
    setFollow(true)
    setPlaying(true)
  }, [])

  const onCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const s = rect.width / (COURT_W + 2 * PAD)
      const mx = (event.clientX - rect.left) / s - PAD
      const my = (event.clientY - rect.top) / s - PAD
      let best: Resolved | null = null
      let bestD = 1.6
      for (const p of hitRef.current) {
        if (p.ident?.role === "official") continue
        const d = Math.hypot(p.x - mx, p.y - my)
        if (d < bestD) {
          best = p
          bestD = d
        }
      }
      setSelected(best ? (best.key === selected ? null : best.key) : null)
    },
    [selected],
  )

  // keyboard: space play/pause, arrows +-5 s
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault()
        setFollow(false)
        setPlaying((p) => !p)
      } else if (event.key === "ArrowRight") {
        seek(timeRef.current + 5)
      } else if (event.key === "ArrowLeft") {
        seek(timeRef.current - 5)
      }
    }
    el.addEventListener("keydown", onKey)
    return () => el.removeEventListener("keydown", onKey)
  }, [seek, info !== null])

  const currentFrame = frames[frameIndexAt(frames, displayTime)]
  const clockLabel = useMemo(() => {
    const anchors = meta?.clock ?? []
    let prev: [number, number, boolean] | null = null
    for (const a of anchors) {
      if (a[0] > displayTime) break
      prev = a
    }
    if (prev) return fmt(prev[2] ? prev[1] + (displayTime - prev[0]) : prev[1])
    return currentFrame?.c != null ? fmt(currentFrame.c) : fmt(displayTime - firstT)
  }, [meta?.clock, displayTime, currentFrame?.c, firstT])
  const score = useMemo(() => {
    let last: string | null = null
    for (const e of info?.events ?? []) {
      if (e.v != null && e.v <= displayTime && e.score) last = e.score
    }
    if (last) return last
    // no goal before this moment: the final result at the very end, otherwise the
    // score read from the broadcast so far, otherwise nothing is known
    const atEnd = frames.length > 0 && displayTime >= frames[frames.length - 1].t - 1
    if (atEnd && meta?.status === "done" && meta?.result) return meta.result.replace("-", "–")
    return (info?.events ?? []).some((e) => e.v != null) ? "0–0" : null
  }, [info?.events, displayTime, frames, meta?.status, meta?.result])

  const roster = useMemo(() => {
    type Row = Ident & { key: string }
    const bySide: Record<Side, Row[]> = { home: [], away: [] }
    let unknown = 0
    for (const [root, ident] of Object.entries(info?.tracks.players ?? {})) {
      if (ident.role === "official" || ident.role === "bench" || ident.role === "ignore" || ident.n < 15) continue
      if (ident.side && ident.number != null) bySide[ident.side].push({ ...ident, key: ident.playerId ? `p${ident.playerId}` : `t${root}` })
      else unknown += 1
    }
    for (const side of ["home", "away"] as Side[]) {
      const seen = new Set<number>()
      bySide[side] = bySide[side]
        .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
        .filter((p) => (p.number == null || seen.has(p.number) ? false : (seen.add(p.number), true)))
    }
    return { ...bySide, unknown }
  }, [info?.tracks.players])

  const selectedIdent = useMemo(() => {
    if (!selected) return null
    const players = info?.tracks.players ?? {}
    return (
      hitRef.current.find((p) => p.key === selected)?.ident ??
      Object.values(players).find((p) => `p${p.playerId}` === selected) ??
      (selected.startsWith("t") ? players[selected.slice(1)] : undefined) ??
      null
    )
  }, [selected, info?.tracks.players, displayTime])

  const selectedStats = selectedIdent?.playerId ? info?.playerStats.find((p) => p.playerId === selectedIdent.playerId) : undefined

  if (error) {
    return <p className="px-4 py-6 text-sm text-slate-500">{error}</p>
  }
  if (!info) {
    return (
      <div className="px-4 py-6">
        <div className="aspect-[43/23] w-full animate-pulse rounded-xl bg-slate-100" />
      </div>
    )
  }

  const hasVideo = (Boolean(meta?.video) || useRealVideo) && !compact
  const hasPlan = meta?.calibrated !== false
  const span = Math.max(0.1, lastT - firstT)
  const progressPct = ((displayTime - firstT) / span) * 100
  const atEdge = follow || lastT - displayTime < 1.5

  const playPause = () => {
    if (follow) {
      setFollow(false)
      setPlaying(false)
    } else setPlaying((p) => !p)
  }
  const teamName = (side: Side) => (side === "home" ? meta?.home : meta?.away) ?? (side === "home" ? "Hemma" : "Borta")
  // who is on the court right now, per team (after the rules), and who sits out
  const now = currentFrame ? resolveAt(displayTime) : null
  const field = { home: 0, away: 0 } as Record<Side, number>
  const keepers = { home: 0, away: 0 } as Record<Side, number>
  for (const p of now?.players ?? []) {
    const sd = p.ident?.side
    if (sd !== "home" && sd !== "away") continue
    if (p.ident?.role === "keeper") keepers[sd] += 1
    else if (p.ident?.role === "player") field[sd] += 1
  }
  const suspNow = now?.susp ?? []
  const offCourt = (currentFrame?.o?.length ?? 0) + (now?.bench.length ?? 0)
  // an unseen keeper only means an empty goal when that goal is in the picture
  const clockNow = clockAt(meta?.clock, displayTime)
  const half = clockNow != null && clockNow >= (meta?.periodSeconds ?? 1800) ? "2" : "1"
  const goalInView = (side: Side) => {
    const g = meta?.defending?.[half]?.[side]
    const gv = currentFrame?.gv
    if (!g || !gv) return false
    return gv[g === "left" ? 0 : 1] === 1
  }
  // a keeper the detector lost for a moment is still in goal
  const keeperSeenLately = (side: Side) => {
    const fi = frameIndexAt(frames, displayTime)
    for (let j = fi; j >= 0 && frames[j].t >= displayTime - 3; j--) {
      for (const [tid] of frames[j].p) {
        const idn = identOf(tid, frames[j].t)
        if (idn?.role === "keeper" && idn.side === side) return true
      }
    }
    return false
  }
  const formation = (side: Side) => {
    const n = suspNow.filter((x) => x.side === side).length
    const shown = keepers[side] || keeperSeenLately(side)
      ? `${field[side]} + MV`
      : goalInView(side)
        ? `${field[side]} utespelare, tom kasse`
        : `${field[side]} utespelare i bild`
    return `${shown}${n ? `, ${n} utvisad${n > 1 ? "e" : ""}` : ""}`
  }
  const suspensionEvents = (info.events ?? []).filter((e) => SUSPENSION.test(e.type ?? "") && e.v != null)

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {/* header: teams, score, clock */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-1">
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight text-slate-900 sm:text-lg">
            <span className={hhfSide === "home" ? "text-emerald-700" : undefined}>{teamName("home")}</span>
            <span className="mx-2 font-normal text-slate-400">mot</span>
            <span className={hhfSide === "away" ? "text-emerald-700" : undefined}>{teamName("away")}</span>
          </h2>
          {(meta?.label || meta?.test) && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{meta?.test ? "Test. " : ""}{meta?.label}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {isLive && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${atEdge ? "bg-red-600 text-white" : "bg-red-50 text-red-700"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${atEdge ? "animate-pulse bg-white" : "bg-red-600"}`} />
              LIVE
            </span>
          )}
          {isProcessing && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              Analyseras {Math.round((meta?.progress ?? 0) * 100)} %
            </span>
          )}
          {score && <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-lg font-bold tabular-nums text-white">{score}</span>}
          <span className="font-mono text-sm font-bold tabular-nums text-slate-700">{clockLabel}</span>
        </div>
      </div>

      {/* video + plan */}
      <div className={hasVideo && showVideo && hasPlan ? "grid grid-cols-1 items-start gap-3 lg:grid-cols-[3fr_2fr]" : "grid grid-cols-1 gap-3"}>
        {showVideo && useRealVideo && (
          <div className="relative min-w-0 overflow-hidden rounded-xl bg-slate-900">
            <video
              ref={videoElRef}
              src={`${BASE}/${encodeURIComponent(id)}/video`}
              muted
              playsInline
              preload="auto"
              className="block w-full"
              onLoadedMetadata={(event) => {
                event.currentTarget.currentTime = timeRef.current
              }}
            />
            <canvas
              ref={overlayRef}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                const mx = event.clientX - rect.left
                const my = event.clientY - rect.top
                const hit = videoBoxesRef.current.find(({ box: [x, y, w, h] }) => mx >= x && mx <= x + w && my >= y && my <= y + h)
                setSelected(hit ? (hit.key === selected ? null : hit.key) : null)
              }}
              className="absolute inset-0 h-full w-full cursor-pointer"
              role="img"
              aria-label="Matchvideo med spårning"
            />
          </div>
        )}
        {hasVideo && showVideo && !useRealVideo && (
          <canvas
            ref={videoRef}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              const mx = event.clientX - rect.left
              const my = event.clientY - rect.top
              const hit = videoBoxesRef.current.find(({ box: [x, y, w, h] }) => mx >= x && mx <= x + w && my >= y && my <= y + h)
              setSelected(hit ? (hit.key === selected ? null : hit.key) : null)
            }}
            className="block w-full min-w-0 cursor-pointer rounded-xl bg-slate-900"
            style={{ aspectRatio: "16 / 9" }}
            role="img"
            aria-label="Video med spårning, samma tidpunkt som planen"
          />
        )}
        {hasPlan && (
          <div ref={wrapRef} tabIndex={0} className="relative w-full min-w-0 select-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <canvas
              ref={canvasRef}
              onClick={onCanvasClick}
              className="block w-full cursor-pointer rounded-xl"
              role="img"
              aria-label={`Spelplan ${teamName("home")} mot ${teamName("away")}, ${clockLabel}`}
            />
          </div>
        )}
      </div>
      {hasPlan && currentFrame && (
        <div className="space-y-1.5 px-1">
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">På planen</span>
            {(["home", "away"] as Side[]).map((side) => (
              <span key={side} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: colours[side] }} />
                {teamName(side)}: <span className="font-semibold tabular-nums text-slate-800">{formation(side)}</span>
              </span>
            ))}
            <span>Bänk och sidlinje: {offCourt}</span>
          </p>
          {suspNow.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Utvisningar just nu">
              {suspNow.map((x, i) => (
                <li
                  key={`${x.side}-${x.number}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 py-0.5 pl-1 pr-2 text-xs text-amber-900 ring-1 ring-amber-200"
                >
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: colours[x.side] }}>
                    {x.number ?? "?"}
                  </span>
                  <span className="max-w-[10rem] truncate">{x.player ?? teamName(x.side)}</span>
                  <span className="font-mono font-semibold tabular-nums">{fmt(x.left)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!hasPlan && (
        <p className="px-1 text-[11px] text-slate-500">
          Planen kunde inte hittas automatiskt i den här videon. Spårning, lag, nummer, namn och mål syns i videon.
        </p>
      )}

      {/* timeline + controls */}
      <div className="space-y-2 px-1">
        <div className="relative h-7">
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-200" />
          <div className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-emerald-600" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
          {suspensionEvents.map((e, i) => {
            const a = (((e.v as number) - firstT) / span) * 100
            const b = ((((e.vUntil ?? (e.v as number) + 120) as number) - firstT) / span) * 100
            if (b < 0 || a > 100) return null
            return (
              <span
                key={`s-${e.v}-${i}`}
                className="pointer-events-none absolute bottom-0 h-1 rounded-full bg-amber-400"
                style={{ left: `${Math.max(0, a)}%`, width: `${Math.max(0.4, Math.min(100, b) - Math.max(0, a))}%` }}
                title={`Utvisning ${e.time ?? ""} ${e.player ?? ""}`}
              />
            )
          })}
          {goals.map((g, i) => {
            const pos = (((g.v as number) - firstT) / span) * 100
            if (pos < 0 || pos > 100) return null
            return (
              <button
                key={`${g.v}-${i}`}
                type="button"
                onClick={() => seek((g.v as number) - 4)}
                className="absolute top-1/2 z-10 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                style={{ left: `${pos}%`, background: g.side ? colours[g.side] : "#64748b" }}
                aria-label={`Mål ${g.score ?? ""} ${g.time ?? ""}`}
                title={`Mål ${g.score ?? ""} ${g.time ?? ""} ${g.player ?? ""}`}
              />
            )
          })}
          <input
            type="range"
            min={firstT}
            max={Math.max(firstT + 0.1, lastT)}
            step={0.1}
            value={Math.min(lastT, Math.max(firstT, displayTime))}
            onChange={(event) => seek(Number(event.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Spola i matchen"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => seek(timeRef.current - 10)} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" aria-label="Tio sekunder bakåt">
              −10 s
            </button>
            <button
              type="button"
              onClick={playPause}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-700"
              aria-label={playing || follow ? "Pausa" : "Spela"}
            >
              {playing || follow ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
            </button>
            <button type="button" onClick={() => seek(timeRef.current + 10)} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" aria-label="Tio sekunder framåt">
              +10 s
            </button>
            <button
              type="button"
              onClick={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)}
              className="rounded-lg px-2.5 py-2 text-xs font-semibold tabular-nums text-slate-700 hover:bg-slate-100"
              aria-label="Uppspelningshastighet"
            >
              {SPEEDS[speedIndex]}x
            </button>
            {hasVideo && (
              <button
                type="button"
                onClick={() => {
                  shownImgRef.current = null
                  setShowVideo((v) => !v)
                }}
                aria-pressed={showVideo}
                aria-label={showVideo ? "Dölj video" : "Visa video"}
                className="rounded-lg px-2.5 py-2 text-slate-700 hover:bg-slate-100"
              >
                {showVideo ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </button>
            )}
          </div>
          {(isLive || isProcessing) && !follow && (
            <button type="button" onClick={goLive} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700">
              <Radio className="h-3.5 w-3.5" />
              {isLive ? "Till live" : "Till senaste"}
            </button>
          )}
        </div>

        {/* legend */}
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
          {(["home", "away"] as Side[]).map((side) => (
            <li key={side} className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ background: colours[side] }} />
              {teamName(side)}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-amber-500 bg-white" />
            Målvakt
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            Domare
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-full bg-amber-400" />
            Utvisning
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 ring-1 ring-amber-800" />
            {meta?.ballModel ? `Boll${ballSimulated ? " (i hand eller skymd)" : ""}` : "Boll visas när bollmodellen är klar"}
          </li>
        </ul>
      </div>

      {selectedIdent && (
        <div className="mx-1 flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: selectedIdent.side ? colours[selectedIdent.side] : "#94a3b8", boxShadow: selectedIdent.role === "keeper" ? "0 0 0 2px #f59e0b" : undefined }}
          >
            {selectedIdent.number ?? "?"}
          </span>
          <div className="min-w-0 text-sm">
            <p className="truncate font-bold text-slate-900">{selectedIdent.name ?? (selectedIdent.number != null ? `Nummer ${selectedIdent.number}` : "Okänd spelare")}</p>
            <p className="text-xs text-slate-500">
              {selectedIdent.side ? teamName(selectedIdent.side) : "Lag okänt"}
              {selectedIdent.role === "keeper" ? ", målvakt" : ""}
              {selectedStats?.goals ? `, ${selectedStats.goals} mål` : ""}
              {selectedStats?.suspensions ? `, ${selectedStats.suspensions} utv.` : ""}
            </p>
          </div>
        </div>
      )}

      {!compact && (
        <div className="grid grid-cols-1 gap-3 px-1 sm:grid-cols-2">
          {(["home", "away"] as Side[]).map((side) => (
            <div key={side} className="min-w-0 rounded-xl border border-slate-200 p-3">
              <p className="mb-2 flex items-center gap-2 truncate text-xs font-bold uppercase tracking-wide text-slate-600">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colours[side] }} />
                {teamName(side)}
              </p>
              {roster[side].length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {roster[side].map((p) => (
                    <li key={`${side}-${p.number}`}>
                      <button
                        type="button"
                        onClick={() => setSelected(p.key === selected ? null : p.key)}
                        className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 text-xs ${p.name ? "pr-2" : "pr-0.5"} ${
                          selected === p.key ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: colours[side] }}>
                          {p.number}
                        </span>
                        {p.name && <span className="max-w-[9rem] truncate text-slate-700">{p.name}</span>}
                        {p.role === "keeper" && <span className="text-[10px] font-semibold text-amber-700">MV</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">Inga nummer lästa än.</p>
              )}
            </div>
          ))}
          {meta?.lineupSource && <p className="text-[11px] text-slate-400 sm:col-span-2">Namn: {meta.lineupSource}</p>}
        </div>
      )}
    </div>
  )
}

export const TrackingCourt2D = memo(TrackingCourt2DInner)

// Finds a tracking analysis for a Profixio match id (staging only; returns
// null everywhere the tracking service is not available).
export function useTrackingForMatch(matchId?: string | number | null) {
  const [trackingId, setTrackingId] = useState<string | null>(null)
  useEffect(() => {
    setTrackingId(null) // never show the previous match's analysis
    if (!matchId) return
    let cancelled = false
    fetch(`${BASE}/matches`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { matches?: Array<{ id: string; matchId?: string; test?: boolean }> } | null) => {
        if (cancelled || !data?.matches) return
        const hit = data.matches.find((m) => String(m.matchId) === String(matchId) && !m.test)
        setTrackingId(hit?.id ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [matchId])
  return trackingId
}
