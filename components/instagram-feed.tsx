"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type InstagramImage = {
  imageUrl?: string
}

type InstagramPost = {
  id?: string
  shortcode?: string
  permalink?: string
  type?: string
  caption?: string
  imageUrl?: string
  thumbnailSrc?: string
  displayResources?: Array<{ src?: string; width?: number; height?: number }>
  images?: InstagramImage[]
  isVideo?: boolean
  likesCount?: number
  commentsCount?: number
  takenAt?: string
}

type InstagramPayload = {
  ok?: boolean
  username?: string
  items?: InstagramPost[]
}

const INSTAGRAM_API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "")) ||
  "https://api.harnosandshf.se"

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='800'><rect width='100%25' height='100%25' fill='%23f1f5f9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='Arial' font-size='28'>Instagram-bild</text></svg>"

const POLL_INTERVAL_MS = 10 * 60 * 1000
const MAX_POSTS = 9
const getProxiedInstagramImageUrl = (url: string) => `/api/instagram-image?url=${encodeURIComponent(url)}`

const formatCompactNumber = (value?: number) => {
  if (!Number.isFinite(value)) return "0"
  return new Intl.NumberFormat("sv-SE", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0)
}

const truncateCaption = (caption?: string, maxLength = 160) => {
  const text = (caption || "").replace(/\s+/g, " ").trim()
  if (!text) return "Inlägg från @harnosandshf"
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

const formatPostDate = (iso?: string) => {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export function InstagramFeed() {
  const [items, setItems] = useState<InstagramPost[]>([])
  const [username, setUsername] = useState("harnosandshf")
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})
  const [imageRetryIndex, setImageRetryIndex] = useState<Record<string, number>>({})

  useEffect(() => {
    let isMounted = true

    const loadFeed = async ({ initial = false }: { initial?: boolean } = {}) => {
      if (initial) {
        setLoading(true)
      }

      try {
        const response = await fetch(`${INSTAGRAM_API_BASE}/instagram/posts?limit=${MAX_POSTS}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        })

        if (response.status === 503) {
          if (isMounted) {
            setUnavailable(true)
          }
          return
        }

        if (!response.ok) {
          throw new Error(`Instagram feed failed (${response.status})`)
        }

        const payload = (await response.json()) as InstagramPayload
        const nextItems = Array.isArray(payload.items) ? payload.items : []

        if (!isMounted) return

        setItems(nextItems)
        setUsername(payload.username || "harnosandshf")
        setUnavailable(false)
      } catch {
        if (isMounted && initial) {
          setUnavailable(true)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadFeed({ initial: true })

    const interval = globalThis.setInterval(() => {
      loadFeed()
    }, POLL_INTERVAL_MS)

    return () => {
      isMounted = false
      globalThis.clearInterval(interval)
    }
  }, [])

  const posts = useMemo(() => items.slice(0, MAX_POSTS), [items])

  const getPostKey = (post: InstagramPost) =>
    post.id ||
    post.shortcode ||
    post.permalink ||
    post.imageUrl ||
    `${post.takenAt || "unknown"}-${(post.caption || "").slice(0, 24)}`

  const getImageCandidates = (post: InstagramPost) => {
    const list = [
      post.imageUrl,
      post.thumbnailSrc,
      ...(Array.isArray(post.displayResources) ? post.displayResources.map((item) => item?.src) : []),
      ...(Array.isArray(post.images) ? post.images.map((item) => item?.imageUrl) : []),
    ]
      .map((item) => (item || "").trim())
      .filter(Boolean)

    return Array.from(new Set(list))
  }

  const resolveImage = (post: InstagramPost) => {
    const key = getPostKey(post)
    const candidates = getImageCandidates(post)
    const index = imageRetryIndex[key] ?? 0

    if (candidates.length === 0) return PLACEHOLDER_IMAGE
    if (brokenImages[key]) return PLACEHOLDER_IMAGE
    const picked = candidates[Math.min(index, candidates.length - 1)] || ""
    if (!picked) return PLACEHOLDER_IMAGE
    return getProxiedInstagramImageUrl(picked)
  }

  const markImageBroken = (post: InstagramPost) => {
    const key = getPostKey(post)
    const candidates = getImageCandidates(post)
    const currentIndex = imageRetryIndex[key] ?? 0
    if (currentIndex < candidates.length - 1) {
      setImageRetryIndex((prev) => ({ ...prev, [key]: currentIndex + 1 }))
      return
    }
    setBrokenImages((prev) => ({ ...prev, [key]: true }))
  }

  return (
    <section className="bg-white py-14">
      <div className="container mx-auto px-4">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-pink-600">Instagram</p>
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">Senaste från @harnosandshf</h2>
            <p className="mt-1 text-sm text-slate-500">Nya inlägg från Instagram.</p>
          </div>
          <Link
            href="https://www.instagram.com/harnosandshf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold uppercase tracking-[0.35em] text-pink-600 hover:text-pink-700"
          >
            Öppna Instagram →
          </Link>
        </div>

        {loading && (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="aspect-square animate-pulse bg-slate-200" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && unavailable && posts.length === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Instagram-flödet är tillfälligt otillgängligt.
          </div>
        )}

        {!loading && !unavailable && posts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {posts.map((post) => (
              <article key={getPostKey(post)} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Link href={post.permalink || `https://www.instagram.com/${username}`} target="_blank" rel="noopener noreferrer">
                  <img
                    src={resolveImage(post)}
                    alt={truncateCaption(post.caption, 90)}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="aspect-square w-full object-cover"
                    onError={() => markImageBroken(post)}
                  />
                </Link>
                <div className="space-y-1 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {post.isVideo ? "Video" : "Bild"}
                    </span>
                    <span className="text-[11px] text-slate-500">{formatPostDate(post.takenAt)}</span>
                  </div>
                  <p className="text-xs text-slate-700">{truncateCaption(post.caption, 90)}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>{formatCompactNumber(post.likesCount)} likes</span>
                    <span>{formatCompactNumber(post.commentsCount)} komm.</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-4 text-right text-xs text-slate-500">@{username}</p>
      </div>
    </section>
  )
}
