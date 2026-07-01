// Run with: npx vitest run app/api/instagram-image/__tests__/route.test.ts
//
// Gap: app/api/instagram-image/route.ts is a proxy with an SSRF allowlist
// (route.ts:3-11) — ZERO tests today. This is the single most
// security-sensitive untested route in the app: a bypass of
// isAllowedInstagramHost would turn this into an open image-fetching proxy
// (internal network scanning / metadata endpoint access).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '../../instagram-image/route'
import { NextRequest } from 'next/server'

function makeRequest(url: string) {
  return new NextRequest(`https://harnosandshf.se/api/instagram-image?url=${encodeURIComponent(url)}`)
}

describe('GET /api/instagram-image', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns 400 when url param is missing', async () => {
    const req = new NextRequest('https://harnosandshf.se/api/instagram-image')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for an unparseable url', async () => {
    // TODO: url=not-a-valid-url
  })

  it('rejects non-https protocols (SSRF: http://, file://, ftp://)', async () => {
    // TODO: url=http://scontent.example.com/foo.jpg -> 403
    // TODO: url=file:///etc/passwd -> 403
  })

  it('rejects hosts not matching the Instagram CDN allowlist', async () => {
    // TODO: url=https://evil.example.com/foo.jpg -> 403
    // TODO: url=https://169.254.169.254/latest/meta-data/ -> 403 (cloud metadata SSRF)
  })

  it('rejects lookalike hosts that merely contain an allowed substring', async () => {
    // TODO: url=https://notcdninstagram.com.evil.net/x.jpg -> 403
    //   (regression guard against a naive `.includes()` allowlist check)
  })

  it('allows *.cdninstagram.com', async () => {
    // TODO: mock fetch to resolve with an image/jpeg response, expect 200
  })

  it('allows *.fbcdn.net', async () => {
    // TODO
  })

  it('allows scontent.* subdomains', async () => {
    // TODO
  })

  it('returns 502 when upstream fetch throws', async () => {
    // TODO: fetch rejects -> 502 "Upstream fetch failed"
  })

  it('returns 502 when upstream responds non-ok', async () => {
    // TODO: fetch resolves with { ok: false, status: 404 }
  })

  it('returns 502 when upstream content-type is not an image (SSRF via redirect-to-text)', async () => {
    // TODO: upstream returns content-type: text/html -> reject even with 200 status
  })

  it('streams through the correct content-type and cache headers on success', async () => {
    // TODO: assert Content-Type and Cache-Control headers on the proxied response
  })
})
