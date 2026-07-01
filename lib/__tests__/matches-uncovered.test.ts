// Run with: npx vitest run lib/__tests__/matches-uncovered.test.ts
//
// Gap: lib/matches.ts exports parseMatchesFromHtml, getMatchTeams,
// formatCountdownLabel, enrichMatchWithDetails, refreshMatchResult, and
// fetchUpcomingMatches — NONE of these have any test coverage today.
// lib/__tests__/matches.test.ts only covers normalizeMatchKey / ticket
// eligibility helpers. See lib/matches.ts:104 (parseMatchesFromHtml),
// :261 (getMatchTeams), :277 (formatCountdownLabel), :314 (enrichMatchWithDetails),
// :362 (refreshMatchResult), :396 (fetchUpcomingMatches).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseMatchesFromHtml,
  getMatchTeams,
  formatCountdownLabel,
  enrichMatchWithDetails,
  refreshMatchResult,
  fetchUpcomingMatches,
  type UpcomingMatch,
} from '../matches'

// ── parseMatchesFromHtml — matches.ts:104 ──────────────────────────────────
// NOTE: guarded by `typeof window === "undefined"` — requires jsdom environment
// (vitest.config.ts environment: 'jsdom') to exercise the real parsing path.

describe('parseMatchesFromHtml', () => {
  it('returns [] when window is undefined (SSR guard)', () => {
    // TODO: if running under node environment, assert [] is returned without DOMParser
  })

  it('parses a day node with a home match', () => {
    // TODO: build minimal HTML with li.fullCalendar__day[data-day] > li.fullCalendar__item
    //   > .fullCalendar__itemInner > .fullCalendar__time / .fullCalendar__text (with "(hemma)")
    // assert isHome === true and "(hemma)" stripped from opponent
  })

  it('parses an away match ("(borta)")', () => {
    // TODO: assert isHome === false
  })

  it('skips events with missing/invalid time text', () => {
    // TODO: fullCalendar__time missing or non-numeric -> event skipped
  })

  it('skips events in the past relative to `now` param', () => {
    // TODO: matchDate < now => excluded from results
  })

  it('skips day nodes with missing/invalid data-day attribute', () => {
    // TODO: data-day="" or data-day="abc" -> day skipped entirely
  })

  it('resolves eventUrl against LAGET_BASE_URL when data-src is relative', () => {
    // TODO: data-src="/Event/123" -> eventUrl === "https://www.laget.se/Event/123"
  })

  it('falls back to LAGET_BASE_URL when data-src is absent', () => {
    // TODO
  })
})

// ── getMatchTeams — matches.ts:261 ─────────────────────────────────────────

describe('getMatchTeams', () => {
  const base: UpcomingMatch = {
    opponent: 'IFK Sundsvall',
    teamType: 'A-lag Herrar',
    isHome: true,
    date: new Date('2026-09-01T18:00:00'),
    time: '18:00',
    displayDate: 'Tis 1 september',
    eventUrl: 'https://www.laget.se',
  }

  it('uses homeTeam/awayTeam verbatim when both are present', () => {
    // TODO
  })

  it('falls back to club team name for home side when homeTeam is absent and isHome=true', () => {
    // TODO: homeName should be "Härnösands HF A-lag Herrar"
  })

  it('falls back to opponent for away side when isHome=true and awayTeam absent', () => {
    // TODO
  })

  it('identifies clubTeamName correctly when club name only appears in awayTeam', () => {
    // TODO: e.g. isHome=false, awayTeam contains "Härnösands HF"
  })

  it('handles empty teamType by defaulting to bare "Härnösands HF"', () => {
    // TODO: base.teamType = ''
  })
})

// ── formatCountdownLabel — matches.ts:277 ──────────────────────────────────
// NOTE: function reads `new Date()` internally — needs vi.setSystemTime to be deterministic.

describe('formatCountdownLabel', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Matchen är igång" when target is in the past and hasResult=false', () => {
    // TODO
  })

  it('returns "Matchen är spelad" when target is in the past and hasResult=true', () => {
    // TODO
  })

  it('formats days + hours when > 1 day away', () => {
    // TODO: e.g. "Om 2 dagar och 3 timmar"
  })

  it('uses singular "dag"/"timme" for exactly 1', () => {
    // TODO
  })

  it('formats hours + minutes when < 1 day away', () => {
    // TODO: "Om 3 timmar och 15 min"
  })

  it('formats minutes only when < 1 hour away', () => {
    // TODO: "Om 15 min"
  })

  it('returns "Strax" when under a minute away', () => {
    // TODO
  })
})

// ── enrichMatchWithDetails — matches.ts:314 ────────────────────────────────

describe('enrichMatchWithDetails', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns match unchanged when window is undefined (SSR)', async () => {
    // TODO
  })

  it('merges venue/series/infoUrl from detail page fetch', async () => {
    // TODO: mock fetch to return HTML with .fullCalendar__info blocks
  })

  it('merges homeTeam/awayTeam/result from overview page fetch when infoUrl resolved', async () => {
    // TODO: two-stage fetch mock (detail page, then overview page)
  })

  it('swallows fetch errors and returns best-effort enriched match', async () => {
    // TODO: fetch rejects -> no throw, returns match with partial/no enrichment
  })

  it('ignores non-ok responses without throwing', async () => {
    // TODO: fetch resolves with { ok: false }
  })
})

// ── refreshMatchResult — matches.ts:362 ────────────────────────────────────

describe('refreshMatchResult', () => {
  it('returns match unchanged when infoUrl is missing', async () => {
    // TODO
  })

  it('returns match unchanged when fetch response is not ok', async () => {
    // TODO
  })

  it('returns updated result/homeTeam/awayTeam from overview page', async () => {
    // TODO
  })

  it('swallows network errors and returns original match', async () => {
    // TODO
  })

  it('uses cache: "no-store" to avoid stale results', async () => {
    // TODO: assert fetch called with { cache: 'no-store' }
  })
})

// ── fetchUpcomingMatches — matches.ts:396 ──────────────────────────────────
// Highest-value untested function: drives pagination across months, respects
// `limit`, calls `onProgress`, and sorts final results — currently 0% covered.

describe('fetchUpcomingMatches', () => {
  it('returns [] when window is undefined (SSR)', async () => {
    // TODO
  })

  it('stops fetching once `limit` matches are collected', async () => {
    // TODO: mock several months of HTML, assert fetch call count stops early
  })

  it('respects maxMonthsAhead and does not fetch beyond it', async () => {
    // TODO
  })

  it('calls onProgress with a running, sorted snapshot after each month', async () => {
    // TODO
  })

  it('sorts final results ascending by date across month boundaries', async () => {
    // TODO
  })

  it('treats limit=null as "no limit" and fetches up to maxMonthsAhead', async () => {
    // TODO
  })

  it('skips months where fetch is not ok, without throwing', async () => {
    // TODO
  })
})
