"use client"

import { useCallback, useEffect, useState } from "react"

// Profixio request monitoring: alarm level, per-exit health and request volume.
// Data: SERVERF /analytics/admin/profixio via the cookie-gated admin proxy.

type Level = "ok" | "warn" | "critical"

type ExitRow = {
  exit: string
  label: string
  pool: boolean
  healthy: boolean
  cooling: boolean
  consecutiveFailures: number
  downForMinutes: number
  lastSuccessAt: string | null
  lastError: string | null
  last60: { requests: number; ok: number; http403: number; http429: number; fail: number }
}

type HourTotal = { hour: string; requests: number; api: number; scout: number; http403: number; pool403: number; http429: number }

type ProfixioData = {
  level: Level
  reasons: Array<{ level: Level; text: string }>
  exits: ExitRow[]
  totals?: { today?: number; month?: number; thisHour?: number; last24h?: number; since?: string | null }
  peakHour: { hour: string; requests: number } | null
  hourlyTotals: HourTotal[]
}

const LEVEL_STYLE: Record<Level, { dot: string; box: string; title: string }> = {
  ok: { dot: "bg-emerald-500", box: "border-emerald-200 bg-emerald-50 text-emerald-900", title: "Allt fungerar" },
  warn: { dot: "bg-amber-500", box: "border-amber-200 bg-amber-50 text-amber-900", title: "Varning" },
  critical: { dot: "bg-red-600", box: "border-red-200 bg-red-50 text-red-900", title: "Kritiskt" },
}

const fmt = (value: number | null | undefined) => Number(value ?? 0).toLocaleString("sv-SE")

const timeOf = (iso: string | null) => {
  if (!iso) return "aldrig"
  const date = new Date(iso)
  const minutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return "nyss"
  if (minutes < 60) return `${minutes} min sedan`
  return date.toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

function HourBars({ hours }: { hours: HourTotal[] }) {
  // Always 48 slots, oldest first, so gaps show as empty hours.
  const byHour = new Map(hours.map((h) => [new Date(h.hour).getTime(), h]))
  const now = new Date()
  now.setMinutes(0, 0, 0)
  const slots = Array.from({ length: 48 }, (_, i) => {
    const ts = now.getTime() - (47 - i) * 3600_000
    return { ts, row: byHour.get(ts) }
  })
  const max = Math.max(1, ...slots.map((s) => s.row?.requests ?? 0))
  return (
    <div>
      <div className="flex h-28 items-end gap-[2px]">
        {slots.map(({ ts, row }) => {
          const total = row?.requests ?? 0
          const scoutShare = total > 0 ? (row?.scout ?? 0) / total : 0
          // The server's own IP is known to be blocked, so only 403 on the tunnels counts.
          const bad = (row?.pool403 ?? 0) + (row?.http429 ?? 0) > 0
          const label = new Date(ts).toLocaleString("sv-SE", { weekday: "short", hour: "2-digit", minute: "2-digit" })
          return (
            <div key={ts} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className={`flex w-full flex-col justify-end ${bad ? "bg-red-500" : "bg-emerald-500/80"} transition-colors group-hover:opacity-80`}
                style={{ height: `${total === 0 ? 0 : Math.max(3, (total / max) * 100)}%` }}
              >
                {!bad && scoutShare > 0 && <div className="w-full bg-amber-400" style={{ height: `${scoutShare * 100}%` }} />}
              </div>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">
                {label}: {fmt(total)} anrop ({fmt(row?.api ?? 0)} sajten, {fmt(row?.scout ?? 0)} scout)
                {bad ? `, ${row?.pool403 ?? 0} st 403 och ${row?.http429 ?? 0} st 429` : ""}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 bg-emerald-500" /> Sajten</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 bg-amber-400" /> Scout</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 bg-red-500" /> Timme med 403 eller 429</span>
        <span className="ml-auto tabular-nums">max {fmt(max)} per timme</span>
      </div>
    </div>
  )
}

export function ProfixioCard() {
  const [data, setData] = useState<ProfixioData | null>(null)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/analytics/profixio", { cache: "no-store" })
      if (!response.ok) throw new Error(String(response.status))
      setData((await response.json()) as ProfixioData)
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(interval)
  }, [refresh])

  const style = LEVEL_STYLE[data?.level ?? "ok"]
  const exits = (data?.exits ?? []).filter((e) => e.pool || (e.last60?.requests ?? 0) > 0)

  return (
    <section className="mt-5 border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Profixio, anrop och blockering</h2>
        {data && (
          <p className="text-xs tabular-nums text-slate-400">
            Idag {fmt(data.totals?.today)}, denna månad {fmt(data.totals?.month)}, senaste dygnet {fmt(data.totals?.last24h)}
          </p>
        )}
      </div>

      {failed && !data && <p className="mt-3 text-sm text-slate-400">Kunde inte hämta Profixio-status.</p>}

      {data && (
        <>
          <div className={`mt-3 border px-3 py-2.5 text-sm ${style.box}`}>
            <p className="flex items-center gap-2 font-semibold">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${style.dot}`} />
              {style.title}
            </p>
            <p className="mt-0.5 text-[13px]">
              {(data.reasons ?? []).length > 0
                ? (data.reasons ?? []).map((r) => r.text).join(" ")
                : "Alla utgångar svarar och Profixio har inte blockerat eller begränsat oss den senaste timmen."}
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-3">Utgång</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Senast lyckad</th>
                  <th className="py-2 pr-3 text-right">Anrop 60 min</th>
                  <th className="py-2 pr-3 text-right">403</th>
                  <th className="py-2 text-right">429</th>
                </tr>
              </thead>
              <tbody>
                {exits.map((e) => {
                  const status = !e.pool && !e.healthy
                    ? e.exit === "direct" ? "Blockerad sedan tidigare" : "Används inte"
                    : !e.healthy
                      ? `Nere ${e.downForMinutes} min`
                      : e.cooling
                        ? "Vilar en stund"
                        : "Fungerar"
                  const tone = e.healthy ? "text-emerald-700" : e.pool ? "text-red-700" : "text-slate-400"
                  return (
                    <tr key={e.exit} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium text-slate-900">{e.label}</td>
                      <td className={`py-2 pr-3 ${tone}`}>{status}</td>
                      <td className="py-2 pr-3 tabular-nums text-slate-500">{timeOf(e.lastSuccessAt)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmt(e.last60.requests)}</td>
                      <td className={`py-2 pr-3 text-right tabular-nums ${e.last60.http403 && e.pool ? "font-semibold text-red-700" : "text-slate-500"}`}>{e.last60.http403}</td>
                      <td className={`py-2 text-right tabular-nums ${e.last60.http429 ? "font-semibold text-red-700" : "text-slate-500"}`}>{e.last60.http429}</td>
                    </tr>
                  )
                })}
                {exits.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-slate-400">Ingen trafik registrerad än.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs text-slate-400">
              Anrop per timme, senaste 48 timmarna.
              {data.peakHour ? ` Toppen senaste 30 dagarna var ${fmt(data.peakHour.requests)} anrop (${new Date(data.peakHour.hour).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}).` : ""}
            </p>
            <HourBars hours={data.hourlyTotals ?? []} />
          </div>
        </>
      )}
    </section>
  )
}
