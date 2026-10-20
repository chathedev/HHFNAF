"use client"

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AXIS_TICK, CHART } from "./theme"

// Series odds from the Monte Carlo simulation of every remaining fixture: chance to win the
// series and chance to finish top 3, one axis (both are probabilities). One hue, dark for
// "wins the series" and light for "top 3" (nested events); HHF rows are marked on the axis.

export type OddsRow = { key: string; name: string; isHhf: boolean; pFirst: number; pTop3: number; expectedPosition: number; expectedPoints: number }

const pct = (v: number) => `${Math.round(v * 100)} %`

export function OddsChart({ rows }: { rows: OddsRow[] }) {
  if (!rows.length) return null
  const data = rows.map((row) => ({ ...row, label: row.name.length > 18 ? `${row.name.slice(0, 17)}…` : row.name }))
  const height = rows.length * 34 + 48
  return (
    <div style={{ height }} role="img" aria-label="Chans att vinna serien och att sluta topp 3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 4 }} barCategoryGap="22%" barGap={2}>
          <CartesianGrid horizontal={false} stroke={CHART.muted} />
          <XAxis type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={pct} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={(props: { x: number; y: number; payload: { value: string; index: number } }) => {
              const row = data[props.payload.index]
              return (
                <g transform={`translate(${props.x},${props.y})`}>
                  {row?.isHhf && <circle cx={-142} cy={0} r={3} fill={CHART.hhf} />}
                  <text x={-4} y={0} dy={4} textAnchor="end" fontSize={11} fontWeight={row?.isHhf ? 700 : 400} fill={CHART.ink}>
                    {props.payload.value}
                  </text>
                </g>
              )
            }}
          />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.12)" }}
            wrapperStyle={{ outline: "none" }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null
              const row = payload[0].payload as OddsRow
              return (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p><span className="font-bold tabular-nums">{pct(row.pFirst)}</span> <span className="text-slate-500">vinner serien</span></p>
                  <p><span className="font-bold tabular-nums">{pct(row.pTop3)}</span> <span className="text-slate-500">slutar topp 3</span></p>
                  <p className="text-slate-500">Väntad placering {row.expectedPosition.toFixed(1).replace(".", ",")}, {row.expectedPoints.toFixed(1).replace(".", ",")} poäng</p>
                </div>
              )
            }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="square"
            iconSize={10}
            formatter={(value: string) => <span className="text-xs text-slate-600">{value === "pFirst" ? "Vinner serien" : "Topp 3"}</span>}
          />
          <Bar dataKey="pFirst" fill={CHART.team} radius={[0, 4, 4, 0]} maxBarSize={12} isAnimationActive={false} />
          <Bar dataKey="pTop3" fill={CHART.teamSoft} radius={[0, 4, 4, 0]} maxBarSize={12} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
