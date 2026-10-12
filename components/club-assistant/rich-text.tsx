import { Fragment, type ReactNode } from "react"

// Minimal, safe renderer for the assistant's replies: paragraphs, "- " lists, **bold**,
// [text](url) links and bare URLs. No HTML is ever injected. While a reply is still
// typing, unfinished markup at the end ("**Lör", "[laget.se](htt") is hidden instead of
// flashing raw syntax.

const ALLOWED_LINK_HOSTS = [
  "harnosandshf.se",
  "laget.se",
  "profixio.com",
  "handbollplay.se",
  "solidsport.com",
  "kaldros.se",
]

function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw, "https://www.harnosandshf.se")
    if (url.protocol === "mailto:") return url.href
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    const host = url.hostname.toLowerCase()
    return ALLOWED_LINK_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) ? url.href : null
  } catch {
    return null
  }
}

function isInternal(href: string) {
  try {
    return /(^|\.)harnosandshf\.se$/i.test(new URL(href).hostname)
  } catch {
    return false
  }
}

export function closePartialMarkup(text: string): string {
  let out = text
  // Unfinished link: show only its label.
  out = out.replace(/\[([^\]\n]*)\]\([^)\s]*$/, "$1")
  out = out.replace(/\[([^\]\n]*)$/, "$1")
  // Unbalanced bold markers at the end: drop the dangling marker.
  const markers = out.match(/\*\*/g)?.length ?? 0
  if (markers % 2 === 1) {
    const last = out.lastIndexOf("**")
    out = out.slice(0, last) + out.slice(last + 2)
  }
  return out.replace(/\*$/, "")
}

const TOKEN_RE = /\*\*([^*]+)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s)]+[^\s).,;:!?])|([\w.+-]+@harnosandshf\.se)/g

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let index = 0
  for (const match of Array.from(text.matchAll(TOKEN_RE))) {
    const start = match.index ?? 0
    if (start > last) nodes.push(text.slice(last, start))
    const key = `${keyPrefix}-${index++}`
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={key} className="font-semibold text-zinc-950">
          {renderInline(match[1], key)}
        </strong>,
      )
    } else if (match[2] !== undefined) {
      const href = safeHref(match[3])
      nodes.push(href ? <Link key={key} href={href} label={match[2]} /> : match[2])
    } else if (match[4] !== undefined) {
      const href = safeHref(match[4])
      nodes.push(href ? <Link key={key} href={href} label={prettyUrl(href)} /> : match[4])
    } else if (match[5] !== undefined) {
      nodes.push(<Link key={key} href={`mailto:${match[5]}`} label={match[5]} />)
    }
    last = start + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function prettyUrl(href: string) {
  try {
    const url = new URL(href)
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "")
    const label = `${url.hostname.replace(/^www\./, "")}${path}`
    return label.length > 42 ? `${label.slice(0, 40)}…` : label
  } catch {
    return href
  }
}

function Link({ href, label }: { href: string; label: string }) {
  const internal = isInternal(href) || href.startsWith("mailto:")
  return (
    <a
      href={href}
      target={internal ? undefined : "_blank"}
      rel={internal ? undefined : "noopener noreferrer"}
      className="font-medium text-green-700 underline decoration-green-700/30 underline-offset-2 transition-colors hover:decoration-green-700"
    >
      {label}
    </a>
  )
}

type Block = { type: "p"; lines: string[] } | { type: "ul"; items: string[] } | { type: "source"; text: string }

function toBlocks(text: string): Block[] {
  const blocks: Block[] = []
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd()
    const bullet = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/)
    const last = blocks[blocks.length - 1]
    if (!line.trim()) {
      blocks.push({ type: "p", lines: [] })
    } else if (/^\s*(?:källa|källor|source|sources)\s*:/i.test(line)) {
      blocks.push({ type: "source", text: line.trim() })
    } else if (bullet) {
      if (last?.type === "ul") last.items.push(bullet[1])
      else blocks.push({ type: "ul", items: [bullet[1]] })
    } else if (last?.type === "p") {
      last.lines.push(line)
    } else {
      blocks.push({ type: "p", lines: [line] })
    }
  }
  return blocks.filter((block) => (block.type === "p" ? block.lines.length > 0 : true))
}

export function RichText({ text, typing = false }: { text: string; typing?: boolean }) {
  const source = typing ? closePartialMarkup(text) : text
  const blocks = toBlocks(source)
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const key = `b${i}`
        if (block.type === "ul") {
          return (
            <ul key={key} className="space-y-1">
              {block.items.map((item, j) => (
                <li key={`${key}-${j}`} className="relative pl-3.5">
                  <span aria-hidden="true" className="absolute left-0 top-[0.62em] h-1.5 w-1.5 rounded-full bg-green-600" />
                  {renderInline(item, `${key}-${j}`)}
                </li>
              ))}
            </ul>
          )
        }
        if (block.type === "source") {
          return (
            <p key={key} className="pt-0.5 text-[12.5px] leading-snug text-zinc-500">
              {renderInline(block.text, key)}
            </p>
          )
        }
        return (
          <p key={key}>
            {block.lines.map((line, j) => (
              <Fragment key={`${key}-${j}`}>
                {j > 0 ? <br /> : null}
                {renderInline(line, `${key}-${j}`)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
