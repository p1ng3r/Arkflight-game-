import { FALLBACK_ACTIONS } from "../content/fallback-actions.js";

export function activeHazards(event, state) {
  const suppressed = new Set(state?.encounter?.suppressedHazards ?? []);
  return (state?.encounter?.hazards ?? []).filter(id => !suppressed.has(id))
    .map(id => event?.hazardDefinitions?.[id]).filter(Boolean);
}

export function hazardCheckAdjustment(event, state, stationId) {
  if (state?.encounter?.hazardShelters?.[stationId]) return { dc: 0, sources: [] };
  const sources = [];
  let dc = 0;
  for (const hazard of activeHazards(event, state)) {
    if (state?.encounter?.ignoredHazards?.[stationId]?.includes(hazard.id)) continue;
    for (const effect of hazard.effects ?? []) {
      if (effect.kind !== "dc-modifier" || (effect.station && effect.station !== stationId)) continue;
      dc += Number(effect.value ?? 0);
      sources.push(`${hazard.name}: ${Number(effect.value) >= 0 ? "+" : ""}${effect.value} DC`);
    }
  }
  return { dc, sources };
}

export function riskBlockReason(event, state, stationId, tier) {
  if (!tier || state?.encounter?.riskOverrides?.[stationId]) return null;
  for (const hazard of activeHazards(event, state)) {
    if (state?.encounter?.ignoredHazards?.[stationId]?.includes(hazard.id)) continue;
    if ((hazard.effects ?? []).some(effect => effect.kind === "block-risk-tier" && Number(effect.tier) === Number(tier) && (!effect.station || effect.station === stationId))) {
      return `${hazard.name} blocks +${tier} Risk for ${stationId}.`;
    }
  }
  return null;
}

export function hazardOrderErrors(event, state) {
  const errors = [];
  for (const hazard of activeHazards(event, state)) {
    for (const effect of hazard.effects ?? []) {
      if (effect.kind !== "order-restriction") continue;
      const [before, after] = String(effect.rule ?? "").split("-before-");
      if (!before || !after) { errors.push(`${hazard.name}: unsupported order restriction ${effect.rule}.`); continue; }
      if (state?.encounter?.riskOverrides?.[after]) continue;
      if (state.order.indexOf(before) > state.order.indexOf(after)) errors.push(`${hazard.name}: ${before} must act before ${after}.`);
    }
  }
  return errors;
}

export function availableStationActions(event, state, stationId) {
  const round = event?.rounds?.[state?.roundIndex ?? 0];
  const actions = [FALLBACK_ACTIONS[stationId], ...(round?.stationActions?.[stationId] ?? [])].filter(Boolean);
  for (const hazard of activeHazards(event, state)) {
    for (const effect of hazard.effects ?? []) {
      if (effect.kind !== "add-emergency-action" || effect.station !== stationId) continue;
      const action = hazard.actions?.[effect.actionId];
      if (action && !actions.some(row => row.id === action.id)) actions.push(action);
    }
  }
  return actions;
}

/** Existing hazards cause upkeep; newly-created round consequences start next round. */
export function ignoredHazardEffects(event, state) {
  return activeHazards(event, state).flatMap(hazard => (hazard.effects ?? [])
    .filter(effect => effect.kind === "strain-if-ignored")
    .map(effect => ({ kind: "gain-strain", value: Number(effect.value ?? 0), source: `${hazard.name}: left active at round end` })));
}

export function applyEmergencyActionResult(state, action, degreeKey) {
  if (!["success", "criticalSuccess"].includes(degreeKey)) return state;
  const ids = (action?.tags ?? []).filter(tag => tag.startsWith("clears-hazard:")).map(tag => tag.slice(14));
  if (!ids.length) return state;
  return { ...state, encounter: { ...state.encounter,
    hazards: (state.encounter?.hazards ?? []).filter(id => !ids.includes(id)),
    suppressedHazards: (state.encounter?.suppressedHazards ?? []).filter(id => !ids.includes(id)),
    notes: [...(state.encounter?.notes ?? []), `${action.name} cleared ${ids.join(", ")}.`]
  } };
}
