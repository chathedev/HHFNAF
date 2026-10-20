"use client"

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AXIS_TICK, CHART } from "./theme"

// Who scores: the team's top scorers, field goals and 7 m goals stacked (part of the
// player's total), total written at the bar tip.

export type ScorerRow = { name: string; no: string | null; goals: number; pen: number; games: number; gpg: number }

export function ScorersChart({ players, tone = "team", limit = 10 }: { players: ScorerRow[]; tone?: "hhf" | "team"; limit?: number }) {
  const rows = players.filter((p) => p.goals > 0).slice(0, limit)
  if (!rows.length) return null
  const accent = tone === "hhf" ? CHART.hhf : CHART.team
  const soft = tone === "hhf" ? CHART.hhfSoft : CHART.teamSoft
  const data = rows.map((p) => ({
    ...p,
    label: `${p.no ? `#${p.no} ` : ""}${p.name}`,
    field: p.goals - p.pen,
  }))
  const height = rows.length * 30 + 16
  return (
    <div>
      <div style={{ height }} role="img" aria-label="Lagets främsta målskyttar">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 4 }} barCategoryGap="26%">
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="label"
              width={200}
              tickLine={false}
              axisLine={false}
              tick={(props: { x: number; y: number; payload: { value: string } }) => (
                <text x={props.x - 4} y={props.y} dy={4} textAnchor="end" fontSize={11} fill={CHART.ink}>
                  {props.payload.value.length > 30 ? `${props.payload.value.slice(0, 29)}…` : props.payload.value}
                </text>
              )}
            />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              wrapperStyle={{ outline: "none" }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const p = payload[0].payload as ScorerRow & { field: number; label: string }
                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-slate-900">{p.label}</p>
                    <p><span className="font-bold tabular-nums text-slate-900">{p.goals}</span> <span className="text-slate-500">mål på {p.games} matcher ({p.gpg.toFixed(1).replace(".", ",")} per match)</span></p>
                    <p className="text-slate-500">{p.field} spelmål · {p.pen} på 7 meter</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="field" stackId="g" fill={accent} maxBarSize={18} isAnimationActive={false} stroke={CHART.surface} strokeWidth={1} />
            <Bar dataKey="pen" stackId="g" fill={soft} maxBarSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false} stroke={CHART.surface} strokeWidth={1}>
              <LabelList dataKey="goals" position="right" fill={CHART.ink} fontSize={11} fontWeight={700} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: accent }} /> Spelmål</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: soft }} /> 7-metersmål</span>
      </div>
    </div>
  )
}
