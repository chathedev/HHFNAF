// Which match analyses the public site may show. Staging (the HHFNAF-staging checkout)
// shows everything, test clips included; production shows only analyses released on
// purpose, and only as the 2D plan on their own match (no video, no review frames).
export const TRACKING_STAGING =
  process.cwd().endsWith("HHFNAF-staging") || process.env.HHF_TRACKING_ENABLED === "1"

// Released analyses (tracking ids). Test analyses are never listed here.
export const TRACKING_RELEASED = new Set(
  (process.env.HHF_TRACKING_RELEASED || "obacka-hhf-strands-2026-01-18")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
)
