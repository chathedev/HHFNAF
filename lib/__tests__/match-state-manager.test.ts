// Run with: npx vitest run lib/__tests__/match-state-manager.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MatchStateManager } from '../match-state-manager'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeState(overrides = {}) {
  return { homeScore: 0, awayScore: 0, matchStatus: 'upcoming', lastUpdated: Date.now(), ...overrides }
}

// ── queueUpdate / getState ────────────────────────────────────────────────────

describe('MatchStateManager.getState', () => {
  it('returns undefined for an unknown matchId', () => {
    const mgr = new MatchStateManager()
    expect(mgr.getState('does-not-exist')).toBeUndefined()
  })

  it('returns the stored state after queueUpdate', async () => {
    const mgr = new MatchStateManager()
    const state = makeState({ homeScore: 1 })
    mgr.queueUpdate('m1', state)
    await vi.runAllTimersAsync()
    expect(mgr.getState('m1')).toEqual(state)
  })
})

// ── processQueue / batching ───────────────────────────────────────────────────

describe('MatchStateManager queue batching', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('processes more than 5 updates across multiple batches', async () => {
    const mgr = new MatchStateManager()
    for (let i = 0; i < 8; i++) {
      mgr.queueUpdate(`m${i}`, makeState({ homeScore: i }))
    }
    await vi.runAllTimersAsync()
    // All 8 matches should now be stored
    for (let i = 0; i < 8; i++) {
      expect(mgr.getState(`m${i}`)).toMatchObject({ homeScore: i })
    }
  })

  it('does not re-process if already processing (no nested loops)', async () => {
    const mgr = new MatchStateManager()
    const spy = vi.spyOn(mgr as any, 'notifyUpdate')
    mgr.queueUpdate('m1', makeState())
    mgr.queueUpdate('m1', makeState()) // second call while first is processing
    await vi.runAllTimersAsync()
    // notifyUpdate should be called once (state equal on second enqueue)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

// ── deepEqual / change detection ─────────────────────────────────────────────

describe('MatchStateManager change detection', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('does not dispatch event when state is identical', async () => {
    const mgr = new MatchStateManager()
    const dispatched: Event[] = []
    window.addEventListener('matchStateUpdate', (e) => dispatched.push(e))

    const state = makeState({ homeScore: 2 })
    mgr.queueUpdate('m1', state)
    await vi.runAllTimersAsync()

    mgr.queueUpdate('m1', { ...state }) // same values
    await vi.runAllTimersAsync()

    expect(dispatched).toHaveLength(1)
  })

  it('dispatches event when score changes', async () => {
    const mgr = new MatchStateManager()
    const events: CustomEvent[] = []
    window.addEventListener('matchStateUpdate', (e) => events.push(e as CustomEvent))

    mgr.queueUpdate('m1', makeState({ homeScore: 0 }))
    await vi.runAllTimersAsync()
    mgr.queueUpdate('m1', makeState({ homeScore: 1 }))
    await vi.runAllTimersAsync()

    expect(events).toHaveLength(2)
    expect(events[1].detail.newState.homeScore).toBe(1)
  })

  it('handles deeply nested state objects', async () => {
    const mgr = new MatchStateManager()
    const events: Event[] = []
    window.addEventListener('matchStateUpdate', (e) => events.push(e))

    const s1 = makeState({ extra: { nested: { deep: 1 } } })
    const s2 = makeState({ extra: { nested: { deep: 2 } } }) // changed leaf
    mgr.queueUpdate('m1', s1)
    await vi.runAllTimersAsync()
    mgr.queueUpdate('m1', s2)
    await vi.runAllTimersAsync()

    expect(events).toHaveLength(2)
  })

  it('treats null and undefined as not equal to an object', async () => {
    const mgr = new MatchStateManager()
    const events: Event[] = []
    window.addEventListener('matchStateUpdate', (e) => events.push(e))

    mgr.queueUpdate('m1', null)
    await vi.runAllTimersAsync()
    mgr.queueUpdate('m1', makeState())
    await vi.runAllTimersAsync()

    // First update: null → dispatched; second: null→object → dispatched
    expect(events).toHaveLength(2)
  })
})

// ── cleanup ───────────────────────────────────────────────────────────────────

describe('MatchStateManager.cleanup', () => {
  it('removes states older than 5 minutes', () => {
    const mgr = new MatchStateManager()
    const old = Date.now() - 6 * 60 * 1000
    // Bypass queueUpdate to inject pre-aged state directly
    ;(mgr as any).matchStates.set('old-match', makeState({ lastUpdated: old }))
    ;(mgr as any).matchStates.set('fresh-match', makeState({ lastUpdated: Date.now() }))

    mgr.cleanup()

    expect(mgr.getState('old-match')).toBeUndefined()
    expect(mgr.getState('fresh-match')).toBeDefined()
  })

  it('does not remove states that have no lastUpdated field', () => {
    const mgr = new MatchStateManager()
    ;(mgr as any).matchStates.set('no-ts', { homeScore: 0 })

    mgr.cleanup()

    expect(mgr.getState('no-ts')).toBeDefined()
  })

  it('handles an empty map without throwing', () => {
    const mgr = new MatchStateManager()
    expect(() => mgr.cleanup()).not.toThrow()
  })
})

// ── notifyUpdate ─────────────────────────────────────────────────────────────

describe('MatchStateManager.notifyUpdate', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('dispatches matchStateUpdate with correct detail', async () => {
    const mgr = new MatchStateManager()
    let received: CustomEvent | null = null
    window.addEventListener('matchStateUpdate', (e) => { received = e as CustomEvent })

    const state = makeState({ matchStatus: 'live' })
    mgr.queueUpdate('match-42', state)
    await vi.runAllTimersAsync()

    expect(received).not.toBeNull()
    expect((received as CustomEvent).detail.matchId).toBe('match-42')
    expect((received as CustomEvent).detail.newState.matchStatus).toBe('live')
  })
})
