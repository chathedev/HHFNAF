"use client"

import { useEffect, useRef } from "react"

// Reloads open pages when a new build goes live, and puts the visitor back where they were:
// same URL, same scroll position (ScrollMemory) and the same match popup open.

const RESTORE_KEY = "hhf-build-restore"
const CHECK_INTERVAL_MS = 60_000
const RESTORE_MAX_AGE_MS = 60_000
const CONFIRM_DELAY_MS = 8_000
const LAST_RELOAD_KEY = "hhf-build-last-reload"

type RestoreState = { url: string; matchId: string | null; at: number }

declare global {
  interface Window {
    __hhfOpenMatchId?: string | null
  }
}

/** Called by the match popup so a reload can reopen it. */
export function setOpenMatchForRestore(matchId: string | null) {
  if (typeof window === "undefined") return
  window.__hhfOpenMatchId = matchId
}

let pendingRestoreMatchId: string | null | undefined

function readPendingRestore(): string | null {
  if (pendingRestoreMatchId !== undefined) return pendingRestoreMatchId
  pendingRestoreMatchId = null
  try {
    const raw = window.sessionStorage.getItem(RESTORE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as RestoreState
    const sameUrl = state.url === `${window.location.pathname}${window.location.search}`
    if (sameUrl && Date.now() - state.at < RESTORE_MAX_AGE_MS && state.matchId) {
      pendingRestoreMatchId = state.matchId
    } else {
      window.sessionStorage.removeItem(RESTORE_KEY)
    }
  } catch {
    // storage unavailable: nothing to restore
  }
  return pendingRestoreMatchId
}

function clearPendingRestore() {
  pendingRestoreMatchId = null
  try {
    window.sessionStorage.removeItem(RESTORE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Reopens the match popup that was open before a release reload, once `matches` contains it.
 * Matches are compared on both the site id and the Profixio id.
 */
export function useRestoreOpenMatch<T extends { id: string; apiMatchId?: string | number | null }>(
  matches: readonly T[] | null | undefined,
  open: (match: T) => void,
) {
  const openRef = useRef(open)
  openRef.current = open
  useEffect(() => {
    if (typeof window === "undefined" || !matches || matches.length === 0) return
    const wanted = readPendingRestore()
    if (!wanted) return
    const match = matches.find((m) => m.id === wanted || String(m.apiMatchId ?? "") === wanted)
    if (!match) return
    clearPendingRestore()
    openRef.current(match)
  }, [matches])
}

function isUserBusy() {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable
}

export function BuildRefresh({ initialBuildId }: { initialBuildId?: string }) {
  // The build that rendered this page; falls back to the first answer when unknown.
  const usable = initialBuildId && initialBuildId !== "unknown" && initialBuildId !== "development"
  const loadedBuildRef = useRef<string | null>(usable ? initialBuildId : null)

  useEffect(() => {
    // Drop a stale restore entry once the page has had time to use it.
    const staleTimer = window.setTimeout(() => {
      if (pendingRestoreMatchId) clearPendingRestore()
    }, RESTORE_MAX_AGE_MS)

    let stopped = false
    let reloading = false
    let candidateBuild: string | null = null

    // focus and visibilitychange often fire together: one check per 30 s is plenty.
    let lastCheck = 0
    const check = async (force?: unknown) => {
      if (stopped || reloading || document.visibilityState === "hidden") return
      if (force !== true && Date.now() - lastCheck < 30_000) return
      lastCheck = Date.now()
      try {
        const res = await fetch("/api/build-id", { cache: "no-store" })
        if (!res.ok) return
        const { buildId } = (await res.json()) as { buildId?: string }
        if (!buildId || buildId === "unknown" || buildId === "development") return
        if (loadedBuildRef.current === null) {
          loadedBuildRef.current = buildId
          return
        }
        if (buildId === loadedBuildRef.current) {
          candidateBuild = null
          return
        }
        // During a release the two production processes briefly run different builds;
        // only act once the same new build answers twice, a few seconds apart.
        if (candidateBuild !== buildId) {
          candidateBuild = buildId
          window.setTimeout(() => check(true), CONFIRM_DELAY_MS)
          return
        }
        if (isUserBusy()) return
        // Loop guard: at most one automatic reload per 3 minutes per tab.
        try {
          const last = Number(window.sessionStorage.getItem(LAST_RELOAD_KEY) || 0)
          if (Date.now() - last < 3 * 60_000) return
          window.sessionStorage.setItem(LAST_RELOAD_KEY, String(Date.now()))
        } catch {
          return
        }
        reloading = true
        const state: RestoreState = {
          url: `${window.location.pathname}${window.location.search}`,
          matchId: window.__hhfOpenMatchId ?? null,
          at: Date.now(),
        }
        try {
          window.sessionStorage.setItem(RESTORE_KEY, JSON.stringify(state))
        } catch {
          // reload anyway; the visitor just lands without the popup
        }
        // ScrollMemory saves the scroll position on pagehide and restores it after load.
        window.location.reload()
      } catch {
        // offline or server restarting: try again on the next tick
      }
    }

    // The page was rendered with the current build id, so there is nothing to compare yet;
    // the first check runs after a minute (or when the tab comes back).
    if (loadedBuildRef.current === null) check(true)
    else lastCheck = Date.now()
    const interval = window.setInterval(() => check(true), CHECK_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") check()
    }
    const onFocus = () => check()
    // A page restored from the back/forward cache may carry an old build: check at once.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) check(true)
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onFocus)
    window.addEventListener("pageshow", onPageShow)
    return () => {
      stopped = true
      window.clearTimeout(staleTimer)
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [])

  return null
}
