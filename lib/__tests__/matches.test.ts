// Run with: npx vitest run lib/__tests__/matches.test.ts
// Install first: npm install --save-dev vitest
//
// Tests for pure utility functions exported from lib/matches.ts.
// Covers normalizeMatchKey, isTicketEligibleTeamType, isTicketEligibleVenue,
// canShowTicketForMatch, and the TICKET_EXCLUDED_MATCHES guard.

import { describe, it, expect } from 'vitest'
import {
  normalizeMatchKey,
  isTicketEligibleTeamType,
  isTicketEligibleVenue,
  canShowTicketForMatch,
  MATCH_TYPES_WITH_TICKETS,
  TICKET_VENUES,
} from '../matches'

describe('normalizeMatchKey', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeMatchKey('Öbacka')).toBe('obacka')
    expect(normalizeMatchKey('Härnösand')).toBe('harnosand')
    expect(normalizeMatchKey('Änget')).toBe('anget')
  })

  it('removes all non-alphanumeric characters', () => {
    expect(normalizeMatchKey('A-lag Herrar!')).toBe('alagherrar')
    expect(normalizeMatchKey('Dam/utv')).toBe('damutv')
    expect(normalizeMatchKey('F18 (2007)')).toBe('f182007')
  })

  it('handles null and undefined gracefully', () => {
    expect(normalizeMatchKey(null)).toBe('')
    expect(normalizeMatchKey(undefined)).toBe('')
    expect(normalizeMatchKey('')).toBe('')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeMatchKey('  dam  ')).toBe('dam')
  })
})

describe('isTicketEligibleTeamType', () => {
  it('returns true for A-lag Herrar', () => {
    expect(isTicketEligibleTeamType('A-lag Herrar')).toBe(true)
  })

  it('returns true for Dam A-lag', () => {
    expect(isTicketEligibleTeamType('Dam A-lag')).toBe(true)
  })

  it('returns true for Dam/utv', () => {
    expect(isTicketEligibleTeamType('Dam/utv')).toBe(true)
  })

  it('returns false for youth team types', () => {
    expect(isTicketEligibleTeamType('F16 (2009)')).toBe(false)
    expect(isTicketEligibleTeamType('P14 (2011)')).toBe(false)
    expect(isTicketEligibleTeamType('F18 (2007)')).toBe(false)
  })

  it('returns false for null/undefined/empty', () => {
    expect(isTicketEligibleTeamType(null)).toBe(false)
    expect(isTicketEligibleTeamType(undefined)).toBe(false)
    expect(isTicketEligibleTeamType('')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isTicketEligibleTeamType('a-lag herrar')).toBe(true)
    expect(isTicketEligibleTeamType('DAM A-LAG')).toBe(true)
  })
})

describe('isTicketEligibleVenue', () => {
  it('returns true for Öbacka SC', () => {
    expect(isTicketEligibleVenue('Öbacka SC')).toBe(true)
  })

  it('returns true for Änget Sportcenter', () => {
    expect(isTicketEligibleVenue('Änget Sportcenter')).toBe(true)
  })

  it('is case-insensitive and diacritic-insensitive', () => {
    expect(isTicketEligibleVenue('OBACKA SC')).toBe(true)
    expect(isTicketEligibleVenue('anget sportcenter')).toBe(true)
  })

  it('returns false for non-ticketed venues', () => {
    expect(isTicketEligibleVenue('Sporthallen')).toBe(false)
    expect(isTicketEligibleVenue('Okänd arena')).toBe(false)
    expect(isTicketEligibleVenue(null)).toBe(false)
  })
})

describe('canShowTicketForMatch', () => {
  const eligibleBase = {
    teamType: 'A-lag Herrar',
    isHome: true,
    venue: 'Öbacka SC',
    opponent: 'IFK Sundsvall',
    date: new Date('2026-09-15'),
  }

  it('returns true for a fully-eligible home match', () => {
    expect(canShowTicketForMatch(eligibleBase)).toBe(true)
  })

  it('returns false for away matches', () => {
    expect(canShowTicketForMatch({ ...eligibleBase, isHome: false })).toBe(false)
  })

  it('returns false when teamType is not eligible', () => {
    expect(canShowTicketForMatch({ ...eligibleBase, teamType: 'F16 (2009)' })).toBe(false)
  })

  it('returns false when venue is not ticketed', () => {
    expect(canShowTicketForMatch({ ...eligibleBase, venue: 'Bortaplan' })).toBe(false)
  })

  it('returns false for excluded opponent+date combinations', () => {
    // gimonäs on 2026-04-19 is hardcoded as excluded
    expect(canShowTicketForMatch({
      ...eligibleBase,
      opponent: 'Gimonäs',
      date: new Date('2026-04-19'),
    })).toBe(false)
  })

  it('returns true for same opponent on a different date', () => {
    expect(canShowTicketForMatch({
      ...eligibleBase,
      opponent: 'Gimonäs',
      date: new Date('2026-10-01'),
    })).toBe(true)
  })

  it('handles null fields gracefully', () => {
    expect(canShowTicketForMatch({ teamType: null, isHome: null, venue: null, opponent: null, date: null })).toBe(false)
  })

  it('MATCH_TYPES_WITH_TICKETS constant is in sync with eligibility function', () => {
    for (const t of MATCH_TYPES_WITH_TICKETS) {
      expect(isTicketEligibleTeamType(t)).toBe(true)
    }
  })

  it('TICKET_VENUES constant is in sync with eligibility function', () => {
    for (const v of TICKET_VENUES) {
      expect(isTicketEligibleVenue(v)).toBe(true)
    }
  })
})
