import { Header } from "@/components/header"
import Footer from "@/components/footer"

/**
 * Route-level loading frame.
 *
 * The old root loading.tsx replaced the whole document with an empty slate panel, so
 * every navigation tore the header and footer off the screen for the length of the
 * server render and read as a flash. Keeping the real chrome mounted means only the
 * content area swaps, which makes a fast route change look instant instead of blank.
 */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_32%,#f8fafc_100%)]">
        <div className="h-24" />
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8 animate-pulse">
            <div className="h-3 w-32 rounded bg-slate-200" />
            <div className="mt-3 h-9 w-64 rounded bg-slate-200 sm:h-12 sm:w-96" />
            <div className="mt-3 h-4 w-full max-w-xl rounded bg-slate-100" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="mt-3 h-5 w-2/3 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
