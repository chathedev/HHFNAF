"use client"

import { useId, useState, type ReactNode } from "react"

// Accessible tab strip (role=tablist, arrow keys) in the site's pill style. Panels are
// rendered on the server and passed in; only the visible one is mounted.
export function Tabs({ tabs, initial = 0, ariaLabel = "Välj serie" }: { tabs: { id: string; label: ReactNode; content: ReactNode }[]; initial?: number; ariaLabel?: string }) {
  const [active, setActive] = useState(Math.min(initial, Math.max(0, tabs.length - 1)))
  const base = useId()
  if (!tabs.length) return null
  if (tabs.length === 1) return <>{tabs[0].content}</>
  return (
    <div>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="mb-5 flex gap-5 overflow-x-auto border-b border-slate-200"
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
          event.preventDefault()
          const next = (active + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length
          setActive(next)
          document.getElementById(`${base}-tab-${next}`)?.focus()
        }}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`${base}-tab-${index}`}
            role="tab"
            type="button"
            aria-selected={index === active}
            aria-controls={`${base}-panel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            className={`-mb-px shrink-0 border-b-2 pb-2 text-xs font-semibold transition ${
              index === active ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel-${active}`} aria-labelledby={`${base}-tab-${active}`}>
        {tabs[active].content}
      </div>
    </div>
  )
}
