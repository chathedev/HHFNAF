import { canShowTicketForMatch } from "@/lib/matches"
import type { NormalizedMatch } from "@/lib/use-match-data"

export function shouldShowTicketButton(match: NormalizedMatch): boolean {
  if (match.matchStatus === "finished") {
    return false
  }
  return canShowTicketForMatch(match)
}
