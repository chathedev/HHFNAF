"use client"

// First-party visitor beacon: one pageview per route change + a heartbeat
// every 30s while the tab is visible. No cookies — a per-tab session id in
// sessionStorage; the server stores IPs only as a salted daily hash.

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MATCH_API_BASE?.replace(/\/$/, "")) ||
  "https://api.harnosandshf.se"

const COLLECT_URL = `${API_BASE_URL}/analytics/collect`
const HEARTBEAT_MS = 30_000

const getSessionId = () => {
  try {
    let sid = sessionStorage.getItem("hhf_sid")
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem("hhf_sid", sid)
    }
    return sid
  } catch {
    return "no-storage"
  }
}

const send = (data: Record<string, unknown>) => {
  try {
    const body = JSON.stringify({
      ...data,
      sid: getSessionId(),
      vw: window.innerWidth,
      webdriver: Boolean((navigator as any).webdriver),
      match: (window as any).__hhfMatchContext || undefined,
    })
    if (navigator.sendBeacon) {
      navigator.sendBeacon(COLLECT_URL, body)
    } else {
      fetch(COLLECT_URL, { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {})
    }
  } catch {
    // analytics must never break the page
  }
}

export function AnalyticsBeacon() {
  const pathname = usePathname()
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/editor")) return
    if (lastPathRef.current === pathname) return
    lastPathRef.current = pathname

    const params = new URLSearchParams(window.location.search)
    send({
      type: "pageview",
      path: pathname,
      ref: document.referrer || undefined,
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_content: params.get("utm_content") || undefined,
    })
  }, [pathname])

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return
      const path = window.location.pathname
      if (path.startsWith("/admin") || path.startsWith("/editor")) return
      send({ type: "heartbeat", path })
    }
    const interval = window.setInterval(tick, HEARTBEAT_MS)
    return () => window.clearInterval(interval)
  }, [])

  return null
}
