"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { usePathname } from "next/navigation"
import { ArrowUp, RotateCcw, Square, X } from "lucide-react"
import { RobotIcon } from "./robot-icon"
import { RichText } from "./rich-text"
import styles from "./club-assistant.module.css"

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; error?: boolean }

const API_BASE = (process.env.NEXT_PUBLIC_MATCH_API_BASE || "https://api.harnosandshf.se").replace(/\/$/, "")
const STORAGE_KEY = "hhf-assistant:v1"
const TEASER_KEY = "hhf-assistant:teaser-seen"
const HIDDEN_PREFIXES = ["/admin", "/editor", "/login", "/stats", "/analys"]
const MAX_QUESTION = 1000
const GENERIC_ERROR = "Något gick fel. Försök igen om en stund."

type Suggestion = { label: string; question?: string; prefill?: string }

const SUGGESTIONS: Suggestion[] = [
  { label: "Matcher idag", question: "Vilka matcher spelas idag?" },
  { label: "Senaste resultaten", question: "Vilka är de senaste resultaten?" },
  { label: "Matcher i helgen", question: "Vilka matcher spelas i helgen?" },
  { label: "Nästa hemmamatch", question: "När är nästa hemmamatch?" },
  { label: "När tränar mitt lag?", prefill: "När tränar " },
  { label: "Målskyttar senaste matchen", prefill: "Vem gjorde mål i senaste matchen för " },
  { label: "Herrarnas tabell", question: "Hur ligger herrarna till i tabellen?" },
  { label: "Börja spela handboll", question: "Hur börjar man spela handboll i HHF?" },
]

// The team the conversation is about ("P16", "herrarna", "damlaget"), for follow-ups.
function detectTeam(text: string): string | null {
  const cls = text.match(/(?:^|[^a-zåäö0-9])([PF])\s?-?\s?(\d{1,2})(?![0-9])/i)
  if (cls) return `${cls[1].toUpperCase()}${cls[2]}`
  if (/\bherr(ar|arna|laget)?\b|a-lag(et)?\b/i.test(text)) return "herrarna"
  if (/\bdam(er|erna|laget)?\b|dam\/utv/i.test(text)) return "damlaget"
  return null
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

function followUpsFor(messages: ChatMessage[]): Suggestion[] {
  const asked = new Set(messages.filter((m) => m.role === "user").map((m) => m.content.trim().toLowerCase()))
  let team: string | null = null
  for (let i = messages.length - 1; i >= 0 && !team; i -= 1) {
    if (messages[i].role === "user") team = detectTeam(messages[i].content)
  }
  const options: Suggestion[] = team
    ? [
        { label: `${capitalize(team)}: målskyttar`, question: `Vem gjorde mål i senaste matchen för ${team}?` },
        { label: `${capitalize(team)}: nästa match`, question: `När spelar ${team} nästa gång?` },
        { label: `${capitalize(team)}: träningstider`, question: `När tränar ${team}?` },
        { label: `${capitalize(team)}: tabellen`, question: `Hur ligger ${team} till i tabellen?` },
        { label: `${capitalize(team)}: skytteliga`, question: `Vem har gjort flest mål i ${team} den här säsongen?` },
      ]
    : []
  return [...options, ...SUGGESTIONS].filter(
    (s) => !s.question || !asked.has(s.question.trim().toLowerCase()),
  ).slice(0, 8)
}

let idCounter = 0
const newId = () => `${Date.now().toString(36)}-${(idCounter++).toString(36)}`

function readStoredMessages(): ChatMessage[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content)
      .slice(-30)
  } catch {
    return []
  }
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    mql.addEventListener?.("change", update)
    return () => mql.removeEventListener?.("change", update)
  }, [query])
  return matches
}

export function ClubAssistant() {
  const pathname = usePathname() || "/"
  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const isMobile = useMediaQuery("(max-width: 639px)")
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const finePointer = useMediaQuery("(pointer: fine)")

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [typingId, setTypingId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(0)
  const [teaser, setTeaser] = useState(false)
  const [announce, setAnnounce] = useState("")
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null)

  const targetRef = useRef("")
  const revealedRef = useRef(0)
  const streamDoneRef = useRef(true)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const stickToBottomRef = useRef(true)
  const restoredRef = useRef(false)

  // Restore the conversation for this tab; it survives navigating between pages.
  useEffect(() => {
    setMessages(readStoredMessages())
    restoredRef.current = true
  }, [])

  useEffect(() => {
    if (!restoredRef.current || busy) return
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => !m.error).slice(-30)))
    } catch {
      // storage unavailable (private mode); the chat still works for this page
    }
  }, [messages, busy])

  // A short hello next to the launcher, once per visit.
  useEffect(() => {
    if (hidden || open) return
    let seen = false
    try {
      seen = window.sessionStorage.getItem(TEASER_KEY) === "1"
    } catch {
      seen = false
    }
    if (seen || readStoredMessages().length > 0) return
    const show = window.setTimeout(() => {
      setTeaser(true)
      try {
        window.sessionStorage.setItem(TEASER_KEY, "1")
      } catch {
        // ignore
      }
    }, 2600)
    const hide = window.setTimeout(() => setTeaser(false), 11600)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [hidden, open])

  // Letter-by-letter reveal. Speeds up when the stream runs ahead so it never lags far behind.
  useEffect(() => {
    if (!typingId) return
    let raf = 0
    let last = performance.now()
    let carry = 0
    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      const target = targetRef.current
      const backlog = target.length - revealedRef.current
      if (backlog > 0) {
        const cps = Math.min(480, 55 + backlog * 2.4) * (reducedMotion ? 4 : 1)
        carry += (cps * dt) / 1000
        const step = Math.floor(carry)
        if (step > 0) {
          carry -= step
          revealedRef.current = Math.min(target.length, revealedRef.current + step)
          setRevealed(revealedRef.current)
        }
      } else if (streamDoneRef.current) {
        setTypingId(null)
        setAnnounce(target)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [typingId, reducedMotion])

  // Follow the reply as it types, unless the reader scrolled up.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !stickToBottomRef.current) return
    el.scrollTop = el.scrollHeight
  }, [messages, revealed, open, viewport])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  // Phones: the panel is an opaque full-screen layer, and the chat column inside it tracks
  // the visible viewport so the input sits right above the keyboard. The page behind is
  // pinned in place (iOS ignores overflow:hidden alone) and restored exactly on close.
  useEffect(() => {
    if (!open || !isMobile) {
      setViewport(null)
      return
    }
    const vv = window.visualViewport
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() =>
        setViewport({ height: vv ? vv.height : window.innerHeight, top: vv ? vv.offsetTop : 0 }),
      )
    }
    update()
    vv?.addEventListener("resize", update)
    vv?.addEventListener("scroll", update)
    window.addEventListener("resize", update)

    const scrollY = window.scrollY
    const body = document.body
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    }
    Object.assign(body.style, {
      position: "fixed",
      top: `-${scrollY}px`,
      left: "0",
      right: "0",
      width: "100%",
      overflow: "hidden",
    })
    return () => {
      cancelAnimationFrame(raf)
      vv?.removeEventListener("resize", update)
      vv?.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      Object.assign(body.style, previous)
      window.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior })
    }
  }, [open, isMobile])

  useEffect(() => {
    if (!open) return
    stickToBottomRef.current = true
    if (finePointer) window.setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        launcherRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, finePointer])

  // Auto-grow the input up to five lines.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [input, open])

  const setAssistantText = useCallback((id: string, content: string, error = false) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content, error } : m)))
  }, [])

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim().slice(0, MAX_QUESTION)
      if (!question || busy) return
      setTeaser(false)
      const userMessage: ChatMessage = { id: newId(), role: "user", content: question }
      const assistantId = newId()
      const history = [...messages.filter((m) => !m.error && m.content), userMessage]
        .slice(-12)
        .map(({ role, content }) => ({ role, content }))

      setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }])
      setInput("")
      targetRef.current = ""
      revealedRef.current = 0
      setRevealed(0)
      streamDoneRef.current = false
      stickToBottomRef.current = true
      setTypingId(assistantId)
      setBusy(true)

      const controller = new AbortController()
      abortRef.current = controller
      try {
        const response = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        })
        if (!response.ok || !response.body) {
          const data = await response.json().catch(() => null)
          throw new Error(typeof data?.message === "string" ? data.message : GENERIC_ERROR)
        }
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let index = buffer.indexOf("\n\n")
          while (index >= 0) {
            const block = buffer.slice(0, index)
            buffer = buffer.slice(index + 2)
            index = buffer.indexOf("\n\n")
            const event = /^event: (.*)$/m.exec(block)?.[1]
            const data = /^data: (.*)$/m.exec(block)?.[1]
            if (!event || !data) continue
            const payload = JSON.parse(data)
            if (event === "delta" && typeof payload.t === "string") {
              targetRef.current += payload.t
              setAssistantText(assistantId, targetRef.current)
            } else if (event === "replace" && typeof payload.t === "string") {
              // The server withdrew what it streamed (e.g. a refused request); show this instead.
              targetRef.current = payload.t
              revealedRef.current = Math.min(revealedRef.current, payload.t.length)
              setRevealed(revealedRef.current)
              setAssistantText(assistantId, payload.t)
            } else if (event === "error") {
              throw new Error(typeof payload.message === "string" ? payload.message : GENERIC_ERROR)
            }
          }
        }
        if (!targetRef.current) throw new Error(GENERIC_ERROR)
      } catch (error) {
        if (controller.signal.aborted) {
          if (!targetRef.current) {
            setMessages((prev) => prev.filter((m) => m.id !== assistantId))
          }
        } else {
          const message =
            error instanceof TypeError
              ? "Kunde inte nå assistenten. Kontrollera anslutningen och försök igen."
              : error instanceof Error && error.message
                ? error.message
                : GENERIC_ERROR
          // Errors are shown at once, not typed.
          targetRef.current = message
          revealedRef.current = message.length
          setRevealed(message.length)
          setAssistantText(assistantId, message, true)
        }
      } finally {
        streamDoneRef.current = true
        abortRef.current = null
        setBusy(false)
      }
    },
    [busy, messages, setAssistantText],
  )

  const stop = () => abortRef.current?.abort()

  const reset = () => {
    abortRef.current?.abort()
    targetRef.current = ""
    revealedRef.current = 0
    setRevealed(0)
    setTypingId(null)
    setMessages([])
    setInput("")
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    inputRef.current?.focus()
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void send(input)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send(input)
    }
  }

  const useSuggestion = (suggestion: Suggestion) => {
    if (suggestion.question) {
      void send(suggestion.question)
      return
    }
    setInput(suggestion.prefill ?? "")
    window.setTimeout(() => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }, 30)
  }

  if (hidden) return null

  const columnStyle =
    isMobile && viewport ? { height: viewport.height, transform: `translateY(${viewport.top}px)` } : undefined
  const showLauncher = !(open && isMobile)

  return (
    <>
      {showLauncher ? (
        <div className={`${styles.launcherPos} ${styles.launcherIn}`}>
          {teaser && !open ? (
            <div className={`${styles.teaser} ${styles.teaserIn}`} role="status">
              <button
                type="button"
                onClick={() => {
                  setTeaser(false)
                  setOpen(true)
                }}
                className="text-left text-[14px] leading-snug text-zinc-800"
              >
                <span className="font-semibold text-zinc-950">Hej!</span> Fråga mig om matcher, resultat eller när ditt lag tränar.
              </button>
              <button
                type="button"
                aria-label="Stäng"
                onClick={() => setTeaser(false)}
                className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          <button
            ref={launcherRef}
            type="button"
            aria-label={open ? "Stäng HHF-assistenten" : "Öppna HHF-assistenten"}
            aria-expanded={open}
            onClick={() => {
              setTeaser(false)
              setOpen((value) => !value)
            }}
            className={`${styles.launcher} relative grid h-[56px] w-[56px] place-items-center rounded-full bg-green-700 text-white shadow-[0_10px_28px_-10px_rgba(21,128,61,0.75),0_2px_6px_rgba(0,0,0,0.18)] ring-1 ring-black/5 sm:h-[60px] sm:w-[60px]`}
          >
            {teaser && !open ? <span className={styles.pulseRing} /> : null}
            {open ? <X className="h-6 w-6" strokeWidth={2.2} /> : <RobotIcon size={34} animated={!reducedMotion} />}
          </button>
        </div>
      ) : null}

      {open ? (
        <section
          role="dialog"
          aria-modal={isMobile}
          aria-label="HHF-assistenten"
          className={`${styles.panel} ${styles.panelIn}`}
        >
          <div className={styles.panelColumn} style={columnStyle}>
            <header className={`${styles.panelHeader} flex items-center gap-3 border-b border-zinc-100 px-4`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green-700 text-white">
                <RobotIcon size={24} animated={false} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-tight text-zinc-950">HHF-assistenten</p>
                <p className="truncate text-[12.5px] leading-tight text-zinc-500">Matcher, resultat och träningar</p>
              </div>
              {messages.length > 0 ? (
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Ny konversation"
                  title="Ny konversation"
                  className="grid h-9 w-9 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <RotateCcw className="h-[17px] w-[17px]" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Stäng"
                className="grid h-9 w-9 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div ref={scrollRef} onScroll={onScroll} className={`${styles.messages} flex-1 overflow-y-auto px-4 py-4`}>
              <div className="space-y-3 text-[15px] leading-[1.5]">
                <div className="max-w-[90%] rounded-[18px] rounded-bl-md bg-zinc-100 px-3.5 py-2.5 text-zinc-900">
                  Hej! Jag svarar på frågor om HHF:s matcher, resultat, tabeller och när lagen tränar.
                </div>
                {messages.length === 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion.label}
                        type="button"
                        onClick={() => useSuggestion(suggestion)}
                        className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-[13.5px] font-medium text-zinc-800 transition-colors hover:border-green-600 hover:text-green-800 active:bg-green-50"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {messages.map((message) => {
                  if (message.role === "user") {
                    return (
                      <div key={message.id} className="flex justify-end">
                        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] rounded-br-md bg-green-700 px-3.5 py-2.5 text-white">
                          {message.content}
                        </div>
                      </div>
                    )
                  }
                  const isTyping = message.id === typingId
                  const text = isTyping ? message.content.slice(0, revealed) : message.content
                  return (
                    <div key={message.id} className="flex">
                      <div
                        className={`max-w-[90%] break-words rounded-[18px] rounded-bl-md px-3.5 py-2.5 ${
                          message.error ? "bg-red-50 text-red-800" : "bg-zinc-100 text-zinc-900"
                        }`}
                      >
                        {isTyping && text.length === 0 ? (
                          <span className="flex h-[22px] items-center gap-1" aria-label="Skriver">
                            <span className={styles.dot} />
                            <span className={styles.dot} />
                            <span className={styles.dot} />
                          </span>
                        ) : message.error ? (
                          <span>{text}</span>
                        ) : (
                          <>
                            <RichText text={text} typing={isTyping} />
                            {isTyping ? <span className={styles.caret} aria-hidden="true" /> : null}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={`${styles.panelFooter} border-t border-zinc-100 px-3 pt-2.5`}>
              {messages.length > 0 && !busy && !typingId ? (
                <div className={`${styles.chipRow} -mx-3 mb-2.5 flex gap-2 overflow-x-auto px-3`}>
                  {followUpsFor(messages).map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => useSuggestion(suggestion)}
                      className="shrink-0 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-700 transition-colors hover:border-green-600 hover:text-green-800 active:bg-green-50"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <form onSubmit={onSubmit} className="flex items-end gap-2">
                <label htmlFor="hhf-assistant-input" className="sr-only">
                  Skriv en fråga
                </label>
                <textarea
                  id="hhf-assistant-input"
                  ref={inputRef}
                  rows={1}
                  value={input}
                  maxLength={MAX_QUESTION}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Fråga om matcher, lag eller träningar"
                  enterKeyHint="send"
                  autoComplete="off"
                  className="block max-h-[132px] min-h-[44px] flex-1 resize-none rounded-[22px] border border-transparent bg-zinc-100 px-4 py-[10px] text-[16px] leading-[1.45] text-zinc-950 outline-none transition-colors placeholder:text-zinc-500 focus:border-green-600/50 focus:bg-white"
                />
                {busy ? (
                  <button
                    type="button"
                    onClick={stop}
                    aria-label="Stoppa svaret"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-zinc-900 text-white transition-transform active:scale-95"
                  >
                    <Square className="h-4 w-4" fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label="Skicka"
                    disabled={!input.trim()}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-green-700 text-white transition-[transform,background-color] active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400"
                  >
                    <ArrowUp className="h-5 w-5" strokeWidth={2.4} />
                  </button>
                )}
              </form>
              <p className="py-2.5 text-center text-[11.5px] text-zinc-400">
                Powered by{" "}
                <a
                  href="https://kaldros.se"
                  target="_blank"
                  rel="noopener"
                  className="font-medium text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-800 hover:underline"
                >
                  Kaldros.se
                </a>
              </p>
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            {announce}
          </p>
        </section>
      ) : null}
    </>
  )
}
