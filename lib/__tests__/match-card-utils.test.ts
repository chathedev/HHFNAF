// Run with: npx vitest run lib/__tests__/match-card-utils.test.ts
// Install: npm install --save-dev vitest

import { describe, it, expect } from 'vitest'
import {
  formatMatchDateLabel,
  formatMatchTimeLabel,
  buildMatchScheduleLabel,
  getMatchupLabel,
  getSimplifiedMatchStatus,
  canOpenMatchTimeline,
  getMatchProviderBadge,
  getProviderHelperText,
  getMatchWatchLabel,
  shouldShowProfixioTechnicalIssue,
  shouldShowFinishedZeroZeroIssue,
} from '../match-card-utils'
import type { NormalizedMatch } from '../use-match-data'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMatch(overrides: Partial<NormalizedMatch> = {}): NormalizedMatch {
  return {
    id: 'match-1',
    date: new Date('2026-03-15T14:00:00'),
    homeTeam: 'Härnösands HF',
    awayTeam: 'IFK Göteborg',
    opponent: 'IFK Göteborg',
    isHome: true,
    venue: 'Hedbergshallen',
    matchStatus: 'upcoming',
    resultState: 'not_started',
    result: undefined,
    provider: 'profixio',
    timelineAvailable: false,
    matchFeed: [],
    display: undefined,
    ...overrides,
  } as NormalizedMatch
}

// ── formatMatchDateLabel ───────────────────────────────────────────────────────

describe('formatMatchDateLabel', () => {
  it('uses display.dateCard when provided', () => {
    const match = makeMatch({ display: { dateCard: 'Lör 15 mars', time: '14:00' } })
    expect(formatMatchDateLabel(match)).toBe('lör 15 mars')
  })

  it('falls back to Intl-formatted date in Swedish lowercase', () => {
    const match = makeMatch({ display: undefined })
    const label = formatMatchDateLabel(match)
    expect(typeof label).toBe('string')
    expect(label.length).toBeGreaterThan(0)
    // Swedish weekday abbreviations are lowercase
    expect(label).toBe(label.toLowerCase())
  })
})

// ── formatMatchTimeLabel ───────────────────────────────────────────────────────

describe('formatMatchTimeLabel', () => {
  it('uses display.time when present and strips seconds', () => {
    const match = makeMatch({ display: { dateCard: 'Lör', time: '14:00:00' } })
    expect(formatMatchTimeLabel(match)).toBe('14:00')
  })

  it('keeps time as-is when no seconds present', () => {
    const match = makeMatch({ display: { dateCard: 'Lör', time: '14:00' } })
    expect(formatMatchTimeLabel(match)).toBe('14:00')
  })

  it('falls back to Intl-formatted time when display.time is absent', () => {
    const match = makeMatch({ display: undefined })
    const label = formatMatchTimeLabel(match)
    expect(label).toMatch(/^\d{2}:\d{2}$/)
  })

  it('handles empty/null display.time by falling back to Intl', () => {
    const match = makeMatch({ display: { dateCard: 'Lör', time: '' } })
    const label = formatMatchTimeLabel(match)
    expect(label).toMatch(/^\d{2}:\d{2}$/)
  })
})

// ── buildMatchScheduleLabel ────────────────────────────────────────────────────

describe('buildMatchScheduleLabel', () => {
  it('joins date, time, and venue with " • "', () => {
    const match = makeMatch({ display: { dateCard: 'lör 15 mars', time: '14:00' }, venue: 'Hedbergshallen' })
    expect(buildMatchScheduleLabel(match)).toBe('lör 15 mars • 14:00 • Hedbergshallen')
  })

  it('omits venue when it is empty string', () => {
    const match = makeMatch({ display: { dateCard: 'lör 15 mars', time: '14:00' }, venue: '' })
    const label = buildMatchScheduleLabel(match)
    expect(label).not.toContain(' • ')
    expect(label).toBe('lör 15 mars • 14:00')
  })

  it('omits venue when it is whitespace only', () => {
    const match = makeMatch({ display: { dateCard: 'lör 15 mars', time: '14:00' }, venue: '   ' })
    expect(buildMatchScheduleLabel(match)).toBe('lör 15 mars • 14:00')
  })

  it('trims venue whitespace', () => {
    const match = makeMatch({ display: { dateCard: 'lör 15 mars', time: '14:00' }, venue: '  Hedbergshallen  ' })
    expect(buildMatchScheduleLabel(match)).toContain('Hedbergshallen')
    expect(buildMatchScheduleLabel(match)).not.toContain('  ')
  })
})

// ── getMatchupLabel ────────────────────────────────────────────────────────────

describe('getMatchupLabel', () => {
  it('returns "HHF vs Opponent (hemma)" for home matches', () => {
    const match = makeMatch({ opponent: 'IFK Göteborg', isHome: true })
    expect(getMatchupLabel(match)).toBe('Härnösands HF vs IFK Göteborg (hemma)')
  })

  it('returns "Opponent vs HHF (borta)" for away matches', () => {
    const match = makeMatch({ opponent: 'IFK Göteborg', isHome: false })
    expect(getMatchupLabel(match)).toBe('IFK Göteborg vs Härnösands HF (borta)')
  })

  it('strips "(hemma)" and "(borta)" suffixes from opponent name', () => {
    const match = makeMatch({ opponent: 'IFK Göteborg (hemma)', isHome: true })
    expect(getMatchupLabel(match)).toBe('Härnösands HF vs IFK Göteborg (hemma)')
  })

  it('uses custom homeTeamLabel when provided', () => {
    const match = makeMatch({ opponent: 'IFK Göteborg', isHome: true })
    expect(getMatchupLabel(match, 'HHF Dam')).toBe('HHF Dam vs IFK Göteborg (hemma)')
  })

  it('falls back to awayTeam when opponent is empty/undefined', () => {
    const match = makeMatch({ opponent: '', awayTeam: 'Skuru IK', isHome: true })
    expect(getMatchupLabel(match)).toContain('Skuru IK')
  })
})

// ── getSimplifiedMatchStatus ───────────────────────────────────────────────────

describe('getSimplifiedMatchStatus', () => {
  it('returns "upcoming" for an upcoming match', () => {
    const match = makeMatch({ matchStatus: 'upcoming', resultState: 'not_started', result: undefined })
    expect(getSimplifiedMatchStatus(match)).toBe('upcoming')
  })

  it('returns "finished" when matchStatus is finished', () => {
    const match = makeMatch({ matchStatus: 'finished', resultState: 'available', result: '22 - 18' })
    expect(getSimplifiedMatchStatus(match)).toBe('finished')
  })

  it('returns "finished" when resultState=available and a numeric result is present', () => {
    const match = makeMatch({ matchStatus: 'upcoming', resultState: 'available', result: '10 - 8' })
    expect(getSimplifiedMatchStatus(match)).toBe('finished')
  })

  it('returns "live" for live matchStatus', () => {
    const match = makeMatch({ matchStatus: 'live', resultState: 'live_pending' })
    expect(getSimplifiedMatchStatus(match)).toBe('live')
  })

  it('returns "live" for halftime matchStatus', () => {
    const match = makeMatch({ matchStatus: 'halftime', resultState: 'live_pending' })
    expect(getSimplifiedMatchStatus(match)).toBe('live')
  })

  it('does not return "finished" when result has no parseable score', () => {
    const match = makeMatch({ matchStatus: 'upcoming', resultState: 'available', result: 'TBD' })
    expect(getSimplifiedMatchStatus(match)).toBe('upcoming')
  })
})

// ── canOpenMatchTimeline ───────────────────────────────────────────────────────

describe('canOpenMatchTimeline', () => {
  it('returns true when timelineAvailable is true', () => {
    expect(canOpenMatchTimeline(makeMatch({ timelineAvailable: true }))).toBe(true)
  })

  it('returns false when timelineAvailable is false', () => {
    expect(canOpenMatchTimeline(makeMatch({ timelineAvailable: false }))).toBe(false)
  })

  it('returns false when timelineAvailable is undefined', () => {
    expect(canOpenMatchTimeline(makeMatch({ timelineAvailable: undefined }))).toBe(false)
  })
})

// ── getMatchProviderBadge ──────────────────────────────────────────────────────

describe('getMatchProviderBadge', () => {
  it('returns ProCup badge for procup provider', () => {
    const badge = getMatchProviderBadge(makeMatch({ provider: 'procup' }))
    expect(badge?.label).toBe('ProCup')
    expect(badge?.tone).toContain('sky')
  })

  it('returns Profixio badge for profixio provider', () => {
    const badge = getMatchProviderBadge(makeMatch({ provider: 'profixio' }))
    expect(badge?.label).toBe('Profixio')
    expect(badge?.tone).toContain('emerald')
  })

  it('returns null for unknown provider', () => {
    expect(getMatchProviderBadge(makeMatch({ provider: 'unknown' as any }))).toBeNull()
  })
})

// ── getMatchWatchLabel ─────────────────────────────────────────────────────────

describe('getMatchWatchLabel', () => {
  it('returns "Se repris" for finished matches', () => {
    expect(getMatchWatchLabel('finished')).toBe('Se repris')
  })

  it('returns "Se match" for live/upcoming matches', () => {
    expect(getMatchWatchLabel('live')).toBe('Se match')
    expect(getMatchWatchLabel('upcoming')).toBe('Se match')
  })
})

// ── shouldShowProfixioTechnicalIssue ──────────────────────────────────────────

describe('shouldShowProfixioTechnicalIssue', () => {
  const BASE_NOW = new Date('2026-03-15T14:10:00').getTime() // 10 min after kickoff
  const KICKOFF = new Date('2026-03-15T14:00:00')

  const liveMatch = (overrides: Partial<NormalizedMatch> = {}) =>
    makeMatch({
      provider: 'profixio',
      matchStatus: 'live',
      resultState: 'live_pending',
      result: '0 - 0',
      date: KICKOFF,
      timelineAvailable: true,
      matchFeed: [],
      ...overrides,
    })

  it('returns false for procup matches', () => {
    expect(shouldShowProfixioTechnicalIssue(liveMatch({ provider: 'procup' }), BASE_NOW)).toBe(false)
  })

  it('returns false when timelineAvailable is false', () => {
    expect(shouldShowProfixioTechnicalIssue(liveMatch({ timelineAvailable: false }), BASE_NOW)).toBe(false)
  })

  it('returns false when match has not started yet (resultState=not_started)', () => {
    expect(shouldShowProfixioTechnicalIssue(liveMatch({ resultState: 'not_started' }), BASE_NOW)).toBe(false)
  })

  it('returns false when match status is not live', () => {
    expect(shouldShowProfixioTechnicalIssue(liveMatch({ matchStatus: 'upcoming' }), BASE_NOW)).toBe(false)
  })

  it('returns false when elapsed time is less than 2 minutes', () => {
    const justKickedOff = KICKOFF.getTime() + 60_000 // only 1 min elapsed
    expect(shouldShowProfixioTechnicalIssue(liveMatch(), justKickedOff)).toBe(false)
  })

  it('returns false when score is non-zero', () => {
    expect(shouldShowProfixioTechnicalIssue(liveMatch({ result: '3 - 1' }), BASE_NOW)).toBe(false)
  })

  it('returns false when there are meaningful timeline events', () => {
    const match = liveMatch({
      matchFeed: [{ type: 'goal', description: 'Mål av #7' }],
    })
    expect(shouldShowProfixioTechnicalIssue(match, BASE_NOW)).toBe(false)
  })

  it('returns true when live, 0-0, 2+ min elapsed, no meaningful events', () => {
    expect(shouldShowProfixioTechnicalIssue(liveMatch(), BASE_NOW)).toBe(true)
  })

  it('treats undefined result as 0-0 (issue should show)', () => {
    expect(shouldShowProfixioTechnicalIssue(liveMatch({ result: undefined }), BASE_NOW)).toBe(true)
  })

  it('ignores generic "händelse" events (they do not count as signal)', () => {
    const match = liveMatch({
      matchFeed: [{ type: 'händelse', description: 'händelse' }],
    })
    expect(shouldShowProfixioTechnicalIssue(match, BASE_NOW)).toBe(true)
  })
})

// ── shouldShowFinishedZeroZeroIssue ───────────────────────────────────────────

describe('shouldShowFinishedZeroZeroIssue', () => {
  it('returns false for procup matches', () => {
    const match = makeMatch({ provider: 'procup', matchStatus: 'finished', result: '0 - 0' })
    expect(shouldShowFinishedZeroZeroIssue(match)).toBe(false)
  })

  it('returns false when match is not finished', () => {
    const match = makeMatch({ provider: 'profixio', matchStatus: 'live', result: '0 - 0' })
    expect(shouldShowFinishedZeroZeroIssue(match)).toBe(false)
  })

  it('returns false when result is not 0-0', () => {
    const match = makeMatch({ provider: 'profixio', matchStatus: 'finished', resultState: 'available', result: '5 - 3' })
    expect(shouldShowFinishedZeroZeroIssue(match)).toBe(false)
  })

  it('returns false when result is unparseable', () => {
    const match = makeMatch({ provider: 'profixio', matchStatus: 'finished', resultState: 'available', result: 'W/O' })
    expect(shouldShowFinishedZeroZeroIssue(match)).toBe(false)
  })

  it('returns true for a finished profixio match with 0-0 result', () => {
    const match = makeMatch({ provider: 'profixio', matchStatus: 'finished', resultState: 'available', result: '0 - 0' })
    expect(shouldShowFinishedZeroZeroIssue(match)).toBe(true)
  })

  it('handles em-dash separator in result string', () => {
    const match = makeMatch({ provider: 'profixio', matchStatus: 'finished', resultState: 'available', result: '0–0' })
    expect(shouldShowFinishedZeroZeroIssue(match)).toBe(true)
  })
})
