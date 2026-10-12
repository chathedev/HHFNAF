"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

// Keeps the reader's place. A reload or back/forward returns to where the page was left;
// a new page opened through a link starts at the top. The browser's own restore runs
// before match lists and images have loaded and lands too high, so it is replaced: the
// position is saved per URL and re-applied while the page grows, until the reader takes
// over (scroll, touch, key) or the page has settled.

const KEY_PREFIX = "hhf-scroll:"
const SETTLE_MS = 1500
const GIVE_UP_MS = 4000
const USER_INPUT = ["wheel", "touchstart", "keydown", "mousedown"] as const

const keyFor = () => `${KEY_PREFIX}${window.location.pathname}${window.location.search}`

function savedPosition(): number | null {
  try {
    const value = Number(window.sessionStorage.getItem(keyFor()))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function restorePosition() {
  const target = savedPosition()
  if (target === null) return () => {}
  let stopped = false
  let raf = 0
  let reachedAt = 0
  const startedAt = performance.now()
  const stop = () => {
    stopped = true
    if (raf) cancelAnimationFrame(raf)
    USER_INPUT.forEach((type) => window.removeEventListener(type, stop))
  }
  USER_INPUT.forEach((type) => window.addEventListener(type, stop, { passive: true }))
  const tick = () => {
    if (stopped) return
    const now = performance.now()
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo(0, Math.min(target, Math.max(0, max)))
    if (!reachedAt && max >= target && Math.abs(window.scrollY - target) < 2) reachedAt = now
    // Keep holding the spot a moment after reaching it: late content above can still shift it.
    if ((reachedAt && now - reachedAt > SETTLE_MS) || now - startedAt > GIVE_UP_MS) {
      stop()
      return
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return stop
}

export function ScrollMemory() {
  const pathname = usePathname()
  // The page we were loaded on, and whether we have navigated away from it since. Comparing
  // paths (not a one-shot flag) keeps this correct when React runs the effect twice in dev.
  const initialPathRef = useRef<string | null>(null)
  const leftInitialRef = useRef(false)
  const viaHistoryRef = useRef(false)

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual"
    const onPopState = () => {
      viaHistoryRef.current = true
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  // Remember the position for the current URL (at most once per frame) and when leaving.
  useEffect(() => {
    let raf = 0
    const save = () => {
      raf = 0
      // The chat locks the page on phones (fixed body); that is not where the reader is.
      if (document.body.style.position === "fixed") return
      try {
        window.sessionStorage.setItem(keyFor(), String(Math.round(window.scrollY)))
      } catch {
        // storage unavailable: nothing to remember, nothing breaks
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(save)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("pagehide", save)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("pagehide", save)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [pathname])

  useEffect(() => {
    if (initialPathRef.current === null) initialPathRef.current = pathname
    if (pathname !== initialPathRef.current) leftInitialRef.current = true
    const isInitialLoad = !leftInitialRef.current
    const viaHistory = viaHistoryRef.current
    viaHistoryRef.current = false
    // An explicit #anchor wins; the browser scrolls to it.
    if (window.location.hash) return
    if (isInitialLoad) {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
      if (navigation?.type === "reload" || navigation?.type === "back_forward") return restorePosition()
      return
    }
    if (viaHistory) return restorePosition()
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
