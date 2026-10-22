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

// ---------- proof of work (the server's challenge before a session) ----------
// Pure SHA-256 in a worker: find nonce so sha256(challenge + ":" + nonce) starts with <bits> zeros.
const POW_SOURCE = `
const K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const W=new Uint32Array(64);
function first32(bytes){
  const len=bytes.length, total=((len+9+63)>>6)<<6, m=new Uint8Array(total);
  m.set(bytes); m[len]=0x80; const bits=len*8;
  m[total-4]=bits>>>24; m[total-3]=(bits>>>16)&255; m[total-2]=(bits>>>8)&255; m[total-1]=bits&255;
  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
  for(let o=0;o<total;o+=64){
    for(let i=0;i<16;i++)W[i]=(m[o+i*4]<<24)|(m[o+i*4+1]<<16)|(m[o+i*4+2]<<8)|m[o+i*4+3];
    for(let i=16;i<64;i++){const a=W[i-15],b=W[i-2];W[i]=(((a>>>7)|(a<<25))^((a>>>18)|(a<<14))^(a>>>3))+W[i-7]+(((b>>>17)|(b<<15))^((b>>>19)|(b<<13))^(b>>>10))+W[i-16];}
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for(let i=0;i<64;i++){const t1=(h+(((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)))+((e&f)^(~e&g))+K[i]+W[i])|0;const t2=((((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)))+((a&b)^(a&c)^(b&c)))|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}
    h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0;h5=(h5+f)|0;h6=(h6+g)|0;h7=(h7+h)|0;
  }
  return h0>>>0;
}
function solve(challenge,bits){
  const prefix=new TextEncoder().encode(challenge+":"); const limit=bits>=32?0:(0xffffffff>>>bits);
  const buf=new Uint8Array(prefix.length+10); buf.set(prefix); const digits=new Uint8Array(10);
  for(let n=0;n<0xffffffff;n++){
    let x=n,d=0; do{digits[d++]=48+(x%10);x=Math.floor(x/10);}while(x>0);
    for(let i=0;i<d;i++)buf[prefix.length+i]=digits[d-1-i];
    if(first32(buf.subarray(0,prefix.length+d))<=limit) return n;
  }
  return -1;
}
self.onmessage=(e)=>{ self.postMessage(solve(e.data.challenge,e.data.bits)); };
`

function solveOnMainThread(challenge: string, bits: number): number {
  // eslint-disable-next-line no-new-func
  const solve = new Function(`${POW_SOURCE.replace(/self\.onmessage[\s\S]*$/, "")}; return solve;`)() as (c: string, b: number) => number
  return solve(challenge, bits)
}

function solveWork(challenge: string): Promise<number> {
  const bits = Number(challenge.split(".")[3]) || 14
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }
    // Workers can fail late (CSP, blocked blob URLs): fall back to the main thread then.
    const fallback = () =>
      finish(() => {
        try {
          const nonce = solveOnMainThread(challenge, bits)
          if (nonce >= 0) resolve(nonce)
          else reject(new Error("vault: no proof of work"))
        } catch (error) {
          reject(error)
        }
      })
    try {
      const url = URL.createObjectURL(new Blob([POW_SOURCE], { type: "text/javascript" }))
      const worker = new Worker(url)
      const done = () => {
        clearTimeout(timer)
        worker.terminate()
        URL.revokeObjectURL(url)
      }
      const timer = setTimeout(() => {
        done()
        fallback()
      }, 30_000)
      worker.onmessage = (event) => {
        done()
        const nonce = Number(event.data)
        finish(() => (nonce >= 0 ? resolve(nonce) : reject(new Error("vault: no proof of work"))))
      }
      worker.onerror = () => {
        done()
        fallback()
      }
      worker.postMessage({ challenge, bits })
    } catch {
      fallback()
    }
  })
}

// ---------- persisted session ----------
// The AES key is a non-extractable CryptoKey: IndexedDB can keep it, but nobody (not even
// our own code) can read its bytes. The server lets a token live 2 h; we reuse it for 110 min.
const SESSION_REUSE_MS = 110 * 60 * 1000
const IDB_NAME = "hhf-vault"

let idbPromise: Promise<IDBDatabase | null> | null = null
function idb(): Promise<IDBDatabase | null> {
  if (!idbPromise) idbPromise = openIdb()
  return idbPromise
}
function openIdb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    // Some Safari versions never answer indexedDB.open: give up after 800 ms, memory works too.
    const timer = setTimeout(() => resolve(null), 800)
    const done = (db: IDBDatabase | null) => {
      clearTimeout(timer)
      resolve(db)
    }
    try {
      const request = indexedDB.open(IDB_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore("s")
      request.onsuccess = () => done(request.result)
      request.onerror = () => done(null)
    } catch {
      done(null)
    }
  })
}

async function loadSession(): Promise<Session | null> {
  const db = await idb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const get = db.transaction("s", "readonly").objectStore("s").get("session")
      get.onsuccess = () => {
        const v = get.result as { key?: CryptoKey; token?: Uint8Array; at?: number } | undefined
        resolve(v?.key && v.token && v.at && Date.now() - v.at < SESSION_REUSE_MS ? { key: v.key, token: v.token } : null)
      }
      get.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function storeSession(session: Session | null) {
  const db = await idb()
  if (!db) return
  try {
    const store = db.transaction("s", "readwrite").objectStore("s")
    if (session) store.put({ key: session.key, token: session.token, at: Date.now() }, "session")
    else store.delete("session")
  } catch {
    // private mode etc: the in-memory session still works
  }
}

// A refused challenge (expired: 428) or a rate limit (429) gets a fresh attempt after a pause.
async function handshake(): Promise<Session> {
  const pauses = [400, 1500, 4000]
  for (let attempt = 0; ; attempt++) {
    try {
      return await handshakeOnce()
    } catch (error) {
      const status = (error as { status?: number })?.status
      if (attempt >= pauses.length || (status !== 428 && status !== 429 && status !== 502 && status !== 503)) throw error
      await new Promise((r) => setTimeout(r, pauses[attempt]))
    }
  }
}

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status })
}

async function handshakeOnce(): Promise<Session> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error("vault: WebCrypto is not available on this origin")
  const stored = await loadSession()
  if (stored) return stored
  const challengeResponse = await fetch("/_v/c", { method: "POST", cache: "no-store", credentials: "omit" })
  if (!challengeResponse.ok) throw httpError(`vault: challenge ${challengeResponse.status}`, challengeResponse.status)
  const challenge = await challengeResponse.text()
  const [pair, nonce] = await Promise.all([
    subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]),
    solveWork(challenge),
  ])
  const clientPub = new Uint8Array(await subtle.exportKey("raw", pair.publicKey))
  const challengeBytes = te.encode(challenge)
  const hello = new Uint8Array(65 + 4 + challengeBytes.length)
  hello.set(clientPub, 0)
  new DataView(hello.buffer).setUint32(65, nonce)
  hello.set(challengeBytes, 69)
  const response = await fetch("/_v/h", {
    method: "POST",
    body: hello as BufferSource,
    headers: { "Content-Type": "application/octet-stream" },
    cache: "no-store",
    credentials: "omit",
  })
  if (!response.ok) throw httpError(`vault: handshake ${response.status}`, response.status)
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
  const session = { key, token }
  storeSession(session).catch(() => {})
  return session
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
  return storeSession(null).then(getSession, getSession)
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
