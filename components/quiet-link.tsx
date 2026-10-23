"use client"

import NextLink from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, type ComponentProps, type FocusEvent, type MouseEvent, type TouchEvent } from "react"

type Props = ComponentProps<typeof NextLink>

// next/link prefetches every link that scrolls into view, which fills the network tab with
// "?_rsc=" rows on every page. On devices with a mouse this link prefetches only when the
// visitor shows intent (pointer over it, keyboard focus), which lands well before the click.
// Touch devices have no hover and a tap comes too fast, so there the normal viewport
// prefetch stays and phones keep instant page changes.
const REWARM_MS = 30_000

function hrefToString(href: Props["href"]): string {
  if (typeof href === "string") return href
  if (!href) return ""
  const path = href.pathname || ""
  let search = href.search || ""
  if (!search && href.query && typeof href.query === "object") {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(href.query)) {
      if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)))
      else if (value != null) params.set(key, String(value))
    }
    search = params.toString()
  }
  if (search && !search.startsWith("?")) search = `?${search}`
  return `${path}${search}`
}

function useTouchOnly(): boolean {
  const [touch, setTouch] = useState(false)
  useEffect(() => {
    try {
      setTouch(window.matchMedia("(hover: none)").matches)
    } catch {
      // keep hover behaviour
    }
  }, [])
  return touch
}

export default function Link({ prefetch, onMouseEnter, onTouchStart, onFocus, href, ...rest }: Props) {
  const router = useRouter()
  const touchOnly = useTouchOnly()
  const warmed = useRef<{ target: string; at: number } | null>(null)

  const warm = useCallback(() => {
    if (prefetch === false) return
    const target = hrefToString(href)
    if (!target.startsWith("/") || target.startsWith("//")) return
    const last = warmed.current
    if (last && last.target === target && Date.now() - last.at < REWARM_MS) return
    warmed.current = { target, at: Date.now() }
    try {
      router.prefetch(target)
    } catch {
      // prefetch is only a speed-up
    }
  }, [href, prefetch, router])

  return (
    <NextLink
      {...rest}
      href={href}
      prefetch={prefetch === false ? false : touchOnly ? prefetch : false}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        warm()
        onMouseEnter?.(event)
      }}
      onTouchStart={(event: TouchEvent<HTMLAnchorElement>) => {
        warm()
        onTouchStart?.(event)
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        warm()
        onFocus?.(event)
      }}
    />
  )
}
