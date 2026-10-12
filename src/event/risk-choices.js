import { cloneEncounter } from "./encounter-state.js";

export const RISK_CHOICE_IDS = new Set([
  "order-followup", "order-swap", "order-shift-self", "arkengine-master", "hazard-remove-1",
  "hazard-suppress-1", "hazard-suppress-2", "hazard-delay", "hazard-turn-1", "hazard-opportunity",
  "lifeveil-ward", "rigging-clear", "helm-line", "weapons-opening", "crew-shield",
  "station-link-strong", "station-link-legend"
]);

/**
 * Resolve choice-shaped rewards using authored targets first and encounter
 * order as the stable fallback. Earned rewards never wait for a GM prompt.
 */
function hazardThreatScore(event, hazardId, stationId) {
  const hazard = event?.hazardDefinitions?.[hazardId];
  return (hazard?.effects ?? []).reduce((score, effect) => {
    if (effect.station && stationId && effect.station !== stationId) return score;
    if (effect.kind === "dc-modifier") return score + Math.max(0, Number(effect.value ?? 0)) * 4;
    if (effect.kind === "strain-if-ignored") return score + Math.max(0, Number(effect.value ?? 0)) * 3;
    if (effect.kind === "block-risk-tier") return score + Math.max(0, Number(effect.tier ?? 0));
    if (effect.kind === "order-restriction") return score + 2;
    return score;
  }, 0);
}

function hazardEligibleForReward(event, hazardId, benefitId) {
  if (!["lifeveil-ward", "lifeveil-miracle", "weapons-opening"].includes(benefitId)) return true;
  const hazard = event?.hazardDefinitions?.[hazardId];
  const text = `${hazardId} ${hazard?.name ?? ""} ${hazard?.description ?? ""}`.toLowerCase();
  if (["lifeveil-ward", "lifeveil-miracle"].includes(benefitId)) return /void|aether|gravity|veil|dark star|psychic/.test(text);
  return /cover|debris|obstruction|barrier/.test(text);
}

export function automaticRiskChoiceOptions(state, award, event = null) {
  const encounter = state?.encounter ?? {};
  const remaining = (state?.order ?? []).filter(id => !state?.results?.[id]);
  const parameters = award?.parameters ?? {};
  const targetStationId = remaining.includes(parameters.targetStationId)
    ? parameters.targetStationId
    : remaining.find(id => id !== award?.stationId) ?? remaining[0] ?? null;
  const eligibleHazards = (encounter.hazards ?? []).filter(id => hazardEligibleForReward(event, id, award?.benefitId));
  const hazardId = eligibleHazards.includes(parameters.hazardId)
    ? parameters.hazardId
    : eligibleHazards.sort((a, b) => hazardThreatScore(event, b, targetStationId) - hazardThreatScore(event, a, targetStationId))[0] ?? null;
  const order = [...remaining];

  switch (award?.benefitId) {
    case "order-shift-self":
      if (order.length > 1) [order[0], order[1]] = [order[1], order[0]];
      break;
    case "order-swap":
      if (award.degreeKey === "criticalSuccess") order.reverse();
      else if (order.length > 1) [order[0], order[1]] = [order[1], order[0]];
      break;
  }

  return {
    targetStationId,
    targetStationIds: remaining.slice(0, 2),
    hazardId,
    order,
    // A one point DC reduction is a fixed, reproducible resolution of the
    // equivalent +1 check bonus / -1 DC choice.
    helmChoice: "dc",
    // Prefer reducing shared Strain when the reward offers two alternatives.
    engineChoice: "strain"
  };
}

export function applyAutomaticRiskChoice(state, award, event = null) {
  const options = automaticRiskChoiceOptions(state, award, event);
  const needsHazard = ["hazard-remove-1", "hazard-suppress-1", "hazard-suppress-2", "hazard-delay", "hazard-turn-1", "hazard-opportunity", "lifeveil-ward", "rigging-clear"].includes(award?.benefitId);
  const needsStation = ["order-followup", "hazard-turn-1", "hazard-opportunity", "lifeveil-ward", "weapons-opening", "station-link-strong", "station-link-legend"].includes(award?.benefitId);
  if ((needsHazard && !options.hazardId) || (needsStation && !options.targetStationId)) {
    const encounter = cloneEncounter(state?.encounter);
    encounter.notes.push(`${award?.name ?? "Risk reward"}: no eligible target remained; resolved automatically with no additional effect.`);
    return { ...state, encounter };
  }
  return applyRiskChoice(state, award, options);
}

/** Player/GM selected targets; never silently redirect an authored choice. */
export function applyRiskChoice(state, award, options = {}) {
  if (!RISK_CHOICE_IDS.has(award.benefitId)) return state;
  const encounter = cloneEncounter(state.encounter);
  let next = { ...state, encounter };
  const critical = award.degreeKey === "criticalSuccess";
  const remaining = state.order.filter(id => !state.results?.[id]);
  const target = options.targetStationId;
  const hazardId = options.hazardId;
  const requireTarget = () => { if (!remaining.includes(target)) throw new Error("Choose an unresolved target station."); };
  const requireHazard = () => { if (!encounter.hazards.includes(hazardId)) throw new Error("Choose an active eligible Hazard."); };
  const addBonus = (station, value) => {
    encounter.checkBonuses[station] = Number(encounter.checkBonuses[station] ?? 0) + value;
    encounter.checkBonusSources[station] ??= []; encounter.checkBonusSources[station].push(`${award.name}: +${value}`);
  };
  const addDc = (station, value) => {
    encounter.dcAdjustments[station] = Number(encounter.dcAdjustments[station] ?? 0) + value;
    encounter.dcAdjustmentSources[station] ??= []; encounter.dcAdjustmentSources[station].push(`${award.name}: ${value} DC`);
  };
  const suppress = () => {
    encounter.hazards = encounter.hazards.filter(id => id !== hazardId);
    if (!encounter.suppressedHazards.includes(hazardId)) encounter.suppressedHazards.push(hazardId);
  };
  switch (award.benefitId) {
    case "arkengine-master": {
      if (options.engineChoice === "refresh") { const masteryUses = { ...(next.masteryUses ?? {}) }; delete masteryUses.engineer; next.masteryUses = masteryUses; }
      else if (options.engineChoice === "strain") next.pendingShipEffects = [...(next.pendingShipEffects ?? []), { kind: "gain-strain", value: -2, source: award.name }];
      else throw new Error("Choose refresh or Strain reduction.");
      break;
    }
    case "order-followup": {
      requireTarget(); const order = state.order.filter(id => id !== target); order.splice(state.activeOrderIndex, 0, target); next.order = order;
      addBonus(target, critical ? 3 : 2); if (critical) addDc(target, -1); break;
    }
    case "order-shift-self": case "order-swap": {
      const order = options.order;
      if (!Array.isArray(order) || order.length !== remaining.length || new Set(order).size !== remaining.length || order.some(id => !remaining.includes(id))) throw new Error("Supply each unresolved station exactly once.");
      if (!critical) {
        const changed = remaining.map((id, index) => id === order[index] ? -1 : index).filter(index => index >= 0);
        if (changed.length !== 2 || (award.benefitId === "order-shift-self" && Math.abs(changed[0] - changed[1]) !== 1)) throw new Error("Success allows one swap (adjacent positions for Slip the Order).");
      }
      const pending = new Set(remaining); let index = 0; next.order = state.order.map(id => pending.has(id) ? order[index++] : id); break;
    }
    case "hazard-remove-1": requireHazard(); encounter.hazards = encounter.hazards.filter(id => id !== hazardId); break;
    case "hazard-suppress-1": case "hazard-delay": case "rigging-clear": {
      requireHazard();
      if (critical && award.benefitId === "hazard-delay") {
        encounter.ignoredHazards ??= {};
        for (const station of remaining) { encounter.ignoredHazards[station] ??= []; encounter.ignoredHazards[station].push(hazardId); }
      } else if (critical) suppress();
      else {
        const nextStation = remaining[0]; if (!nextStation) throw new Error("No station remains to receive this benefit.");
        encounter.ignoredHazards ??= {}; encounter.ignoredHazards[nextStation] ??= []; encounter.ignoredHazards[nextStation].push(hazardId);
      }
      break;
    }
    case "hazard-suppress-2": requireHazard(); suppress(); if (critical) next.pendingShipEffects = [...(next.pendingShipEffects ?? []), { kind: "gain-strain", value: -1, source: award.name }]; break;
    case "lifeveil-ward": {
      requireHazard(); if (!critical) requireTarget();
      encounter.ignoredHazards ??= {};
      for (const station of critical ? remaining : [target]) { encounter.ignoredHazards[station] ??= []; encounter.ignoredHazards[station].push(hazardId); }
      break;
    }
    case "hazard-turn-1": case "hazard-opportunity": {
      requireHazard(); requireTarget();
      encounter.hazardOpportunities ??= {};
      encounter.hazardOpportunities[target] = { hazardId, bonus: critical ? 3 : 2, onSuccess: critical ? (award.benefitId === "hazard-turn-1" ? "remove" : "suppress") : null, source: award.name };
      break;
    }
    case "helm-line": {
      if (!remaining.includes("navigator")) throw new Error("The Navigator has already resolved; this benefit has no eligible check this round.");
      if (critical) { addBonus("navigator", 2); addDc("navigator", -1); }
      else if (options.helmChoice === "dc") addDc("navigator", -1);
      else addBonus("navigator", 1);
      break;
    }
    case "weapons-opening": requireTarget(); addBonus(target, critical ? 2 : 1); if (critical && hazardId) { requireHazard(); encounter.ignoredHazards ??= {}; encounter.ignoredHazards[target] = [...(encounter.ignoredHazards[target] ?? []), hazardId]; } break;
    case "crew-shield": {
      const targets = critical ? remaining : options.targetStationIds;
      if (!Array.isArray(targets) || !targets.length || (!critical && targets.length !== Math.min(2, remaining.length)) || new Set(targets).size !== targets.length || targets.some(id => !remaining.includes(id))) throw new Error("Choose two different unresolved stations, or the only remaining station.");
      encounter.penaltyShields ??= {}; for (const station of targets) encounter.penaltyShields[station] = true; break;
    }
    case "station-link-strong": case "station-link-legend": {
      requireTarget(); addBonus(target, award.benefitId === "station-link-strong" ? (critical ? 3 : 2) : (critical ? 5 : 3));
      if (critical) { encounter.links ??= []; encounter.links.push({ source: award.stationId, target, kind: award.benefitId }); }
      break;
    }
  }
  encounter.notes.push(`${award.name}: ${options.note || "chosen targets applied"}`);
  return next;
}
