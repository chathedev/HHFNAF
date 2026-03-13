import { getMatchData, type EnhancedMatchData } from "@/lib/use-match-data"

const STOCKHOLM_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const getStockholmToday = () => STOCKHOLM_DATE_FORMATTER.format(new Date())

export async function getInitialMatchWindow(): Promise<EnhancedMatchData | undefined> {
  try {
    return await getMatchData("liveUpcoming", true, {
      cursorDate: getStockholmToday(),
      chunkDays: 1,
    })
  } catch (error) {
    console.warn("Failed to load initial matcher window", error)
    return undefined
  }
}
