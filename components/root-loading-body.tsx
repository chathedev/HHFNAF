"use client"

import { usePathname } from "next/navigation"
import { PageSkeletonMain } from "@/components/page-skeleton"

// The root loading boundary wraps every route, not only the home page, and React paints its
// fallback first on a full page load. Dark hero block on the start page, the light page
// skeleton everywhere else, so /matcher and friends never flash dark.
export function RootLoadingBody() {
  const pathname = usePathname()
  if (pathname === "/" || !pathname) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="h-screen w-full animate-pulse bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900" />
      </div>
    )
  }
  return <PageSkeletonMain />
}
