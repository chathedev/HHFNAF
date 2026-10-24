"use client"

import { useEffect, useState, type MouseEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "@/components/quiet-link"

// Where did the reader come from? A small stack of the pages visited in this tab. Back links
// use it to return to the page the reader actually came from (ScrollMemory then puts them back
// at the same spot); without history they fall back to a fixed parent page.
// The stack is mirrored to sessionStorage so it survives the automatic reload after a release
// (BuildRefresh) and full page loads. Entries pushed by client navigation in this page load
// are "live" and use router.back(); restored ones use history.back() only when the browser
// really has a previous entry, else a plain link, so back can never leave the site by mistake.

type Entry = { url: string; label: string; live?: boolean }

const MAX_ENTRIES = 40
const EVENT = "hhf-nav-history"
const STORE_KEY = "hhf-nav-stack"
const stack: Entry[] = []
let restored = false

function save() {
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(stack.slice(-MAX_ENTRIES).map(({ url, label }) => ({ url, label }))))
  } catch {}
}

function loadSaved(): Entry[] {
  try {
    const raw = JSON.parse(window.sessionStorage.getItem(STORE_KEY) || "[]")
    return Array.isArray(raw) ? raw.filter((e) => e && typeof e.url === "string").map((e) => ({ url: e.url, label: typeof e.label === "string" ? e.label : "" })) : []
  } catch {
    return []
  }
}

function referrerUrl(): string | null {
  try {
    if (!document.referrer) return null
    const ref = new URL(document.referrer)
    return ref.origin === window.location.origin ? `${ref.pathname}${ref.search}` : null
  } catch {
    return null
  }
}

// First navigation of this page load: rebuild the stack from what we know.
function restore(url: string) {
  restored = true
  const saved = loadSaved()
  const ref = referrerUrl()
  if (saved.length && saved[saved.length - 1].url === url) {
    stack.push(...saved) // reload (also the automatic one after a release)
  } else if (saved.length && ref && saved[saved.length - 1].url === ref) {
    stack.push(...saved, { url, label: "" }) // full page load from the last page we knew
  } else if (ref && ref !== url) {
    stack.push({ url: ref, label: "" }, { url, label: "" })
  } else {
    stack.push({ url, label: "" })
  }
}

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
  if (!restored) {
    restore(url)
  } else if (stack[stack.length - 1]?.url === url) {
    // same page again (reload of state, hash change): nothing to do
  } else if (popped) {
    if (stack[stack.length - 2]?.url === url) stack.pop()
    else stack.splice(0, stack.length, { url, label: "" }) // forward, or a jump we cannot follow: start over
  } else {
    stack.push({ url, label: "", live: true })
    if (stack.length > MAX_ENTRIES) stack.splice(0, stack.length - MAX_ENTRIES)
  }
  save()
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
        save()
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
    const top = stack[stack.length - 1]
    if (top?.live) {
      event.preventDefault()
      router.back()
    } else if (window.history.length > 1) {
      // restored after a reload or full page load: the browser's own previous entry is that page
      event.preventDefault()
      window.history.back()
    }
    // otherwise (new tab, no history): the link itself goes to prev.url
  }
  return (
    <Link href={prev ? prev.url : href} onClick={onClick} className={className}>
      ← {prev ? labelFor(prev) : label}
    </Link>
  )
}
