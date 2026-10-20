import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowUpRight, TrendingDown, TrendingUp, Minus } from "lucide-react"
import { OUTCOME_LABEL, OUTCOME_TEXT, type Insight, type Outcome } from "@/lib/scout"

// Small building blocks for the HHF Scout pages. They follow the /matcher and /tabeller
// visual language: slate ink, emerald for HHF, rounded-2xl cards, hairline borders.

export function Section({
  eyebrow,
  title,
  children,
  right,
  id,
  description,
}: {
  eyebrow?: string
  title: string
  children: ReactNode
  right?: ReactNode
  id?: string
  description?: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-600">{eyebrow}</p>}
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 sm:text-xl">{title}</h2>
          {description && <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</div>
}

export function StatTile({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${highlight ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-widest ${highlight ? "text-emerald-700" : "text-slate-400"}`}>{label}</p>
      <p className={`mt-1 text-2xl font-black ${highlight ? "text-emerald-800" : "text-slate-950"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

const OUTCOME_STYLE: Record<Outcome, string> = {
  W: "bg-emerald-600 text-white",
  D: "bg-slate-200 text-slate-800",
  L: "bg-rose-500 text-white",
}

export function OutcomeChip({ outcome, size = "md" }: { outcome: Outcome; size?: "sm" | "md" }) {
  return (
    <span
      title={OUTCOME_TEXT[outcome]}
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-black ${OUTCOME_STYLE[outcome]} ${
        size === "sm" ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-[11px]"
      }`}
    >
      {OUTCOME_LABEL[outcome]}
    </span>
  )
}

export function FormChips({ form, size = "md" }: { form: Outcome[]; size?: "sm" | "md" }) {
  if (!form.length) return <span className="text-xs text-slate-400">Inga matcher</span>
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Form, senaste först: ${form.map((f) => OUTCOME_TEXT[f]).join(", ")}`}>
      {form.map((outcome, index) => (
        <OutcomeChip key={index} outcome={outcome} size={size} />
      ))}
    </span>
  )
}

export function TeamLink({
  teamKey,
  name,
  isHhf = false,
  slug = null,
  className = "",
}: {
  teamKey: string | null
  name: string
  isHhf?: boolean
  slug?: string | null
  className?: string
}) {
  const href = isHhf && slug ? `/scout/${slug}` : teamKey ? `/scout/lag/${teamKey}` : null
  const body = (
    <>
      {isHhf && <span className="mr-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 align-middle" aria-hidden />}
      {name}
    </>
  )
  if (!href) return <span className={className}>{body}</span>
  return (
    <Link href={href} className={`hover:underline decoration-slate-300 underline-offset-2 ${className}`}>
      {body}
    </Link>
  )
}

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "emerald" | "sky" | "amber" | "rose" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    sky: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
    </a>
  )
}

// Insights: strength / weakness / neutral, always with an icon + word, never colour alone.
export function InsightList({
  insights,
  perspective = "team",
  limit = 8,
  empty = "För få loggade matcher för säkra slutsatser ännu.",
}: {
  insights: Insight[]
  perspective?: "team" | "opponent"
  limit?: number
  empty?: string
}) {
  if (!insights.length) return <p className="text-sm text-slate-500">{empty}</p>
  const label = (tone: Insight["tone"]) => {
    if (tone === "strength") return perspective === "opponent" ? "Hot" : "Styrka"
    if (tone === "weakness") return perspective === "opponent" ? "Möjlighet" : "Att jobba på"
    return "Värt att veta"
  }
  return (
    <ul className="space-y-2">
      {insights.slice(0, limit).map((insight, index) => {
        const Icon = insight.tone === "strength" ? TrendingUp : insight.tone === "weakness" ? TrendingDown : Minus
        const tone =
          insight.tone === "strength"
            ? perspective === "opponent"
              ? "text-rose-600 bg-rose-50"
              : "text-emerald-700 bg-emerald-50"
            : insight.tone === "weakness"
              ? perspective === "opponent"
                ? "text-emerald-700 bg-emerald-50"
                : "text-amber-700 bg-amber-50"
              : "text-slate-600 bg-slate-100"
        return (
          <li key={`${insight.kind}-${index}`} className="flex gap-3 rounded-xl border border-slate-100 bg-white p-3">
            <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label(insight.tone)}</p>
              <p className="text-sm leading-snug text-slate-800">{insight.text}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">{children}</div>
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition hover:text-emerald-900">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {children}
    </Link>
  )
}
