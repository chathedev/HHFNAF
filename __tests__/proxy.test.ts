// Run with: npx vitest run __tests__/proxy.test.ts
//
// Gap: proxy.ts (Next.js middleware) has ZERO tests. It is NOT a SERVERF
// fetch wrapper (no fetch calls exist here at all) — it only does path-based
// routing/pass-through and an editor auth-cookie check.
//
// POTENTIAL BUG worth locking down with a test either way: proxy.ts:29-40 —
// both the "no/invalid cookie" branch (:33-36) and the "valid cookie" branch
// (:38-39) call NextResponse.next(). The middleware currently performs NO
// actual access control on /editor; whatever protection exists must live at
// the page/layout level. Write a test that asserts the CURRENT behavior
// (both branches pass through) so any future fix to add real gating here is
// a deliberate, visible change rather than an accidental regression either way.

import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'

function makeRequest(path: string, cookies?: Record<string, string>) {
  const req = new NextRequest(`https://harnosandshf.se${path}`)
  if (cookies) {
    for (const [name, value] of Object.entries(cookies)) {
      req.cookies.set(name, value)
    }
  }
  return req
}

describe('proxy middleware', () => {
  it('passes through known public paths unmodified (/, /shop, /partners, /lag, /kontakt, /kalender)', async () => {
    // TODO: for each path, assert response is NextResponse.next() (status 200-ish passthrough)
  })

  it('passes through /api/* without any auth check', async () => {
    // TODO
  })

  it('passes through static asset paths (/_next/static/, /_next/image/, /favicon.ico, etc.)', async () => {
    // TODO
  })

  it('CURRENT BEHAVIOR: allows /editor through even without an editor-auth cookie', async () => {
    // TODO: documents that proxy.ts does not block unauthenticated /editor requests today
    const req = makeRequest('/editor')
    const res = await proxy(req)
    // TODO: expect(res.status).toBe(200) // NextResponse.next() equivalent
  })

  it('CURRENT BEHAVIOR: allows /editor through with an invalid cookie value', async () => {
    // TODO: cookie value other than "authenticated"
  })

  it('CURRENT BEHAVIOR: allows /editor through with a valid "authenticated" cookie', async () => {
    // TODO
  })

  it('matcher config excludes api/_next/static/_next/image/favicon/robots/sitemap', () => {
    // TODO: import { config } from '../proxy'; assert config.matcher regex behavior
    //   against a handful of sample paths
  })
})
