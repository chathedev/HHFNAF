import { apiFetch } from "@/lib/api-client"
// HHF Scout: types, data fetching and formatting shared by the /scout pages.
// Data comes from the API's /scout endpoints (SERVERF routes/scout.js), which serve the
// snapshot built by the scout worker from every Profixio match in HHF's series.


export type Outcome = "W" | "D" | "L"

export type Prediction = {
  pHome: number
  pDraw: number
  pAway: number
  expHome: number
  expAway: number
  margin: number
  sigma: number
  homeGames: number
  awayGames: number
  hv?: number
  homePrior?: "cohort" | "club" | "club-form" | null
  awayPrior?: "cohort" | "club" | "club-form" | null
}

export type Rating = {
  r: number
  o: number
  d: number
  attack: number | null
  defence: number | null
  games: number
  confidence: "låg" | "medel" | "hög"
  rank?: number
  rankOf?: number
}

export type CategoryBrief = {
  id: number
  name: string
  leagueName: string | null
  classKey: string
  season: string
  group: boolean
  url: string
}

export type MatchSide = {
  key: string | null
  name: string
  listedAs: string
  isHhf: boolean
  slug: string | null
}

export type ScoutMatch = {
  id: number
  season: string
  classKey: string
  category: CategoryBrief | null
  day: string | null
  time: string | null
  ts: number | null
  home: MatchSide
  away: MatchSide
  played: boolean
  hs: number | null
  as: number | null
  ht: [number, number] | null
  hasLog: boolean
  resultHidden?: boolean
  venue: string | null
  /** Real home side: 1 listed home team plays in its own hall, 0 neutral court, -1 reversed. */
  hv?: number
  /** Where hv comes from: hall | arranger | same-club | fixture (no data, listed side assumed). */
  hvSource?: string
  matchNo: string | null
  playUrl: string | null
  hhfSide: "home" | "away" | null
  teamType: string | null
  profixioUrl: string
  prediction?: Prediction | null
  preMatch?: Prediction | null
  /** saved = the guess the site showed before kick-off, backtest = computed afterwards from earlier matches only */
  preMatchSource?: "saved" | "backtest" | null
  opponent?: EntityBrief | null
}

export type RegisterEntry = {
  us: number
  them: number
  expUs: number
  expThem: number
  pWin: number
  pDraw: number
  pLoss: number
  guessed: Outcome
  actual: Outcome
  hit: boolean
  marginError: number | null
  source: "saved" | "backtest"
  savedAt: string | null
}

export type RegisterSummary = { n: number; hits: number; accuracy: number | null; meanMarginError: number | null; saved: number }

export type RegisterPayload = {
  generatedAt: string
  season: string
  currentSeason: string
  previousSeason: string | null
  summary: RegisterSummary
  byTeam: (RegisterSummary & { label: string })[]
  matches: (ScoutMatch & { register: RegisterEntry })[]
}

export type RecordSplit = { played: number; won: number; drawn: number; lost: number; gf: number; ga: number }

export type FormEntry = { id: number; gf: number; ga: number; outcome: Outcome; home: boolean }

export type TeamRecord = RecordSplit & {
  points: number
  home: RecordSplit
  away: RecordSplit
  close: { played: number; won: number; drawn: number; lost: number }
  form: FormEntry[]
  streak: { type: Outcome; count: number } | null
  biggestWin: { id: number; margin: number; score: string } | null
  biggestLoss: { id: number; margin: number; score: string } | null
  gfPerGame: number | null
  gaPerGame: number | null
  gdPerGame: number | null
}

export type EntityBrief = {
  key: string
  name: string
  season: string
  classKey: string
  isHhf: boolean
  slug: string | null
  rating: Rating | null
  position: number | null
  positionOf: number | null
  positionGroup?: string | null
  record: {
    played: number
    won: number
    drawn: number
    lost: number
    gf: number
    ga: number
    points: number
    gfPerGame: number | null
    gaPerGame: number | null
    gdPerGame: number | null
    form: Outcome[]
  } | null
}

export type TeamProfile = {
  matches: number
  periodMinutes: number | null
  halves: {
    n: number
    firstFor: number
    firstAgainst: number
    secondFor: number
    secondAgainst: number
    leadAtHalf: number
    trailAtHalf: number
    winsAfterTrailingAtHalf: number
    lossesAfterLeadingAtHalf: number
  } | null
  timing: { buckets: number[]; against: number[] }
  first10: { for: number; against: number } | null
  last10: { for: number; against: number } | null
  sevenMeters: {
    attempts: number
    goals: number
    pct: number | null
    perGame: number | null
    against: { attempts: number; goals: number; pct: number | null; perGame: number | null }
  }
  suspensions: { perGame: number | null; total: number; staff: number; againstPerGame: number | null; reds: number }
  timeouts: { perGame: number | null }
  powerPlay: {
    gfUp: number
    gaUp: number
    gfDown: number
    gaDown: number
    gfEven: number
    gaEven: number
    minutesUp: number | null
    minutesDown: number | null
    diffPer10Up: number | null
    diffPer10Down: number | null
  }
  leadShare: { lead: number; trail: number; tied: number } | null
  comebacks: number
  blownLeads: number
  biggestComeback: number
  runs: { avgLongestFor: number | null; avgLongestAgainst: number | null; best: number }
  scorersPerGame: number | null
}

export type Player = {
  name: string
  no: string | null
  games: number
  goals: number
  gpg: number
  share: number
  pen: number
  penAtt: number
  susp: number
  reds: number
  h1: number
  h2: number
  scoredIn: number
  best: number
  recent: number[]
  keeper: boolean
  captain: boolean
  prev?: { goals: number; games: number; gpg: number; teams: { key: string; team: string; classKey: string; goals: number; games: number }[] }
}

export type Insight = { kind: string; tone: "strength" | "weakness" | "neutral"; text: string; n: number; weight: number }

export type ModelHistoryPoint = {
  id: number
  day: string
  ts: number | null
  opponent: string
  r: number
  games: number
  band: number
  pWin: number | null
  pDraw: number | null
  pLoss: number | null
  expUs: number
  expThem: number
  us: number
  them: number
}

export type ModelHistory = {
  points: ModelHistoryPoint[]
  now: { r: number; games: number; band: number; at: string } | null
}

export type Entity = {
  key: string
  name: string
  names: string[]
  season: string
  classKey: string
  classLabel: string
  isHhf: boolean
  slug: string | null
  teamType: string | null
  rating: Rating | null
  position: number | null
  positionOf: number | null
  positionGroup?: string | null
  record: TeamRecord
  logged: number
  profile: TeamProfile | null
  players: Player[]
  insights: Insight[]
  categories: CategoryBrief[]
  mainCategory: number | null
  previousSameName: EntityBrief | null
  nextSameName: EntityBrief | null
  squadHistory: { key: string; name: string; classKey: string; shared: number; brief: EntityBrief | null }[]
  /** HHF teams this season: strength and uncertainty before each match, and now */
  modelHistory?: ModelHistory | null
}

export type StandingRow = {
  key: string
  name: string
  isHhf: boolean
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
}

export type SimulationRow = {
  key: string
  name: string
  isHhf: boolean
  positions: number[]
  pFirst: number
  pTop3: number
  expectedPoints: number
  expectedPosition: number
}

export type ScoutCategory = CategoryBrief & {
  totalMatches: number | null
  matchCount: number
  playedCount: number
  loggedCount: number
  goalsPerMatch: number | null
  homeWinShare: number | null
  drawShare: number | null
  upcomingCount: number
  standings: StandingRow[]
  official: unknown[]
  resultsHidden?: boolean
  power: { key: string; name: string; isHhf: boolean; rank: number; rating: Rating }[]
  simulation: SimulationRow[] | null
  baseline: { teams: number; scorersPerGame: number | null; suspPerGame: number | null; penPerGame: number | null; penPct: number | null; gfPerGame: number | null }
  results?: ScoutMatch[]
  fixtures?: ScoutMatch[]
  scorers?: (Player & { team: string; teamKey: string; isHhf: boolean })[]
  withdrawn?: { key: string; name: string }[]
  groups?: { label: string; upcomingCount: number; standings: StandingRow[]; simulation: SimulationRow[] | null }[] | null
}

export type EvalSummary = {
  n: number
  accuracy?: number
  logLoss?: number
  brier?: number
  marginMae?: number
  baselineAccuracy?: number
  baselineLogLoss?: number
  baselineBrier?: number
  gdBaselineAccuracy?: number
  calibration?: { from: number; to: number; n: number; predicted: number; actual: number }[]
}

export type ModelSummary = {
  params: Record<string, number>
  current: EvalSummary
  previous: EvalSummary
  byClass: Record<string, { previous: EvalSummary; current: EvalSummary }>
  sigma: { s2: number; c: number; n: number; fallback: boolean }
}

export type HhfTeam = {
  slug: string
  key: string
  name: string
  classKey: string
  teamType: string
  label: string
  categories: number[]
  nextMatch: number | null
  lastMatch: number | null
}

export type Coverage = {
  matches: number
  played: number
  withLogs: number
  teams: number
  categories: number
  players: number
  bySeason: Record<string, { matches: number; played: number; withLogs: number; teams: number }>
}

export type OverviewPayload = {
  generatedAt: string
  currentSeason: string
  previousSeason: string
  coverage: Coverage
  model: ModelSummary
  teams: (Omit<HhfTeam, "categories"> & {
    brief: EntityBrief
    categories: CategoryBrief[]
    next: ScoutMatch | null
    last: ScoutMatch | null
    topScorer: { name: string; no: string | null; goals: number; games: number } | null
    upcomingCount: number
  })[]
  week: ScoutMatch[]
  recent: ScoutMatch[]
  index: { key: string; name: string; classKey: string; season: string; isHhf: boolean; played: number }[]
}

export type TeamPayload = {
  generatedAt: string
  currentSeason: string
  team: HhfTeam
  entity: Entity
  categories: ScoutCategory[]
  upcoming: ScoutMatch[]
  results: ScoutMatch[]
  model: ModelSummary
  otherTeams: { slug: string; label: string; classKey: string }[]
}

export type MatchPayload = {
  generatedAt: string
  match: ScoutMatch
  hhf: Entity | null
  opponent: Entity | null
  hhfMatches: { results: ScoutMatch[]; upcoming: ScoutMatch[] }
  opponentMatches: { results: ScoutMatch[]; upcoming: ScoutMatch[] }
  h2h: ScoutMatch[]
  common: { key: string; name: string; hhf: ScoutMatch[]; opp: ScoutMatch[]; hhfAvg: number; oppAvg: number; diff: number }[]
  commonAvgDiff: number | null
  category: ScoutCategory | null
  model: ModelSummary
}

export type ProfilePayload = {
  generatedAt: string
  currentSeason: string
  entity: Entity
  results: ScoutMatch[]
  upcoming: ScoutMatch[]
  vsHhf: ScoutMatch[]
  categories: ScoutCategory[]
}

export type SeriesPayload = { generatedAt: string; category: ScoutCategory; model: ModelSummary }

export class ScoutUnavailable extends Error {}

export async function scoutFetch<T>(path: string): Promise<T | null> {
  let res: Response
  try {
    res = await apiFetch(`/scout${path}`, { next: { revalidate: 60 } })
  } catch {
    throw new ScoutUnavailable("network")
  }
  if (res.status === 404) return null
  if (!res.ok) throw new ScoutUnavailable(String(res.status))
  return (await res.json()) as T
}

// ---------- formatting ----------

const NBSP = " "

export function pct(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "–"
  return `${(value * 100).toFixed(digits).replace(".", ",")}${NBSP}%`
}

// Where the match is really played, seen from one side: "hemma", "borta" or "neutral plan".
// The fixture's home side is only trusted when Scout has no hall or arranger data.
export function realVenueLabel(m: Pick<ScoutMatch, "hv" | "hvSource">, side: "home" | "away"): string {
  if (m.hvSource && m.hvSource !== "fixture" && typeof m.hv === "number") {
    const own = side === "home" ? m.hv : -m.hv
    return own > 0 ? "hemma" : own < 0 ? "borta" : "neutral plan"
  }
  return side === "home" ? "hemma" : "borta"
}

// A model probability is never certain: show "<1 %" / ">99 %" at the ends.
export function prob(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "–"
  if (value < 0.005) return `<1${NBSP}%`
  if (value >= 0.995) return `>99${NBSP}%`
  return `${Math.round(value * 100)}${NBSP}%`
}

export function num(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "–"
  return value.toFixed(digits).replace(".", ",")
}

export function signed(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "–"
  const fixed = Math.abs(value).toFixed(digits).replace(".", ",")
  if (Number(value.toFixed(digits)) === 0) return `±${fixed}`
  return `${value > 0 ? "+" : "−"}${fixed}`
}

const DATE_FMT = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", weekday: "short", day: "numeric", month: "short" })
const DATE_FMT_YEAR = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", day: "numeric", month: "short", year: "numeric" })
const UPDATED_FMT = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export function matchDate(m: Pick<ScoutMatch, "ts" | "day">, withYear = false): string {
  if (m.ts) return (withYear ? DATE_FMT_YEAR : DATE_FMT).format(new Date(m.ts))
  return m.day ?? ""
}

export function updatedLabel(iso: string | null | undefined): string {
  if (!iso) return ""
  return UPDATED_FMT.format(new Date(iso))
}

export function seasonLabel(season: string): string {
  return season.replace("/", "–")
}

// Perspective helpers: which side is "us" in a match.
export function sideOf(m: ScoutMatch, key: string | null | undefined): "home" | "away" | null {
  if (!key) return null
  if (m.home.key === key) return "home"
  if (m.away.key === key) return "away"
  return null
}

export function outcomeFor(m: ScoutMatch, key: string): Outcome | null {
  if (m.hs == null || m.as == null) return null
  const side = sideOf(m, key)
  if (!side) return null
  const mine = side === "home" ? m.hs : m.as
  const theirs = side === "home" ? m.as : m.hs
  return mine > theirs ? "W" : mine < theirs ? "L" : "D"
}

export function scoreFor(m: ScoutMatch, key: string): string {
  if (m.hs == null || m.as == null) return "–"
  const side = sideOf(m, key)
  return side === "away" ? `${m.as}–${m.hs}` : `${m.hs}–${m.as}`
}

export function probsFor(pred: Prediction | null | undefined, side: "home" | "away" | null) {
  if (!pred) return null
  if (side === "away") return { win: pred.pAway, draw: pred.pDraw, loss: pred.pHome, us: pred.expAway, them: pred.expHome }
  return { win: pred.pHome, draw: pred.pDraw, loss: pred.pAway, us: pred.expHome, them: pred.expAway }
}

/** Rounded guessed score that never contradicts the guessed outcome: when the expected goals
 *  round to a tie but we tipped a win or a loss, the favourite gets one goal more. */
export function guessPair(us: number, them: number, guessed: Outcome): [number, number] {
  let a = Math.round(us)
  let b = Math.round(them)
  if (a === b && guessed === "W") a += 1
  else if (a === b && guessed === "L") b += 1
  else if (guessed === "D") b = a
  return [a, b]
}

/** Our guess as a score from one side, e.g. "18–31". */
export function guessScore(pred: Prediction | null | undefined, side: "home" | "away" | null): string | null {
  const p = probsFor(pred, side)
  if (!p || !Number.isFinite(p.us) || !Number.isFinite(p.them)) return null
  const guessed: Outcome = p.win >= p.loss && p.win >= p.draw ? "W" : p.loss >= p.draw ? "L" : "D"
  const [a, b] = guessPair(p.us, p.them, guessed)
  return `${a}–${b}`
}

/** Did our pre-match favourite (win, draw or loss, from one side) match the result? */
export function guessHit(pred: Prediction | null | undefined, side: "home" | "away" | null, us: number, them: number): boolean | null {
  const p = probsFor(pred, side)
  if (!p) return null
  const guessed: Outcome = p.win >= p.loss && p.win >= p.draw ? "W" : p.loss >= p.draw ? "L" : "D"
  const actual: Outcome = us > them ? "W" : us < them ? "L" : "D"
  return guessed === actual
}

/** How good a guess was: the outcome AND how far the guessed goal difference was from the real one.
 *  "Rätt" alone is only used when the margin was within 3 goals, so 20–30 against 27–28 is never
 *  shown as a plain hit. tone: good (rätt, nära) | ok (rätt vinnare, 4–6 mål) | poor (rätt vinnare,
 *  7+ mål) | wrong (fel utgång). */
export type GuessVerdict = { tone: "good" | "ok" | "poor" | "wrong"; label: string; goals: number; detail: string }

export function guessVerdict(guess: [number, number], guessed: Outcome, us: number, them: number): GuessVerdict {
  const actual: Outcome = us > them ? "W" : us < them ? "L" : "D"
  const goals = Math.abs(us - them - (guess[0] - guess[1]))
  const detail = goals === 0 ? "exakt målskillnad" : `${goals} mål ifrån`
  if (guessed !== actual) return { tone: "wrong", label: "Fel", goals, detail }
  if (goals <= 3) return { tone: "good", label: "Rätt", goals, detail }
  return { tone: goals <= 6 ? "ok" : "poor", label: "Rätt vinnare", goals, detail }
}

export const VERDICT_CLASS: Record<GuessVerdict["tone"], string> = {
  good: "font-semibold text-emerald-700",
  ok: "font-semibold text-emerald-700/80",
  poor: "font-semibold text-amber-700",
  wrong: "font-semibold text-rose-700",
}

/** The verdict for a pre-match prediction seen from one side, using the same rounded guess the
 *  page shows. */
export function guessVerdictFor(pred: Prediction | null | undefined, side: "home" | "away" | null, us: number, them: number): GuessVerdict | null {
  const p = probsFor(pred, side)
  if (!p || !Number.isFinite(p.us) || !Number.isFinite(p.them)) return null
  const guessed: Outcome = p.win >= p.loss && p.win >= p.draw ? "W" : p.loss >= p.draw ? "L" : "D"
  return guessVerdict(guessPair(p.us, p.them, guessed), guessed, us, them)
}

export const OUTCOME_LABEL: Record<Outcome, string> = { W: "V", D: "O", L: "F" }
export const OUTCOME_TEXT: Record<Outcome, string> = { W: "Vinst", D: "Oavgjort", L: "Förlust" }

export function classLabel(classKey: string): string {
  if (classKey === "HERR") return "Herrar"
  if (classKey === "DAM") return "Damer"
  return classKey
}

export function confidenceText(rating: Rating | null | undefined): string {
  if (!rating) return "inga matcher"
  return `${rating.games} ${rating.games === 1 ? "match" : "matcher"}, säkerhet ${rating.confidence}`
}
