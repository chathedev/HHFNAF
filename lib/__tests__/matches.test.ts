// Run with: npx vitest run lib/__tests__/matches.test.ts
// Install first: npm install --save-dev vitest
//
// Tests for pure utility functions exported from lib/matches.ts.
// Covers normalizeMatchKey.

import { describe, it, expect } from 'vitest'
import { normalizeMatchKey } from '../matches'

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
