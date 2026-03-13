type TimelineEventLike = {
  type?: string | null
  description?: string | null
  payload?: {
    description?: string
    fallbackFinish?: boolean
    synthetic?: boolean
    [key: string]: unknown
  } | null
}

type TimelineSource<T> = {
  matchFeed?: T[] | null
  timeline?: T[] | null
  events?: T[] | null
  scoreTimeline?: T[] | null
}

const toArray = <T>(value?: T[] | null) => (Array.isArray(value) ? value : [])

const getCombinedText = (event: TimelineEventLike) =>
  `${event.type || ""} ${event.description || ""} ${event.payload?.description || ""}`.trim().toLowerCase()

export const isSyntheticFinalOnlyTimeline = <T extends TimelineEventLike>(timeline: T[]) => {
  if (timeline.length !== 1) {
    return false
  }

  const [event] = timeline
  const text = getCombinedText(event)

  return (
    Boolean(event.payload?.fallbackFinish) ||
    Boolean(event.payload?.synthetic) ||
    text.includes("matchen är slut") ||
    text.includes("slutresultat") ||
    text.includes("fulltid")
  )
}

export const getBestAvailableTimeline = <T>(source: TimelineSource<T>): T[] => {
  const candidates = [
    toArray(source.matchFeed),
    toArray(source.timeline),
    toArray(source.events),
    toArray(source.scoreTimeline),
  ]

  return candidates.find((timeline) => timeline.length > 0) ?? []
}

export const preferRicherTimeline = <T extends TimelineEventLike>(primary: T[], fallback: T[] = []) => {
  if (primary.length === 0) {
    return fallback
  }

  if (fallback.length === 0) {
    return primary
  }

  if (isSyntheticFinalOnlyTimeline(primary) && fallback.length > 1) {
    return fallback
  }

  if (primary.length < fallback.length && fallback.length > 1) {
    return fallback
  }

  return primary
}

export const resolvePreferredTimeline = <T extends TimelineEventLike>(
  source: TimelineSource<T>,
  fallback: T[] = [],
) => preferRicherTimeline(getBestAvailableTimeline(source), fallback)
