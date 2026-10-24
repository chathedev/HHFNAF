"use client"

import { useEffect, useState, type MouseEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "@/components/quiet-link"

// Where did the reader come from? A small in-memory stack of the pages visited in this tab
// (only in-app navigation; a reload or a new tab starts empty, so "back" can never leave the
// site by mistake). Back links use it to return to the page the reader actually came from,
// with ScrollMemory putting them back at the same spot; without history they fall back to a
// fixed parent page.

type Entry = { url: string; label: string }

const MAX_ENTRIES = 40
const EVENT = "hhf-nav-history"
const stack: Entry[] = []

const currentUrl = () => `${window.location.pathname}${window.location.search}`

function pageLabel(): string {
  const h1 = document.querySelector("main h1") ?? document.querySelector("h1")
  const text = (h1?.textContent ?? "").replace(/\s+/g, " ").trim()
  if (!text) return ""
  return text.length > 42 ? `${text.slice(0, 40).trimEnd()}…` : text
}

// Set by the browser's popstate (back/forward button, or router.back() from a back link), read
// once by the next recorded navigation. Link clicks never set it, so A -> B -> A by links is
// recorded as a new page, exactly like the browser history.
let poppedAt = 0
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    poppedAt = Date.now()
  })
}

function record(url: string) {
  const popped = Date.now() - poppedAt < 3000
  poppedAt = 0
  if (stack[stack.length - 1]?.url === url) {
    // same page again (reload of state, hash change): nothing to do
  } else if (popped) {
    if (stack[stack.length - 2]?.url === url) stack.pop()
    else stack.splice(0, stack.length, { url, label: "" }) // forward, or a jump we cannot follow: start over
  } else {
    stack.push({ url, label: "" })
    if (stack.length > MAX_ENTRIES) stack.splice(0, stack.length - MAX_ENTRIES)
  }
  window.dispatchEvent(new Event(EVENT))
}

/** The page before this one in this tab, if the reader got here by navigating inside the site. */
function previousEntry(): Entry | null {
  const top = stack[stack.length - 1]
  if (!top || top.url !== currentUrl()) return null
  return stack[stack.length - 2] ?? null
}

export function NavHistoryTracker() {
  const pathname = usePathname()
  const search = useSearchParams()?.toString() ?? ""
  useEffect(() => {
    const url = currentUrl()
    record(url)
    // The new page's heading becomes this entry's label (used by the next page's back link).
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      const top = stack[stack.length - 1]
      const label = pageLabel()
      if (top && top.url === url && label) {
        top.label = label
        window.clearInterval(timer)
      } else if (tries > 100) window.clearInterval(timer)
    }, 100)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search])
  return null
}

const LABEL_BY_PATH: [RegExp, string][] = [
  [/^\/scout\/?$/, "HHF Scout"],
  [/^\/scout\/register/, "Register"],
  [/^\/scout\/match\//, "Matchen"],
  [/^\/scout\/serie\//, "Serien"],
  [/^\/scout\/lag\//, "Laget"],
  [/^\/scout\/[^/]+$/, "Laget"],
  [/^\/matcher/, "Matcher"],
  [/^\/?$/, "Startsidan"],
]

function labelFor(entry: Entry): string {
  if (entry.label) return entry.label
  const path = entry.url.split("?")[0]
  return LABEL_BY_PATH.find(([re]) => re.test(path))?.[1] ?? "Tillbaka"
}

/** "← label" that returns to where the reader came from, else to the fallback page. */
export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
  const router = useRouter()
  const [prev, setPrev] = useState<Entry | null>(null)
  useEffect(() => {
    const update = () => setPrev(previousEntry())
    update()
    window.addEventListener(EVENT, update)
    return () => window.removeEventListener(EVENT, update)
  }, [])
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!prev || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    router.back()
  }
  return (
    <Link href={prev ? prev.url : href} onClick={onClick} className={className}>
      ← {prev ? labelFor(prev) : label}
    </Link>
  )
}
