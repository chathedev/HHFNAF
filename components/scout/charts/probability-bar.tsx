"use client"

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CHART } from "./theme"

// Win / draw / loss probabilities as one 100 % stacked bar (part-to-whole), with the
// numbers always written out underneath so the tooltip only enhances.

type Side = { label: string; p: number; tone: "hhf" | "team" }

const fmt = (p: number) => `${Math.round(p * 100)} %`

export function ProbabilityBar({
  left,
  right,
  draw,
  size = "md",
}: {
  left: Side
  right: Side
  draw: number
  size?: "sm" | "md" | "lg"
}) {
  const height = size === "lg" ? 22 : size === "sm" ? 10 : 14
  const colorOf = (tone: Side["tone"]) => (tone === "hhf" ? CHART.hhf : CHART.team)
  const data = [{ name: "p", left: left.p, draw, right: right.p }]
  const rows = [
    { key: "left", label: left.label, p: left.p, color: colorOf(left.tone) },
    { key: "draw", label: "Oavgjort", p: draw, color: CHART.draw },
    { key: "right", label: right.label, p: right.p, color: right.tone === left.tone ? CHART.against : colorOf(right.tone) },
  ]
  return (
    <div className="w-full">
      <div style={{ height }} className="w-full" role="img" aria-label={`${left.label} ${fmt(left.p)}, oavgjort ${fmt(draw)}, ${right.label} ${fmt(right.p)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap={0}>
            <XAxis type="number" domain={[0, 1]} hide />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              cursor={false}
              wrapperStyle={{ outline: "none", zIndex: 30 }}
              content={({ active }) =>
                active ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    {rows.map((row) => (
                      <div key={row.key} className="flex items-center gap-2 py-0.5">
                        <span className="h-0.5 w-3 rounded" style={{ background: row.color }} />
                        <span className="font-bold tabular-nums text-slate-900">{fmt(row.p)}</span>
                        <span className="text-slate-500">{row.label}</span>
                      </div>
                    ))}
                  </div>
                ) : null
              }
            />
            <Bar dataKey="left" stackId="p" fill={rows[0].color} radius={[4, 0, 0, 4]} stroke={CHART.surface} strokeWidth={2} isAnimationActive={false} />
            <Bar dataKey="draw" stackId="p" fill={rows[1].color} stroke={CHART.surface} strokeWidth={2} isAnimationActive={false} />
            <Bar dataKey="right" stackId="p" fill={rows[2].color} radius={[0, 4, 4, 0]} stroke={CHART.surface} strokeWidth={2} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {size !== "sm" && (
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-xs">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: rows[0].color }} aria-hidden />
              <span className={`font-black tabular-nums text-slate-950 ${size === "lg" ? "text-base" : ""}`}>{fmt(left.p)}</span>
            </p>
            <p className="mt-0.5 truncate text-slate-500" title={left.label}>{left.label}</p>
          </div>
          <div className="text-center">
            <p className="flex items-center justify-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: rows[1].color }} aria-hidden />
              <span className={`font-bold tabular-nums text-slate-700 ${size === "lg" ? "text-base" : ""}`}>{fmt(draw)}</span>
            </p>
            <p className="mt-0.5 text-slate-500">oavgjort</p>
          </div>
          <div className="min-w-0 text-right">
            <p className="flex items-center justify-end gap-1.5">
              <span className={`font-black tabular-nums text-slate-950 ${size === "lg" ? "text-base" : ""}`}>{fmt(right.p)}</span>
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: rows[2].color }} aria-hidden />
            </p>
            <p className="mt-0.5 truncate text-slate-500" title={right.label}>{right.label}</p>
          </div>
        </div>
      )}
    </div>
  )
}
