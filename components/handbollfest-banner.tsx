"use client"

// Handbollfest 12 sep 2026 notice. This entire file is deleted by the
// self-cleanup cron (/root/handbollfest-cleanup.sh) on 13 sep 2026.

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Clock, Instagram, MapPin, X } from "lucide-react"

const INSTAGRAM_POST_URL = "https://www.instagram.com/p/DctudiJMl0K/"

export function HandbollfestBanner() {
  const [showPoster, setShowPoster] = useState(false)

  useEffect(() => {
    if (!showPoster) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowPoster(false)
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [showPoster])

  return (
    <>
      <div
        role="link"
        tabIndex={0}
        aria-label="Öppna inlägget om Handbollfest på Instagram"
        onClick={(event) => {
          const target = event.target as HTMLElement
          if (target.closest("a,button")) return
          window.open(INSTAGRAM_POST_URL, "_blank", "noopener,noreferrer")
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            window.open(INSTAGRAM_POST_URL, "_blank", "noopener,noreferrer")
          }
        }}
        className="relative mb-5 cursor-pointer overflow-hidden border border-emerald-200 bg-white transition-colors hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-emerald-600" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setShowPoster(true)
            }}
            aria-label="Visa affischen för Handbollfest i större format"
            className="group/poster relative mx-auto w-36 shrink-0 cursor-zoom-in sm:mx-0 sm:w-32"
          >
            <img
              src="/handbollfest-2026-thumb.webp"
              alt="Affisch: Handbollfest 12 september på Öbacka Sportcenter"
              width={480}
              height={679}
              className="w-full border border-slate-200 transition group-hover/poster:border-emerald-400"
              loading="lazy"
              decoding="async"
            />
            <span className="absolute bottom-1.5 right-1.5 bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Visa
            </span>
          </button>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Handbollfest · Lördag 12 september
            </p>
            <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              Är du född 2018, 2019 eller 2020? Kom och testa handboll!
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              En kul förmiddag med massor av lek, rörelse och prova-på-övningar. Vi bjuder på fika.
              Äldre och nyfiken? Du är också jättevälkommen!
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm font-semibold text-slate-900 sm:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-600" aria-hidden />
                10.00–12.00
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-emerald-600" aria-hidden />
                Öbacka Sportcenter
              </span>
              <span className="inline-flex items-center bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Ingen föranmälan
              </span>
            </div>
            <p className="mt-2.5 text-xs text-slate-400">
              Frågor?{" "}
              <a
                href="mailto:kontakt@harnosandshf.se"
                className="font-medium text-slate-500 underline-offset-2 hover:text-emerald-700 hover:underline"
              >
                kontakt@harnosandshf.se
              </a>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <Instagram className="h-3.5 w-3.5" aria-hidden />
                Se inlägget på Instagram
              </span>
            </p>
          </div>
        </div>
      </div>

      {showPoster && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Affisch: Handbollfest 12 september"
          onClick={() => setShowPoster(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 duration-200 animate-in fade-in sm:p-8"
        >
          <button
            type="button"
            onClick={() => setShowPoster(false)}
            aria-label="Stäng affischen"
            className="absolute right-4 top-4 p-2 text-white/70 transition hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src="/handbollfest-2026.webp"
            alt="Affisch: Handbollfest 12 september på Öbacka Sportcenter"
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full object-contain shadow-2xl duration-200 animate-in zoom-in-95"
          />
        </div>,
        document.body,
      )}
    </>
  )
}
