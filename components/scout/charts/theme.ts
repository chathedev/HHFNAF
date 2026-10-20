// Chart colours for HHF Scout. Validated with the dataviz palette checker (light surface):
// HHF emerald-700 is the only hue; other teams are slate (emphasis form), always labelled.
// Greys are context only (conceded goals, draws, other teams) and never carry identity alone:
// every chart also has a legend and labels.
export const CHART = {
  hhf: "#047857", // emerald-700
  hhfSoft: "#a7f3d0", // emerald-200
  team: "#334155", // slate-700 (the other team / any non-HHF team)
  teamSoft: "#cbd5e1", // slate-300
  against: "#94a3b8", // slate-400
  draw: "#cbd5e1", // slate-300
  muted: "#e2e8f0", // slate-200 (grid)
  axis: "#64748b", // slate-500 (axis text)
  ink: "#0f172a", // slate-900
  win: "#047857",
  loss: "#94a3b8", // slate-400 (losses grey, not alarm red)
  surface: "#ffffff",
}

export const AXIS_TICK = { fill: CHART.axis, fontSize: 11 }
