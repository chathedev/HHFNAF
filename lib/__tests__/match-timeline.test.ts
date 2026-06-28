// Run with: npx vitest run lib/__tests__/match-timeline.test.ts

import { describe, it, expect } from 'vitest'
import {
  isSyntheticFinalOnlyTimeline,
  getBestAvailableTimeline,
  preferRicherTimeline,
  resolvePreferredTimeline,
} from '../match-timeline'

// ── isSyntheticFinalOnlyTimeline ─────────────────────────────────────────────

describe('isSyntheticFinalOnlyTimeline', () => {
  it('returns false for empty timeline', () => {
    expect(isSyntheticFinalOnlyTimeline([])).toBe(false)
  })

  it('returns false when there are multiple events', () => {
    const events = [
      { type: 'goal', description: 'Goal by #10' },
      { type: 'full_time', description: 'Matchen är slut' },
    ]
    expect(isSyntheticFinalOnlyTimeline(events)).toBe(false)
  })

  it('returns true for a single event with payload.fallbackFinish', () => {
    const timeline = [{ type: 'status', payload: { fallbackFinish: true } }]
    expect(isSyntheticFinalOnlyTimeline(timeline)).toBe(true)
  })

  it('returns true for a single event with payload.synthetic', () => {
    const timeline = [{ type: 'status', payload: { synthetic: true } }]
    expect(isSyntheticFinalOnlyTimeline(timeline)).toBe(true)
  })

  it('returns true for "matchen är slut" in type field (case-insensitive)', () => {
    const timeline = [{ type: 'Matchen är slut', description: '' }]
    expect(isSyntheticFinalOnlyTimeline(timeline)).toBe(true)
  })

  it('returns true for "slutresultat" in description', () => {
    const timeline = [{ type: '', description: 'Slutresultat' }]
    expect(isSyntheticFinalOnlyTimeline(timeline)).toBe(true)
  })

  it('returns true for "fulltid" in payload.description', () => {
    const timeline = [{ payload: { description: 'Fulltid' } }]
    expect(isSyntheticFinalOnlyTimeline(timeline)).toBe(true)
  })

  it('returns false for a single non-synthetic event', () => {
    const timeline = [{ type: 'goal', description: 'Mål av spelare' }]
    expect(isSyntheticFinalOnlyTimeline(timeline)).toBe(false)
  })

  it('handles null/undefined fields gracefully', () => {
    const timeline = [{ type: null, description: null, payload: null }]
    expect(isSyntheticFinalOnlyTimeline(timeline)).toBe(false)
  })
})

// ── getBestAvailableTimeline ──────────────────────────────────────────────────

describe('getBestAvailableTimeline', () => {
  const event = { type: 'goal' }

  it('returns matchFeed when non-empty (highest priority)', () => {
    const src = { matchFeed: [event], timeline: [event, event], events: [event, event, event] }
    expect(getBestAvailableTimeline(src)).toBe(src.matchFeed)
  })

  it('falls back to timeline when matchFeed is empty', () => {
    const src = { matchFeed: [], timeline: [event] }
    expect(getBestAvailableTimeline(src)).toBe(src.timeline)
  })

  it('falls back to events when matchFeed and timeline are empty', () => {
    const src = { matchFeed: [], timeline: [], events: [event] }
    expect(getBestAvailableTimeline(src)).toBe(src.events)
  })

  it('falls back to scoreTimeline as last resort', () => {
    const src = { scoreTimeline: [event] }
    expect(getBestAvailableTimeline(src)).toEqual([event])
  })

  it('returns [] when all sources are empty or absent', () => {
    expect(getBestAvailableTimeline({})).toEqual([])
    expect(getBestAvailableTimeline({ matchFeed: null, timeline: null })).toEqual([])
  })

  it('treats null source arrays like empty', () => {
    const src = { matchFeed: null, timeline: [event] }
    expect(getBestAvailableTimeline(src)).toEqual([event])
  })
})

// ── preferRicherTimeline ──────────────────────────────────────────────────────

describe('preferRicherTimeline', () => {
  const make = (n: number) => Array.from({ length: n }, (_, i) => ({ type: `e${i}` }))

  it('returns fallback when primary is empty', () => {
    const fb = make(3)
    expect(preferRicherTimeline([], fb)).toBe(fb)
  })

  it('returns primary when fallback is empty', () => {
    const primary = make(3)
    expect(preferRicherTimeline(primary, [])).toBe(primary)
  })

  it('returns primary when both are non-empty and primary is richer', () => {
    const primary = make(5)
    const fb = make(3)
    expect(preferRicherTimeline(primary, fb)).toBe(primary)
  })

  it('returns fallback when primary is synthetic and fallback has >1 event', () => {
    const synthetic = [{ type: 'status', payload: { fallbackFinish: true } }]
    const rich = make(4)
    expect(preferRicherTimeline(synthetic, rich)).toBe(rich)
  })

  it('keeps primary even if synthetic when fallback has only 1 event', () => {
    const synthetic = [{ type: 'status', payload: { synthetic: true } }]
    const fb = [{ type: 'goal' }]
    // fallback.length === 1, so primary wins
    expect(preferRicherTimeline(synthetic, fb)).toBe(synthetic)
  })

  it('returns fallback when primary has fewer events than fallback (>1)', () => {
    const primary = make(2)
    const fb = make(5)
    expect(preferRicherTimeline(primary, fb)).toBe(fb)
  })

  it('returns primary when primary.length === fallback.length', () => {
    const primary = make(3)
    const fb = make(3)
    expect(preferRicherTimeline(primary, fb)).toBe(primary)
  })

  it('defaults fallback to [] when omitted', () => {
    const primary = make(3)
    expect(preferRicherTimeline(primary)).toBe(primary)
  })
})

// ── resolvePreferredTimeline ──────────────────────────────────────────────────

describe('resolvePreferredTimeline', () => {
  const event = { type: 'goal' }

  it('picks best candidate from source and compares with fallback', () => {
    const src = { matchFeed: [], timeline: [event, event] }
    const fb = [event, event, event]
    // timeline (2) < fallback (3) → fallback wins
    expect(resolvePreferredTimeline(src, fb)).toBe(fb)
  })

  it('returns fallback when source has nothing', () => {
    const fb = [event]
    expect(resolvePreferredTimeline({}, fb)).toBe(fb)
  })

  it('returns [] when both source and fallback are empty', () => {
    expect(resolvePreferredTimeline({})).toEqual([])
  })
})
