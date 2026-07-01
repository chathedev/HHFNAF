// Run with: npx vitest run lib/__tests__/get-initial-match-window.test.ts
//
// Gap: lib/get-initial-match-window.ts (470 lines) has exactly ONE export —
// getInitialMatchWindow (line 458) — and it is completely untested. All of
// the interesting logic (~20 helper functions) is unexported and can only be
// exercised indirectly through this one async function, which itself makes
// live network calls to MATCH_DATA_ENDPOINT unless fetch is mocked.
//
// TIMEZONE / DST FOCUS: getStockholmToday (get-initial-match-window.ts:92-99)
// uses Intl.DateTimeFormat with timeZone: "Europe/Stockholm" to compute
// "today" — this is the ONLY timezone-aware date logic found in the entire
// lib/ directory (date-fns-tz is a dependency in package.json but is not
// imported anywhere in the codebase — dead dependency or a planned-but-
// unimplemented feature, worth flagging separately). Sweden observes CEST
// (UTC+2) in summer and CET (UTC+1) in winter; DST transitions in 2026 are
// 2026-03-29 (spring forward) and 2026-10-25 (fall back).

import { describe, it, expect, vi, afterEach } from 'vitest'
import { getInitialMatchWindow } from '../get-initial-match-window'

describe('getInitialMatchWindow — timezone & DST edge cases', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('computes "today" correctly just before midnight UTC during CEST (summer, UTC+2)', async () => {
    // TODO: vi.setSystemTime(new Date('2026-07-01T22:30:00Z')) // 00:30 local (already next day in Stockholm)
    //   Mock fetch to capture the cursorDate query param sent to MATCH_DATA_ENDPOINT
    //   and assert it reflects Stockholm-local date, not UTC date.
  })

  it('computes "today" correctly just after midnight UTC during CET (winter, UTC+1)', async () => {
    // TODO: vi.setSystemTime(new Date('2026-01-01T23:30:00Z')) // 00:30 local next day
  })

  it('handles the spring-forward DST transition (2026-03-29 02:00 CET -> 03:00 CEST)', async () => {
    // TODO: vi.setSystemTime around 2026-03-29T01:00:00Z; assert no crash and a
    //   sane, unambiguous date string is produced (the "missing hour" should not
    //   cause an off-by-one-day error)
  })

  it('handles the fall-back DST transition (2026-10-25 03:00 CEST -> 02:00 CET)', async () => {
    // TODO: vi.setSystemTime around 2026-10-25T01:30:00Z (ambiguous local hour);
    //   assert getStockholmToday still returns a single well-formed YYYY-MM-DD
  })

  it('returns undefined gracefully when the API request fails entirely', async () => {
    // TODO: mock fetch to reject; assert function does not throw
  })

  it('deduplicates matches with the same normalized team key + date (dedupeApiMatches / dedupeMatches)', async () => {
    // TODO: mock payload with duplicate-looking matches, assert single result survives
  })

  it('merges multiple fetched windows without losing distinct matches (mergeMatchWindows)', async () => {
    // TODO
  })

  it('normalizeTimeForIso clamps out-of-range hour/minute/second values (e.g. "25:99:99")', async () => {
    // TODO: this is unexported (get-initial-match-window.ts:115) — exercise indirectly
    //   via a match payload containing a malformed time string, assert no crash
    //   and a clamped, valid Date results
  })

  it('toDate returns null for malformed/unparseable date strings rather than an Invalid Date', async () => {
    // TODO: exercise indirectly via malformed date field in mocked API payload
  })
})
