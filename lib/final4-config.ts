export const FINAL4_TOURNAMENT_NAME = "Final4 Norr"
export const FINAL4_START = new Date("2026-04-06T00:00:00+02:00")
export const FINAL4_END = new Date("2026-04-12T22:00:00+02:00")
export const FINAL4_URL = "https://final4.harnosandshf.se"

export const isFinal4Active = () => {
  const now = new Date()
  return now >= FINAL4_START && now <= FINAL4_END
}

export const isFinal4Upcoming = () => new Date() < FINAL4_START

export const isFinal4Over = () => new Date() > FINAL4_END

export const isFinal4Relevant = () => isFinal4Upcoming() || isFinal4Active()
