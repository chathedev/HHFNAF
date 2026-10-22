"use client"

import { apiFetch } from "@/lib/api-client"
import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"


export function VisitBeacon() {
  const pathname = usePathname()
  const lastSentPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    if (lastSentPathRef.current === pathname) return
    lastSentPathRef.current = pathname

    apiFetch("/sys/diagnostics/v1/visit-6f2a9d3b5c", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: window.location.pathname,
        referrer: document.referrer || "",
      }),
      keepalive: true,
    }).catch(() => {
      // Intentionally silent for public visitor telemetry.
    })
  }, [pathname])

  return null
}

