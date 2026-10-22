// Server pages: <Seal as={ChartSealed} {...props} /> instead of <Chart {...props} />. The props
// are sealed (lib/page-seal.ts) so the page payload carries ciphertext, not JSON.
import type { ComponentType } from "react"
import { sealProps } from "@/lib/page-seal"

type SealProps = { as: ComponentType<{ sealed: string }> } & Record<string, unknown>

export async function Seal({ as: Island, ...props }: SealProps) {
  return <Island sealed={await sealProps(props)} />
}
