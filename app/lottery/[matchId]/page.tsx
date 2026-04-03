import { LotteryMatchClient } from "./page-client"

export const dynamic = "force-dynamic"

export default async function LotteryMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  return <LotteryMatchClient matchId={Number(matchId)} />
}
