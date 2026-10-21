// Live win probability for a handball match, from HHF Scout's pre-match prediction plus the
// current score and match time. Fitted 2026-10-21 on 19 600 snapshots from 1 033 logged
// matches (walk-forward, 2025/26 train, 2026/27 test: log loss 0.41 vs 0.46 without the
// pre-match strength; calibrated within a few percent at every level).
//
//   final margin = current margin + remaining
//   remaining ~ Normal(A * preMargin * (1 - f), (K * preSigma * (1 - f)^B)^2)
//   f = share of playing time gone; a draw is a final margin within +-DELTA.

export const LIVE_MODEL = { A: 0.5, K: 0.55, B: 0.4, DELTA: 0.4 }

export type PreMatch = { pHome: number; pDraw: number; pAway: number; margin: number; sigma: number }
export type Odds = { pHome: number; pDraw: number; pAway: number }

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax)
  return sign * y
}
const normCdf = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2))

export function liveOdds(pre: PreMatch, homeGoals: number, awayGoals: number, elapsedShare: number): Odds {
  const f = Math.min(1, Math.max(0, elapsedShare))
  if (f < 0.03 && homeGoals === 0 && awayGoals === 0) return { pHome: pre.pHome, pDraw: pre.pDraw, pAway: pre.pAway }
  const diff = homeGoals - awayGoals
  if (f >= 1) return diff > 0 ? { pHome: 1, pDraw: 0, pAway: 0 } : diff < 0 ? { pHome: 0, pDraw: 0, pAway: 1 } : { pHome: 0, pDraw: 1, pAway: 0 }
  const rem = 1 - f
  const mu = diff + LIVE_MODEL.A * pre.margin * rem
  const sd = Math.max(0.3, LIVE_MODEL.K * pre.sigma * Math.pow(rem, LIVE_MODEL.B))
  const pAway = normCdf((-LIVE_MODEL.DELTA - mu) / sd)
  const pHomeOrDraw = normCdf((LIVE_MODEL.DELTA - mu) / sd)
  return { pHome: 1 - pHomeOrDraw, pDraw: Math.max(0, pHomeOrDraw - pAway), pAway }
}
