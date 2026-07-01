// Run with: npx vitest run app/api/auth/__tests__/login.test.ts
// Requires vitest environment: 'node' (or jsdom) plus Next.js server runtime shims.
// NOTE: Next.js route handlers built on `cookies()` from "next/headers" require
// the Next.js test helpers (or a manual mock) to run outside a real request —
// see TODO below for mocking next/headers.
//
// Gap: app/api/auth/login/route.ts has ZERO test coverage. It compares
// credentials to plaintext env vars (AUTH_EMAIL/AUTH_PASSWORD) and sets a
// long-lived (7 day) httpOnly cookie on success. This is the only
// authentication gate protecting /editor — worth testing thoroughly.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// TODO: mock next/headers before importing the route, e.g.:
// vi.mock('next/headers', () => ({
//   cookies: () => ({ set: vi.fn() }),
// }))

describe('POST /api/auth/login', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, AUTH_EMAIL: 'admin@example.com', AUTH_PASSWORD: 'correct-horse' }
  })
  afterEach(() => {
    process.env = ORIGINAL_ENV
    vi.restoreAllMocks()
  })

  it('returns 401 when email is missing', async () => {
    // TODO: build a NextRequest-like object with json() => ({ password: 'x' })
    //   import { POST } from '../login/route'
    //   const res = await POST(req)
    //   expect(res.status).toBe(401)
  })

  it('returns 401 when password is missing', async () => {
    // TODO
  })

  it('returns 401 when email does not match AUTH_EMAIL', async () => {
    // TODO
  })

  it('returns 401 when password does not match AUTH_PASSWORD', async () => {
    // TODO
  })

  it('returns 200 and sets editor-auth cookie on valid credentials', async () => {
    // TODO: assert cookies().set called with { name: 'editor-auth', value: 'authenticated', httpOnly: true, ... }
  })

  it('is case-sensitive on both email and password (no normalization)', async () => {
    // TODO: 'Admin@example.com' should NOT match 'admin@example.com'
  })

  it('returns 500 with a generic message when request.json() throws (malformed body)', async () => {
    // TODO
  })

  it('does not leak whether email or password specifically was wrong (uniform error message)', async () => {
    // TODO: security-relevant — response body should be identical whether email
    //   or password is the mismatch, to avoid user enumeration
  })
})
