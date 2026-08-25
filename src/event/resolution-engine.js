import { FALLBACK_ACTIONS } from "../content/fallback-actions.js";
import { getRiskBenefit } from "../content/risk-benefits.js";
import { rollPf2eStatistic } from "../pf2e/check-runner.js";
import { activeStationId, recordStationResult } from "./resolution-state.js";
import { applyEarnedRiskBenefit, checkAdjustments, consumeCheckAdjustments } from "./round-runtime.js";

function normalizedOutcomeSlug(outcome) {
  return String(outcome ?? "").trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").replaceAll("_", "-").replace(/\s+/g, "-").toLowerCase();
}
function normalizeOutcome(outcome) {
  const slug = normalizedOutcomeSlug(outcome);
  if (slug === "critical-success" || slug === "criticalsuccess") return "criticalSuccess";
  if (slug === "success") return "success";
  if (slug === "failure") return "failure";
  if (slug === "critical-failure" || slug === "criticalfailure") return "criticalFailure";
  throw new Error(`Unsupported PF2e outcome: ${outcome}`);
}
function liftDegree(degreeKey, amount = 0) {
  const order = ["criticalFailure", "failure", "success", "criticalSuccess"];
  const index = order.indexOf(degreeKey);
  if (index < 0 || amount <= 0) return degreeKey;
  return order[Math.min(order.length - 1, index + amount)];
}
function reducedRiskIncrease(tier) {
  const n = Number(tier ?? 0);
  if (n === 2) return 0;
  if (n === 5) return 2;
  if (n === 8) return 5;
  return n;
}

export function selectedResolution(event, state, stationId) {
  const round = event?.rounds?.[state?.roundIndex ?? 0];
  const selection = state?.selections?.[stationId];
  if (!round || !selection) return null;
  const fallback = FALLBACK_ACTIONS[stationId];
  const actions = [fallback, ...(round.stationActions?.[stationId] ?? [])].filter(Boolean);
  const action = actions.find((entry) => entry.id === selection.actionId) ?? null;
  const skill = action?.skills?.find((entry) => entry.id === selection.skillId) ?? null;
  const riskBid = skill?.riskBids?.find((entry) => Number(entry.tier) === Number(selection.riskTier)) ?? null;
  const riskBenefit = riskBid ? getRiskBenefit(riskBid.benefitId) : null;
  if (!action || !skill) return null;

  const adjustments = checkAdjustments(state, stationId);
  const authoredRiskIncrease = Number(riskBid?.tier ?? 0);
  const riskReducedByMastery = Boolean(state?.masteryRiskTierReductions?.[stationId] && riskBid);
  const riskIncrease = riskReducedByMastery ? reducedRiskIncrease(authoredRiskIncrease) : authoredRiskIncrease;
  const baseDc = Number(skill.dc);
  const preAdjustmentDc = baseDc + riskIncrease;
  const momentumBonus = Math.max(0, Math.min(3, Number(state?.encounter?.momentum ?? 0)));
  return {
    stationId, selection, action, skill, riskBid, riskBenefit, momentumBonus,
    checkBonus: adjustments.bonus,
    checkBonusSources: adjustments.bonusSources,
    dcAdjustment: adjustments.dc,
    dcAdjustmentSources: adjustments.dcSources,
    degreeLift: adjustments.degreeLift,
    degreeLiftSources: adjustments.degreeLiftSources,
    authoredRiskIncrease,
    riskIncrease,
    riskReducedByMastery,
    preAdjustmentDc,
    finalDc: Math.max(0, preAdjustmentDc + Number(adjustments.dc ?? 0))
  };
}

export async function rollSelectedStation({ event, state, actor }) {
  const stationId = activeStationId(state);
  if (!stationId) throw new Error("No station is waiting to resolve.");
  const chosen = selectedResolution(event, state, stationId);
  if (!chosen) throw new Error(`The ${stationId} selection is incomplete or invalid.`);
  if (!actor) throw new Error("The assigned PF2e actor is unavailable.");
  const modifiers = [];
  if (chosen.momentumBonus) modifiers.push({ slug: "arkflight-momentum", label: "Arkflight Momentum", modifier: chosen.momentumBonus, type: "untyped", source: `Crew Momentum ${chosen.momentumBonus}/3` });
  if (chosen.checkBonus) modifiers.push({ slug: "arkflight-crew-advantage", label: "Arkflight Crew Advantage", modifier: chosen.checkBonus, type: "untyped", source: chosen.checkBonusSources?.join("; ") || "Arkflight Heroic / Risk Benefit" });
  const roll = await rollPf2eStatistic({
    actor,
    statisticSlug: chosen.skill.skill,
    dc: chosen.finalDc,
    modifiers,
    label: `Arkflight — ${chosen.action.name}`,
    options: ["arkflight:event", `arkflight:station:${stationId}`, `arkflight:action:${chosen.action.id}`, `arkflight:momentum:${chosen.momentumBonus}`, ...(chosen.riskBid ? [`arkflight:risk:${chosen.riskBid.tier}`] : [])]
  });
  return { stationId, chosen, roll };
}

export function applyStationRollResult({ event, state, actor, roll }) {
  const stationId = activeStationId(state);
  if (!stationId) throw new Error("No station is waiting to resolve.");
  const chosen = selectedResolution(event, state, stationId);
  if (!chosen) throw new Error(`The ${stationId} selection is incomplete or invalid.`);
  if (!actor) throw new Error("The assigned PF2e actor is unavailable.");
  if (!roll || !Number.isFinite(Number(roll.total)) || !roll.outcome) throw new Error("Arkflight received an invalid PF2e roll result.");

  const rawDegreeKey = normalizeOutcome(roll.outcome);
  const degreeKey = liftDegree(rawDegreeKey, chosen.degreeLift);
  const riskEarned = Boolean(chosen.riskBid && (degreeKey === "success" || degreeKey === "criticalSuccess"));
  const riskText = riskEarned ? (degreeKey === "criticalSuccess" ? chosen.riskBenefit?.criticalSuccess : chosen.riskBenefit?.success) ?? "Heroic/Risk benefit earned." : null;

  let nextState = recordStationResult(state, stationId, {
    actorId: actor.id, actorName: actor.name,
    actionId: chosen.action.id, actionName: chosen.action.name,
    skillId: chosen.skill.id, skillSlug: chosen.skill.skill,
    baseDc: Number(chosen.skill.dc), riskTier: chosen.riskBid?.tier ?? null,
    authoredRiskIncrease: chosen.authoredRiskIncrease,
    riskIncrease: chosen.riskIncrease,
    riskReducedByMastery: chosen.riskReducedByMastery,
    preAdjustmentDc: chosen.preAdjustmentDc,
    dcAdjustment: chosen.dcAdjustment, dcAdjustmentSources: chosen.dcAdjustmentSources,
    momentumBonus: chosen.momentumBonus,
    checkBonus: chosen.checkBonus, checkBonusSources: chosen.checkBonusSources,
    finalDc: chosen.finalDc,
    total: Number(roll.total), outcome: roll.outcome,
    rawDegreeKey, degreeKey,
    degreeLiftApplied: chosen.degreeLift, degreeLiftSources: chosen.degreeLiftSources,
    messageId: roll.messageId ?? null,
    riskBenefitId: chosen.riskBid?.benefitId ?? null,
    riskBenefitName: chosen.riskBenefit?.name ?? null,
    riskEarned, riskText
  });

  const postCheckPressure = state.masteryPostCheckPressure?.[stationId] ?? null;
  nextState = consumeCheckAdjustments(nextState, stationId);
  const masteryRiskTierReductions = { ...(nextState.masteryRiskTierReductions ?? {}) };
  const masteryPostCheckPressure = { ...(nextState.masteryPostCheckPressure ?? {}) };
  delete masteryRiskTierReductions[stationId];
  delete masteryPostCheckPressure[stationId];
  nextState = { ...nextState, masteryRiskTierReductions, masteryPostCheckPressure };

  if (postCheckPressure) {
    const encounter = { ...nextState.encounter, pressure: { ...(nextState.encounter?.pressure ?? {}) }, notes: [...(nextState.encounter?.notes ?? [])] };
    encounter.pressure[postCheckPressure.system] = Math.max(0, Number(encounter.pressure[postCheckPressure.system] ?? 0) + Number(postCheckPressure.value ?? 0));
    encounter.notes.push(`${postCheckPressure.source}: Arkengine Pressure +${postCheckPressure.value} after ${stationId} resolved.`);
    nextState = { ...nextState, encounter };
  }
  if (riskEarned) nextState = applyEarnedRiskBenefit(nextState, chosen, degreeKey);
  nextState = { ...nextState, lastResolvedStationId: stationId, lastResolvedAt: Date.now() };
  return { nextState, stationId, chosen, roll };
}

export async function resolveActiveStation({ event, state, actor }) {
  const rolled = await rollSelectedStation({ event, state, actor });
  return applyStationRollResult({ event, state, actor, roll: rolled.roll });
}
