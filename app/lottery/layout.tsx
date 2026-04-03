import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Lottning – Final4 Norr",
  description: "Matchlottning för Final4 Norr 2026 – Härnösands HF",
}

export default function LotteryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
