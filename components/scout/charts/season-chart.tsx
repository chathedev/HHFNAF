"use client"

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AXIS_TICK, CHART } from "./theme"

// The season match by match: goal difference per match in date order. Wins, draws and losses
// are status colours and always come with the result word in the tooltip and table.

export type SeasonPoint = {
  id: number
  date: string
  opponent: string
  score: string
  gd: number
  outcome: "W" | "D" | "L"
  home: boolean
}

const WORD = { W: "Vinst", D: "Oavgjort", L: "Förlust" }

export function SeasonChart({ points, height = 170 }: { points: SeasonPoint[]; height?: number }) {
  if (!points.length) return null
  const raw = Math.max(3, ...points.map((p) => Math.abs(p.gd)))
  const step = raw > 20 ? 10 : 5
  const max = Math.ceil(raw / step) * step
  const ticks = [-max, -max / 2, 0, max / 2, max].filter((t) => Number.isInteger(t))
  const data = points.map((p, i) => ({ ...p, n: i + 1 }))
  return (
    <div>
      <div style={{ height }} role="img" aria-label="Målskillnad per match under säsongen">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke={CHART.muted} />
            <XAxis dataKey="n" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} domain={[-max, max]} ticks={ticks} width={44} allowDecimals={false} />
            <ReferenceLine y={0} stroke={CHART.axis} strokeWidth={1} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              wrapperStyle={{ outline: "none" }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const p = payload[0].payload as SeasonPoint
                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-bold tabular-nums text-slate-900">
                      {p.score} <span className="font-semibold text-slate-500">({p.gd > 0 ? "+" : ""}{p.gd})</span>
                    </p>
                    <p className="text-slate-600">
                      {WORD[p.outcome]} {p.home ? "hemma mot" : "borta mot"} {p.opponent}
                    </p>
                    <p className="text-slate-400">{p.date}</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="gd" maxBarSize={22} isAnimationActive={false}>
              {data.map((p) => (
                <Cell
                  key={p.id}
                  fill={p.outcome === "W" ? CHART.win : p.outcome === "L" ? CHART.loss : CHART.against}
                  radius={(p.gd >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]) as unknown as number}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART.win }} /> Vinst</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART.against }} /> Oavgjort</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART.loss }} /> Förlust</span>
        <span>Målskillnad per match, äldst till vänster</span>
      </div>
    </div>
  )
}
