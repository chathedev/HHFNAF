// The one way this site talks to the HHF API (2026-10-22).
//
// On the server (SSR, route handlers) calls go straight to the API on 127.0.0.1 with the
// internal secret. In the browser nothing goes to api.harnosandshf.se any more: every call is
// sealed with AES-256-GCM and sent to www.harnosandshf.se/_v/q, so the network tab shows one
// endpoint with binary bodies and no paths or JSON. The key comes from an ECDH handshake with
// the API (/_v/h). Live updates use the same key over /_v/ws.
//
// Use apiFetch("/matcher/data") exactly like fetch: it returns a normal Response.

type ApiInit = RequestInit & { next?: { revalidate?: number | false; tags?: string[] } }

const isServer = typeof window === "undefined"

// ---------- server side ----------

const INTERNAL_BASES = [process.env.HHF_API_INTERNAL || "http://127.0.0.1:3000", "http://127.0.0.1:3010"]

async function serverFetch(path: string, init: ApiInit): Promise<Response> {
  const headers = new Headers(init.headers || {})
  const secret = process.env.HHF_INTERNAL_SECRET
  if (secret) headers.set("x-hhf-internal", secret)
  let lastError: unknown = null
  for (const base of INTERNAL_BASES) {
    try {
      return await fetch(`${base}${path}`, { ...init, headers })
    } catch (error) {
      // Connection refused on the primary (restart): the standby answers instead.
      lastError = error
    }
  }
  throw lastError
}

// ---------- browser side ----------

type Session = { key: CryptoKey; token: Uint8Array }

const te = new TextEncoder()
const td = new TextDecoder()
let sessionPromise: Promise<Session> | null = null

const canInflate = (() => {
  if (isServer || typeof DecompressionStream === "undefined") return false
  try {
    new DecompressionStream("deflate-raw" as CompressionFormat)
    return true
  } catch {
    return false
  }
})()

function concat(parts: Uint8Array[]): Uint8Array {
  let length = 0
  for (const part of parts) length += part.length
  const out = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

async function handshake(): Promise<Session> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error("vault: WebCrypto is not available on this origin")
  const pair = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"])
  const clientPub = new Uint8Array(await subtle.exportKey("raw", pair.publicKey))
  const response = await fetch("/_v/h", {
    method: "POST",
    body: clientPub as BufferSource,
    headers: { "Content-Type": "application/octet-stream" },
    cache: "no-store",
    credentials: "omit",
  })
  if (!response.ok) throw new Error(`vault: handshake ${response.status}`)
  const reply = new Uint8Array(await response.arrayBuffer())
  const serverPub = reply.slice(0, 65)
  const token = reply.slice(65)
  const serverKey = await subtle.importKey("raw", serverPub, { name: "ECDH", namedCurve: "P-256" }, false, [])
  const bits = await subtle.deriveBits({ name: "ECDH", public: serverKey }, pair.privateKey, 256)
  const hkdf = await subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"])
  const key = await subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: concat([serverPub, clientPub]) as BufferSource, info: te.encode("hhf-vault-v1") },
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
  return { key, token }
}

let refreshingFrom: Session | null = null

function getSession(): Promise<Session> {
  if (!sessionPromise) {
    const attempt = handshake()
    sessionPromise = attempt
    attempt.catch(() => {
      if (sessionPromise === attempt) sessionPromise = null
    })
  }
  return sessionPromise
}

// A session was refused (expired, or the visitor's IP changed). Many calls can notice at once;
// only the first starts a new handshake, the rest wait for it.
function refreshSession(stale: Session): Promise<Session> {
  if (refreshingFrom === stale && sessionPromise) return sessionPromise
  refreshingFrom = stale
  sessionPromise = null
  return getSession()
}

async function sealCall(session: Session, call: unknown): Promise<Uint8Array> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const sealed = new Uint8Array(
    await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: te.encode("q") }, session.key, te.encode(JSON.stringify(call))),
  )
  const out = new Uint8Array(2 + session.token.length + 12 + sealed.length)
  new DataView(out.buffer).setUint16(0, session.token.length)
  out.set(session.token, 2)
  out.set(iv, 2 + session.token.length)
  out.set(sealed, 14 + session.token.length)
  return out
}

async function openSealed(key: CryptoKey, sealed: Uint8Array, aad: string): Promise<Uint8Array> {
  const plain = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: sealed.slice(0, 12), additionalData: te.encode(aad) },
    key,
    sealed.slice(12),
  )
  return new Uint8Array(plain)
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// Splits the reply into frames: u32 length | iv | ciphertext.
function frameReader(reader: ReadableStreamDefaultReader<Uint8Array>) {
  let buffer: Uint8Array = new Uint8Array(0)
  return async function next(): Promise<Uint8Array | null> {
    for (;;) {
      if (buffer.length >= 4) {
        const size = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(0)
        if (buffer.length >= 4 + size) {
          const frame = buffer.slice(4, 4 + size)
          buffer = buffer.slice(4 + size)
          return frame
        }
      }
      const { done, value } = await reader.read()
      if (done) return null
      buffer = buffer.length ? concat([buffer, value]) : value
    }
  }
}

const NULL_BODY_STATUS = new Set([101, 204, 205, 304])

async function vaultFetch(path: string, init: ApiInit, retry = true): Promise<Response> {
  const session = await getSession()
  const method = (init.method || "GET").toUpperCase()
  let body: string | undefined
  if (init.body != null) {
    if (typeof init.body !== "string") throw new Error("apiFetch: body must be a string")
    body = init.body
  }
  const headers = new Headers(init.headers || {})
  const envelope = await sealCall(session, {
    m: method,
    p: path,
    b: body,
    c: body !== undefined ? headers.get("content-type") || "application/json" : undefined,
    z: canInflate ? 1 : 0,
  })
  const outer = await fetch("/_v/q", {
    method: "POST",
    body: envelope as BufferSource,
    headers: { "Content-Type": "application/octet-stream" },
    cache: "no-store",
    credentials: "omit",
    signal: init.signal,
    keepalive: init.keepalive,
  })
  if (outer.status === 401 && retry) {
    // Session expired or the network changed (new IP): new handshake, one retry.
    await refreshSession(session)
    return vaultFetch(path, init, false)
  }
  if (!outer.ok || !outer.body) return new Response(null, { status: outer.status >= 400 ? outer.status : 502 })

  const reader = outer.body.getReader()
  const next = frameReader(reader)
  const headFrame = await next()
  if (!headFrame) return new Response(null, { status: 502 })
  const head = JSON.parse(td.decode(await openSealed(session.key, headFrame, "r"))) as {
    s: number
    h?: Record<string, string>
    z?: number
    st?: number
  }
  const status = head.s >= 200 && head.s <= 599 ? head.s : 502
  const responseHeaders = new Headers(head.h || {})

  if (head.st) {
    // Event stream (club assistant): decrypt frame by frame as they arrive.
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const frame = await next()
          if (!frame) return controller.close()
          controller.enqueue(await openSealed(session.key, frame, "r"))
        } catch (error) {
          controller.error(error)
        }
      },
      cancel() {
        reader.cancel().catch(() => {})
      },
    })
    return new Response(stream, { status, headers: responseHeaders })
  }

  const parts: Uint8Array[] = []
  for (let frame = await next(); frame; frame = await next()) parts.push(await openSealed(session.key, frame, "r"))
  let data = concat(parts)
  if (head.z) data = await inflate(data)
  return new Response(NULL_BODY_STATUS.has(status) ? null : (data as BodyInit), { status, headers: responseHeaders })
}

/** fetch() for the HHF API. `path` starts with "/", e.g. "/matcher/data?limit=5". */
export function apiFetch(path: string, init: ApiInit = {}): Promise<Response> {
  if (!path.startsWith("/")) throw new Error(`apiFetch: path must start with "/": ${path}`)
  if (isServer) return serverFetch(path, init)
  if (process.env.NODE_ENV === "development" || !globalThis.crypto?.subtle) {
    // Staging, or the site opened over plain http on lyrnet (no WebCrypto there): a server
    // route forwards the call. It only answers in dev or behind the lyrnet proxy.
    return fetch(`/api/lan${path}`, init)
  }
  return vaultFetch(path, init)
}

/** True when the encrypted live socket can be used in this browser. */
export function liveSocketAvailable(): boolean {
  return (
    !isServer &&
    process.env.NODE_ENV !== "development" &&
    Boolean(globalThis.crypto?.subtle) &&
    typeof WebSocket !== "undefined"
  )
}

/** Start the handshake early so the first real call does not wait for it. */
export function warmApi(): void {
  if (!isServer) getSession().catch(() => {})
}

// ---------- live socket ----------

/**
 * A WebSocket look-alike for the encrypted live channel. It connects after the handshake,
 * decrypts every frame in order and hands plain JSON text to onmessage, so callers can
 * treat it like the old /matcher/ws socket.
 */
export class LiveSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  onopen: (() => void) | null = null
  onmessage: ((message: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null

  private socket: WebSocket | null = null
  private closed = false
  private opened = false
  private queue: Promise<void> = Promise.resolve()

  constructor(query = "") {
    this.connect(query).catch(() => this.finish())
  }

  get readyState(): number {
    if (this.closed) return LiveSocket.CLOSED
    return this.socket ? this.socket.readyState : LiveSocket.CONNECTING
  }

  private async connect(query: string) {
    // A socket that never opened usually means a stale session: shake hands again.
    const session = await getSession()
    if (this.closed) return
    const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    const params = new URLSearchParams()
    params.set("t", toHex(session.token))
    // Our own query (sinceEventId) travels sealed too, so the URL has nothing readable.
    const inner = Object.fromEntries(new URLSearchParams(query))
    if (Object.keys(inner).length) {
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
      const sealed = new Uint8Array(
        await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: te.encode("wq") }, session.key, te.encode(JSON.stringify(inner))),
      )
      params.set("q", toHex(concat([iv, sealed])))
    }
    if (!canInflate) params.set("z", "0")
    if (this.closed) return
    const scheme = location.protocol === "https:" ? "wss:" : "ws:"
    const socket = new WebSocket(`${scheme}//${location.host}/_v/ws?${params.toString()}`)
    socket.binaryType = "arraybuffer"
    this.socket = socket
    socket.onopen = () => {
      this.opened = true
      this.onopen?.()
    }
    socket.onmessage = (event) => {
      const bytes = new Uint8Array(event.data as ArrayBuffer)
      // Decrypt in arrival order: a big snapshot must not be overtaken by a small delta.
      this.queue = this.queue.then(async () => {
        try {
          let data = await openSealed(session.key, bytes.slice(1), "w")
          if (bytes[0] === 1) data = await inflate(data)
          if (!this.closed) this.onmessage?.({ data: td.decode(data) })
        } catch {
          // A frame that does not decrypt is dropped; the safety poll fills any gap.
        }
      })
    }
    socket.onerror = () => this.onerror?.()
    socket.onclose = () => {
      if (!this.opened) refreshSession(session).catch(() => {})
      this.finish()
    }
  }

  private finish() {
    if (this.closed) return
    this.closed = true
    // Like a real WebSocket, onclose never fires inside close() itself.
    queueMicrotask(() => this.onclose?.())
  }

  close() {
    if (this.socket) {
      try {
        this.socket.close()
      } catch {
        // ignore
      }
    }
    this.finish()
  }
}
