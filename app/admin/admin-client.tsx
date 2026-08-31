"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type Overview = {
  days: number
  totals: { pageviews: string; visitors: string; sessions: string }
  devices: Array<{ device: string; sessions: string }>
  countries: Array<{ country: string; sessions: string }>
  topPaths: Array<{ path: string; views: string; sessions: string }>
  sources: Array<{ source: string; utm_medium?: string; utm_content?: string; sessions: string; views: string }>
  daily: Array<{ day: string; views: string; visitors: string }>
  hourly: Array<{ dow: number; hour: number; views: string }>
  botEvents: number
}

type Minutely = { minutes: number; series: Array<{ minute: string; views: string; active_sessions: string; match_sessions: string }> }
type Live = { activeNow: number; byPath: Array<{ path: string; sessions: string }>; byDevice: Array<{ device: string; sessions: string }> }
type MatchRow = {
  match_id: string
  opponent: string
  date: string
  time: string
  team_type: string
  sessions_during: string
  opened_timeline: string
  pageviews_during: string
}

const DAY_LABELS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"]

const fetchJson = async <T,>(url: string): Promise<T | null> => {
  try {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

const num = (value: string | number | undefined) => Number(value || 0)

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-slate-200 bg-white px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-slate-950">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function BarList({ rows, max }: { rows: Array<{ label: string; detail?: string; value: number }>; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-2">
      {rows.map((row, index) => (
        <li key={`${row.label}-${index}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-700">
              {row.label}
              {row.detail && <span className="ml-1.5 text-xs text-slate-400">{row.detail}</span>}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{row.value}</span>
          </div>
          <div className="mt-1 h-1.5 w-full bg-slate-100">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (row.value / top) * 100)}%` }} />
          </div>
        </li>
      ))}
      {rows.length === 0 && <li className="text-sm text-slate-400">Ingen data än.</li>}
    </ul>
  )
}

function MinuteChart({ series }: { series: Minutely["series"] }) {
  const width = 720
  const height = 140
  const values = series.map((p) => num(p.active_sessions))
  const maxValue = Math.max(1, ...values)
  const points = series.map((p, i) => {
    const x = series.length > 1 ? (i / (series.length - 1)) * width : 0
    const y = height - (num(p.active_sessions) / maxValue) * (height - 12)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const matchPoints = series.map((p, i) => {
    const x = series.length > 1 ? (i / (series.length - 1)) * width : 0
    const y = height - (num(p.match_sessions) / maxValue) * (height - 12)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full min-w-[560px]" preserveAspectRatio="none" role="img" aria-label="Aktiva besökare per minut">
        <polyline points={points.join(" ")} fill="none" stroke="#10b981" strokeWidth="2" />
        <polyline points={matchPoints.join(" ")} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
      <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-emerald-500" /> Aktiva sessioner</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-amber-500" /> Varav på matchsidan</span>
        <span className="ml-auto tabular-nums">max {maxValue}</span>
      </div>
    </div>
  )
}

function DailyChart({ daily }: { daily: Overview["daily"] }) {
  const maxViews = Math.max(1, ...daily.map((d) => num(d.views)))
  return (
    <div className="flex h-36 items-end gap-[3px]">
      {daily.map((d) => (
        <div key={d.day} className="group relative flex-1">
          <div
            className="w-full bg-emerald-500/80 transition-colors group-hover:bg-emerald-600"
            style={{ height: `${Math.max(3, (num(d.views) / maxViews) * 130)}px` }}
          />
          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">
            {d.day}: {num(d.views)} visningar, {num(d.visitors)} besökare
          </div>
        </div>
      ))}
      {daily.length === 0 && <p className="text-sm text-slate-400">Ingen data än.</p>}
    </div>
  )
}

function HourHeatmap({ hourly }: { hourly: Overview["hourly"] }) {
  const grid = useMemo(() => {
    const map = new Map<string, number>()
    let max = 1
    hourly.forEach((cell) => {
      const key = `${cell.dow}-${cell.hour}`
      const value = num(cell.views)
      map.set(key, value)
      if (value > max) max = value
    })
    return { map, max }
  }, [hourly])
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-[2px]">
        <thead>
          <tr>
            <th className="w-10" />
            {Array.from({ length: 24 }).map((_, hour) => (
              <th key={hour} className="text-[9px] font-medium text-slate-400">{hour}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAY_LABELS.map((label, dayIndex) => (
            <tr key={label}>
              <td className="pr-1 text-right text-[10px] font-semibold text-slate-400">{label}</td>
              {Array.from({ length: 24 }).map((_, hour) => {
                const value = grid.map.get(`${dayIndex + 1}-${hour}`) || 0
                const intensity = value / grid.max
                return (
                  <td key={hour} title={`${label} ${hour}:00 – ${value} visningar`}>
                    <div
                      className="h-4 w-full"
                      style={{ backgroundColor: value === 0 ? "#f1f5f9" : `rgba(16,185,129,${0.15 + intensity * 0.85})` }}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AdminDashboard() {
  const [days, setDays] = useState(30)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [minutely, setMinutely] = useState<Minutely | null>(null)
  const [live, setLive] = useState<Live | null>(null)
  const [matches, setMatches] = useState<MatchRow[] | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string>("")

  const refresh = useCallback(async () => {
    const [o, m, l, ma] = await Promise.all([
      fetchJson<Overview>(`/api/admin/analytics/overview?days=${days}`),
      fetchJson<Minutely>(`/api/admin/analytics/minutely?minutes=180`),
      fetchJson<Live>(`/api/admin/analytics/live`),
      fetchJson<{ matches: MatchRow[] }>(`/api/admin/analytics/matches?days=${days}`),
    ])
    if (o) setOverview(o)
    if (m) setMinutely(m)
    if (l) setLive(l)
    if (ma) setMatches(ma.matches)
    setUpdatedAt(new Date().toLocaleTimeString("sv-SE"))
  }, [days])

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    return () => window.clearInterval(interval)
  }, [refresh])

  const deviceRows = (overview?.devices ?? []).map((d) => ({
    label: d.device === "mobile" ? "Mobil" : d.device === "tablet" ? "Surfplatta" : d.device === "desktop" ? "Dator" : d.device,
    value: num(d.sessions),
  }))
  const sourceRows = (overview?.sources ?? []).map((s) => ({
    label: s.source + (s.utm_medium ? ` / ${s.utm_medium}` : ""),
    detail: s.utm_content || undefined,
    value: num(s.sessions),
  }))
  const pathRows = (overview?.topPaths ?? []).map((p) => ({ label: p.path || "/", detail: `${p.sessions} sessioner`, value: num(p.views) }))
  const countryRows = (overview?.countries ?? []).map((c) => ({ label: c.country === "?" ? "Okänt" : c.country, value: num(c.sessions) }))

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Härnösands HF · Admin</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Besöksstatistik</h1>
          </div>
          <div className="flex items-center gap-2">
            {[7, 30, 90].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                  days === option ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200 hover:text-slate-900"
                }`}
              >
                {option} dagar
              </button>
            ))}
            <span className="ml-2 text-xs tabular-nums text-slate-400">Uppdaterad {updatedAt || "…"}</span>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Aktiva just nu" value={String(live?.activeNow ?? "…")} hint="senaste 2 min" />
          <StatCard label="Sidvisningar" value={String(num(overview?.totals?.pageviews))} hint={`senaste ${days} dagarna`} />
          <StatCard label="Unika besökare" value={String(num(overview?.totals?.visitors))} hint="per dag-hash, utan cookies" />
          <StatCard label="Sessioner" value={String(num(overview?.totals?.sessions))} />
          <StatCard label="Bortfiltrerade bottar" value={String(overview?.botEvents ?? 0)} hint="räknas inte i något ovan" />
        </section>

        <section className="mt-5 border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Per minut · senaste 3 timmarna</h2>
            {live && live.byPath.length > 0 && (
              <p className="text-xs text-slate-400">
                Just nu: {live.byPath.map((p) => `${p.path} (${p.sessions})`).slice(0, 3).join(" · ")}
              </p>
            )}
          </div>
          <div className="mt-3">
            <MinuteChart series={minutely?.series ?? []} />
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Trafikkällor</h2>
            <p className="mt-1 text-xs text-slate-400">Instagram-bion syns som ig / social · link_in_bio</p>
            <div className="mt-3">
              <BarList rows={sourceRows} />
            </div>
          </div>
          <div className="border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Mest besökta sidor</h2>
            <div className="mt-3">
              <BarList rows={pathRows} />
            </div>
          </div>
          <div className="border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Enheter</h2>
            <div className="mt-3">
              <BarList rows={deviceRows} />
            </div>
          </div>
          <div className="border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Länder</h2>
            <div className="mt-3">
              <BarList rows={countryRows} />
            </div>
          </div>
        </section>

        <section className="mt-5 border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Visningar per dag</h2>
          <div className="mt-3">
            <DailyChart daily={overview?.daily ?? []} />
          </div>
        </section>

        <section className="mt-5 border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Veckoschema · visningar per veckodag och timme</h2>
          <div className="mt-3">
            <HourHeatmap hourly={overview?.hourly ?? []} />
          </div>
        </section>

        <section className="mt-5 border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Tittande under matcher</h2>
          <p className="mt-1 text-xs text-slate-400">
            Sessioner på sajten under matchfönstret (90 min före till 150 min efter avkast) samt hur många som öppnade matchens tidslinje.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-3">Datum</th>
                  <th className="py-2 pr-3">Lag</th>
                  <th className="py-2 pr-3">Motståndare</th>
                  <th className="py-2 pr-3 text-right">Sessioner</th>
                  <th className="py-2 pr-3 text-right">Öppnade tidslinjen</th>
                  <th className="py-2 text-right">Sidvisningar</th>
                </tr>
              </thead>
              <tbody>
                {(matches ?? []).map((row) => (
                  <tr key={`${row.match_id}-${row.date}`} className="border-b border-slate-100">
                    <td className="py-2 pr-3 tabular-nums text-slate-500">{row.date} {String(row.time || "").slice(0, 5)}</td>
                    <td className="py-2 pr-3 text-slate-700">{row.team_type}</td>
                    <td className="py-2 pr-3 font-medium text-slate-900">{row.opponent}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">{num(row.sessions_during)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{num(row.opened_timeline)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-500">{num(row.pageviews_during)}</td>
                  </tr>
                ))}
                {(matches ?? []).length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-slate-400">Ingen matchtrafik registrerad än.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 text-xs text-slate-400">
          Förstapartsmätning utan cookies. IP-adresser sparas endast som saltad daghash. Bottar filtreras bort vid insamling.
        </p>
      </div>
    </main>
  )
}
