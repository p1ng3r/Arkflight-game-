import { ignoredHazardEffects } from "./hazard-rules.js";
import { applyAutomaticRiskChoice, RISK_CHOICE_IDS } from "./risk-choices.js";
import { cloneEncounter } from "./encounter-state.js";
import { clampMomentum } from "./event-schema.js";
import { appendRoundHistory, scoreEvent } from "./event-outcome.js";
import { applyRewardPackageToState, applyRoundRewardPackageToState, resolveEventEnding } from "./reward-engine.js";


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
  for (const key of ["ignoredHazards", "hazardOpportunities", "penaltyShields", "successDegreeLifts"]) delete encounter[key]?.[stationId];
  delete encounter.rollTwiceBest[stationId]; delete encounter.riskTierOverrides[stationId];
  return { ...state, encounter };
}

export function applyEarnedRiskBenefit(state, chosen, degreeKey, event = null) {
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
    case "aid-next-2": bonusTarget(critical ? 3 : 2); break;
    case "aid-next-3": bonusTarget(critical ? 5 : 3); break;
    case "dc-next-1": dcTarget(critical ? -2 : -1); break;
    case "dc-next-2": dcTarget(critical ? -3 : -2); if (critical) encounter.momentum = clampMomentum(encounter.momentum + 1); break;
    case "dc-next-3": dcTarget(critical ? -5 : -3); break;
    case "momentum-1": encounter.momentum = clampMomentum(encounter.momentum + 1); if (critical) encounter.momentumLossGuard += 1; break;
    case "momentum-2": encounter.momentum = clampMomentum(encounter.momentum + (critical ? 2 : 1)); bonusTarget(critical ? 2 : 1); break;
    case "momentum-3": encounter.momentum = Math.max(encounter.momentum, critical ? 3 : 2); if (critical) for (const stationId of unresolved) addCheckBonus(stationId, 1); break;
    case "pressure-drop-1": next = appendShipEffect(next, { kind: "gain-strain", value: critical ? -2 : -1 }, riskSource(chosen, "vent Strain")); break;
    case "pressure-drop-2": next = appendShipEffect(next, { kind: "gain-strain", value: critical ? -3 : -2 }, riskSource(chosen, "vent Strain")); break;
    case "pressure-guard-1": encounter.generalStrainGuard += critical ? 2 : 1; break;
    case "pressure-guard-2": encounter.generalStrainGuard += critical ? 3 : 2; break;
    case "pressure-guard-3": if (critical) encounter.guardAllRoundStrain = true; else encounter.guardNextStrainSource = true; break;
    case "mixed-softener": encounter.mixedStrainGuard = Math.max(Number(encounter.mixedStrainGuard ?? 0), critical ? 0 : 1); if (critical) encounter.ignoreMixedStrain = true; break;
    case "failure-softener":
      encounter.failureStrainGuard = Number(encounter.failureStrainGuard ?? 0) + (critical ? 1 : 1);
      if (critical) encounter.failureMomentumGuard = true;
      break;
    case "disaster-buffer": encounter.disasterHazardGuard = Number(encounter.disasterHazardGuard ?? 0) + 1; if (critical) encounter.disasterStrainGuard = Number(encounter.disasterStrainGuard ?? 0) + 1; break;
    case "information-next-round":
      encounter.revealedInformation ??= [];
      if (event?.rounds?.[Number(state.roundIndex ?? 0) + 1]) encounter.revealedInformation.push({ kind: "next-round", roundIndex: Number(state.roundIndex ?? 0) + 1, degreeKey, source: chosen.riskBenefit.name });
      else bonusTarget(critical ? 2 : 1);
      break;
    case "narrative-breakthrough":
      encounter.momentum = clampMomentum(encounter.momentum + 1);
      if (critical) for (const stationId of unresolved) addCheckBonus(stationId, 1);
      else bonusTarget(1);
      encounter.breakthroughCount = Number(encounter.breakthroughCount ?? 0) + 1;
      break;
    case "crew-surge": { const value = critical ? 2 : 1; for (const stationId of unresolved) addCheckBonus(stationId, value); break; }
    case "order-followup":
      next = applyAutomaticRiskChoice(next, { benefitId: id, name: chosen.riskBenefit.name, degreeKey, stationId: chosen.stationId, parameters: chosen.riskBid.parameters }, event);
      Object.assign(encounter, next.encounter);
      break;
    case "arkengine-vent": next = appendShipEffect(next, { kind: "gain-strain", value: critical ? -2 : -1 }, riskSource(chosen, "vent Strain")); break;
    case "lifeveil-steady": next = appendShipEffect(next, { kind: "gain-strain", value: critical ? -2 : -1 }, riskSource(chosen, "steady Strain")); break;
    case "arkengine-overdrive": {
      const eligibleTarget = nextEligibleStation(state, ["engineer", "navigator"]); addCheckBonus(eligibleTarget, critical ? 3 : 2);
      if (critical && eligibleTarget) { encounter.stationStrainGuards ??= {}; encounter.stationStrainGuards[eligibleTarget] = Number(encounter.stationStrainGuards[eligibleTarget] ?? 0) + 1; }
      break;
    }
    case "arkengine-master":
      if (critical) {
        next = appendShipEffect(next, { kind: "gain-strain", value: -2 }, riskSource(chosen, "vent Strain"));
        encounter.momentum = clampMomentum(encounter.momentum + 1);
        const masteryUses = { ...(state.masteryUses ?? {}) }; delete masteryUses.engineer; next = { ...next, masteryUses };
      } else if (state.masteryUses?.engineer) {
        const masteryUses = { ...(next.masteryUses ?? {}) }; delete masteryUses.engineer; next = { ...next, masteryUses };
      } else next = appendShipEffect(next, { kind: "gain-strain", value: -2 }, riskSource(chosen, "vent Strain"));
      break;
    case "degree-lift": if (target) { if (critical) encounter.degreeLifts[target] = Math.max(Number(encounter.degreeLifts[target] ?? 0), 1); else { encounter.successDegreeLifts ??= {}; encounter.successDegreeLifts[target] = 1; } addSource(encounter, "degreeLiftSources", target, riskSource(chosen, "improve the degree of success by one step")); } break;
    case "order-swap": case "order-shift-self":
      next = applyAutomaticRiskChoice(next, { benefitId: id, name: chosen.riskBenefit.name, degreeKey, stationId: chosen.stationId, parameters: chosen.riskBid.parameters }, event);
      Object.assign(encounter, next.encounter);
      break;
    case "hazard-remove-1": {
      const hazardId = chosen.riskBid.parameters?.hazardId;
      if (hazardId && encounter.hazards.includes(hazardId)) encounter.hazards = encounter.hazards.filter(row => row !== hazardId);
      else if (encounter.hazards.length) encounter.hazards = encounter.hazards.slice(1);
      if (critical) encounter.momentum = clampMomentum(encounter.momentum + 1);
      break;
    }
    case "hazard-deny-risk":
      for (const stationId of unresolved) encounter.riskOverrides[stationId] = true;
      if (critical) bonusTarget(1);
      break;
    case "hazard-strain-guard-1": encounter.hazardStrainGuard += critical ? 2 : 1; break;
    case "lifeveil-miracle":
      encounter.lifeveilBreachGuard = true;
      if (critical && encounter.hazards.length) encounter.suppressedHazards = [...new Set([...encounter.suppressedHazards, encounter.hazards[0]])];
      break;
    case "information-choice":
      encounter.revealedInformation ??= [];
      encounter.revealedInformation.push({ kind: "lower-consequence-option", roundIndex: state.roundIndex, source: chosen.riskBenefit.name });
      bonusTarget(critical ? 2 : 1);
      break;
    case "condition-suppress":
      for (const stationId of unresolved) addCheckBonus(stationId, critical ? 2 : 1);
      break;
    case "condition-stabilize":
      next = appendShipEffect(next, { kind: "recover-most-severe-condition", steps: critical ? 2 : 1 }, riskSource(chosen, "stabilize the most severe active ship condition"));
      break;
    default:
      if (!RISK_CHOICE_IDS.has(id)) encounter.notes.push(`${chosen.riskBenefit.name}: automatically resolved using the event's authored reward text.`);
      break;
  }
  next = { ...next, encounter };
  if (RISK_CHOICE_IDS.has(id) && !["order-followup", "order-swap", "order-shift-self", "hazard-remove-1", "arkengine-master"].includes(id)) {
    next = applyAutomaticRiskChoice(next, { benefitId: id, name: chosen.riskBenefit.name, degreeKey, stationId: chosen.stationId, parameters: chosen.riskBid.parameters }, event);
  }
  next.encounter.riskAwardHistory = [...(next.encounter.riskAwardHistory ?? []), {
    benefitId: id, name: chosen.riskBenefit.name, stationId: chosen.stationId, degreeKey, automaticallyResolved: true, resolvedAt: Date.now()
  }];
  return next;
}

export function guardedStrainEffect(encounter, effect) {
  let value = Number(effect.value ?? 0);
  if (value <= 0) return { ...effect, value };
  if (encounter.guardAllRoundStrain || encounter.guardNextStrainSource) {
    encounter.guardNextStrainSource = false;
    return { ...effect, value: 0 };
  }
  if (Number(encounter.nextSourceStrainGuard ?? 0) > 0) {
    value = Math.max(0, value - encounter.nextSourceStrainGuard);
    encounter.nextSourceStrainGuard = 0;
  }
  const general = Number(encounter.generalStrainGuard ?? 0);
  const blocked = Math.min(value, general);
  value -= blocked;
  encounter.generalStrainGuard = Math.max(0, general - blocked);
  return { ...effect, value };
}

function normalizedShipEffect(effect) {
  if (!effect) return null;
  if (effect.kind === "gain-strain") return {
    kind: "gain-strain",
    value: Number(effect.value ?? 0),
    ...(effect.degradationOverride ? { degradationOverride: effect.degradationOverride } : {})
  };
  if (effect.kind === "pressure") return { kind: "gain-strain", value: Number(effect.value ?? 0) };
  if (effect.kind === "reduce-highest-pressure") return { kind: "gain-strain", value: -Math.abs(Number(effect.value ?? 1)) };
  if (["damage-hull", "damage-lifeveil", "change-morale", "degrade-area", "recover-area", "recover-most-severe-condition", "add-condition", "remove-condition"].includes(effect.kind)) return { ...effect };
  return null;
}

function applyOutcomeEffects(state, encounter, effects = []) {
  let next = state;
  for (const effect of effects) {
    if (!effect) continue;
    if (effect.kind === "hazard") { addHazard(encounter, effect.hazardId); continue; }
    if (effect.kind === "damage-lifeveil" && encounter.lifeveilBreachGuard) {
      encounter.lifeveilBreachGuard = false;
      encounter.notes.push("Aegis of the Veil prevented the Lifeveil breach consequence.");
      continue;
    }
    const shipEffect = normalizedShipEffect(effect);
    if (!shipEffect) continue;
    const guarded = shipEffect.kind === "gain-strain" ? guardedStrainEffect(encounter, shipEffect) : shipEffect;
    if (guarded.kind === "gain-strain" && Number(guarded.value ?? 0) === 0) continue;
    next = appendShipEffect(next, guarded, effect.source ?? "Event round consequence");
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

function finalFailureEffect(event, eventResult) {
  if (eventResult?.id === "failure") return { kind: "add-condition", condition: { id: `${event.id}-event-failure`, name: `${event.title}: Massive System Disadvantage`, source: event.id, severity: "massive", eventResult: "failure" } };
  if (eventResult?.id === "criticalFailure") return { kind: "add-condition", condition: { id: `${event.id}-event-critical-failure`, name: `${event.title}: Catastrophic System Disadvantage`, source: event.id, severity: "catastrophic", eventResult: "criticalFailure" } };
  return null;
}

function sentenceCount(text) { return String(text ?? "").split(/[.!?]+/).map((row) => row.trim()).filter(Boolean).length; }
function roundTitle(event, entry) { return event?.rounds?.find((round) => round.id === entry?.roundId)?.title ?? `Round ${Number(entry?.roundIndex ?? 0) + 1}`; }
function cinematicEventNarrative(event, eventResult, ending, history = []) {
  const rows = [...history].sort((a, b) => Number(b.score) - Number(a.score));
  const best = rows[0] ?? null; const worst = rows.at(-1) ?? null;
  const authored = String(ending?.vignette ?? "").trim();
  const authoredSentences = sentenceCount(authored);
  const summary = `Across ${rows.length} rounds, the crew's combined performance resolves as ${eventResult.label}, with an average round score of ${Number(eventResult.averageRoundScore).toFixed(1)}.`;
  const contrast = best && worst && best.roundId !== worst.roundId ? `${roundTitle(event, best)} was the crew's strongest passage, while ${roundTitle(event, worst)} exacted the greatest price.` : best ? `${roundTitle(event, best)} became the defining passage of the event.` : "The event is decided by the crew's accumulated choices.";
  if (authoredSentences >= 10) return authored;
  if (authoredSentences === 9) return `${summary} ${authored}`;
  return `${summary} ${contrast} ${authored}`;
}

export function finalizeRound(event, state) {
  if (state?.phase !== "round-result" || !state.roundResult) return state;
  if (state.consequenceApplied) return state;
  const round = event?.rounds?.[state.roundIndex ?? 0]; const outcome = round?.outcomes?.[state.roundResult.bandId];
  if (!outcome) throw new Error(`Missing authored round outcome for ${state.roundResult.bandId}.`);
  const encounter = cloneEncounter(state.encounter); const momentumBefore = Number(encounter.momentum ?? 0); let momentumDelta = Number(state.roundResult.momentumDelta ?? 0);
  if (state.roundResult.bandId === "failure" && encounter.failureMomentumGuard) momentumDelta = 0;
  if (momentumDelta < 0 && encounter.momentumLossGuard > 0) { momentumDelta = Math.min(0, momentumDelta + encounter.momentumLossGuard); encounter.momentumLossGuard = 0; }
  encounter.momentum = clampMomentum(momentumBefore + momentumDelta); const momentumAfter = encounter.momentum;
  const effectsBefore = (state.pendingShipEffects ?? []).length;
  let next = { ...state, encounter };
  const band = state.roundResult.bandId;
  let effects = (outcome.effects ?? []).map(effect => ({ ...effect }));
  let bandGuard = band === "mixed-success" ? Number(encounter.mixedStrainGuard ?? 0) : band === "failure" ? Number(encounter.failureStrainGuard ?? 0) : band === "disaster" ? Number(encounter.disasterStrainGuard ?? 0) : 0;
  effects = effects.filter(effect => {
    if (band === "disaster" && effect.kind === "hazard" && encounter.disasterHazardGuard > 0) { encounter.disasterHazardGuard -= 1; return false; }
    if (["gain-strain", "pressure"].includes(effect.kind) && Number(effect.value) > 0) {
      const blocked = band === "mixed-success" && encounter.ignoreMixedStrain ? Number(effect.value) : Math.min(Number(effect.value), bandGuard);
      effect.value -= blocked; bandGuard = Math.max(0, bandGuard - blocked);
    }
    return true;
  });
  // Existing Hazard Strain is a distinct consequence, so this reward cannot
  // accidentally absorb Strain from the round outcome itself.
  const upkeep = ignoredHazardEffects(event, state).map(effect => {
    if (effect.kind !== "gain-strain" || Number(effect.value ?? 0) <= 0) return effect;
    const blocked = Math.min(Number(encounter.hazardStrainGuard ?? 0), Number(effect.value));
    encounter.hazardStrainGuard = Math.max(0, Number(encounter.hazardStrainGuard ?? 0) - blocked);
    return { ...effect, value: Number(effect.value) - blocked };
  });
  next = applyOutcomeEffects(next, encounter, [...effects, ...upkeep]);
  const roundNarrative = cinematicRoundNarrative({ round, bandId: state.roundResult.bandId, results: state.results, consequenceNarrative: outcome.narrative });
  next = { ...next, encounter, roundNarrative, consequenceNarrative: outcome.narrative, consequenceApplied: true, roundMomentumBefore: momentumBefore, roundMomentumAward: momentumDelta, roundMomentumAfter: momentumAfter, roundRewards: null };
  if (outcome.rewards) next = applyRoundRewardPackageToState(next, outcome.rewards, { roundId: round.id, bandId: state.roundResult.bandId });
  next = appendRoundHistory(next, { roundId: round.id, roundIndex: state.roundIndex, roundResult: state.roundResult, momentumBefore, momentumAfter, pendingShipEffects: (next.pendingShipEffects ?? []).slice(effectsBefore), results: state.results });
  if (Number(state.roundIndex ?? 0) >= event.rounds.length - 1) next = { ...next, eventResultPreview: scoreEvent(next.eventHistory) };
  return next;
}

export function advanceToNextRound(event, state) {
  if (state?.phase !== "round-result" || !state.consequenceApplied) throw new Error("Finish the current round before advancing.");
  const nextIndex = Number(state.roundIndex ?? 0) + 1; const nextRound = event?.rounds?.[nextIndex];
  if (!nextRound) {
    const eventResult = state.eventResultPreview ?? scoreEvent(state.eventHistory);
    const authoredEnding = resolveEventEnding(event, eventResult.id);
    const eventEnding = { ...authoredEnding, label: `${eventResult.label} — ${authoredEnding.label}`, vignette: cinematicEventNarrative(event, eventResult, authoredEnding, state.eventHistory) };
    let next = { ...state, phase: "event-complete", eventResult, eventEnding, eventResultPreview: null };
    const failureEffect = finalFailureEffect(event, eventResult); if (failureEffect) next = appendShipEffect(next, failureEffect, `Final Event Result — ${eventResult.label}`);
    return applyRewardPackageToState(next, eventEnding.rewards, { eventResultId: eventResult.id });
  }
  const encounter = cloneEncounter(state.encounter);
  for (const entry of encounter.scheduledHazards ?? []) if (entry.roundIndex === nextIndex && !encounter.hazards.includes(entry.hazardId)) encounter.hazards.push(entry.hazardId);
  encounter.scheduledHazards = (encounter.scheduledHazards ?? []).filter(entry => entry.roundIndex > nextIndex);
  for (const hazardId of encounter.suppressedHazards) if (!encounter.hazards.includes(hazardId)) encounter.hazards.push(hazardId);
  for (const key of ["guardAllRoundStrain", "guardNextStrainSource", "nextSourceStrainGuard", "mixedStrainGuard", "ignoreMixedStrain", "failureMomentumGuard", "failureStrainGuard", "disasterHazardGuard", "disasterStrainGuard", "lifeveilBreachGuard"]) delete encounter[key];
  encounter.successDegreeLifts = {}; encounter.stationStrainGuards = {};
  encounter.ignoredHazards = {}; encounter.hazardOpportunities = {}; encounter.penaltyShields = {}; encounter.links = [];
  for (const link of encounter.nextRoundLinks ?? []) { encounter.checkBonuses[link.target] = Number(encounter.checkBonuses[link.target] ?? 0) + link.value; encounter.checkBonusSources[link.target] ??= []; encounter.checkBonusSources[link.target].push("Forge the Link: +3 carried from last round"); }
  encounter.nextRoundLinks = [];
  encounter.suppressedHazards = []; encounter.strainGuards = {}; encounter.generalStrainGuard = 0; encounter.hazardStrainGuard = 0; encounter.hazardGuard = 0; encounter.momentumLossGuard = 0; encounter.riskOverrides = {}; encounter.hazardShelters = {}; encounter.rollTwiceBest = {}; encounter.riskTierOverrides = {};
  return { ...state, encounter, roundIndex: nextIndex, roundId: nextRound.id, phase: "round-opening", planningStartedAt: null, planningEndsAt: null, lockedAt: null, activeOrderIndex: null, results: {}, roundResult: null, roundNarrative: null, consequenceNarrative: null, consequenceApplied: false, roundRewards: null, eventResultPreview: null, selections: Object.fromEntries(Object.entries(state.selections).map(([stationId, selection]) => [stationId, { ...selection, actionId: null, skillId: null, riskTier: null, componentAbilityId: null }])) };
}
