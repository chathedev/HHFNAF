"use client"

import { useEffect, useMemo, useState } from "react"
import { liveOdds, type PreMatch } from "@/lib/live-odds"
import { prob } from "@/lib/scout"

const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "")) ||
  "https://api.harnosandshf.se"

type ClockLike = {
  running?: boolean
  period?: number
  currentSeconds?: number
  currentSecondsExact?: number
  periodEndSeconds?: number
  reason?: string
  serverNow?: number
  source?: { periodLengthSeconds?: number } | null
} | null | undefined

type Props = {
  matchId?: string | null
  homeTeam: string
  awayTeam: string
  homeIsHhf: boolean
  awayIsHhf: boolean
  score: string
  clockState: ClockLike
  matchStatus?: "live" | "finished" | "upcoming" | "halftime"
}

const preCache = new Map<string, { pre: PreMatch; hhfSide: "home" | "away" | null } | null>()

// Win probability under the scoreboard: the Scout prediction before the match, updated from
// score and match time while it is live. Hidden when Scout has no prediction for the match.
export function LiveWinOdds({ matchId, homeTeam, awayTeam, homeIsHhf, awayIsHhf, score, clockState, matchStatus }: Props) {
  const [data, setData] = useState(() => (matchId ? preCache.get(matchId) ?? null : null))
  const [readingAt, setReadingAt] = useState(() => Date.now())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!matchId || preCache.has(matchId)) {
      setData(matchId ? preCache.get(matchId) ?? null : null)
      return
    }
    // Never show the previous match's odds while this one loads.
    setData(null)
    let cancelled = false
    fetch(`${API_BASE_URL}/scout/match/${encodeURIComponent(matchId)}`)
      .then((res) => {
        if (res.status === 404) {
          preCache.set(matchId, null)
          return null
        }
        return res.ok ? res.json() : null // other errors: not cached, retried next open
      })
      .then((json) => {
        if (!json) return
        const m = json?.match
        const p = m?.prediction || m?.preMatch
        const value =
          p && Number.isFinite(p.margin) && Number.isFinite(p.sigma)
            ? { pre: { pHome: p.pHome, pDraw: p.pDraw, pAway: p.pAway, margin: p.margin, sigma: p.sigma }, hhfSide: m.hhfSide ?? null }
            : null
        preCache.set(matchId, value)
        if (!cancelled) setData(value)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [matchId])

  useEffect(() => setReadingAt(Date.now()), [clockState])
  const live = matchStatus === "live" || matchStatus === "halftime"
  useEffect(() => {
    if (!live) return
    const id = globalThis.setInterval(() => setTick((t) => t + 1), 5_000)
    return () => globalThis.clearInterval(id)
  }, [live])

  const odds = useMemo(() => {
    if (!data) return null
    // Scout and the live feed name the same fixture; flip if they disagree on HHF's side.
    const feedSide = homeIsHhf && !awayIsHhf ? "home" : awayIsHhf && !homeIsHhf ? "away" : null
    const flip = Boolean(data.hhfSide && feedSide && data.hhfSide !== feedSide)
    const pre: PreMatch = flip
      ? { pHome: data.pre.pAway, pDraw: data.pre.pDraw, pAway: data.pre.pHome, margin: -data.pre.margin, sigma: data.pre.sigma }
      : data.pre
    if (!live) return pre
    const [h, a] = String(score || "").split(/[-–]/).map((v) => Number.parseInt(v, 10))
    if (!Number.isFinite(h) || !Number.isFinite(a)) return pre
    const period = clockState?.period ?? 1
    // Playing time: two periods. Period length from the clock source, else from the period end,
    // else the most common youth length (25 min).
    const sourceLen = clockState?.source?.periodLengthSeconds
    const periodEnd = clockState?.periodEndSeconds
    const periodLen =
      typeof sourceLen === "number" && sourceLen > 0
        ? sourceLen
        : typeof periodEnd === "number" && periodEnd > 0
          ? periodEnd / Math.max(1, Math.min(2, period))
          : 25 * 60
    const total = periodLen * 2
    if (matchStatus === "halftime" || clockState?.reason === "intermission") return liveOdds(pre, h, a, 0.5)
    const base = clockState?.currentSecondsExact ?? clockState?.currentSeconds
    let seconds = typeof base === "number" ? base : period >= 2 ? total / 2 : 0
    if (clockState?.running) {
      const readAt = typeof clockState.serverNow === "number" && Math.abs(Date.now() - clockState.serverNow) < 60_000 ? clockState.serverNow : readingAt
      seconds += Math.max(0, Date.now() - readAt) / 1000
    }
    return liveOdds(pre, h, a, Math.min(seconds, total - 1) / total)
  }, [data, homeIsHhf, awayIsHhf, live, score, clockState, readingAt, matchStatus, tick])

  if (!odds || matchStatus === "finished") return null
  const segments = [
    { key: "home", value: odds.pHome, label: homeTeam, cls: homeIsHhf ? "bg-emerald-600" : "bg-slate-400" },
    { key: "draw", value: odds.pDraw, label: "Oavgjort", cls: "bg-slate-200" },
    { key: "away", value: odds.pAway, label: awayTeam, cls: awayIsHhf ? "bg-emerald-600" : "bg-slate-400" },
  ]
  return (
    <div className="mt-3" aria-label="Vinstchans">
      <div className="flex items-baseline justify-between text-[11px] tabular-nums">
        <span className={homeIsHhf ? "font-bold text-slate-900" : "text-slate-500"}>{prob(odds.pHome)}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {live ? "Vinstchans just nu" : "Vinstchans"} · oavgjort {prob(odds.pDraw)}
        </span>
        <span className={awayIsHhf ? "font-bold text-slate-900" : "text-slate-500"}>{prob(odds.pAway)}</span>
      </div>
      <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`${s.cls} h-full transition-[width] duration-700 ease-out`}
            style={{ width: `${Math.max(0, s.value * 100)}%` }}
            title={`${s.label} ${prob(s.value)}`}
          />
        ))}
      </div>
    </div>
  )
}
