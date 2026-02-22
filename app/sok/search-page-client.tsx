"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Search, ArrowRight } from "lucide-react"

import { Header } from "@/components/header"
import Footer from "@/components/footer"
import type { SearchDoc } from "@/lib/search-index"
import { scoreSearch } from "@/lib/search-index"

type Props = {
  docs: SearchDoc[]
  initialQuery: string
}

export default function SearchPageClient({ docs, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!initialQuery) {
      inputRef.current?.focus()
    }
  }, [initialQuery])

  const trimmedQuery = query.trim()

  const results = useMemo(() => {
    if (!trimmedQuery) {
      return docs.slice(0, 12)
    }

    return docs
      .map((doc) => ({ doc, score: scoreSearch(doc, trimmedQuery) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title, "sv"))
      .slice(0, 20)
      .map((row) => row.doc)
  }, [docs, trimmedQuery])

  const showNoResults = trimmedQuery.length > 0 && results.length === 0

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="h-24" />
        <section className="container mx-auto max-w-4xl px-4 pb-16 pt-4 md:px-6">
          <div className="rounded-3xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-6 shadow-sm md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600">Sök</p>
            <h1 className="mt-2 text-3xl font-black text-gray-900 md:text-4xl">Sök på harnosandshf.se</h1>
            <p className="mt-2 text-sm text-gray-600 md:text-base">
              Hitta lag, matcher, kontaktuppgifter och viktiga sidor på klubbens webbplats.
            </p>

            <form action="/sok" method="get" className="mt-6">
              <label htmlFor="site-search" className="sr-only">
                Sök på webbplatsen
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-3 shadow-sm focus-within:border-emerald-500">
                <Search className="h-5 w-5 text-gray-500" aria-hidden />
                <input
                  ref={inputRef}
                  id="site-search"
                  name="q"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Sök efter lag, matcher, biljetter eller kontakt"
                  className="w-full bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Sök
                </button>
              </div>
            </form>
          </div>

          <section aria-live="polite" className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {trimmedQuery ? `Sökresultat (${results.length})` : "Populära sidor"}
              </h2>
              {trimmedQuery && (
                <p className="text-sm text-gray-500">
                  Söker efter: <span className="font-medium text-gray-800">{trimmedQuery}</span>
                </p>
              )}
            </div>

            {showNoResults ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6">
                <h2 className="text-lg font-semibold text-gray-900">Inga träffar hittades</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Prova ett kortare ord eller sök på till exempel <span className="font-medium">lag</span>,{" "}
                  <span className="font-medium">matcher</span>, <span className="font-medium">biljetter</span> eller{" "}
                  <span className="font-medium">kontakt</span>.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { label: "Våra lag", href: "/lag" },
                    { label: "Matcher", href: "/matcher" },
                    { label: "Köp biljett", href: "/kop-biljett" },
                    { label: "Kontakt", href: "/kontakt" },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-emerald-500 hover:text-emerald-700"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {results.map((result) => (
                  <li key={result.id}>
                    <Link
                      href={result.url}
                      className="group block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
                            {result.typeLabel}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-gray-900 group-hover:text-emerald-700">
                            {result.title}
                          </h3>
                          <p className="mt-2 text-sm text-gray-600">{result.snippet}</p>
                          <p className="mt-3 text-xs text-gray-500">{result.url}</p>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400 transition group-hover:text-emerald-600" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
      </main>
      <Footer />
    </>
  )
}
