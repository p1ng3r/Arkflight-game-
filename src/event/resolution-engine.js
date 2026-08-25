import { FALLBACK_ACTIONS } from "../content/fallback-actions.js";
import { getRiskBenefit } from "../content/risk-benefits.js";
import { rollPf2eStatistic } from "../pf2e/check-runner.js";
import { activeStationId, recordStationResult } from "./resolution-state.js";

function normalizedOutcomeSlug(outcome) {
  return String(outcome ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replaceAll("_", "-")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function normalizeOutcome(outcome) {
  const slug = normalizedOutcomeSlug(outcome);
  if (slug === "critical-success" || slug === "criticalsuccess") return "criticalSuccess";
  if (slug === "success") return "success";
  if (slug === "failure") return "failure";
  if (slug === "critical-failure" || slug === "criticalfailure") return "criticalFailure";
  throw new Error(`Unsupported PF2e outcome: ${outcome}`);
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

  return {
    stationId,
    selection,
    action,
    skill,
    riskBid,
    riskBenefit,
    finalDc: Number(skill.dc) + Number(riskBid?.tier ?? 0)
  };
}

export async function resolveActiveStation({ event, state, actor }) {
  const stationId = activeStationId(state);
  if (!stationId) throw new Error("No station is waiting to resolve.");
  const chosen = selectedResolution(event, state, stationId);
  if (!chosen) throw new Error(`The ${stationId} selection is incomplete or invalid.`);
  if (!actor) throw new Error("Select or configure a PF2e actor before rolling this station.");

  const roll = await rollPf2eStatistic({
    actor,
    statisticSlug: chosen.skill.skill,
    dc: chosen.finalDc,
    label: `Arkflight — ${chosen.action.name}`,
    options: [
      "arkflight:event",
      `arkflight:station:${stationId}`,
      `arkflight:action:${chosen.action.id}`,
      ...(chosen.riskBid ? [`arkflight:risk:${chosen.riskBid.tier}`] : [])
    ]
  });

  const degreeKey = normalizeOutcome(roll.outcome);
  const riskEarned = Boolean(chosen.riskBid && (degreeKey === "success" || degreeKey === "criticalSuccess"));
  const riskText = riskEarned
    ? degreeKey === "criticalSuccess"
      ? chosen.riskBenefit?.criticalSuccess ?? "Critical Risk benefit earned."
      : chosen.riskBenefit?.success ?? "Risk benefit earned."
    : null;

  const nextState = recordStationResult(state, stationId, {
    actorId: actor.id,
    actorName: actor.name,
    actionId: chosen.action.id,
    actionName: chosen.action.name,
    skillId: chosen.skill.id,
    skillSlug: chosen.skill.skill,
    baseDc: Number(chosen.skill.dc),
    riskTier: chosen.riskBid?.tier ?? null,
    finalDc: chosen.finalDc,
    total: roll.total,
    outcome: roll.outcome,
    degreeKey,
    messageId: roll.messageId ?? null,
    riskBenefitId: chosen.riskBid?.benefitId ?? null,
    riskBenefitName: chosen.riskBenefit?.name ?? null,
    riskEarned,
    riskText
  });

  return { nextState, stationId, chosen, roll };
}
