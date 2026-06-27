// Run with: npx vitest run lib/__tests__/get-matches.test.ts
//
// Tests for get-matches.ts HTML parsing and date-filtering logic.
// The fetch call is mocked — no network required.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── We need to test the internal fetchMatchesForMonth.
// Since it's not exported, we test the public getUpcomingMatchesServer
// with a fully controlled fetch mock.
//
// To also unit-test fetchMatchesForMonth directly, add to get-matches.ts:
//   export { fetchMatchesForMonth }  (only for test builds)

// Mock global fetch before importing the module
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function loadModule() {
  const mod = await import('../get-matches')
  return mod
}

// ── HTML fixture builder ───────────────────────────────────────────────────────

function makeDayGroupHtml(date: string, events: string[]) {
  const eventItems = events.map(e => `<li class="event-item">${e}</li>`).join('\n')
  return `
    <div class="day-group" data-day="${date}">
      <ul>${eventItems}</ul>
    </div>
  `
}

function makeTimedEvent(time: string, title: string) {
  return `<time>${time}</time> ${title} <a href="#">Läs mer</a>`
}

function makeHeldagEvent(title: string) {
  return `Heldag ${title}`
}

const MOCK_HTML_STANDARD = makeDayGroupHtml('2026-08-15', [
  makeTimedEvent('14:00', 'Härnösands HF - IFK Göteborg'),
  makeTimedEvent('16:00', 'HHF Dam - Skuru IK'),
])

const MOCK_HTML_HELDAG = makeDayGroupHtml('2026-08-20', [
  makeHeldagEvent('Handbollsläger'),
])

const MOCK_HTML_TRAINING = makeDayGroupHtml('2026-08-17', [
  makeTimedEvent('18:00', 'Träning ungdomslag'),
])

// ── getUpcomingMatchesServer ───────────────────────────────────────────────────

describe('getUpcomingMatchesServer', () => {
  it('returns an empty array when all fetch calls fail', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 500, statusText: 'Server Error' }))
    const { getUpcomingMatchesServer } = await loadModule()
    const matches = await getUpcomingMatchesServer()
    expect(matches).toEqual([])
  })

  it('returns an empty array when fetch throws a network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network failure'))
    const { getUpcomingMatchesServer } = await loadModule()
    const matches = await getUpcomingMatchesServer()
    expect(matches).toEqual([])
  })

  it('returns an empty array when HTML has no day-group divs', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('<html><body>No events</body></html>', { status: 200 }))
    const { getUpcomingMatchesServer } = await loadModule()
    const matches = await getUpcomingMatchesServer()
    expect(matches).toEqual([])
  })

  it('parses timed events from valid HTML', async () => {
    // Only respond to first call with content; rest return empty
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(MOCK_HTML_STANDARD, { status: 200 }))
      .mockResolvedValue(new Response('', { status: 200 }))

    const { getUpcomingMatchesServer } = await loadModule()

    // Freeze time to before the events so they appear as "upcoming"
    vi.setSystemTime(new Date('2026-08-01T00:00:00'))
    const matches = await getUpcomingMatchesServer()
    vi.useRealTimers()

    const dates = matches.map(m => m.date)
    expect(dates.every(d => d === '2026-08-15')).toBe(true)
    expect(matches.length).toBe(2)
  })

  it('filters out events with "träning" in title (case-insensitive)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(MOCK_HTML_TRAINING, { status: 200 }))
      .mockResolvedValue(new Response('', { status: 200 }))

    const { getUpcomingMatchesServer } = await loadModule()
    vi.setSystemTime(new Date('2026-08-01T00:00:00'))
    const matches = await getUpcomingMatchesServer()
    vi.useRealTimers()

    expect(matches).toEqual([])
  })

  it('handles Heldag events with correct time label', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(MOCK_HTML_HELDAG, { status: 200 }))
      .mockResolvedValue(new Response('', { status: 200 }))

    const { getUpcomingMatchesServer } = await loadModule()
    vi.setSystemTime(new Date('2026-08-01T00:00:00'))
    const matches = await getUpcomingMatchesServer()
    vi.useRealTimers()

    expect(matches.length).toBeGreaterThan(0)
    const heldag = matches.find(m => m.time === 'Heldag')
    expect(heldag).toBeTruthy()
  })

  it('filters out past events', async () => {
    // Event is in the past relative to "now"
    const pastHtml = makeDayGroupHtml('2026-07-01', [makeTimedEvent('10:00', 'Old match')])
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(pastHtml, { status: 200 }))
      .mockResolvedValue(new Response('', { status: 200 }))

    const { getUpcomingMatchesServer } = await loadModule()
    vi.setSystemTime(new Date('2026-08-01T00:00:00'))
    const matches = await getUpcomingMatchesServer()
    vi.useRealTimers()

    expect(matches).toEqual([])
  })

  it('returns results sorted by date and time (ascending)', async () => {
    const mixedHtml =
      makeDayGroupHtml('2026-08-15', [makeTimedEvent('16:00', 'Match B')]) +
      makeDayGroupHtml('2026-08-15', [makeTimedEvent('14:00', 'Match A')]) +
      makeDayGroupHtml('2026-08-10', [makeTimedEvent('18:00', 'Match C')])

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(mixedHtml, { status: 200 }))
      .mockResolvedValue(new Response('', { status: 200 }))

    const { getUpcomingMatchesServer } = await loadModule()
    vi.setSystemTime(new Date('2026-08-01T00:00:00'))
    const matches = await getUpcomingMatchesServer()
    vi.useRealTimers()

    // Dates should be non-decreasing
    for (let i = 1; i < matches.length; i++) {
      const prev = `${matches[i-1].date}T${matches[i-1].time}`
      const curr = `${matches[i].date}T${matches[i].time}`
      expect(curr >= prev).toBe(true)
    }
  })

  it('fetches exactly 4 months (current + 3 ahead)', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }))
    const { getUpcomingMatchesServer } = await loadModule()
    vi.setSystemTime(new Date('2026-06-27T12:00:00'))
    await getUpcomingMatchesServer()
    vi.useRealTimers()

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(4)
  })

  it('rolls over to next year when months exceed 12', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }))
    const { getUpcomingMatchesServer } = await loadModule()
    vi.setSystemTime(new Date('2026-11-01T12:00:00'))
    await getUpcomingMatchesServer()
    vi.useRealTimers()

    const urls = vi.mocked(fetch).mock.calls.map(([url]) => url as string)
    const jan2027 = urls.find(u => u.includes('Year=2027') && u.includes('Month=01'))
    expect(jan2027).toBeTruthy()
    const feb2027 = urls.find(u => u.includes('Year=2027') && u.includes('Month=02'))
    expect(feb2027).toBeTruthy()
  })

  it('includes the correct laget.se URL with Year and Month params', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }))
    const { getUpcomingMatchesServer } = await loadModule()
    vi.setSystemTime(new Date('2026-06-27T12:00:00'))
    await getUpcomingMatchesServer()
    vi.useRealTimers()

    const firstCall = vi.mocked(fetch).mock.calls[0][0] as string
    expect(firstCall).toContain('laget.se')
    expect(firstCall).toContain('Year=2026')
    expect(firstCall).toContain('Month=06')
  })

  it('includes User-Agent header in fetch calls', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }))
    const { getUpcomingMatchesServer } = await loadModule()
    vi.setSystemTime(new Date('2026-06-27T12:00:00'))
    await getUpcomingMatchesServer()
    vi.useRealTimers()

    const firstCallInit = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect((firstCallInit?.headers as Record<string, string>)?.['User-Agent']).toBeTruthy()
  })

  it('handles malformed/empty day-group HTML without throwing', async () => {
    const malformedHtml = `
      <div class="day-group" data-day="">
        <li class="event-item"></li>
      </div>
      <div class="day-group">
        <li class="event-item"><time>14:00</time> Match</li>
      </div>
    `
    vi.mocked(fetch).mockResolvedValue(new Response(malformedHtml, { status: 200 }))
    const { getUpcomingMatchesServer } = await loadModule()
    await expect(getUpcomingMatchesServer()).resolves.not.toThrow()
  })
})
