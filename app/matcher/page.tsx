import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { MatcherPageClientSealed } from "./page-client"
import { sealProps } from "@/lib/page-seal"
import { getInitialMatchWindow } from "@/lib/get-initial-match-window"

// Revalidate data every 60 seconds
export const revalidate = 60

export default async function MatcherPage() {
  const initialData = await getInitialMatchWindow({
    minMatches: 16,
    maxDays: 21,
  })

  const sealed = await sealProps({ initialData })
  return (
    <>
      <Header />
      <MatcherPageClientSealed sealed={sealed} />
      <Footer />
    </>
  )
}
