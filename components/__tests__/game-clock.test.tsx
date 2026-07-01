// Run with: npx vitest run components/__tests__/game-clock.test.tsx
// Requires: @testing-library/react, @testing-library/jest-dom, jsdom environment
// (see vitest.config.ts — environment: 'jsdom')
//
// Gap: components/game-clock.tsx has ZERO test coverage. It renders a live,
// self-updating (setInterval 1000ms) game clock that interpolates elapsed
// time from a server timestamp (game-clock.tsx:28-31), detects overtime past
// 3600s (:72-77), and has 3 distinct render states: no clock, static/finished
// clock, live interpolating clock (:43-88).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { GameClock } from '../game-clock'
import type { GameClock as GameClockType } from '@/lib/use-match-data'

describe('GameClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when gameClock is undefined', () => {
    // TODO: const { container } = render(<GameClock gameClock={undefined} />)
    //   expect(container).toBeEmptyDOMElement()
  })

  it('shows 00:00 static display for a non-live clock with no display string', () => {
    // TODO: gameClock = { isLive: false, totalSeconds: 0, serverTimestamp: Date.now() } as GameClockType
  })

  it('shows the provided display string for a finished/static clock', () => {
    // TODO: gameClock = { isLive: false, display: '60:00', overtime: false, ... }
    //   expect(screen.getByText('60')).toBeInTheDocument() // minutes
    //   expect(screen.getByText('00')).toBeInTheDocument() // seconds
  })

  it('marks isInOvertime when a static clock has overtime=true', () => {
    // TODO: assert "+N min" indicator appears
  })

  it('interpolates elapsed seconds every 1000ms for a live clock', () => {
    // TODO: gameClock = { isLive: true, totalSeconds: 0, serverTimestamp: Date.now() }
    //   render, then act(() => vi.advanceTimersByTime(3000))
    //   expect displayed seconds to have advanced by ~3
  })

  it('detects overtime once interpolated totalSeconds crosses 3600', () => {
    // TODO: serverTimestamp far enough in the past that totalSeconds >= 3600
    //   after interpolation; assert overtime indicator + correct overtimeMinutes
  })

  it('shows the LIVE badge only when gameClock.isLive is true', () => {
    // TODO
  })

  it('shows "Est." source indicator only when showSource=true and source="estimated"', () => {
    // TODO
  })

  it('clears the interval on unmount (no state updates after unmount)', () => {
    // TODO: render, unmount(), advance timers, assert no errors/act warnings
  })

  it('resets to 00:00 when gameClock transitions from defined to undefined across a rerender', () => {
    // TODO: rerender(<GameClock gameClock={undefined} />)
  })

  it('applies the correct size classes for sm/md/lg', () => {
    // TODO
  })
})
