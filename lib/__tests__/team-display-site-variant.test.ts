// Run with: npx vitest run lib/__tests__/team-display-site-variant.test.ts
//
// Gap: lib/team-display.ts and lib/site-variant.ts have ZERO test coverage.

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  isExtendedTeamKey,
  extendTeamDisplayName,
  extendTeamDisplayNameFromCandidates,
  createTeamMatchKeySet,
} from '../team-display'
import {
  deriveSiteVariant,
  isStagingVariant,
  isMemorialThemeActive,
  getThemeVariant,
  getHeroImages,
} from '../site-variant'
import { mapVenueIdToName, isVenueId, VENUE_MAPPINGS } from '../venue-mapper'

// ── team-display.ts ─────────────────────────────────────────────────────────

describe('isExtendedTeamKey / extendTeamDisplayName', () => {
  it('recognizes F16 (2009) as an extended key and expands its display name', () => {
    // TODO: extendTeamDisplayName('F16 (2009)') -> 'F16 (2009/2010/2011)'
  })

  it('returns the trimmed original value for non-extended team names', () => {
    // TODO
  })

  it('handles null/undefined/empty gracefully', () => {
    // TODO: extendTeamDisplayName(null) -> '' ; extendTeamDisplayName(undefined) -> ''
  })
})

describe('extendTeamDisplayNameFromCandidates', () => {
  it('prefers an extended-key match over the first non-empty candidate', () => {
    // TODO: candidates = ['Some Other Name', 'F16 (2009)'] -> should still find F16 extension
  })

  it('falls back to first non-empty trimmed candidate when none match extended keys', () => {
    // TODO
  })

  it('returns the fallback value when all candidates are empty/whitespace', () => {
    // TODO
  })
})

describe('createTeamMatchKeySet', () => {
  it('normalizes and dedupes multiple name variants into one key', () => {
    // TODO: createTeamMatchKeySet('Öbacka', 'öbacka', 'OBACKA') -> Set with 1 entry
  })

  it('ignores null/undefined/empty values', () => {
    // TODO
  })
})

// ── site-variant.ts ─────────────────────────────────────────────────────────

describe('deriveSiteVariant', () => {
  const ORIGINAL_ENV = process.env
  afterEach(() => { process.env = ORIGINAL_ENV })

  it('returns "staging" for hhf.wby.se host', () => {
    // TODO
  })

  it('returns "production" for harnosandshf.se / www.harnosandshf.se', () => {
    // TODO
  })

  it('NEXT_PUBLIC_SITE_VARIANT env override takes precedence over host', () => {
    // TODO
  })

  it('falls back to VERCEL_ENV === "preview" -> staging', () => {
    // TODO
  })

  it('falls back to NODE_ENV when no host/env signal matches', () => {
    // TODO
  })

  it('is case-insensitive and strips port from host (e.g. "hhf.wby.se:3000")', () => {
    // TODO
  })
})

describe('isMemorialThemeActive', () => {
  afterEach(() => { vi.useRealTimers() })

  it('returns false when NEXT_PUBLIC_MEMORIAL_THEME flag is not "pink"', () => {
    // TODO
  })

  it('returns false once current date is past MEMORIAL_THEME_END_DATE (2026-01-18T22:00:00Z)', () => {
    // NOTE: "today" in this project's context is 2026-07-01 — this cutoff has
    // already passed. If the flag is still referenced anywhere in app/,
    // getThemeVariant will always resolve to "orange" now; consider whether
    // this whole memorial-theme branch is dead code worth removing.
    // TODO: vi.setSystemTime(new Date('2026-07-01')) -> expect isMemorialThemeActive() === false
  })

  it('returns true when flag is "pink" and current date is before the cutoff', () => {
    // TODO: vi.setSystemTime(new Date('2026-01-10'))
  })
})

describe('getThemeVariant / getHeroImages', () => {
  it('always returns "orange" for staging hosts regardless of memorial flag', () => {
    // TODO
  })

  it('returns "pink" only for production hosts when memorial theme is active', () => {
    // TODO
  })

  it('getHeroImages returns memorial images for pink theme, default images otherwise', () => {
    // TODO
  })
})

// ── venue-mapper.ts ─────────────────────────────────────────────────────────
// NOTE: also flag lib/venue-mapper.js as a stray compiled duplicate of this
// file — no source imports the .js version (verified via grep); it looks
// like a leftover build artifact accidentally committed to source control
// and should probably be deleted rather than tested.

describe('mapVenueIdToName / isVenueId', () => {
  it('maps a known numeric venue id to its name', () => {
    // TODO: mapVenueIdToName('32') -> 'Öbacka SC'
  })

  it('returns undefined for unknown venue ids', () => {
    // TODO
  })

  it('returns the input unchanged when it is already a venue name, not an id', () => {
    // TODO
  })

  it('isVenueId correctly distinguishes numeric ids from venue name strings', () => {
    // TODO
  })

  it('handles null/undefined venue input', () => {
    // TODO
  })

  it('VENUE_MAPPINGS constant stays in sync with mapVenueIdToName for every key', () => {
    for (const id of Object.keys(VENUE_MAPPINGS)) {
      // TODO: expect(mapVenueIdToName(id)).toBe(VENUE_MAPPINGS[id])
    }
  })
})
