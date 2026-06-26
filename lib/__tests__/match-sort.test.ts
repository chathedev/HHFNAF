// Run with: npx vitest run lib/__tests__/match-sort.test.ts
// Install first: npm install --save-dev vitest
//
// These tests cover compareMatchesByDateAscStable and compareMatchesByDateDescStable
// in lib/match-sort.ts — pure functions with no external dependencies.

import { describe, it, expect } from 'vitest'
import {
  compareMatchesByDateAscStable,
  compareMatchesByDateDescStable,
} from '../match-sort'
import type { NormalizedMatch } from '../use-match-data'

function makeMatch(overrides: Partial<NormalizedMatch>): NormalizedMatch {
  return {
    id: 'match-1',
    teamType: 'A-lag Herrar',
    opponent: 'IFK',
    homeTeam: 'HHF',
    awayTeam: 'IFK',
    venue: 'Öbacka SC',
    series: 'Herr Division 2',
    startTimestamp: Date.now(),
    date: new Date(),
    isHome: true,
    result: null,
    ...overrides,
  } as NormalizedMatch
}

describe('compareMatchesByDateAscStable', () => {
  it('sorts earlier date first', () => {
    const earlier = makeMatch({ startTimestamp: 1_000 })
    const later   = makeMatch({ startTimestamp: 2_000 })
    expect(compareMatchesByDateAscStable(earlier, later)).toBeLessThan(0)
    expect(compareMatchesByDateAscStable(later, earlier)).toBeGreaterThan(0)
  })

  it('returns 0 for identical matches', () => {
    const m = makeMatch({ startTimestamp: 5_000 })
    expect(compareMatchesByDateAscStable(m, { ...m })).toBe(0)
  })

  it('uses stable tiebreak on same timestamp — teamType', () => {
    const a = makeMatch({ startTimestamp: 1_000, teamType: 'A-lag Herrar' })
    const b = makeMatch({ startTimestamp: 1_000, teamType: 'Dam A-lag' })
    const result = compareMatchesByDateAscStable(a, b)
    expect(typeof result).toBe('number')
    // Reversed order must be the opposite sign
    expect(Math.sign(compareMatchesByDateAscStable(b, a))).toBe(-Math.sign(result))
  })

  it('stable tiebreak is consistent across all identity fields', () => {
    const base = makeMatch({ startTimestamp: 1_000 })
    const variants = [
      { ...base, id: 'z' },
      { ...base, id: 'a' },
      { ...base, id: 'm' },
    ]
    const sorted = [...variants].sort(compareMatchesByDateAscStable)
    expect(sorted.map((m) => m.id)).toEqual(['a', 'm', 'z'])
  })

  it('falls back to Date object when startTimestamp is absent', () => {
    const early = makeMatch({ startTimestamp: undefined as any, date: new Date('2026-01-01') })
    const late  = makeMatch({ startTimestamp: undefined as any, date: new Date('2026-06-01') })
    expect(compareMatchesByDateAscStable(early, late)).toBeLessThan(0)
  })

  it('handles string date when startTimestamp and Date object absent', () => {
    const early = makeMatch({ startTimestamp: undefined as any, date: '2026-01-01' as any })
    const late  = makeMatch({ startTimestamp: undefined as any, date: '2026-12-31' as any })
    expect(compareMatchesByDateAscStable(early, late)).toBeLessThan(0)
  })

  it('sorts an array in ascending order', () => {
    const matches = [
      makeMatch({ startTimestamp: 3_000, id: 'c' }),
      makeMatch({ startTimestamp: 1_000, id: 'a' }),
      makeMatch({ startTimestamp: 2_000, id: 'b' }),
    ]
    const sorted = [...matches].sort(compareMatchesByDateAscStable)
    expect(sorted.map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('compareMatchesByDateDescStable', () => {
  it('sorts later date first', () => {
    const earlier = makeMatch({ startTimestamp: 1_000 })
    const later   = makeMatch({ startTimestamp: 2_000 })
    expect(compareMatchesByDateDescStable(later, earlier)).toBeLessThan(0)
    expect(compareMatchesByDateDescStable(earlier, later)).toBeGreaterThan(0)
  })

  it('is the inverse of ascending sort', () => {
    const a = makeMatch({ startTimestamp: 1_000, id: 'a' })
    const b = makeMatch({ startTimestamp: 3_000, id: 'b' })
    const asc  = compareMatchesByDateAscStable(a, b)
    const desc = compareMatchesByDateDescStable(a, b)
    expect(Math.sign(asc)).toBe(-Math.sign(desc))
  })

  it('sorts an array in descending order', () => {
    const matches = [
      makeMatch({ startTimestamp: 1_000, id: 'a' }),
      makeMatch({ startTimestamp: 3_000, id: 'c' }),
      makeMatch({ startTimestamp: 2_000, id: 'b' }),
    ]
    const sorted = [...matches].sort(compareMatchesByDateDescStable)
    expect(sorted.map((m) => m.id)).toEqual(['c', 'b', 'a'])
  })
})
