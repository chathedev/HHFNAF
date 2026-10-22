"use client"

import { withSealed } from "@/components/sealed"
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AXIS_TICK, CHART } from "./theme"

// When a team scores and concedes: goals per match in ten equal slices of the game
// (5 min each for 2x25, 6 min for 2x30). Scored grows up, conceded grows down, from one
// baseline. Data: Profixio match logs only.

const fmt = (v: number) => v.toFixed(1).replace(".", ",")

export function GoalTimingChart({
  scored,
  conceded,
  periodMinutes,
  matches,
  tone = "team",
  height = 220,
}: {
  scored: number[]
  conceded: number[]
  periodMinutes: number | null
  matches: number
  tone?: "hhf" | "team"
  height?: number
}) {
  const total = 2 * (periodMinutes || 25)
  const step = total / 10
  const data = scored.map((value, i) => ({
    label: `${Math.round(i * step)}–${Math.round((i + 1) * step)}`,
    scored: value,
    conceded: -(conceded[i] || 0),
  }))
  const max = Math.max(1, Math.ceil(Math.max(...scored, ...conceded)))
  const accent = tone === "hhf" ? CHART.hhf : CHART.team
  return (
    <div>
      <div style={{ height }} role="img" aria-label="Gjorda och insläppta mål per matchperiod">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} stackOffset="sign" margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={CHART.muted} />
            {/* Only the start minute on the axis ("10" not "10–15"): ten full ranges do not fit on a
                phone. The full range is in the tooltip and the table. */}
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              interval={0}
              fontSize={10}
              tickFormatter={(v: string) => `${String(v).split("–")[0]}'`}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              domain={[-max, max]}
              ticks={[-max, 0, max]}
              tickFormatter={(v: number) => fmt(Math.abs(v))}
              width={44}
            />
            <ReferenceLine y={0} stroke={CHART.axis} strokeWidth={1} />
            <ReferenceLine x={data[5]?.label} stroke={CHART.against} strokeWidth={1} label={{ value: "paus", position: "insideTopLeft", fill: CHART.axis, fontSize: 10 }} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              wrapperStyle={{ outline: "none" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const row = payload[0].payload as { scored: number; conceded: number }
                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="mb-1 font-semibold text-slate-500">Minut {label}</p>
                    <p className="flex items-center gap-2">
                      <span className="h-0.5 w-3 rounded" style={{ background: accent }} />
                      <span className="font-bold tabular-nums text-slate-900">{fmt(row.scored)}</span>
                      <span className="text-slate-500">gjorda per match</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="h-0.5 w-3 rounded" style={{ background: CHART.against }} />
                      <span className="font-bold tabular-nums text-slate-900">{fmt(-row.conceded)}</span>
                      <span className="text-slate-500">insläppta per match</span>
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="scored" stackId="t" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            <Bar dataKey="conceded" stackId="t" fill={CHART.against} radius={[0, 0, 4, 4]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: accent }} aria-hidden /> Gjorda mål (uppåt)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART.against }} aria-hidden /> Insläppta mål (nedåt)
        </span>
        <span>Snitt per match, {matches} {matches === 1 ? "match" : "matcher"} med matchlogg</span>
      </div>
      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer select-none font-semibold text-slate-600">Visa som tabell</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left tabular-nums">
            <thead>
              <tr className="text-slate-400">
                <th className="py-1 pr-3 font-semibold">Minut</th>
                {data.map((row) => (
                  <th key={row.label} className="px-1 py-1 text-center font-semibold">{row.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 pr-3 font-semibold text-slate-600">Gjorda</td>
                {data.map((row) => (
                  <td key={row.label} className="px-1 py-1 text-center text-slate-800">{fmt(row.scored)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-1 pr-3 font-semibold text-slate-600">Insläppta</td>
                {data.map((row) => (
                  <td key={row.label} className="px-1 py-1 text-center text-slate-800">{fmt(-row.conceded)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

export const GoalTimingChartSealed = withSealed(GoalTimingChart, "GoalTimingChart")
