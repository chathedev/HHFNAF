import { prob } from "@/lib/scout"

// Win / draw / loss as one thin bar with the numbers written out underneath.
// Green = the team in focus wins, grey = draw, red = the other team wins.

type Side = { label: string; p: number; tone: "hhf" | "team" }

export function ProbabilityBar({ left, right, draw, size = "md" }: { left: Side; right: Side; draw: number; size?: "sm" | "md" | "lg" }) {
  const h = size === "lg" ? "h-1.5" : size === "sm" ? "h-[3px]" : "h-1"
  const seg = (p: number) => `${Math.max(0, p) * 100}%`
  const leftColor = "bg-emerald-600"
  return (
    <div className="w-full" role="img" aria-label={`${left.label} ${prob(left.p)}, oavgjort ${prob(draw)}, ${right.label} ${prob(right.p)}`}>
      <div className={`flex w-full gap-[2px] overflow-hidden rounded-full ${h}`}>
        <div className={leftColor} style={{ width: seg(left.p) }} />
        <div className="bg-slate-300" style={{ width: seg(draw) }} />
        <div className="bg-rose-400" style={{ width: seg(right.p) }} />
      </div>
      {size !== "sm" && (
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] gap-3 text-xs">
          <p className="min-w-0 truncate">
            <span className={`font-bold tabular-nums text-slate-950 ${size === "lg" ? "text-base" : ""}`}>{prob(left.p)}</span>{" "}
            <span className="text-slate-500">{left.label}</span>
          </p>
          <p className="text-center">
            <span className={`font-semibold tabular-nums text-slate-700 ${size === "lg" ? "text-base" : ""}`}>{prob(draw)}</span>{" "}
            <span className="text-slate-500">oavgjort</span>
          </p>
          <p className="min-w-0 truncate text-right">
            <span className="text-slate-500">{right.label}</span>{" "}
            <span className={`font-bold tabular-nums text-slate-950 ${size === "lg" ? "text-base" : ""}`}>{prob(right.p)}</span>
          </p>
        </div>
      )}
    </div>
  )
}
