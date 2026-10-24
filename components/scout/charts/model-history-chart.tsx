"use client"

import { withSealed } from "@/components/sealed"
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AXIS_TICK, CHART } from "./theme"

// How the model has learned this team: its strength before each match (goals better or worse
// than an average team in the class), ending with where it stands now. One series, so no
// legend; the tooltip carries the win chance, guess and result of each match.

export type ModelPoint = {
  id: number
  label: string
  opponent: string | null
  date: string | null
  r: number
  band: number
  games: number
  pWin: number | null
  guess: string | null
  result: string | null
  outcome: "W" | "D" | "L" | null
  now?: boolean
}

const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(1).replace(".", ",")}`
const pctText = (v: number) => (v < 0.005 ? "<1 %" : v >= 0.995 ? ">99 %" : `${Math.round(v * 100)} %`)
const WORD = { W: "vinst", D: "oavgjort", L: "förlust" }

export function ModelHistoryChart({ points, height = 190 }: { points: ModelPoint[]; height?: number }) {
  if (points.length < 2) return null
  const raw = Math.max(1, ...points.map((p) => Math.abs(p.r)))
  const max = Math.ceil(raw + 0.5)
  return (
    <div>
      <div style={{ height }} role="img" aria-label="Lagets styrka enligt modellen före varje match">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke={CHART.muted} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} domain={[-max, max]} width={44} tickFormatter={(v: number) => signed(v)} allowDecimals />
            <ReferenceLine y={0} stroke={CHART.axis} strokeWidth={1} />
            <Tooltip
              cursor={{ stroke: CHART.against, strokeWidth: 1 }}
              wrapperStyle={{ outline: "none" }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const p = payload[0].payload as ModelPoint
                return (
                  <div className="max-w-[16rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-bold text-slate-900">{p.now ? "Nu, efter senaste matchen" : `Före matchen mot ${p.opponent}`}</p>
                    {p.date && <p className="text-slate-400">{p.date}</p>}
                    <p className="mt-1 text-slate-700">
                      Styrka <span className="font-semibold tabular-nums">{signed(p.r)}</span> mål · osäkerhet ±{p.band.toFixed(1).replace(".", ",")}
                    </p>
                    {p.pWin != null && (
                      <p className="text-slate-700">
                        Vinstchans <span className="font-semibold tabular-nums">{pctText(p.pWin)}</span>
                        {p.guess ? ` · gissning ${p.guess}` : ""}
                      </p>
                    )}
                    {p.result && p.outcome && (
                      <p className="text-slate-700">
                        Blev {p.result} ({WORD[p.outcome]})
                      </p>
                    )}
                    <p className="text-slate-400">Byggt på {p.games} {p.games === 1 ? "match" : "matcher"}</p>
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="r"
              stroke={CHART.hhf}
              strokeWidth={2}
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; payload?: ModelPoint; index?: number }) => {
                const { cx, cy, payload, index } = props
                if (cx == null || cy == null || !payload) return <g key={index} />
                const fill = payload.now ? CHART.hhf : payload.outcome === "W" ? CHART.win : payload.outcome === "L" ? CHART.loss : CHART.draw
                return <circle key={index} cx={cx} cy={cy} r={payload.now ? 5 : 4} fill={fill} stroke={CHART.surface} strokeWidth={2} />
              }}
              activeDot={{ r: 6, stroke: CHART.surface, strokeWidth: 2, fill: CHART.hhf }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Styrka i mål mot ett snittlag i klassen, före varje match och nu. Prickens färg visar hur matchen gick: grön vinst, grå förlust.
      </p>
    </div>
  )
}

export const ModelHistoryChartSealed = withSealed(ModelHistoryChart, "ModelHistoryChart")
