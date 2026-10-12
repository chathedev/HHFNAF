"use client"

import dynamic from "next/dynamic"

// Loaded after hydration so the assistant never weighs on the first paint.
const ClubAssistant = dynamic(() => import("./club-assistant").then((m) => m.ClubAssistant), { ssr: false })

export function ClubAssistantMount() {
  return <ClubAssistant />
}
