import { DEGREE } from "../game/constants.js";

function degreeFromOutcome(outcome) {
  const slug = String(outcome ?? "").toLowerCase().replaceAll("_", "-");
  if (slug === "critical-success") return DEGREE.CRITICAL_SUCCESS;
  if (slug === "success") return DEGREE.SUCCESS;
  if (slug === "failure") return DEGREE.FAILURE;
  if (slug === "critical-failure") return DEGREE.CRITICAL_FAILURE;
  return null;
}

function outcomeFromDegree(degree) {
  if (degree === DEGREE.CRITICAL_SUCCESS) return "critical-success";
  if (degree === DEGREE.SUCCESS) return "success";
  if (degree === DEGREE.FAILURE) return "failure";
  if (degree === DEGREE.CRITICAL_FAILURE) return "critical-failure";
  return "";
}

export async function rollPf2eStatistic({ actor, statisticSlug, dc, label = "Arkflight Station Check", options = [] }) {
  if (!actor) throw new Error("A PF2e actor is required.");
  const statistic = actor.getStatistic?.(statisticSlug) ?? actor.skills?.[statisticSlug];
  if (!statistic?.check?.roll) throw new Error(`PF2e statistic is unavailable: ${statisticSlug}`);

  let captured = null;
  const roll = await statistic.check.roll({
    dc: { value: Number(dc) },
    label,
    extraRollOptions: [...options],
    callback: (checkRoll, outcome, message) => {
      captured = {
        total: Number(checkRoll?.total ?? 0),
        outcome: String(outcome ?? ""),
        degree: degreeFromOutcome(outcome),
        messageId: message?.id ?? null
      };
    }
  });

  if (captured?.outcome) return captured;
  if (roll) {
    const degree = Number.isInteger(roll.degreeOfSuccess) ? Number(roll.degreeOfSuccess) : null;
    const outcome = outcomeFromDegree(degree);
    if (outcome) {
      return {
        total: Number(roll.total ?? 0),
        outcome,
        degree,
        messageId: null
      };
    }
  }

  throw new Error("PF2e check completed without a readable degree of success.");
}
