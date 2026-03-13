"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, Play } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  formatMatchDateLabel,
  formatMatchTimeLabel,
  getMatchupLabel,
  getSimplifiedMatchStatus,
} from "@/lib/match-card-utils"
import { compareMatchesByDateAscStable } from "@/lib/match-sort"
import { extendTeamDisplayName } from "@/lib/team-display"
import type { NormalizedMatch } from "@/lib/use-match-data"

type CompactCupScheduleProps = {
  matches: NormalizedMatch[]
  title: string
  description?: string
  defaultOpenDates?: number
  className?: string
  previewTimeBucketsPerDate?: number
  previewMatchesPerTimeBucket?: number
  fullScheduleHref?: string
  fullScheduleLabel?: string
}

type TimeBucket = {
  key: string
  label: string
  matches: NormalizedMatch[]
}

type DateBucket = {
  key: string
  label: string
  competitionLabel: string | null
  matches: NormalizedMatch[]
  timeBuckets: TimeBucket[]
}

const getStatusChip = (match: NormalizedMatch) => {
  const status = getSimplifiedMatchStatus(match)
  const result = match.result?.trim()

  if (match.resultState === "available" && result) {
    return {
      label: result,
      tone: "bg-slate-900 text-white",
    }
  }

  if (status === "live") {
    return {
      label: match.statusLabel ?? "LIVE",
      tone: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    }
  }

  if (status === "finished") {
    return {
      label: result || "Resultat inväntas",
      tone: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
    }
  }

  if (match.resultState === "pending") {
    return {
      label: "Resultat inväntas",
      tone: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    }
  }

  return {
    label: match.statusLabel ?? "KOMMANDE",
    tone: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  }
}

const getStreamLabel = (match: NormalizedMatch) => {
  if (match.streamProvider === "handbollplay") {
    return "HandbollPlay"
  }
  if (match.streamProvider === "solidsport") {
    return "Se live"
  }
  return "Se match"
}

const isStreamAvailable = (match: NormalizedMatch) => {
  const playUrl = (match.playUrl ?? "").trim()
  return match.hasStream === true && playUrl.length > 0 && playUrl.toLowerCase() !== "null"
}

const buildDateBuckets = (matches: NormalizedMatch[]): DateBucket[] => {
  const sortedMatches = [...matches].sort(compareMatchesByDateAscStable)
  const dateMap = new Map<
    string,
    {
      label: string
      competitionLabels: Set<string>
      timeMap: Map<string, { label: string; matches: NormalizedMatch[] }>
      matches: NormalizedMatch[]
    }
  >()

  sortedMatches.forEach((match) => {
    const dateKey = match.presentation?.primaryGroupKey ?? match.date.toISOString().slice(0, 10)
    const dateLabel = (match.presentation?.primaryGroupLabel ?? formatMatchDateLabel(match)).trim()
    const timeKey = match.presentation?.secondaryGroupKey ?? formatMatchTimeLabel(match)
    const timeLabel = (match.presentation?.secondaryGroupLabel ?? formatMatchTimeLabel(match)).trim()
    const competitionLabel = (match.series || match.competition || "").trim()

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, {
        label: dateLabel,
        competitionLabels: new Set<string>(),
        timeMap: new Map(),
        matches: [],
      })
    }

    const dateEntry = dateMap.get(dateKey)!
    dateEntry.matches.push(match)
    if (competitionLabel) {
      dateEntry.competitionLabels.add(competitionLabel)
    }

    if (!dateEntry.timeMap.has(timeKey)) {
      dateEntry.timeMap.set(timeKey, { label: timeLabel, matches: [] })
    }

    dateEntry.timeMap.get(timeKey)!.matches.push(match)
  })

  return Array.from(dateMap.entries()).map(([key, value]) => {
    const timeBuckets = Array.from(value.timeMap.entries())
      .map(([timeKey, timeValue]) => ({
        key: timeKey,
        label: timeValue.label,
        matches: [...timeValue.matches].sort((a, b) => {
          const teamCompare = (a.presentation?.tertiaryGroupLabel ?? a.teamType ?? "").localeCompare(
            b.presentation?.tertiaryGroupLabel ?? b.teamType ?? "",
            "sv",
          )
          if (teamCompare !== 0) {
            return teamCompare
          }
          return compareMatchesByDateAscStable(a, b)
        }),
      }))
      .sort((a, b) => a.matches[0].date.getTime() - b.matches[0].date.getTime())

    return {
      key,
      label: value.label,
      competitionLabel:
        value.competitionLabels.size === 1 ? Array.from(value.competitionLabels)[0] : value.competitionLabels.size > 1 ? "Flera cupklasser" : null,
      matches: value.matches,
      timeBuckets,
    }
  })
}

export function CompactCupSchedule({
  matches,
  title,
  description,
  defaultOpenDates = 1,
  className,
  previewTimeBucketsPerDate,
  previewMatchesPerTimeBucket,
  fullScheduleHref,
  fullScheduleLabel = "Visa hela matchsidan",
}: CompactCupScheduleProps) {
  const dateBuckets = useMemo(() => buildDateBuckets(matches), [matches])
  const [openDates, setOpenDates] = useState<Record<string, boolean>>({})
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setOpenDates((previous) => {
      const next: Record<string, boolean> = {}

      dateBuckets.forEach((bucket, index) => {
        next[bucket.key] = previous[bucket.key] ?? index < defaultOpenDates
      })

      const sameKeys =
        Object.keys(previous).length === Object.keys(next).length &&
        Object.keys(next).every((key) => previous[key] === next[key])

      return sameKeys ? previous : next
    })
  }, [dateBuckets, defaultOpenDates])

  useEffect(() => {
    setExpandedDates((previous) => {
      const next: Record<string, boolean> = {}

      dateBuckets.forEach((bucket) => {
        next[bucket.key] = previous[bucket.key] ?? false
      })

      const sameKeys =
        Object.keys(previous).length === Object.keys(next).length &&
        Object.keys(next).every((key) => previous[key] === next[key])

      return sameKeys ? previous : next
    })
  }, [dateBuckets])

  if (matches.length === 0) {
    return null
  }

  return (
    <section className={`rounded-xl border border-slate-200 bg-slate-50/70 ${className ?? ""}`}>
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-900">{title}</h4>
              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                ProCup
              </span>
            </div>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{matches.length} matcher</div>
            {fullScheduleHref ? (
              <Link
                href={fullScheduleHref}
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 transition hover:text-emerald-900"
              >
                {fullScheduleLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {dateBuckets.map((dateBucket) => {
          const isOpen = openDates[dateBucket.key] ?? false
          const isExpanded = expandedDates[dateBucket.key] ?? false
          const visibleTimeBuckets =
            previewTimeBucketsPerDate && !isExpanded
              ? dateBucket.timeBuckets.slice(0, previewTimeBucketsPerDate)
              : dateBucket.timeBuckets
          const hiddenTimeBuckets = dateBucket.timeBuckets.length - visibleTimeBuckets.length
          const hasHiddenMatchesInVisibleBuckets =
            Boolean(previewMatchesPerTimeBucket) &&
            visibleTimeBuckets.some((timeBucket) => timeBucket.matches.length > (previewMatchesPerTimeBucket ?? 0))
          const firstTimeLabel = dateBucket.timeBuckets[0]?.label
          const lastTimeLabel = dateBucket.timeBuckets[dateBucket.timeBuckets.length - 1]?.label
          const uniqueTeamTypes = new Set(
            dateBucket.matches.map((match) => (match.presentation?.tertiaryGroupLabel ?? match.teamType ?? "").trim()).filter(Boolean),
          ).size

          return (
            <Collapsible
              key={dateBucket.key}
              open={isOpen}
              onOpenChange={(nextOpen) => setOpenDates((previous) => ({ ...previous, [dateBucket.key]: nextOpen }))}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-white/70 sm:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-base font-semibold text-slate-950">{dateBucket.label}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {dateBucket.matches.length} matcher
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                      {dateBucket.competitionLabel ? <span>{dateBucket.competitionLabel}</span> : null}
                      {firstTimeLabel ? (
                        <span>
                          {firstTimeLabel}
                          {lastTimeLabel && lastTimeLabel !== firstTimeLabel ? `–${lastTimeLabel}` : ""}
                        </span>
                      ) : null}
                      <span>{dateBucket.timeBuckets.length} starttider</span>
                      {uniqueTeamTypes > 0 ? <span>{uniqueTeamTypes} lagklasser</span> : null}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-slate-200 bg-white">
                  {visibleTimeBuckets.map((timeBucket) => {
                    const visibleMatches =
                      previewMatchesPerTimeBucket && !isExpanded
                        ? timeBucket.matches.slice(0, previewMatchesPerTimeBucket)
                        : timeBucket.matches
                    const hiddenMatches = timeBucket.matches.length - visibleMatches.length

                    return (
                    <div key={timeBucket.key} className="border-b border-slate-100 last:border-b-0">
                      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                        <span className="text-sm font-semibold text-slate-900">{timeBucket.label}</span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                          {timeBucket.matches.length} st
                        </span>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {visibleMatches.map((match) => {
                          const statusChip = getStatusChip(match)
                          const playUrl = (match.playUrl ?? "").trim()
                          const showStream = isStreamAvailable(match)
                          const teamTypeRaw = match.teamType?.trim() || ""
                          const teamTypeLabel = extendTeamDisplayName(teamTypeRaw) || teamTypeRaw || "Härnösands HF"
                          const venueLabel = match.venue?.trim() || match.arena?.trim() || "Arena saknas"

                          return (
                            <li key={match.id} className="px-4 py-3 sm:px-5">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                                      {teamTypeLabel}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm font-medium leading-snug text-slate-950">
                                    {getMatchupLabel(match)}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">{venueLabel}</p>
                                </div>

                                <div className="flex items-center gap-2 sm:justify-end">
                                  <span
                                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${statusChip.tone}`}
                                  >
                                    {statusChip.label}
                                  </span>
                                  {showStream ? (
                                    <Link
                                      href={playUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                                    >
                                      <Play className="h-3.5 w-3.5" />
                                      {getStreamLabel(match)}
                                    </Link>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                      {hiddenMatches > 0 && !isExpanded ? (
                        <div className="px-4 pb-3 sm:px-5">
                          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                            {hiddenMatches} fler matcher vid {timeBucket.label} visas när du öppnar hela dagen.
                          </div>
                        </div>
                      ) : null}
                    </div>
                    )
                  })}

                  {(hiddenTimeBuckets > 0 || hasHiddenMatchesInVisibleBuckets) && !isExpanded ? (
                    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="text-sm text-slate-500">
                        {hiddenTimeBuckets > 0
                          ? `${hiddenTimeBuckets} fler starttider döljs för att hålla cupdagen snabb och läsbar.`
                          : "Fler matcher i vissa starttider döljs tills du öppnar hela dagen."}
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedDates((previous) => ({ ...previous, [dateBucket.key]: true }))}
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:text-slate-950"
                      >
                        Visa hela cupdagen
                      </button>
                    </div>
                  ) : null}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>
    </section>
  )
}
