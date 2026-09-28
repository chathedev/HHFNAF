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
  // [tid, x, y, kit?]: kit = index into meta.kits of the shirt the track wears right now
  p: ([number, number, number] | [number, number, number, number])[]
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
  kits?: { name: string; side: Side | null; role: "player" | "keeper" | "official" }[]
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

type Boot = { info: Info; frames: string; offset: number; from: number | null; span: [number, number] | null }
const bootCache = new Map<string, { at: number; promise: Promise<Boot> }>()

// identities, events and the first frames in ONE request; a prefetch (hovering the match,
// landing on /matcher) fills the cache so opening the plan is instant
function getBoot(id: string, compact: boolean): Promise<Boot> {
  const key = `${id}|${compact ? "slim" : "full"}`
  const hit = bootCache.get(key)
  if (hit && Date.now() - hit.at < 20000) return hit.promise
  const promise = fetch(`${BASE}/${encodeURIComponent(id)}/bootstrap${compact ? "?slim=1" : ""}`, { cache: "no-store" }).then((res) => {
    if (!res.ok) throw new Error("Analysen kunde inte läsas in.")
    return res.json() as Promise<Boot>
  })
  bootCache.set(key, { at: Date.now(), promise })
  promise.catch(() => bootCache.delete(key))
  return promise
}

let releasedCache: { at: number; promise: Promise<Array<{ id: string; matchId?: string; test?: boolean; status?: string }>> } | null = null
function getReleased() {
  if (releasedCache && Date.now() - releasedCache.at < 60000) return releasedCache.promise
  const promise = fetch(`${BASE}/matches`, { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : { matches: [] }))
    .then((d: { matches?: Array<{ id: string; matchId?: string; test?: boolean; status?: string }> }) => d.matches ?? [])
    .catch(() => [])
  releasedCache = { at: Date.now(), promise }
  return promise
}

// call early (page load / hover): the list of analyses and the first window of each finished one
export function prefetchTracking() {
  void getReleased().then((list) => {
    for (const m of list) if (!m.test) void getBoot(m.id, true).catch(() => {})
  })
}

function useTracking(id: string, compact: boolean) {
  const [info, setInfo] = useState<Info | null>(null)
  const [fullSpan, setFullSpan] = useState<[number, number] | null>(null)
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

    const slimQ = compact ? "&slim=1" : ""
    const getFrames = async (query: string) => {
      const res = await fetch(`${BASE}/${encodeURIComponent(id)}/frames?${query}${slimQ}`, { cache: "no-store" })
      if (!res.ok) return [] as Frame[]
      return parseFrames(await res.text())
    }

    // everything before the first loaded frame, after the plan is already showing
    const backfillBefore = async () => {
      const first = framesRef.current[0]?.t
      if (first === undefined) return
      try {
        const older = (await getFrames(`to=${first}`)).filter((f) => f.t < (framesRef.current[0]?.t ?? first))
        if (cancelled || !older.length) return
        framesRef.current = [...older, ...framesRef.current]
        setFrameCount(framesRef.current.length)
      } catch {}
    }

    // a finished match: the rest after the first window, in 15-minute pieces
    const loadRest = async (end: number) => {
      try {
        let cursor = framesRef.current[framesRef.current.length - 1]?.t ?? 0
        while (!cancelled && cursor < end - 0.5) {
          const part = await getFrames(`from=${cursor + 0.001}&to=${cursor + 900}`)
          if (cancelled) return
          if (part.length) {
            append(part)
            cursor = framesRef.current[framesRef.current.length - 1].t
          } else cursor += 900
        }
        await backfillBefore()
      } catch {}
    }

    ;(async () => {
      try {
        const boot = await getBoot(id, compact)
        if (cancelled) return
        const nextInfo = boot.info
        const status = nextInfo.meta.status
        const running = status === "live" || status === "processing" || status === "starting"
        framesRef.current = parseFrames(boot.frames)
        setFrameCount(framesRef.current.length)
        setInfo(nextInfo)
        lastOffset = String(boot.offset ?? 0)
        if (running) {
          openStream()
          void backfillBefore()
        } else {
          const first = framesRef.current[0]?.t ?? 0
          const end = boot.span?.[1] ?? nextInfo.meta.lastT ?? nextInfo.meta.duration ?? first
          setFullSpan([boot.span?.[0] ?? 0, end])
          void loadRest(end)
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
  }, [id, reloadKey, compact])

  return { info, error, framesRef, frameCount, fullSpan }
}

type Resolved = { key: string; x: number; y: number; ident: Ident | null; tid: number }

function TrackingCourt2DInner({ id, compact = false }: { id: string; compact?: boolean }) {
  const { info, error, framesRef, frameCount, fullSpan } = useTracking(id, compact)
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
  const fadeRef = useRef(new Map<string, { p: Resolved; alpha: number }>())
  const lastDrawRef = useRef({ ms: 0, time: 0 })
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
  // a finished match: the slider covers the whole match from the first moment, even while
  // the later parts are still arriving in the background
  const firstT = fullSpan ? Math.min(fullSpan[0], frames[0]?.t ?? fullSpan[0]) : frames.length ? frames[0].t : 0
  const lastT = fullSpan ? fullSpan[1] : frames.length ? frames[frames.length - 1].t : 0

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
      // a finished match starts at kick-off (the clock's first run), not in the warm-up
      const first = framesRef.current[0]?.t ?? 0
      const kickoff = info.meta.clock?.find((a) => a[2])?.[0]
      timeRef.current = kickoff != null && kickoff > first ? kickoff : first
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

  // who is where at a moment; computed once per moment (the plan, the video boxes and
  // the counters all ask for the same instant within one animation frame)
  const resolveAt = useMemo(() => {
    const cache: { list: Frame[]; first: number; last: number; time: number; count: number; value: ReturnType<typeof resolve> }[] = []
    function resolve(time: number) {
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
      // smooth motion: each position is the weighted mean of the frames within ±0.45 s,
      // which removes the camera's frame-to-frame jitter without adding delay
      const smooth = new Map<number, [number, number, number]>()
      const here = new Map<number, [number, number]>()
      for (const row of a.p) here.set(row[0], [row[1], row[2]])
      for (let j = i; j >= 0 && time - list[j].t <= 0.45; j--) smoothFrame(list[j])
      for (let j = i + 1; j < list.length && list[j].t - time <= 0.45; j++) smoothFrame(list[j])
      function smoothFrame(f: Frame) {
        const dt = Math.abs(f.t - time)
        const w = 0.5 - dt
        for (const row of f.p) {
          // a position far from where the track is in this very frame is another
          // person (id switch, calibration flip): never averaged in
          const h = here.get(row[0])
          if (h && Math.hypot(row[1] - h[0], row[2] - h[1]) > 3) continue
          const acc = smooth.get(row[0]) ?? [0, 0, 0]
          acc[0] += row[1] * w
          acc[1] += row[2] * w
          acc[2] += w
          smooth.set(row[0], acc)
        }
      }
      const players: Resolved[] = []
      const bench: Resolved[] = []
      const seen = new Set<string>()
      // a player the detector missed for a frame or two (fast pans) stays on the plan:
      // seen just before and just after, drawn in between
      const kitOf = new Map<number, number>()
      for (const row of a.p) if (row.length > 3) kitOf.set(row[0], row[3] as number)
      const pts: [number, number, number][] = a.p.map((row) => [row[0], row[1], row[2]])
      const before = list[i - 1]
      if (before && b && b.t - before.t < 0.8) {
        const inA = new Set(a.p.map((q) => q[0]))
        const prevPos = new Map(before.p.map((q) => [q[0], q] as const))
        for (const [tid] of b.p) {
          const q = prevPos.get(tid)
          // from where it was last seen; the loop below glides it to the next frame
          if (q && !inA.has(tid)) {
            pts.push([tid, q[1], q[2]])
            if (q.length > 3) kitOf.set(tid, q[3] as number)
          }
        }
      }
      for (const [tid, x, y] of pts) {
        const n = nextPos.get(tid)
        const sm = smooth.get(tid)
        const px = sm && sm[2] > 0.3 ? sm[0] / sm[2] : n ? x + (n[0] - x) * k : x
        const py = sm && sm[2] > 0.3 ? sm[1] / sm[2] : n ? y + (n[1] - y) * k : y
        let ident = identOf(tid, time)
        // not named yet (newest seconds at the live edge): the shirt already tells the team
        const kit = kitOf.has(tid) ? info?.meta.kits?.[kitOf.get(tid) as number] : undefined
        if (!ident && kit) {
          ident = {
            side: kit.side,
            role: kit.role,
            number: null,
            numberConf: 0,
            playerId: null,
            name: null,
            n: 0,
            kitConf: 0.3,
          }
        }
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
      // people outside the playing area (bench, coaches, crowd) never count towards a team
      const onCourtNow = (p: Resolved) => {
        const mx = p.ident?.role === "keeper" ? 1.8 : 1.5
        // along the middle of the sidelines stand the benches (coaches, substitutes, table):
        // there the line itself is the limit; the wings work the corners and may step out
        const middle = p.x > 8 && p.x < 32 && p.ident?.role !== "official"
        const my = middle ? 0.2 : 1.0
        return p.x >= -mx && p.x <= COURT_W + mx && p.y >= -my && p.y <= COURT_H + my
      }
      for (let j = players.length - 1; j >= 0; j--) if (!onCourtNow(players[j])) players.splice(j, 1)
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
      // only the game is shown: players of the two teams and the referees, on the court.
      // Benches, coaches, people walking along the side, the crowd and anyone the
      // analysis could not place in a team are left out (plan and video alike).
      const inPlay = (p: Resolved) => {
        const role = p.ident?.role
        if (role === "official") return true          // already inside the margins above
        if (role !== "player" && role !== "keeper") return false
        return p.ident?.side === "home" || p.ident?.side === "away"
      }
      for (let j = players.length - 1; j >= 0; j--) if (!inPlay(players[j])) players.splice(j, 1)
      bench.length = 0
      // ball: only a sighting that is part of a believable flight. In a +-0.6 s window the
      // sightings are chained in time order; a link is believable when it needs at most
      // 32 m/s. The longest chain (at least 4 sightings) is the ball; a lone sighting
      // that jumps between players is not shown. "In hand" only right after a chain.
      let ball: [number, number, number] | null = null
      {
        const seen: { t: number; x: number; y: number }[] = []
        let held: [number, number] | null = null
        for (let j = Math.max(0, i - 14); j <= Math.min(list.length - 1, i + 14); j++) {
          const f = list[j]
          if (!f.b || Math.abs(f.t - time) > 0.6) continue
          if (f.b[2] === 0) seen.push({ t: f.t, x: f.b[0], y: f.b[1] })
          else if (f.t <= time) held = [f.b[0], f.b[1]]
        }
        let best: { t: number; x: number; y: number }[] = []
        for (let s0 = 0; s0 < seen.length; s0++) {
          const chain = [seen[s0]]
          for (let m = s0 + 1; m < seen.length; m++) {
            const last = chain[chain.length - 1]
            const dt = Math.max(0.05, seen[m].t - last.t)
            if (Math.hypot(seen[m].x - last.x, seen[m].y - last.y) / dt <= 32) chain.push(seen[m])
          }
          if (chain.length > best.length) best = chain
        }
        if (best.length >= 3) {
          let sx = 0
          let sy = 0
          let sw = 0
          for (const q of best) {
            const dt = Math.abs(q.t - time)
            if (dt > 0.35) continue
            const w = 0.4 - dt
            sx += q.x * w
            sy += q.y * w
            sw += w
          }
          if (sw > 0) ball = [sx / sw, sy / sw, 0]
          else {
            const q = best.reduce((a, c) => (Math.abs(c.t - time) < Math.abs(a.t - time) ? c : a))
            if (Math.abs(q.t - time) < 0.6) ball = [q.x, q.y, 0]
          }
        } else if (held && a.b && a.b[2] === 1) ball = [held[0], held[1], 1]
      }
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
    }
    return (time: number) => {
      const list = framesRef.current
      const count = list.length
      const first = list[0]?.t ?? 0
      const lastT = list[count - 1]?.t ?? 0
      const hit = cache.find((c) => c.time === time && c.list === list && c.count === count && c.first === first && c.last === lastT)
      if (hit) return hit.value
      const value = resolve(time)
      cache.unshift({ list, first, last: lastT, time, count, value })
      if (cache.length > 4) cache.pop()
      return value
    }
  }, [framesRef, identOf, effectiveTid, goals, info?.tracks.alias, info?.events, info?.meta])

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

      const { players, ball } = resolveAt(time)
      hitRef.current = players
      // dots ease in and out (0.18 s / 0.3 s) instead of popping: a player the analysis loses
      // for a moment fades and comes back, it does not blink
      const nowMs = performance.now()
      const dtS = Math.min(0.1, (nowMs - lastDrawRef.current.ms) / 1000)
      const jumped = Math.abs(time - lastDrawRef.current.time) > 1.0
      lastDrawRef.current = { ms: nowMs, time }
      const fade = fadeRef.current
      if (jumped) fade.clear()
      const presentKeys = new Set<string>()
      for (const p of players) {
        presentKeys.add(p.key)
        const e = fade.get(p.key)
        if (e) {
          e.p = p
          e.alpha = Math.min(1, e.alpha + dtS / 0.18)
        } else fade.set(p.key, { p, alpha: jumped ? 1 : Math.min(1, dtS / 0.18) })
      }
      fade.forEach((e, key) => {
        if (presentKeys.has(key)) return
        e.alpha -= dtS / 0.3
        if (e.alpha <= 0) fade.delete(key)
      })
      const shown = Array.from(fade.values())
      const r = Math.max(8 * dpr, 0.55 * s)
      // officials first (under players)
      const ordered = shown.sort((a, b) => Number(a.p.ident?.role === "official") - Number(b.p.ident?.role === "official")).reverse()
      for (const { p, alpha } of ordered) {
        ctx.globalAlpha = alpha
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
      ctx.globalAlpha = 1
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
      const { players: shown } = resolveAt(ft)
      const capped = new Map<number, Ident | null>()
      for (const p of shown) capped.set(p.tid, p.ident)
      const font = Math.max(11, Math.round(12 * dpr))
      ctx.font = `700 ${font}px ui-sans-serif, system-ui, sans-serif`
      ctx.textBaseline = "middle"
      const hits: { key: string; box: [number, number, number, number] }[] = []
      for (const [tid, x1, y1, x2, y2] of boxes) {
        if (!capped.has(tid)) continue       // not in play: no box at all
        const ident = capped.get(tid) ?? null
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
    [effectiveTid, colours, selected, info?.tracks.alias, resolveAt],
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
      // every box is the weighted mean of that person's boxes within ±0.35 s: it glides
      // with the player instead of twitching with each detection
      const acc = new Map<number, [number, number, number, number, number]>()
      const aBoxes = new Map<number, [number, number]>()
      for (const [tid, x1, y1, x2, y2] of a.bx ?? []) aBoxes.set(tid, [(x1 + x2) / 2, (y1 + y2) / 2])
      let bx = 0
      let by = 0
      let bw = 0
      for (let j = Math.max(0, k - 5); j <= Math.min(list.length - 1, k + 5); j++) {
        const f = list[j]
        if (!f.bx) continue
        const dt = Math.abs(f.t - time)
        if (dt > 0.35) continue
        const w = 0.4 - dt
        for (const [tid, x1, y1, x2, y2] of f.bx) {
          // a box far from this track's box in the shown frame is another person: never averaged in
          const ref = aBoxes.get(tid)
          if (ref && Math.hypot((x1 + x2) / 2 - ref[0], (y1 + y2) / 2 - ref[1]) > 90) continue
          const q = acc.get(tid) ?? [0, 0, 0, 0, 0]
          q[0] += x1 * w
          q[1] += y1 * w
          q[2] += x2 * w
          q[3] += y2 * w
          q[4] += w
          acc.set(tid, q)
        }
        if (f.bb && f.b?.[2] === 0) {
          bx += f.bb[0] * w
          by += f.bb[1] * w
          bw += w
        }
      }
      const present = new Set((a.bx ?? []).map((x) => x[0]))
      const boxes: [number, number, number, number, number][] = []
      acc.forEach((q, tid) => {
        if (!present.has(tid) || q[4] <= 0) return
        boxes.push([tid, q[0] / q[4], q[1] / q[4], q[2] / q[4], q[3] / q[4]])
      })
      // the ball circle in the video only where the plan believes in the ball
      const trusted = resolveAt(time).ball
      const bb: [number, number] | undefined = bw > 0 && trusted && trusted[2] === 0 ? [bx / bw, by / bw] : undefined
      videoBoxesRef.current = paintBoxes(ctx, boxes, canvas.width / 960, dpr, time, bb, false)
    },
    [framesRef, paintBoxes, resolveAt],
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
      const hits = paintBoxes(ctx, boxes, k2, dpr, list[fk]?.t ?? time, bb, list[fk]?.b?.[2] === 1)
      videoBoxesRef.current = hits
      shownImgRef.current = key
    },
    [framesRef, loadImg, paintBoxes, selected],
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
    getReleased()
      .then((matches) => {
        if (cancelled) return
        const hit = matches.find((m) => String(m.matchId) === String(matchId) && !m.test)
        setTrackingId(hit?.id ?? null)
        if (hit) void getBoot(hit.id, true).catch(() => {})
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [matchId])
  return trackingId
}
