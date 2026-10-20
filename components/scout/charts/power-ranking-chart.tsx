"use client"

import { useRouter } from "next/navigation"
import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AXIS_TICK, CHART } from "./theme"

// Power ranking: model strength as goal difference against an average team in the class on
// neutral court. Emphasis form: HHF (and an optional highlighted opponent) in colour, the
// rest grey. Bars diverge from 0 = average.

export type PowerRow = {
  key: string
  name: string
  isHhf: boolean
  rank: number
  r: number
  attack: number | null
  defence: number | null
  games: number
  confidence: string
}

const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(1).replace(".", ",")}`

export function PowerRankingChart({ rows, highlightKey }: { rows: PowerRow[]; highlightKey?: string | null }) {
  const router = useRouter()
  const data = rows.map((row) => ({ ...row, label: `${row.rank}. ${row.name}` }))
  const extent = Math.max(2, ...rows.map((row) => Math.abs(row.r)))
  const domainMax = Math.ceil(extent * 1.25)
  const height = Math.max(160, rows.length * 30 + 24)
  const colorOf = (row: PowerRow) => (row.isHhf ? CHART.hhf : row.key === highlightKey ? CHART.team : CHART.against)
  return (
    <div>
      <div style={{ height }} role="img" aria-label="Styrkeranking: förväntad målskillnad mot ett snittlag">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 4 }} barCategoryGap="28%">
            <XAxis type="number" domain={[-domainMax, domainMax]} hide />
            <YAxis
              type="category"
              dataKey="label"
              width={190}
              tickLine={false}
              axisLine={false}
              tick={(props: { x: number; y: number; payload: { value: string } }) => (
                <text x={props.x - 4} y={props.y} dy={4} textAnchor="end" fontSize={11} fill={CHART.ink}>
                  {props.payload.value.length > 30 ? `${props.payload.value.slice(0, 29)}…` : props.payload.value}
                </text>
              )}
            />
            <ReferenceLine x={0} stroke={CHART.axis} strokeWidth={1} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              wrapperStyle={{ outline: "none" }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const row = payload[0].payload as PowerRow
                return (
                  <div className="max-w-[240px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-slate-900">{row.name}</p>
                    <p className="mt-1">
                      <span className="font-bold tabular-nums text-slate-900">{signed(row.r)}</span>
                      <span className="text-slate-500"> mål mot ett snittlag</span>
                    </p>
                    {row.attack != null && row.defence != null && (
                      <p className="text-slate-500">
                        Väntas göra <span className="font-semibold text-slate-800">{row.attack.toFixed(1).replace(".", ",")}</span>, släppa in{" "}
                        <span className="font-semibold text-slate-800">{row.defence.toFixed(1).replace(".", ",")}</span>
                      </p>
                    )}
                    <p className="text-slate-400">
                      {row.games} matcher · säkerhet {row.confidence}
                    </p>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="r"
              maxBarSize={18}
              isAnimationActive={false}
              cursor="pointer"
              onClick={(entry: { payload?: PowerRow }) => {
                const row = entry?.payload
                if (row) router.push(`/scout/lag/${row.key}`)
              }}
            >
              {data.map((row) => (
                <Cell key={row.key} fill={colorOf(row)} radius={(row.r >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4]) as unknown as number} />
              ))}
              <LabelList
                dataKey="r"
                position="right"
                content={(props) => {
                  const { x, y, width, height: h, value } = props as { x: number; y: number; width: number; height: number; value: number }
                  const left = Math.min(x, x + width)
                  const right = Math.max(x, x + width)
                  const negative = value < 0
                  return (
                    <text x={negative ? left - 6 : right + 6} y={y + h / 2} dy={4} fontSize={11} fill={CHART.ink} textAnchor={negative ? "end" : "start"}>
                      {signed(value)}
                    </text>
                  )
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Siffran är förväntad målskillnad mot ett genomsnittligt lag i klassen på neutral plan. Klicka på ett lag för hela profilen.
      </p>
    </div>
  )
}
