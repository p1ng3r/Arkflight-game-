import { clampMomentum } from "./event-schema.js";
import { applyRewardPackageToState, applyRoundRewardPackageToState, resolveEventEnding } from "./reward-engine.js";

function cloneSourceMap(source) { return Object.fromEntries(Object.entries(source ?? {}).map(([key, rows]) => [key, [...(rows ?? [])]])); }

function cloneEncounter(encounter) {
  return {
    momentum: Number(encounter?.momentum ?? 0),
    hazards: [...(encounter?.hazards ?? [])],
    checkBonuses: { ...(encounter?.checkBonuses ?? {}) },
    dcAdjustments: { ...(encounter?.dcAdjustments ?? {}) },
    degreeLifts: { ...(encounter?.degreeLifts ?? {}) },
    checkBonusSources: cloneSourceMap(encounter?.checkBonusSources),
    dcAdjustmentSources: cloneSourceMap(encounter?.dcAdjustmentSources),
    degreeLiftSources: cloneSourceMap(encounter?.degreeLiftSources),
    notes: [...(encounter?.notes ?? [])],
    strainGuards: { ...(encounter?.strainGuards ?? {}) },
    generalStrainGuard: Number(encounter?.generalStrainGuard ?? 0),
    hazardGuard: Number(encounter?.hazardGuard ?? 0),
    momentumLossGuard: Number(encounter?.momentumLossGuard ?? 0),
    riskOverrides: { ...(encounter?.riskOverrides ?? {}) },
    hazardShelters: { ...(encounter?.hazardShelters ?? {}) },
    suppressedHazards: [...(encounter?.suppressedHazards ?? [])]
  };
}

function appendShipEffect(state, effect, source = null) {
  if (!effect) return state;
  return { ...state, pendingShipEffects: [...(state?.pendingShipEffects ?? []), { ...effect, ...(source ? { source } : {}) }] };
}

function addHazard(encounter, hazardId) {
  if (!hazardId) return;
  if (Number(encounter.hazardGuard ?? 0) > 0) {
    encounter.hazardGuard = Math.max(0, Number(encounter.hazardGuard) - 1);
    encounter.notes.push(`A prepared Arkflight defense prevented ${hazardId} from becoming active.`);
    return;
  }
  if (!encounter.hazards.includes(hazardId)) encounter.hazards.push(hazardId);
}

function targetStation(state, riskBid) {
  const authored = riskBid?.parameters?.targetStationId;
  if (authored && state.order.includes(authored) && !state.results?.[authored]) return authored;
  return state.order.filter((id) => !state.results?.[id])[0] ?? null;
}
function nextEligibleStation(state, allowedStations = []) { const allowed = new Set(allowedStations); return state.order.find((stationId) => !state.results?.[stationId] && allowed.has(stationId)) ?? null; }
function addSource(encounter, bucket, stationId, source) { if (!stationId || !source) return; encounter[bucket][stationId] ??= []; encounter[bucket][stationId].push(source); }
function riskSource(chosen, effect) { return `${chosen.riskBenefit?.name ?? "Heroic benefit"} from ${chosen.stationId ?? "an earlier station"}: ${effect}`; }

export function encounterFromEvent(event) { return cloneEncounter(event?.startingState ?? {}); }

export function checkAdjustments(state, stationId) {
  const encounter = cloneEncounter(state?.encounter);
  return {
    bonus: Number(encounter.checkBonuses?.[stationId] ?? 0), dc: Number(encounter.dcAdjustments?.[stationId] ?? 0), degreeLift: Number(encounter.degreeLifts?.[stationId] ?? 0),
    bonusSources: [...(encounter.checkBonusSources?.[stationId] ?? [])], dcSources: [...(encounter.dcAdjustmentSources?.[stationId] ?? [])], degreeLiftSources: [...(encounter.degreeLiftSources?.[stationId] ?? [])]
  };
}

export function consumeCheckAdjustments(state, stationId) {
  const encounter = cloneEncounter(state?.encounter);
  delete encounter.checkBonuses[stationId]; delete encounter.dcAdjustments[stationId]; delete encounter.degreeLifts[stationId];
  delete encounter.checkBonusSources[stationId]; delete encounter.dcAdjustmentSources[stationId]; delete encounter.degreeLiftSources[stationId];
  delete encounter.hazardShelters[stationId]; delete encounter.riskOverrides[stationId];
  return { ...state, encounter };
}

export function applyEarnedRiskBenefit(state, chosen, degreeKey) {
  if (!chosen?.riskBid || !chosen?.riskBenefit || !(degreeKey === "success" || degreeKey === "criticalSuccess")) return state;
  const critical = degreeKey === "criticalSuccess";
  const id = chosen.riskBenefit.id;
  const encounter = cloneEncounter(state.encounter);
  const target = targetStation(state, chosen.riskBid);
  const unresolved = state.order.filter((stationId) => !state.results?.[stationId]);
  const addCheckBonus = (stationId, value) => { if (!stationId) return; encounter.checkBonuses[stationId] = Number(encounter.checkBonuses[stationId] ?? 0) + value; addSource(encounter, "checkBonusSources", stationId, riskSource(chosen, `+${value} to the PF2e check`)); };
  const bonusTarget = (value) => addCheckBonus(target, value);
  const dcTarget = (value) => { if (!target) return; encounter.dcAdjustments[target] = Number(encounter.dcAdjustments[target] ?? 0) + value; addSource(encounter, "dcAdjustmentSources", target, riskSource(chosen, `${value} DC`)); };
  let next = { ...state, encounter };

  switch (id) {
    case "aid-next-1": bonusTarget(critical ? 2 : 1); break;
    case "dc-next-1": dcTarget(critical ? -2 : -1); break;
    case "crew-surge": { const value = critical ? 2 : 1; for (const stationId of unresolved) addCheckBonus(stationId, value); break; }
    case "order-followup":
      if (target) {
        const activeIndex = Number(state.activeOrderIndex ?? 0); const currentTargetIndex = state.order.indexOf(target);
        if (currentTargetIndex > activeIndex) { const order = [...state.order]; order.splice(currentTargetIndex, 1); order.splice(activeIndex, 0, target); next = { ...next, order }; }
        const value = critical ? 3 : 2; addCheckBonus(target, value);
        if (critical) { encounter.dcAdjustments[target] = Number(encounter.dcAdjustments[target] ?? 0) - 1; addSource(encounter, "dcAdjustmentSources", target, riskSource(chosen, "-1 DC")); }
      }
      break;
    case "arkengine-vent": next = appendShipEffect(next, { kind: "gain-strain", value: critical ? -2 : -1, area: "arkengine" }, riskSource(chosen, "vent Strain")); break;
    case "lifeveil-steady": next = appendShipEffect(next, { kind: "gain-strain", value: critical ? -2 : -1, area: "lifeveil" }, riskSource(chosen, "steady Strain")); break;
    case "arkengine-overdrive": {
      const eligibleTarget = nextEligibleStation(state, ["engineer", "navigator"]); addCheckBonus(eligibleTarget, critical ? 3 : 2);
      if (critical) { encounter.strainGuards.arkengine = Number(encounter.strainGuards.arkengine ?? 0) + 1; encounter.notes.push("Controlled Overdrive prevents the next point of Strain that threatens Arkengine this round."); }
      break;
    }
    case "arkengine-master": next = appendShipEffect(next, { kind: "gain-strain", value: -2, area: "arkengine" }, riskSource(chosen, "vent Strain")); if (critical) encounter.momentum = clampMomentum(encounter.momentum + 1); break;
    case "degree-lift": if (target) { encounter.degreeLifts[target] = Math.max(Number(encounter.degreeLifts[target] ?? 0), 1); addSource(encounter, "degreeLiftSources", target, riskSource(chosen, "improve the degree of success by one step")); } break;
    case "order-swap": if (target) { const activeIndex = Number(state.activeOrderIndex ?? 0); const currentTargetIndex = state.order.indexOf(target); if (currentTargetIndex > activeIndex) { const order = [...state.order]; order.splice(currentTargetIndex, 1); order.splice(activeIndex, 0, target); next = { ...next, order }; } } break;
    case "hazard-remove-1": { const hazardId = chosen.riskBid.parameters?.hazardId ?? encounter.hazards[0]; if (hazardId) encounter.hazards = encounter.hazards.filter((row) => row !== hazardId); if (critical) encounter.momentum = clampMomentum(encounter.momentum + 1); break; }
    case "hazard-reveal-1": encounter.notes.push(critical ? "A hidden danger was revealed with an exploitable opening." : "A hidden danger was revealed before it struck."); break;
    default: encounter.notes.push(`${chosen.riskBenefit.name} was earned; its authored payoff remains available for GM adjudication.`); break;
  }
  return { ...next, encounter };
}

function guardedStrainEffect(encounter, effect) {
  let value = Number(effect.value ?? 0);
  if (value <= 0) return { ...effect, value };
  const area = effect.area ?? null;
  if (area) {
    const guard = Number(encounter.strainGuards?.[area] ?? 0); const blocked = Math.min(value, guard); value -= blocked; encounter.strainGuards[area] = Math.max(0, guard - blocked);
  }
  const general = Number(encounter.generalStrainGuard ?? 0); const blockedGenerally = Math.min(value, general); value -= blockedGenerally; encounter.generalStrainGuard = Math.max(0, general - blockedGenerally);
  return { ...effect, value };
}

function normalizedShipEffect(effect) {
  if (!effect) return null;
  if (effect.kind === "gain-strain") return { kind: "gain-strain", value: Number(effect.value ?? 0), area: effect.area ?? null };
  // Temporary authoring migration: old event content is interpreted, but no Pressure state is created.
  if (effect.kind === "pressure") return { kind: "gain-strain", value: Number(effect.value ?? 0), area: effect.system ?? null };
  if (effect.kind === "reduce-highest-pressure") return { kind: "gain-strain", value: -Math.abs(Number(effect.value ?? 1)), area: null };
  if (["damage-hull", "damage-lifeveil", "change-morale", "degrade-area", "recover-area", "add-condition", "remove-condition"].includes(effect.kind)) return { ...effect };
  return null;
}

function applyOutcomeEffects(state, encounter, effects = []) {
  let next = state;
  for (const effect of effects) {
    if (!effect) continue;
    if (effect.kind === "hazard") { addHazard(encounter, effect.hazardId); continue; }
    const shipEffect = normalizedShipEffect(effect);
    if (!shipEffect) continue;
    const guarded = shipEffect.kind === "gain-strain" ? guardedStrainEffect(encounter, shipEffect) : shipEffect;
    if (guarded.kind === "gain-strain" && Number(guarded.value ?? 0) === 0) continue;
    next = appendShipEffect(next, guarded, "Event round consequence");
  }
  return next;
}

function stationPhrase(result) { const name = result.actionName; if (result.degreeKey === "criticalSuccess") return `${name} lands with startling precision`; if (result.degreeKey === "success") return `${name} holds`; if (result.degreeKey === "criticalFailure") return `${name} breaks badly under the strain`; return `${name} slips at the worst moment`; }
export function cinematicRoundNarrative({ round, bandId, results, consequenceNarrative }) {
  const rows = Object.values(results ?? {}); const strong = rows.find((r) => r.degreeKey === "criticalSuccess") ?? rows.find((r) => r.degreeKey === "success"); const weak = rows.find((r) => r.degreeKey === "criticalFailure") ?? rows.find((r) => r.degreeKey === "failure");
  const opening = { extraordinary: `For a few fierce breaths, the crew owns ${round.title.toLowerCase()}.`, "strong-success": `The ship drives through ${round.title.toLowerCase()} with the crew moving as one.`, "mixed-success": `The ship claws its way through ${round.title.toLowerCase()}, but the passage is anything but clean.`, failure: `The crossing through ${round.title.toLowerCase()} begins to come apart around the crew.`, disaster: `Everything in ${round.title.toLowerCase()} turns violent at once.` }[bandId] ?? `The crew fights through ${round.title.toLowerCase()}.`;
  const middle = strong && weak ? `${stationPhrase(strong)}, buying precious room even as ${stationPhrase(weak)}.` : strong ? `${stationPhrase(strong)}, giving the ship the opening it needs.` : weak ? `${stationPhrase(weak)}, and the rest of the crew is forced to compensate.` : `Every station strains against the same narrowing window.`;
  const risk = rows.find((r) => r.riskEarned); const riskSentence = risk ? `${risk.riskBenefitName} turns that gamble into a real advantage as the crew presses on.` : `No heroic gamble changes the shape of the crossing before the moment closes.`;
  return `${opening} ${middle} ${riskSentence} ${consequenceNarrative}`;
}

export function finalizeRound(event, state) {
  if (state?.phase !== "round-result" || !state.roundResult) return state;
  if (state.consequenceApplied) return state;
  const round = event?.rounds?.[state.roundIndex ?? 0]; const outcome = round?.outcomes?.[state.roundResult.bandId];
  if (!outcome) throw new Error(`Missing authored round outcome for ${state.roundResult.bandId}.`);
  const encounter = cloneEncounter(state.encounter); const momentumBefore = Number(encounter.momentum ?? 0); let momentumDelta = Number(state.roundResult.momentumDelta ?? 0);
  if (momentumDelta < 0 && encounter.momentumLossGuard > 0) { momentumDelta = Math.min(0, momentumDelta + encounter.momentumLossGuard); encounter.momentumLossGuard = 0; }
  encounter.momentum = clampMomentum(momentumBefore + momentumDelta); const momentumAfter = encounter.momentum;
  let next = { ...state, encounter };
  next = applyOutcomeEffects(next, encounter, outcome.effects ?? []);
  const roundNarrative = cinematicRoundNarrative({ round, bandId: state.roundResult.bandId, results: state.results, consequenceNarrative: outcome.narrative });
  next = { ...next, encounter, roundNarrative, consequenceNarrative: outcome.narrative, consequenceApplied: true, roundMomentumBefore: momentumBefore, roundMomentumAward: momentumDelta, roundMomentumAfter: momentumAfter, roundRewards: null };
  if (outcome.rewards) next = applyRoundRewardPackageToState(next, outcome.rewards, { roundId: round.id, bandId: state.roundResult.bandId });
  return next;
}

export function advanceToNextRound(event, state) {
  if (state?.phase !== "round-result" || !state.consequenceApplied) throw new Error("Finish the current round before advancing.");
  const nextIndex = Number(state.roundIndex ?? 0) + 1; const nextRound = event?.rounds?.[nextIndex];
  if (!nextRound) { const eventEnding = resolveEventEnding(event, state.roundResult?.bandId); let next = { ...state, phase: "event-complete", eventEnding }; return applyRewardPackageToState(next, eventEnding.rewards); }
  const encounter = cloneEncounter(state.encounter);
  for (const hazardId of encounter.suppressedHazards) if (!encounter.hazards.includes(hazardId)) encounter.hazards.push(hazardId);
  encounter.suppressedHazards = []; encounter.strainGuards = {}; encounter.generalStrainGuard = 0; encounter.hazardGuard = 0; encounter.momentumLossGuard = 0; encounter.riskOverrides = {}; encounter.hazardShelters = {};
  return { ...state, encounter, roundIndex: nextIndex, roundId: nextRound.id, phase: "round-opening", planningStartedAt: null, planningEndsAt: null, lockedAt: null, activeOrderIndex: null, results: {}, roundResult: null, roundNarrative: null, consequenceNarrative: null, consequenceApplied: false, roundRewards: null, selections: Object.fromEntries(Object.entries(state.selections).map(([stationId, selection]) => [stationId, { ...selection, actionId: null, skillId: null, riskTier: null, componentAbilityId: null }])) };
}
