import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { AdminDashboard } from "./admin-client"

export const metadata = {
  title: "Statistik – Härnösands HF",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default function AdminPage() {
  const cookieToken = process.env.AUTH_COOKIE_TOKEN || "authenticated"
  const authCookie = cookies().get("editor-auth")
  if (!authCookie || authCookie.value !== cookieToken) {
    redirect("/login?next=/admin")
  }
  return <AdminDashboard />
}
