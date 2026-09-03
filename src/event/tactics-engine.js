import { getCrewEdgeCard } from "../content/crew-edge-cards.js";
import { clampMomentum } from "./event-schema.js";
import { shiftEventResult } from "./event-outcome.js";

function cloneSources(source) { return Object.fromEntries(Object.entries(source ?? {}).map(([key, rows]) => [key, [...(rows ?? [])]])); }
function cloneEncounter(encounter = {}) {
  return {
    momentum: Number(encounter.momentum ?? 0), hazards: [...(encounter.hazards ?? [])],
    checkBonuses: { ...(encounter.checkBonuses ?? {}) }, dcAdjustments: { ...(encounter.dcAdjustments ?? {}) }, degreeLifts: { ...(encounter.degreeLifts ?? {}) },
    checkBonusSources: cloneSources(encounter.checkBonusSources), dcAdjustmentSources: cloneSources(encounter.dcAdjustmentSources), degreeLiftSources: cloneSources(encounter.degreeLiftSources),
    notes: [...(encounter.notes ?? [])], strainGuards: { ...(encounter.strainGuards ?? {}) }, generalStrainGuard: Number(encounter.generalStrainGuard ?? 0), hazardGuard: Number(encounter.hazardGuard ?? 0), suppressedHazards: [...(encounter.suppressedHazards ?? [])],
    rollTwiceBest: { ...(encounter.rollTwiceBest ?? {}) }, riskTierOverrides: { ...(encounter.riskTierOverrides ?? {}) }
  };
}
function unresolved(state) { return (state.order ?? []).filter((stationId) => !state.results?.[stationId]); }
function assertTarget(state, stationId) { if (!stationId || !unresolved(state).includes(stationId)) throw new Error("Choose an unresolved station."); }
function addCheckBonus(encounter, stationId, value, source) { encounter.checkBonuses[stationId] = Number(encounter.checkBonuses[stationId] ?? 0) + Number(value ?? 0); encounter.checkBonusSources[stationId] ??= []; encounter.checkBonusSources[stationId].push(source); }
function addDc(encounter, stationId, value, source) { encounter.dcAdjustments[stationId] = Number(encounter.dcAdjustments[stationId] ?? 0) + Number(value ?? 0); encounter.dcAdjustmentSources[stationId] ??= []; encounter.dcAdjustmentSources[stationId].push(source); }
function suppressHazard(encounter, hazardId) { if (!hazardId || !encounter.hazards.includes(hazardId)) throw new Error("Choose an active Hazard."); encounter.hazards = encounter.hazards.filter((id) => id !== hazardId); if (!encounter.suppressedHazards.includes(hazardId)) encounter.suppressedHazards.push(hazardId); }
function spend(state, tacticId) { const hand = [...(state.crewEdgeHand ?? [])]; const index = hand.indexOf(tacticId); if (index < 0) throw new Error("That Crew Tactic is not in the shared crew pool."); hand.splice(index, 1); return { ...state, crewEdgeHand: hand }; }
function reducedRiskTier(tier) { const value = Number(tier ?? 0); if (value === 8) return 5; if (value === 5) return 2; if (value === 2) return 0; return value; }
function assertTheater(state, tactic) {
  if (tactic.theater === "planning") {
    if (!["round-opening", "planning"].includes(state.phase)) throw new Error(`${tactic.name} is a Planning Tactic.`);
    return;
  }
  if (tactic.theater === "resolution") {
    if (!["resolution", "round-result"].includes(state.phase)) throw new Error(`${tactic.name} is a Resolution Tactic.`);
    return;
  }
  if (tactic.theater === "event-result") {
    if (state.phase !== "round-result" || !state.eventResultPreview) throw new Error(`${tactic.name} may only be played after the final round is scored and before the Event Result is finalized.`);
  }
}

export function applyCrewTactic(state, tacticId, options = {}) {
  const tactic = getCrewEdgeCard(tacticId); if (!tactic) throw new Error(`Unknown Crew Tactic: ${tacticId}`); if (!(state?.crewEdgeHand ?? []).includes(tacticId)) throw new Error(`${tactic.name} is not currently Ready.`);
  assertTheater(state, tactic);
  let next = { ...state }; const encounter = cloneEncounter(state.encounter); const source = `Crew Tactic — ${tactic.name}`;
  switch (tacticId) {
    case "all-hands-together": for (const stationId of unresolved(state)) addCheckBonus(encounter, stationId, 1, `${source}: +1 for the round`); break;
    case "clear-the-way": for (const stationId of unresolved(state)) addDc(encounter, stationId, -1, `${source}: -1 DC for the round`); break;
    case "hold-together": encounter.generalStrainGuard = Number(encounter.generalStrainGuard ?? 0) + 1; break;
    case "clear-opening": assertTarget(state, options.targetStationId); addDc(encounter, options.targetStationId, -2, `${source}: -2 final DC`); break;
    case "ride-the-momentum": { const hasSuccess = Object.values(state.results ?? {}).some((result) => ["success", "criticalSuccess"].includes(result?.degreeKey)); if (!hasSuccess) throw new Error("Ride the Momentum requires a station success this round."); assertTarget(state, options.targetStationId); addCheckBonus(encounter, options.targetStationId, 2, `${source}: +2 to the PF2e check`); break; }
    case "second-chance": { const failed = Object.entries(state.results ?? {}).filter(([, result]) => ["failure", "criticalFailure"].includes(result?.degreeKey)); const target = options.targetStationId ?? failed.at(-1)?.[0]; if (!target || !failed.some(([stationId]) => stationId === target)) throw new Error("Second Chance requires a failed station result from this round."); const results = { ...(state.results ?? {}) }; delete results[target]; next = { ...next, phase: "resolution", results, activeOrderIndex: state.order.indexOf(target) }; break; }
    case "take-the-better-line": assertTarget(state, options.targetStationId); encounter.rollTwiceBest[options.targetStationId] = true; encounter.notes.push(`${source}: ${options.targetStationId} rolls twice and keeps the better result.`); break;
    case "measured-gamble": { assertTarget(state, options.targetStationId); const selectedTier = Number(state.selections?.[options.targetStationId]?.riskTier ?? 0); if (![2, 5, 8].includes(selectedTier)) throw new Error("Measured Gamble requires a Heroic / Risk Bid on the target station."); encounter.riskTierOverrides[options.targetStationId] = reducedRiskTier(selectedTier); encounter.notes.push(`${source}: ${options.targetStationId}'s +${selectedTier} Heroic Bid rolls at +${reducedRiskTier(selectedTier)} while keeping the +${selectedTier} reward.`); break; }
    case "change-of-course": { if (state.phase !== "planning") throw new Error("Change of Course may only be used during crew planning."); assertTarget(state, options.targetStationId); const order = [...state.order]; const from = order.indexOf(options.targetStationId); const to = Math.max(0, Math.min(order.length - 1, Number(options.targetIndex ?? from))); order.splice(from, 1); order.splice(to, 0, options.targetStationId); next = { ...next, order }; break; }
    case "crew-instinct": { const desired = Array.isArray(options.order) ? options.order : []; if (desired.length !== state.order.length || new Set(desired).size !== state.order.length || desired.some((id) => !state.order.includes(id))) throw new Error("Crew Instinct requires a complete valid station order."); next = { ...next, order: [...desired] }; break; }
    case "not-yet": suppressHazard(encounter, options.hazardId); break;
    case "brace-for-it": { const area = options.area ?? options.system; if (!area) throw new Error("Choose a ship Area to protect."); encounter.strainGuards[area] = Number(encounter.strainGuards[area] ?? 0) + 99; encounter.notes.push(`${source} protects ${area} from the next round Strain consequence.`); break; }
    case "one-more-push": if (encounter.momentum < 1) throw new Error("One More Push requires at least 1 Momentum."); assertTarget(state, options.targetStationId); encounter.momentum = clampMomentum(encounter.momentum - 1); addCheckBonus(encounter, options.targetStationId, 3, `${source}: +3 after spending 1 Momentum`); break;
    case "steady-hands": { assertTarget(state, options.targetStationId); const riskTier = Number(state.selections?.[options.targetStationId]?.riskTier ?? 0); if (!riskTier) throw new Error("Steady Hands requires a station with a Heroic / Risk Bid selected."); addDc(encounter, options.targetStationId, -Math.min(2, riskTier), `${source}: reduces only the Risk portion of the DC`); break; }
    case "seize-the-gap": { const hasCrit = Object.values(state.results ?? {}).some((result) => result?.degreeKey === "criticalSuccess"); if (!hasCrit) throw new Error("Seize the Gap requires a Critical Success this round."); encounter.momentum = clampMomentum(encounter.momentum + 1); break; }
    case "protect-the-system": { const area = options.area ?? options.system; if (!area) throw new Error("Choose a ship Area to protect."); encounter.strainGuards[area] = Number(encounter.strainGuards[area] ?? 0) + 2; break; }
    case "refuse-the-ending": next = { ...next, eventResultPreview: shiftEventResult(state.eventResultPreview, 1, { failuresOnly: true }), eventResultTacticUsed: tacticId }; break;
    default: throw new Error(`Unsupported Crew Tactic: ${tacticId}`);
  }
  next = { ...next, encounter }; return spend(next, tacticId);
}
