// Chart colours for HHF Scout. Validated with the dataviz palette checker (light surface):
// HHF #059669 vs opponent #0369a1 -> CVD dE 17.8, normal-vision dE 18.5, contrast >= 3:1.
// Greys are context only (conceded goals, draws, other teams) and never carry identity alone:
// every chart also has a legend and labels.
export const CHART = {
  hhf: "#059669", // emerald-600
  hhfSoft: "#a7f3d0", // emerald-200
  team: "#0369a1", // sky-700 (the other team / any non-HHF team)
  teamSoft: "#bae6fd", // sky-200
  against: "#94a3b8", // slate-400
  draw: "#cbd5e1", // slate-300
  muted: "#e2e8f0", // slate-200 (grid)
  axis: "#64748b", // slate-500 (axis text)
  ink: "#0f172a", // slate-900
  win: "#059669",
  loss: "#e11d48", // rose-600
  surface: "#ffffff",
}

export const AXIS_TICK = { fill: CHART.axis, fontSize: 11 }
