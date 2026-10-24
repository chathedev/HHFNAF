import Link from "@/components/quiet-link"
import type { ReactNode } from "react"
import { BackLink } from "@/components/nav-history"
import { OUTCOME_LABEL, OUTCOME_TEXT, type Insight, type Outcome } from "@/lib/scout"

// Minimal building blocks for HHF Scout, in the same flat style as the home page match list:
// hairline dividers, small grey uppercase labels, square corners, plain text.

export function PageHeader({ back, title, sub, right }: { back?: { href: string; label: string }; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-6">
      {back && (
        <BackLink href={back.href} label={back.label} className="inline-block max-w-full truncate text-xs font-medium text-slate-500 transition hover:text-slate-900" />
      )}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          {sub && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{sub}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}

export function Section({ title, children, right, id, note }: { title: string; children: ReactNode; right?: ReactNode; id?: string; note?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{title}</h2>
        <div className="h-px flex-1 bg-slate-200" />
        {right}
      </div>
      {note && <p className="-mt-1 mb-3 text-xs text-slate-500">{note}</p>}
      {children}
    </section>
  )
}

// A row of plain figures (label above value), no boxes.
export function Figures({ items }: { items: { label: string; value: ReactNode; sub?: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-slate-200 py-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[11px] font-medium text-slate-400">{item.label}</dt>
          <dd className="mt-0.5 text-lg font-black tabular-nums text-slate-950">{item.value}</dd>
          {item.sub && <dd className="text-xs text-slate-500">{item.sub}</dd>}
        </div>
      ))}
    </dl>
  )
}

const OUTCOME_STYLE: Record<Outcome, string> = {
  W: "bg-slate-900 text-white",
  D: "bg-slate-200 text-slate-700",
  L: "border border-slate-300 text-slate-500",
}

export function OutcomeChip({ outcome }: { outcome: Outcome }) {
  return (
    <span title={OUTCOME_TEXT[outcome]} className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-[10px] font-bold ${OUTCOME_STYLE[outcome]}`}>
      {OUTCOME_LABEL[outcome]}
    </span>
  )
}

export function FormChips({ form }: { form: Outcome[] }) {
  if (!form.length) return <span className="text-xs text-slate-400">Inga matcher</span>
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Form, senaste först: ${form.map((f) => OUTCOME_TEXT[f]).join(", ")}`}>
      {form.map((outcome, index) => (
        <OutcomeChip key={index} outcome={outcome} />
      ))}
    </span>
  )
}

export function TeamLink({ teamKey, name, isHhf = false, slug = null, className = "" }: { teamKey: string | null; name: string; isHhf?: boolean; slug?: string | null; className?: string }) {
  const href = isHhf && slug ? `/scout/${slug}` : teamKey ? `/scout/lag/${teamKey}` : null
  if (!href) return <span className={className}>{name}</span>
  return (
    <Link href={href} className={`underline-offset-2 hover:underline ${className}`}>
      {name}
    </Link>
  )
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline">
      {children} ↗
    </a>
  )
}

export function ButtonLink({ href, children, tone = "dark" }: { href: string; children: ReactNode; tone?: "dark" | "green" }) {
  const cls = tone === "green" ? "border-emerald-700 text-emerald-700 hover:bg-emerald-700" : "border-slate-900 text-slate-900 hover:bg-slate-900"
  return (
    <Link href={href} className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-semibold transition hover:text-white ${cls}`}>
      {children}
    </Link>
  )
}

// Facts from the match logs. "+" = speaks for the team, "−" = a weakness. Perspective
// "opponent" turns the wording around (their strength is a threat to us).
export function InsightList({ insights, perspective = "team", limit = 6, empty = "För få matcher med matchlogg för säkra slutsatser ännu." }: { insights: Insight[]; perspective?: "team" | "opponent"; limit?: number; empty?: string }) {
  if (!insights.length) return <p className="text-sm text-slate-500">{empty}</p>
  const label = (tone: Insight["tone"]) => {
    if (tone === "strength") return perspective === "opponent" ? "Se upp" : "Styrka"
    if (tone === "weakness") return perspective === "opponent" ? "Chans för oss" : "Att jobba på"
    return "Bra att veta"
  }
  return (
    <ul className="divide-y divide-slate-200 border-y border-slate-200">
      {insights.slice(0, limit).map((insight, index) => (
        <li key={`${insight.kind}-${index}`} className="flex gap-3 py-2.5 text-sm">
          <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label(insight.tone)}</span>
          <span className="text-slate-800">{insight.text}</span>
        </li>
      ))}
    </ul>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="border-y border-slate-200 py-6 text-center text-sm text-slate-500">{children}</p>
}
