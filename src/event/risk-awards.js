import { RISK_CHOICE_IDS } from "./risk-choices.js";
/** Effects requiring a target or an authored ruling stay visible until the GM records it. */
const AUTOMATIC = new Set([
  "aid-next-1", "dc-next-1", "dc-next-2", "dc-next-3", "crew-surge", "degree-lift",
  "arkengine-vent", "arkengine-overdrive", "lifeveil-steady", "momentum-1", "momentum-2", "momentum-3",
  "pressure-drop-1", "pressure-drop-2", "pressure-guard-1", "pressure-guard-2", "pressure-guard-3",
  "mixed-softener", "disaster-buffer"
]);
const MIXED = new Set(["order-followup", "arkengine-master", "hazard-remove-1",
  "information-next-round", "narrative-breakthrough", "failure-softener"]);
export function riskResolutionLabel(id) {
  if (RISK_CHOICE_IDS.has(id)) return "Choose reward target";
  return AUTOMATIC.has(id) ? "Automatic" : MIXED.has(id) ? "Automatic + GM resolution" : "GM resolution required";
}
export function queueRiskAward(state, chosen, degreeKey, { remaining = null } = {}) {
  const benefit = chosen.riskBenefit;
  const encounter = state.encounter;
  const id = `${state.createdAt ?? 0}:${state.roundIndex ?? 0}:${chosen.stationId}:${benefit.id}:${(encounter.riskAwardHistory?.length ?? 0) + (encounter.pendingRiskAwards?.length ?? 0)}`;
  const award = { id, benefitId: benefit.id, name: benefit.name, stationId: chosen.stationId,
    roundIndex: state.roundIndex ?? 0, degreeKey,
    effect: remaining ?? (degreeKey === "criticalSuccess" ? benefit.criticalSuccess : benefit.success) };
  return { ...state, encounter: { ...encounter, pendingRiskAwards: [...(encounter.pendingRiskAwards ?? []), award] } };
}
export function recordRiskAwardResolution(state, id, note, { userId, now = Date.now() } = {}) {
  const award = state.encounter?.pendingRiskAwards?.find(row => row.id === id);
  if (!award) throw new Error("That Risk reward is no longer waiting for resolution.");
  if (!String(note ?? "").trim()) throw new Error("Record the chosen target and how the reward was applied (or why it was ineligible).");
  return { ...state, encounter: { ...state.encounter,
    pendingRiskAwards: state.encounter.pendingRiskAwards.filter(row => row.id !== id),
    riskAwardHistory: [...(state.encounter.riskAwardHistory ?? []), { ...award, resolution: String(note).trim(), userId, resolvedAt: now }]
  } };
}
export function assertRiskAwardsResolved(state) {
  if (state?.encounter?.pendingRiskAwards?.length) throw new Error("Resolve the pending Risk rewards before the next roll or round consequence.");
}
