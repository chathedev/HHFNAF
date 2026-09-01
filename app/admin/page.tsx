import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { AdminDashboard } from "./admin-client"

export const metadata = {
  title: "Statistik – Härnösands HF",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>
}) {
  const cookieToken = process.env.AUTH_COOKIE_TOKEN || "authenticated"
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("editor-auth")

  if (authCookie && authCookie.value === cookieToken) {
    return <AdminDashboard />
  }

  // No session: a request arriving through the lyrnet-only vhost carries the
  // trusted headers — send it through the automatic device check. The ?denied
  // guard prevents a redirect loop when the device was checked and rejected.
  const { denied } = await searchParams
  const headerStore = await headers()
  const lyrnetSecret = headerStore.get("x-lyrnet-secret")
  if (!denied && lyrnetSecret && lyrnetSecret === process.env.LYRNET_PROXY_SECRET) {
    redirect("/api/auth/lyrnet")
  }

  // Everyone else: closed.
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm border border-slate-200 bg-white p-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Härnösands HF</p>
        <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950">Stängt område</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Den här sidan är endast tillgänglig för klubbens administratörer.
        </p>
        <a
          href="/login?next=/admin"
          className="mt-6 inline-block text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-700 hover:underline"
        >
          Logga in manuellt
        </a>
      </div>
    </main>
  )
}
