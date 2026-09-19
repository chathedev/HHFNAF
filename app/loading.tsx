import { Header } from "@/components/header"

/**
 * Fallback for the home route (every other public route has its own).
 *
 * The home hero is a full-height dark image, so the old plain slate panel read as a
 * bright flash when navigating back to the start page. A dark block of the same height
 * keeps the transition continuous, and the header stays mounted throughout.
 */
export default function Loading() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-slate-900">
        <div className="h-screen w-full animate-pulse bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900" />
      </div>
    </>
  )
}
