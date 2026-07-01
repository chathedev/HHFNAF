// Run with: npx vitest run lib/__tests__/use-match-data.test.ts
//
// Gap: lib/use-match-data.ts is 2147 lines — the single largest file in lib/ —
// and has ZERO test coverage. It exports (line 1887):
//   getMatchEndTime, shouldShowFinishedMatch, shouldShowFinishedMatchForTeam,
//   normalizeStatusValue
// plus getMatchData (line 1671) and the useMatchData hook itself (line 1889).
// All downstream tested modules (match-card-utils, match-sort) import its
// NormalizedMatch type but nothing exercises these functions directly.
//
// This skeleton targets the 4 named exports; the React hook (useMatchData)
// and getMatchData (live SERVERF fetch + polling) are covered separately
// under "Integration test gaps" — see use-match-data-hook.test.tsx skeleton.

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  normalizeStatusValue,
  getMatchEndTime,
  shouldShowFinishedMatch,
  shouldShowFinishedMatchForTeam,
} from '../use-match-data'

// ── normalizeStatusValue — use-match-data.ts:377 ───────────────────────────

describe('normalizeStatusValue', () => {
  it('returns undefined for null/undefined/empty', () => {
    expect(normalizeStatusValue(null)).toBeUndefined()
    expect(normalizeStatusValue(undefined)).toBeUndefined()
    expect(normalizeStatusValue('')).toBeUndefined()
  })

  it('passes through canonical values (live/finished/upcoming/halftime)', () => {
    // TODO
  })

  it('maps provider synonyms to "live" (playing/inprogress/ongoing/started)', () => {
    // TODO
  })

  it('maps provider synonyms to "finished" (complete/completed/done/slut/final/closed)', () => {
    // TODO
  })

  it('maps provider synonyms to "upcoming" (scheduled/pending/future)', () => {
    // TODO
  })

  it('maps Swedish halftime synonyms (halvlek/paus/vila) to "halftime"', () => {
    // TODO
  })

  it('is case-insensitive and trims whitespace', () => {
    // TODO: '  LIVE  ' -> 'live'
  })

  it('returns undefined for unrecognized status strings', () => {
    // TODO: 'banana' -> undefined
  })
})

// ── getMatchEndTime — use-match-data.ts:446 ────────────────────────────────

describe('getMatchEndTime', () => {
  const baseDate = new Date('2026-03-15T18:00:00Z')

  it('returns null when match is not finished', () => {
    // TODO: matchStatus: 'live' -> null
  end
  })

  it('prefers explicit end-event time from matchFeed ("matchen är slut")', () => {
    // TODO: matchFeed with event.time "60:00" and description "Matchen är slut"
    //   -> matchStart + 60min
  })

  it('handles overtime notation in event time (e.g. "60:00+5")', () => {
    // TODO: totalMinutes = base + overtime
  })

  it('falls back to the last timeline event with a parseable time when no explicit end event exists', () => {
    // TODO
  })

  it('falls back to matchStart + 90 minutes when timeline is empty', () => {
    // TODO: PRIORITY 3 fallback
  })

  it('uses startTimestamp over match.date when both are present', () => {
    // TODO
  })

  it('handles malformed event.time strings without throwing (e.g. "abc", "", "::")', () => {
    // TODO
  })
})

// ── shouldShowFinishedMatch — use-match-data.ts:541 ────────────────────────

describe('shouldShowFinishedMatch', () => {
  afterEach(() => vi.useRealTimers())

  it('returns false when match is not finished', () => {
    // TODO
  })

  it('returns false when result is empty or "Inte publicerat"', () => {
    // TODO
  })

  it('returns false for unparseable result strings', () => {
    // TODO: result: 'W/O'
  })

  it('returns false for 0-0 results (home/matcher pages hide scoreless finals)', () => {
    // TODO
  })

  it('returns true within the retention window after computed match end time', () => {
    // TODO: vi.setSystemTime just before retentionWindowEnd
  })

  it('returns false after the retention window has elapsed', () => {
    // TODO: vi.setSystemTime after retentionWindowEnd
  })

  it('returns true (generous fallback) when match end time cannot be determined', () => {
    // TODO
  })

  it('handles em-dash score separators ("2–1")', () => {
    // TODO
  })
})

// ── shouldShowFinishedMatchForTeam — use-match-data.ts:585 ─────────────────

describe('shouldShowFinishedMatchForTeam', () => {
  it('shows 0-0 finished results (unlike shouldShowFinishedMatch)', () => {
    // TODO: this is the key behavioral difference from shouldShowFinishedMatch —
    //   assert both functions side by side for the same 0-0 match to lock in the contract
  })

  it('respects the same retention-window logic as shouldShowFinishedMatch', () => {
    // TODO
  })

  it('returns false when match is not finished', () => {
    // TODO
  })
})
