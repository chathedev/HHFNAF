import { permanentRedirect } from "next/navigation"

// The video analyses were retired 2026-10-24; old links land on Scout.
export default function Page() {
  permanentRedirect("/scout")
}
