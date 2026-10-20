"use client"

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AXIS_TICK, CHART } from "./theme"

// Honesty check for the model: when it gave the favourite X %, how often did the favourite
// actually win? Points on the diagonal = well calibrated. From the walk-forward backtest.

type Bin = { from: number; to: number; n: number; predicted: number; actual: number }

const pct = (v: number) => `${Math.round(v * 100)} %`

export function CalibrationChart({ bins, height = 220 }: { bins: Bin[]; height?: number }) {
  const data = bins.filter((b) => b.n > 0).map((b) => ({ ...b, x: b.predicted, y: b.actual }))
  if (!data.length) return null
  return (
    <div>
      <div style={{ height }} role="img" aria-label="Modellens kalibrering: förutsagd mot faktisk vinstandel">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid stroke={CHART.muted} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0.5, 1]}
              ticks={[0.5, 0.6, 0.7, 0.8, 0.9, 1]}
              tickFormatter={pct}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
            />
            <YAxis type="number" domain={[0.4, 1]} ticks={[0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]} tickFormatter={pct} tick={AXIS_TICK} tickLine={false} axisLine={false} width={52} />
            <ReferenceLine
              segment={[{ x: 0.5, y: 0.5 }, { x: 1, y: 1 }]}
              stroke={CHART.against}
              strokeWidth={1}
              ifOverflow="extendDomain"
            />
            <Tooltip
              wrapperStyle={{ outline: "none" }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const b = payload[0].payload as Bin
                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="text-slate-500">Modellen gav favoriten {pct(b.from)}–{pct(b.to)}</p>
                    <p>
                      <span className="font-bold tabular-nums text-slate-900">{pct(b.actual)}</span>
                      <span className="text-slate-500"> vann faktiskt (snitt prognos {pct(b.predicted)})</span>
                    </p>
                    <p className="text-slate-400">{b.n} matcher</p>
                  </div>
                )
              }}
            />
            <Line
              type="linear"
              dataKey="y"
              stroke={CHART.hhf}
              strokeWidth={2}
              dot={{ r: 5, fill: CHART.hhf, stroke: CHART.surface, strokeWidth: 2 }}
              activeDot={{ r: 7, fill: CHART.hhf, stroke: CHART.surface, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Grå linje = perfekt träffsäkerhet. Varje punkt är en grupp matcher där modellen gav favoriten ungefär samma chans.
      </p>
    </div>
  )
}
