import { Final4PageClient } from "./page-client"
import { fetchFinal4Data } from "@/lib/use-final4-data"

export const revalidate = 60

export default async function Final4Page() {
  const initialData = await fetchFinal4Data()
  return <Final4PageClient initialData={initialData ?? undefined} />
}
