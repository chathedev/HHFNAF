"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AnalysisCountdown } from "@/components/analysis-countdown"

type Row = {
  id: string
  result?: string | null
  status?: string
  live?: boolean
  home?: string
  away?: string
  label?: string | null
  test?: boolean
  date?: string | null
  progress?: number | null
}

const statusText = (row: Row) => {
  if (row.status === "live") return "LIVE"
  if (row.status === "processing" || row.status === "starting") return `Analyseras ${Math.round((row.progress ?? 0) * 100)} %`
  if (row.status === "error") return "Fel"
  return "Klar"
}

export function AnalysisList() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch("/api/tracking/matches", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((data: { matches?: Row[] }) => {
          if (!cancelled) {
            setRows(data.matches ?? [])
            setFailed(false)
          }
        })
        .catch(() => !cancelled && setFailed(true))
    load()
    const timer = setInterval(load, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (failed && !rows) return <p className="mt-8 text-sm text-slate-500">Analystjänsten svarar inte just nu.</p>
  if (!rows) return <div className="mt-8 h-24 animate-pulse rounded-xl bg-slate-100" />
  if (!rows.length) return <p className="mt-8 text-sm text-slate-500">Inga analyserade matcher än.</p>

  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/analys/${encodeURIComponent(row.id)}`}
            className="flex h-full flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-emerald-500 hover:shadow-sm"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold leading-snug text-slate-900">
                {row.home ?? "Hemma"} <span className="font-normal text-slate-400">mot</span> {row.away ?? "Borta"}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                {row.test ? "Test. " : ""}
                {row.label ?? ""}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{row.date ?? ""}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  row.status === "live" ? "bg-red-600 text-white" : row.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {row.status === "processing" || row.status === "starting" ? (
                  <AnalysisCountdown id={row.id} compact />
                ) : (
                  statusText(row)
                )}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
