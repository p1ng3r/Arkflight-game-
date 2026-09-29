import { availableStationActions, hazardCheckAdjustment, hazardOrderErrors, riskBlockReason, applyEmergencyActionResult } from "./hazard-rules.js";
import { assertRiskAwardsResolved } from "./risk-awards.js";
import { getRiskBenefit } from "../content/risk-benefits.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { rollPf2eStatistic } from "../pf2e/check-runner.js";
import { activeStationId, recordStationResult } from "./resolution-state.js";
import { applyEarnedRiskBenefit, checkAdjustments, consumeCheckAdjustments, guardedStrainEffect } from "./round-runtime.js";

const MODULE_ID = "arkflight-game";
function normalizedOutcomeSlug(outcome) { return String(outcome ?? "").trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").replaceAll("_", "-").replace(/\s+/g, "-").toLowerCase(); }
function normalizeOutcome(outcome) { const slug = normalizedOutcomeSlug(outcome); if (slug === "critical-success" || slug === "criticalsuccess") return "criticalSuccess"; if (slug === "success") return "success"; if (slug === "failure") return "failure"; if (slug === "critical-failure" || slug === "criticalfailure") return "criticalFailure"; throw new Error(`Unsupported PF2e outcome: ${outcome}`); }
function liftDegree(degreeKey, amount = 0) { const order = ["criticalFailure", "failure", "success", "criticalSuccess"]; const index = order.indexOf(degreeKey); if (index < 0 || amount <= 0) return degreeKey; return order[Math.min(order.length - 1, index + amount)]; }
function reducedRiskIncrease(tier) { const n = Number(tier ?? 0); if (n === 2) return 0; if (n === 5) return 2; if (n === 8) return 5; return n; }
function outcomeRank(outcome) { return { criticalFailure: 0, failure: 1, success: 2, criticalSuccess: 3 }[normalizeOutcome(outcome)] ?? -1; }
function betterRoll(first, second) { const a = outcomeRank(first?.outcome); const b = outcomeRank(second?.outcome); if (b > a) return second; if (a > b) return first; return Number(second?.total ?? 0) > Number(first?.total ?? 0) ? second : first; }

function boundVoyageShipBonus(stationId) {
  const actor = globalThis.game?.arkflight?.activeShip ?? null;
  const ship = actor?.flags?.[MODULE_ID]?.ship ?? null;
  if (!ship) return 0;
  try {
    const stats = deriveShip(ship, SHIP_CATALOGS).stats ?? {};
    return Number(stats.stationBonuses?.[stationId] ?? 0) + Number(stats.allStationBonus ?? 0) + Number(stats.pillarBonuses?.voyage ?? 0);
  } catch (_error) { return 0; }
}
function resolvedShipRollBonus(stationId, supplied) { return supplied === null || supplied === undefined ? boundVoyageShipBonus(stationId) : Number(supplied || 0); }

function carryoverRiskDc(state) {
  const carry = state?.riskCarryover ?? null;
  if (!carry || Number(carry.roundIndex) !== Number(state?.roundIndex)) return 0;
  return Math.max(0, Number(carry.dcAll ?? 0));
}

function applyAuthoredRiskCommitment(state, chosen) {
  const parameters = chosen?.riskBid?.parameters ?? {};
  const commitStrain = Math.max(0, Number(parameters.commitStrain ?? 0));
  const nextRoundDcAll = Math.max(0, Number(parameters.nextRoundDcAll ?? 0));
  const nextRoundHazard = parameters.nextRoundHazard ?? null;
  if (!commitStrain && !nextRoundDcAll && !nextRoundHazard) return state;

  const encounter = {
    ...(state.encounter ?? {}),
    hazards: [...(state.encounter?.hazards ?? [])],
    notes: [...(state.encounter?.notes ?? [])]
  };
  if (nextRoundHazard) {
    encounter.scheduledHazards = [...(encounter.scheduledHazards ?? [])];
    const roundIndex = Number(state.roundIndex ?? 0) + 1;
    if (!encounter.scheduledHazards.some(row => row.hazardId === nextRoundHazard && row.roundIndex === roundIndex)) encounter.scheduledHazards.push({ hazardId: nextRoundHazard, roundIndex });
  }
  if (nextRoundDcAll) encounter.notes.push(`Heroic commitment carries +${nextRoundDcAll} DC to every station in the next round.`);
  if (commitStrain) encounter.notes.push(`Heroic commitment adds ${commitStrain} ${parameters.commitStrainArea ?? "ship"} Strain before escape.`);

  const pendingShipEffects = [...(state.pendingShipEffects ?? [])];
  if (commitStrain) pendingShipEffects.push({ kind: "gain-strain", value: commitStrain, source: `Heroic commitment — ${chosen.action?.name ?? "Risk Bid"}` });

  const prior = state.riskCarryover ?? null;
  const targetRoundIndex = Number(state.roundIndex ?? 0) + 1;
  const riskCarryover = nextRoundDcAll
    ? {
        roundIndex: targetRoundIndex,
        dcAll: Math.max(Number(prior?.roundIndex) === targetRoundIndex ? Number(prior?.dcAll ?? 0) : 0, nextRoundDcAll),
        hazardId: nextRoundHazard ?? prior?.hazardId ?? null,
        sourceActionId: chosen.action?.id ?? null,
        sourceRiskTier: chosen.riskBid?.tier ?? null
      }
    : prior;

  return { ...state, encounter, pendingShipEffects, ...(riskCarryover ? { riskCarryover } : {}) };
}

export function selectedResolution(event, state, stationId, { shipRollBonus = null } = {}) {
  const round = event?.rounds?.[state?.roundIndex ?? 0]; const selection = state?.selections?.[stationId]; if (!round || !selection) return null;
  const actions = availableStationActions(event, state, stationId); const action = actions.find((entry) => entry.id === selection.actionId) ?? null; const skill = action?.skills?.find((entry) => entry.id === selection.skillId) ?? null; const riskBid = skill?.riskBids?.find((entry) => Number(entry.tier) === Number(selection.riskTier)) ?? null; const riskBenefit = riskBid ? getRiskBenefit(riskBid.benefitId) : null; if (!action || !skill) return null;
  const adjustments = checkAdjustments(state, stationId);
  const hazard = hazardCheckAdjustment(event, state, stationId);
  adjustments.dc += hazard.dc; adjustments.dcSources.push(...hazard.sources);
  const opportunity = state.encounter?.hazardOpportunities?.[stationId];
  if (opportunity && (state.encounter.hazards ?? []).includes(opportunity.hazardId)) { adjustments.bonus += opportunity.bonus; adjustments.bonusSources.push(`${opportunity.source}: +${opportunity.bonus}`); }
  if (state.encounter?.penaltyShields?.[stationId] && hazard.dc > 0) { adjustments.dc -= 1; adjustments.dcSources.push("Cover the Crew: ignore the first point of Hazard penalty"); }
  const blockedReason = riskBlockReason(event, state, stationId, selection.riskTier)
    ?? (selection.riskTier && !riskBid ? "The selected Risk tier is not authored for this skill." : null); const authoredRiskIncrease = Number(riskBid?.tier ?? 0); const riskReducedByMastery = Boolean(state?.masteryRiskTierReductions?.[stationId] && riskBid); const tacticOverride = state?.encounter?.riskTierOverrides?.[stationId]; const riskReducedByTactic = tacticOverride !== undefined && tacticOverride !== null && Boolean(riskBid); const riskIncrease = riskReducedByTactic ? Math.max(0, Number(tacticOverride)) : riskReducedByMastery ? reducedRiskIncrease(authoredRiskIncrease) : authoredRiskIncrease; const carryoverDc = carryoverRiskDc(state); const baseDc = Number(skill.dc) + carryoverDc; const preAdjustmentDc = baseDc + riskIncrease; const momentumBonus = Math.max(0, Math.min(3, Number(state?.encounter?.momentum ?? 0)));
  return { stationId, selection, action, skill, riskBid, riskBenefit, blockedReason, momentumBonus, shipRollBonus: resolvedShipRollBonus(stationId, shipRollBonus), checkBonus: adjustments.bonus, checkBonusSources: adjustments.bonusSources, dcAdjustment: adjustments.dc, dcAdjustmentSources: adjustments.dcSources, degreeLift: adjustments.degreeLift, degreeLiftSources: adjustments.degreeLiftSources, authoredRiskIncrease, riskIncrease, riskReducedByMastery, riskReducedByTactic, rollTwiceBest: Boolean(state?.encounter?.rollTwiceBest?.[stationId]), carryoverDc, preAdjustmentDc, finalDc: Math.max(0, preAdjustmentDc + Number(adjustments.dc ?? 0)) };
}

export async function rollSelectedStation({ event, state, actor, shipRollBonus = null }) {
  assertRiskAwardsResolved(state);
  const orderErrors = hazardOrderErrors(event, state); if (orderErrors.length) throw new Error(orderErrors.join(" "));
  const stationId = activeStationId(state); if (!stationId) throw new Error("No station is waiting to resolve."); const chosen = selectedResolution(event, state, stationId, { shipRollBonus }); if (!chosen) throw new Error(`The ${stationId} selection is incomplete or invalid.`); if (!actor) throw new Error("The assigned PF2e actor is unavailable.");
  if (chosen.blockedReason) throw new Error(chosen.blockedReason);
  const modifiers = [];
  if (chosen.momentumBonus) modifiers.push({ slug: "arkflight-momentum", label: "Arkflight Momentum", modifier: chosen.momentumBonus, type: "untyped", source: `Crew Momentum ${chosen.momentumBonus}/3` });
  if (chosen.shipRollBonus) modifiers.push({ slug: "arkflight-ship-talent", label: "Arkflight Ship Talents", modifier: chosen.shipRollBonus, type: "untyped", source: "Persistent vessel progression" });
  if (chosen.checkBonus) modifiers.push({ slug: "arkflight-crew-advantage", label: "Arkflight Crew Advantage", modifier: chosen.checkBonus, type: "untyped", source: chosen.checkBonusSources?.join("; ") || "Arkflight Heroic / Risk Benefit" });
  const rollOnce = () => rollPf2eStatistic({ actor, statisticSlug: chosen.skill.skill, dc: chosen.finalDc, modifiers, label: `Arkflight — ${chosen.action.name}`, options: ["arkflight:event", `arkflight:station:${stationId}`, `arkflight:action:${chosen.action.id}`, `arkflight:momentum:${chosen.momentumBonus}`, `arkflight:ship-bonus:${chosen.shipRollBonus}`, ...(chosen.riskBid ? [`arkflight:risk:${chosen.riskBid.tier}`] : []), ...(chosen.rollTwiceBest ? ["arkflight:tactic:take-the-better-line"] : [])] });
  const first = await rollOnce();
  const roll = chosen.rollTwiceBest ? betterRoll(first, await rollOnce()) : first;
  return { stationId, chosen, roll };
}

export function applyStationRollResult({ event, state, actor, roll, shipRollBonus = null }) {
  assertRiskAwardsResolved(state);
  const orderErrors = hazardOrderErrors(event, state); if (orderErrors.length) throw new Error(orderErrors.join(" "));
  const stationId = activeStationId(state); if (!stationId) throw new Error("No station is waiting to resolve."); const chosen = selectedResolution(event, state, stationId, { shipRollBonus }); if (!chosen) throw new Error(`The ${stationId} selection is incomplete or invalid.`); if (!actor) throw new Error("The assigned PF2e actor is unavailable."); if (!roll || !Number.isFinite(Number(roll.total)) || !roll.outcome) throw new Error("Arkflight received an invalid PF2e roll result.");
  if (chosen.blockedReason) throw new Error(chosen.blockedReason);
  const rawDegreeKey = normalizeOutcome(roll.outcome);
  const successLift = rawDegreeKey === "success" ? Number(state.encounter?.successDegreeLifts?.[stationId] ?? 0) : 0;
  const degreeKey = liftDegree(rawDegreeKey, Math.max(chosen.degreeLift, successLift)); const riskEarned = Boolean(chosen.riskBid && (degreeKey === "success" || degreeKey === "criticalSuccess")); const riskText = riskEarned ? (degreeKey === "criticalSuccess" ? chosen.riskBenefit?.criticalSuccess : chosen.riskBenefit?.success) ?? "Heroic/Risk benefit earned." : null;
  let nextState = recordStationResult(state, stationId, { actorId: actor.id, actorName: actor.name, actionId: chosen.action.id, actionName: chosen.action.name, skillId: chosen.skill.id, skillSlug: chosen.skill.skill, baseDc: Number(chosen.skill.dc), riskTier: chosen.riskBid?.tier ?? null, authoredRiskIncrease: chosen.authoredRiskIncrease, riskIncrease: chosen.riskIncrease, riskReducedByMastery: chosen.riskReducedByMastery, riskReducedByTactic: chosen.riskReducedByTactic, rollTwiceBest: chosen.rollTwiceBest, carryoverDc: chosen.carryoverDc, preAdjustmentDc: chosen.preAdjustmentDc, dcAdjustment: chosen.dcAdjustment, dcAdjustmentSources: chosen.dcAdjustmentSources, momentumBonus: chosen.momentumBonus, shipRollBonus: chosen.shipRollBonus, checkBonus: chosen.checkBonus, checkBonusSources: chosen.checkBonusSources, finalDc: chosen.finalDc, total: Number(roll.total), outcome: roll.outcome, rawDegreeKey, degreeKey, degreeLiftApplied: Math.max(chosen.degreeLift, successLift), degreeLiftSources: chosen.degreeLiftSources, messageId: roll.messageId ?? null, riskBenefitId: chosen.riskBid?.benefitId ?? null, riskBenefitName: chosen.riskBenefit?.name ?? null, riskEarned, riskText });
  const postCheckShipEffects = state.masteryPostCheckShipEffects?.[stationId] ?? [];
  nextState = consumeCheckAdjustments(nextState, stationId);
  const opportunity = state.encounter?.hazardOpportunities?.[stationId];
  if (opportunity?.onSuccess && ["success", "criticalSuccess"].includes(degreeKey)) {
    nextState.encounter.hazards = nextState.encounter.hazards.filter(id => id !== opportunity.hazardId);
    if (opportunity.onSuccess === "suppress" && !nextState.encounter.suppressedHazards.includes(opportunity.hazardId)) nextState.encounter.suppressedHazards.push(opportunity.hazardId);
  }
  for (const link of state.encounter?.links ?? []) {
    if (link.target !== stationId || !["success", "criticalSuccess"].includes(degreeKey) || !["success", "criticalSuccess"].includes(state.results?.[link.source]?.degreeKey)) continue;
    if (link.kind === "station-link-legend") nextState.encounter.momentum = Math.min(3, nextState.encounter.momentum + 1);
    else { nextState.encounter.nextRoundLinks ??= []; nextState.encounter.nextRoundLinks.push({ target: stationId, value: 3 }); }
  }
  const masteryRiskTierReductions = { ...(nextState.masteryRiskTierReductions ?? {}) }; const masteryPostCheckMap = { ...(nextState.masteryPostCheckShipEffects ?? {}) }; delete masteryRiskTierReductions[stationId]; delete masteryPostCheckMap[stationId];
  nextState = { ...nextState, masteryRiskTierReductions, masteryPostCheckShipEffects: masteryPostCheckMap };
  if (postCheckShipEffects.length) {
    nextState = { ...nextState, pendingShipEffects: [...(nextState.pendingShipEffects ?? []), ...postCheckShipEffects.map((effect) => ({ ...effect }))], encounter: { ...nextState.encounter, notes: [...(nextState.encounter?.notes ?? []), ...postCheckShipEffects.map((effect) => `${effect.source ?? "Arkcraft"}: ${effect.value >= 0 ? "+" : ""}${effect.value} ship-wide Strain after ${stationId} resolved.`)] } };
  }
  nextState = applyEmergencyActionResult(nextState, chosen.action, degreeKey);
  nextState = applyAuthoredRiskCommitment(nextState, chosen);
  // Guard only Strain generated by this station, not earlier pending effects.
  const priorEffects = (state.pendingShipEffects ?? []).length;
  let stationGuard = Number(state.encounter?.stationStrainGuards?.[stationId] ?? 0);
  nextState.pendingShipEffects = (nextState.pendingShipEffects ?? []).map((effect, index) => {
    if (index < priorEffects || effect.kind !== "gain-strain" || Number(effect.value) <= 0) return effect;
    const blocked = Math.min(stationGuard, Number(effect.value)); stationGuard -= blocked;
    return guardedStrainEffect(nextState.encounter, { ...effect, value: Number(effect.value) - blocked });
  });
  delete nextState.encounter.stationStrainGuards?.[stationId];
  if (riskEarned) nextState = applyEarnedRiskBenefit(nextState, chosen, degreeKey);
  nextState = { ...nextState, lastResolvedStationId: stationId, lastResolvedAt: Date.now() };
  return { nextState, stationId, chosen, roll };
}

export async function resolveActiveStation({ event, state, actor, shipRollBonus = null }) { const rolled = await rollSelectedStation({ event, state, actor, shipRollBonus }); return applyStationRollResult({ event, state, actor, roll: rolled.roll, shipRollBonus }); }
