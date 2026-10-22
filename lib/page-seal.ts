// Sealed page data (2026-10-22). Data that server pages hand to client components is not
// written into the HTML/RSC payload as JSON. Instead each island carries
//   1.<keyBlob>.<dataBlob>   (base64url, "1" = page key version)
// dataBlob = AES-256-GCM(K, deflate(JSON props)) with a random per-island key K, and
// keyBlob  = AES-256-GCM(HHF_PAGE_SEAL_KEY, K). The page key exists only on our servers
// (Next and the API). The browser asks the API for K through the encrypted vault channel
// (/seal/open), so outside the site the payload is ciphertext and nothing else.
//
// Shared file: sealing and server-side opening use node:crypto synchronously (no suspense in
// server rendering); the browser opens with WebCrypto after fetching K.

import { apiFetch } from "@/lib/api-client"

const te = new TextEncoder()
const td = new TextDecoder()
const DATA_AAD = "hhf-page-data-v1"
export const KEY_AAD = "hhf-page-key-v1"
const VERSION = "1"

export function b64urlEncode(bytes: Uint8Array): string {
  let s = ""
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)))
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function b64urlDecode(text: string): Uint8Array {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/")
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// JSON that keeps Date objects (React's own payload does, so client code relies on it).
export function encodeProps(value: unknown): string {
  return JSON.stringify(value ?? null, function (this: Record<string, unknown>, key: string, v: unknown) {
    const raw = this[key]
    return raw instanceof Date ? { $hhfDate: Number.isNaN(raw.getTime()) ? null : raw.toISOString() } : v
  })
}
export function decodeProps(text: string): unknown {
  return JSON.parse(text, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 1 && "$hhfDate" in v
      ? new Date((v as { $hhfDate: string | null }).$hhfDate ?? NaN)
      : v,
  )
}

function parse(sealed: string) {
  const [version, keyPart, dataPart] = String(sealed).split(".")
  if (version !== VERSION || !keyPart || !dataPart) throw new Error("seal: malformed")
  return { keyPart, dataPart }
}

// ---------- server (node:crypto, synchronous) ----------

type NodeCrypto = typeof import("crypto")
type NodeZlib = typeof import("zlib")
function node(): { crypto: NodeCrypto; zlib: NodeZlib; master: Buffer } | null {
  if (typeof window !== "undefined") return null
  const hex = process.env.HHF_PAGE_SEAL_KEY
  if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) return null
  const get = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule
  if (!get) return null
  return { crypto: get("node:crypto") as NodeCrypto, zlib: get("node:zlib") as NodeZlib, master: Buffer.from(hex, "hex") }
}

function nodeSeal(n: NonNullable<ReturnType<typeof node>>, key: Buffer, plain: Buffer, aad: string) {
  const iv = n.crypto.randomBytes(12)
  const cipher = n.crypto.createCipheriv("aes-256-gcm", key, iv)
  cipher.setAAD(Buffer.from(aad))
  return Buffer.concat([iv, cipher.update(plain), cipher.final(), cipher.getAuthTag()])
}

function nodeOpen(n: NonNullable<ReturnType<typeof node>>, key: Buffer, sealed: Buffer, aad: string) {
  const decipher = n.crypto.createDecipheriv("aes-256-gcm", key, sealed.subarray(0, 12))
  decipher.setAAD(Buffer.from(aad))
  decipher.setAuthTag(sealed.subarray(sealed.length - 16))
  return Buffer.concat([decipher.update(sealed.subarray(12, sealed.length - 16)), decipher.final()])
}

/** Server only: seal props for a client island. */
export async function sealProps(props: unknown): Promise<string> {
  const n = node()
  if (!n) throw new Error("HHF_PAGE_SEAL_KEY is not set")
  const k = n.crypto.randomBytes(32)
  const keyBlob = nodeSeal(n, n.master, k, KEY_AAD)
  const dataBlob = nodeSeal(n, k, n.zlib.deflateRawSync(Buffer.from(encodeProps(props)), { level: 6 }), DATA_AAD)
  return `${VERSION}.${b64urlEncode(keyBlob)}.${b64urlEncode(dataBlob)}`
}

/** Server only: open synchronously (server rendering of sealed islands). */
export function openSealedSync<T>(sealed: string): T {
  const n = node()
  if (!n) throw new Error("seal: no page key on this server")
  const { keyPart, dataPart } = parse(sealed)
  const k = nodeOpen(n, n.master, Buffer.from(b64urlDecode(keyPart)), KEY_AAD)
  const plain = n.zlib.inflateRawSync(nodeOpen(n, k, Buffer.from(b64urlDecode(dataPart)), DATA_AAD))
  return decodeProps(plain.toString("utf8")) as T
}

// ---------- browser ----------

const BATCH_MAX = 64
const canInflate = (() => {
  if (typeof DecompressionStream === "undefined") return false
  try {
    new DecompressionStream("deflate-raw" as CompressionFormat)
    return true
  } catch {
    return false
  }
})()

let pending: { keyBlob: string; resolve: (k: Uint8Array) => void; reject: (e: unknown) => void }[] = []
let flushScheduled = false

// Island keys requested in the same tick go to the API together (64 per call).
function flushKeys() {
  flushScheduled = false
  const all = pending
  pending = []
  for (let i = 0; i < all.length; i += BATCH_MAX) {
    const batch = all.slice(i, i + BATCH_MAX)
    apiFetch("/seal/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ k: batch.map((p) => p.keyBlob) }) })
      .then(async (response) => {
        if (!response.ok) throw new Error(`seal/open ${response.status}`)
        const data = (await response.json()) as { k?: (string | null)[] }
        batch.forEach((p, j) => {
          const key = data.k?.[j]
          if (key) p.resolve(b64urlDecode(key))
          else p.reject(new Error("seal: key refused"))
        })
      })
      .catch((error) => batch.forEach((p) => p.reject(error)))
  }
}

function browserKey(keyBlob: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    pending.push({ keyBlob, resolve, reject })
    if (!flushScheduled) {
      flushScheduled = true
      queueMicrotask(flushKeys)
    }
  })
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function openInBrowser(sealed: string): Promise<unknown> {
  const { keyPart, dataPart } = parse(sealed)
  if (!globalThis.crypto?.subtle) {
    // Plain http (staging, lyrnet admin): no WebCrypto, so the server route opens it.
    const response = await fetch("/api/lan/seal/props", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ s: sealed }) })
    if (!response.ok) throw new Error(`seal: props ${response.status}`)
    return decodeProps(await response.text())
  }
  if (!canInflate) {
    // Older browser without deflate-raw: the API opens it, the answer still comes through the vault.
    const response = await apiFetch("/seal/props", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ s: sealed }) })
    if (!response.ok) throw new Error(`seal: props ${response.status}`)
    return decodeProps(await response.text())
  }
  const k = await browserKey(keyPart)
  const data = b64urlDecode(dataPart)
  const key = await crypto.subtle.importKey("raw", k as BufferSource, "AES-GCM", false, ["decrypt"])
  const deflated = new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.subarray(0, 12) as BufferSource, additionalData: te.encode(DATA_AAD) as BufferSource }, key, data.subarray(12) as BufferSource),
  )
  return decodeProps(td.decode(await inflate(deflated)))
}

// Keeps trying with growing pauses and never rejects (except for a malformed seal). While it
// waits React keeps the server-rendered HTML on screen, so a failure costs interactivity,
// never content, and never floods the API.
async function openWithRetry(sealed: string): Promise<unknown> {
  parse(sealed)
  const pauses = [500, 1500, 4000, 10000, 20000, 30000]
  for (let attempt = 0; ; attempt++) {
    try {
      return await openInBrowser(sealed)
    } catch {
      await new Promise((r) => setTimeout(r, pauses[Math.min(attempt, pauses.length - 1)]))
    }
  }
}

const cache = new Map<string, Promise<unknown>>()
const CACHE_MAX = 100

/** Browser: same promise for the same island, so React's use() sees a stable value. */
export function openSealed<T>(sealed: string): Promise<T> {
  let promise = cache.get(sealed)
  if (!promise) {
    promise = openWithRetry(sealed)
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
    cache.set(sealed, promise)
  }
  return promise as Promise<T>
}
