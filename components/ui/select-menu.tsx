"use client"

import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"

// The club's own dropdown (instead of the browser's): same look on every device,
// keyboard and screen reader support from Radix, HHF green for the chosen option.

export type SelectMenuOption = { value: string; label: string; hint?: string }

export function SelectMenu({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
  size = "md",
  id,
}: {
  value: string
  onChange: (value: string) => void
  options: SelectMenuOption[]
  ariaLabel: string
  className?: string
  size?: "sm" | "md"
  id?: string
}) {
  const current = options.find((o) => o.value === value)
  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={`group inline-flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white text-left font-semibold text-slate-900 transition hover:border-slate-300 focus:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 data-[state=open]:border-emerald-400 ${
          size === "sm" ? "px-3 py-2 text-xs" : "px-3 py-2 text-sm"
        } ${className}`}
      >
        <span className="min-w-0 truncate">
          <SelectPrimitive.Value>{current?.label ?? ""}</SelectPrimitive.Value>
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-data-[state=open]:rotate-180 group-data-[state=open]:text-emerald-600" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-[70] max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-slate-400">
            <ChevronDown className="h-4 w-4 rotate-180" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-slate-700 outline-none transition data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-800 data-[state=checked]:font-bold data-[state=checked]:text-emerald-800"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2.5 inline-flex">
                  <Check className="h-4 w-4 text-emerald-600" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                {option.hint && <span className="ml-auto pl-3 text-xs font-medium text-slate-400">{option.hint}</span>}
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-slate-400">
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
