import { getMasteryTechnique, canonicalMasteryId, canonicalMasteryStation } from "../content/base-mastery.js";
import { getRiskBenefit } from "../content/risk-benefits.js";
import { scoreRound } from "./event-schema.js";
import { applyEarnedRiskBenefit } from "./round-runtime.js";

function cloneSources(source) { return Object.fromEntries(Object.entries(source ?? {}).map(([key, rows]) => [key, [...(rows ?? [])]])); }
function cloneEncounter(encounter = {}) {
  return {
    momentum: Number(encounter.momentum ?? 0), hazards: [...(encounter.hazards ?? [])],
    checkBonuses: { ...(encounter.checkBonuses ?? {}) }, dcAdjustments: { ...(encounter.dcAdjustments ?? {}) }, degreeLifts: { ...(encounter.degreeLifts ?? {}) },
    checkBonusSources: cloneSources(encounter.checkBonusSources), dcAdjustmentSources: cloneSources(encounter.dcAdjustmentSources), degreeLiftSources: cloneSources(encounter.degreeLiftSources),
    notes: [...(encounter.notes ?? [])], strainGuards: { ...(encounter.strainGuards ?? {}) }, generalStrainGuard: Number(encounter.generalStrainGuard ?? 0), hazardGuard: Number(encounter.hazardGuard ?? 0), momentumLossGuard: Number(encounter.momentumLossGuard ?? 0), riskOverrides: { ...(encounter.riskOverrides ?? {}) }, hazardShelters: { ...(encounter.hazardShelters ?? {}) }, suppressedHazards: [...(encounter.suppressedHazards ?? [])]
  };
}
function unresolved(state) { return (state.order ?? []).filter((stationId) => !state.results?.[stationId]); }
function assertTarget(state, stationId) { if (!stationId || !unresolved(state).includes(stationId)) throw new Error("Choose an unresolved station."); }
function addCheckBonus(encounter, stationId, value, source) { encounter.checkBonuses[stationId] = Number(encounter.checkBonuses[stationId] ?? 0) + Number(value ?? 0); encounter.checkBonusSources[stationId] ??= []; encounter.checkBonusSources[stationId].push(`${source}: +${Number(value ?? 0)} to the PF2e check`); }
function addDegreeLift(encounter, stationId, value, source) { encounter.degreeLifts[stationId] = Math.max(Number(encounter.degreeLifts[stationId] ?? 0), Number(value ?? 0)); encounter.degreeLiftSources[stationId] ??= []; encounter.degreeLiftSources[stationId].push(source); }
function moveToFrontOfRemaining(state, stationId) { assertTarget(state, stationId); const order = [...state.order]; const from = order.indexOf(stationId); const target = state.phase === "resolution" ? Number(state.activeOrderIndex ?? 0) : 0; order.splice(from, 1); order.splice(target, 0, stationId); return { ...state, order }; }
function markUsed(state, stationId, mastery) { const station = canonicalMasteryStation(stationId); return { ...state, masteryUses: { ...(state.masteryUses ?? {}), [station]: { masteryId: mastery.id, usedAt: Date.now(), roundIndex: Number(state.roundIndex ?? 0) } } }; }
function improveFailedResult(state, sourceStationId) { const result = state.results?.[sourceStationId]; if (!result || !["failure", "criticalFailure"].includes(result.degreeKey)) throw new Error("Not Like This requires a Failure or Critical Failure result."); const degreeKey = result.degreeKey === "criticalFailure" ? "failure" : "success"; const results = { ...state.results, [sourceStationId]: { ...result, degreeKey, masteryImprovedBy: "captain-not-like-this" } }; const roundResult = state.phase === "round-result" ? scoreRound(state.order.map((id) => results[id]?.degreeKey)) : state.roundResult; return { ...state, results, roundResult }; }

export function masteryReady(state, stationId) { const station = canonicalMasteryStation(stationId); const masteryId = state?.masterySelections?.[station] ?? state?.masterySelections?.[stationId] ?? null; return Boolean(masteryId && !state?.masteryUses?.[station] && !state?.masteryUses?.[stationId]); }

export function applyMasteryTechnique(state, stationId, options = {}) {
  if (!state?.setupLocked) throw new Error("Crew & Mastery must be locked before a Mastery Technique can be used.");
  if (["opening", "event-complete"].includes(state.phase)) throw new Error("Mastery Techniques cannot be used in this phase.");
  const station = canonicalMasteryStation(stationId);
  const selectedId = state.masterySelections?.[station] ?? state.masterySelections?.[stationId] ?? null;
  const mastery = getMasteryTechnique(station, selectedId);
  if (!mastery) throw new Error(`No Mastery Technique is readied for ${station}.`);
  if (state.masteryUses?.[station] || state.masteryUses?.[stationId]) throw new Error(`${mastery.name} is already EXPENDED for this Event.`);

  let next = { ...state }; let encounter = cloneEncounter(state.encounter); const source = `Mastery — ${mastery.name}`;
  switch (mastery.id) {
    case "captain-carry-the-deed": {
      const sourceStationId = options.sourceStationId; const result = state.results?.[sourceStationId];
      if (!result?.riskEarned || !result.riskBenefitId) throw new Error("Carry the Deed requires a station that just earned a Heroic/Risk benefit.");
      assertTarget(state, options.targetStationId); const riskBenefit = getRiskBenefit(result.riskBenefitId); if (!riskBenefit) throw new Error("The earned Heroic/Risk benefit could not be found.");
      next = applyEarnedRiskBenefit({ ...state, encounter }, { stationId: sourceStationId, riskBenefit, riskBid: { benefitId: result.riskBenefitId, parameters: { targetStationId: options.targetStationId } } }, result.degreeKey === "criticalSuccess" ? "criticalSuccess" : "success");
      encounter = cloneEncounter(next.encounter); encounter.notes.push(`${source} extended ${riskBenefit.name} to ${options.targetStationId}.`); break;
    }
    case "captain-set-the-pace": throw new Error("Set the Pace resolves automatically when Round 1 planning begins.");
    case "captain-not-like-this": next = improveFailedResult(state, options.sourceStationId); encounter = cloneEncounter(next.encounter); encounter.notes.push(`${source} improved ${options.sourceStationId}'s failed result by one degree.`); break;

    case "engineer-redline-the-arkengine":
      assertTarget(state, options.targetStationId); if (!["engineer", "navigator"].includes(options.targetStationId)) throw new Error("Redline the Arkengine may only affect Engineer or Navigator.");
      addDegreeLift(encounter, options.targetStationId, 1, `${source}: improve the final degree by one step`);
      next = { ...next, masteryPostCheckShipEffects: { ...(state.masteryPostCheckShipEffects ?? {}), [options.targetStationId]: [{ kind: "gain-strain", value: 1, area: "arkengine", source }] } };
      break;
    case "engineer-keep-her-breathing": {
      const area = options.area ?? options.system; if (!area) throw new Error("Choose the ship Area being kept operational.");
      next = { ...next, masteryAreaDisableGuards: { ...(state.masteryAreaDisableGuards ?? {}), [area]: 1 } }; encounter.notes.push(`${source} keeps ${area} operational through the next station resolution.`); break;
    }
    case "engineer-crosswire-the-systems": {
      const fromArea = options.fromArea ?? options.fromSystem; const toArea = options.toArea ?? options.toSystem;
      if (!fromArea || !toArea || fromArea === toArea) throw new Error("Choose two different ship Areas for Crosswire the Systems.");
      next = { ...next, masteryAreaRedirects: { ...(state.masteryAreaRedirects ?? {}), [fromArea]: { destination: toArea, source } } }; break;
    }

    case "navigator-impossible-passage": assertTarget(state, options.targetStationId); encounter.riskOverrides[options.targetStationId] = true; encounter.notes.push(`${source} lets ${options.targetStationId} ignore one authored Hazard or Heroic/Risk restriction this round.`); break;
    case "navigator-find-another-way": assertTarget(state, options.targetStationId); addCheckBonus(encounter, options.targetStationId, 3, source); encounter.notes.push(`${source} found a better line for ${options.targetStationId}: +3 to its next PF2e check.`); break;
    case "navigator-read-the-current": next = moveToFrontOfRemaining(state, options.targetStationId); break;

    case "battlewatch-call-the-true-opening": assertTarget(state, options.targetStationId); if (!state.selections?.[options.targetStationId]?.riskTier) throw new Error("Call the True Opening requires a station with a Heroic/Risk Bid."); next = { ...next, masteryRiskTierReductions: { ...(state.masteryRiskTierReductions ?? {}), [options.targetStationId]: true } }; break;
    case "battlewatch-nothing-surprises-me": assertTarget(state, options.targetStationId); next = { ...next, reopenedStations: { ...(state.reopenedStations ?? {}), [options.targetStationId]: true } }; break;
    case "battlewatch-exploit-the-break": { const sourceResult = state.results?.[options.sourceStationId]; if (sourceResult?.degreeKey !== "criticalSuccess") throw new Error("Exploit the Break requires a Critical Success."); next = moveToFrontOfRemaining(state, options.targetStationId); break; }

    case "veilwarden-stand-between": {
      const fromArea = options.fromArea ?? options.fromSystem; if (!["hull", "arkengine", "rigging"].includes(fromArea)) throw new Error("Stand Between may redirect Hull, Arkengine, or Rigging Strain threat.");
      next = { ...next, masteryAreaRedirects: { ...(state.masteryAreaRedirects ?? {}), [fromArea]: { destination: "lifeveil", source } } }; break;
    }
    case "veilwarden-seal-the-impossible": encounter.hazardGuard = Math.max(Number(encounter.hazardGuard ?? 0), 1); break;
    case "veilwarden-sanctuary": assertTarget(state, options.targetStationId); encounter.hazardShelters[options.targetStationId] = true; encounter.riskOverrides[options.targetStationId] = true; encounter.notes.push(`${source} creates a Hazard-free sanctuary around ${options.targetStationId}'s next check.`); break;
    default: throw new Error(`Unsupported Mastery Technique: ${canonicalMasteryId(mastery.id)}`);
  }
  next = { ...next, encounter };
  return markUsed(next, station, mastery);
}

export function applyMasteryConsequenceRedirects(_event, beforeState, finalizedState) {
  const redirects = beforeState?.masteryAreaRedirects ?? {};
  if (!Object.keys(redirects).length) return finalizedState;
  const priorCount = (beforeState?.pendingShipEffects ?? []).length;
  const effects = [...(finalizedState?.pendingShipEffects ?? [])];
  const notes = [...(finalizedState.encounter?.notes ?? [])];
  const remainingRedirects = { ...redirects };
  for (let index = priorCount; index < effects.length; index += 1) {
    const effect = effects[index];
    if (effect?.kind !== "gain-strain" || Number(effect.value ?? 0) <= 0 || !effect.area) continue;
    const redirect = remainingRedirects[effect.area]; if (!redirect) continue;
    const from = effect.area; effects[index] = { ...effect, area: redirect.destination, redirectedFrom: from, redirectSource: redirect.source };
    notes.push(`${redirect.source}: redirected the Strain threat from ${from} to ${redirect.destination}.`);
    delete remainingRedirects[from];
  }
  return { ...finalizedState, pendingShipEffects: effects, encounter: { ...finalizedState.encounter, notes }, masteryAreaRedirects: remainingRedirects };
}
