import { DEGREE } from "../game/constants.js";

function normalizedOutcomeSlug(outcome) {
  return String(outcome ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replaceAll("_", "-")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function degreeFromOutcome(outcome) {
  const slug = normalizedOutcomeSlug(outcome);
  if (slug === "critical-success" || slug === "criticalsuccess") return DEGREE.CRITICAL_SUCCESS;
  if (slug === "success") return DEGREE.SUCCESS;
  if (slug === "failure") return DEGREE.FAILURE;
  if (slug === "critical-failure" || slug === "criticalfailure") return DEGREE.CRITICAL_FAILURE;
  return null;
}

function outcomeFromDegree(degree) {
  if (degree === DEGREE.CRITICAL_SUCCESS) return "critical-success";
  if (degree === DEGREE.SUCCESS) return "success";
  if (degree === DEGREE.FAILURE) return "failure";
  if (degree === DEGREE.CRITICAL_FAILURE) return "critical-failure";
  return "";
}

function readableDegree(...values) {
  for (const value of values) {
    if (Number.isInteger(value) && value >= DEGREE.CRITICAL_FAILURE && value <= DEGREE.CRITICAL_SUCCESS) return value;
  }
  return null;
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
      const outcomeText = String(outcome ?? checkRoll?.outcome ?? "");
      const degree = degreeFromOutcome(outcomeText) ?? readableDegree(checkRoll?.degreeOfSuccess, checkRoll?.degree);
      captured = {
        total: Number(checkRoll?.total ?? 0),
        outcome: outcomeText || outcomeFromDegree(degree),
        degree,
        messageId: message?.id ?? null
      };
    }
  });

  if (captured?.outcome && captured.degree !== null) return captured;

  if (roll) {
    const directOutcome = String(roll.outcome ?? roll.options?.outcome ?? "");
    const degree = degreeFromOutcome(directOutcome) ?? readableDegree(roll.degreeOfSuccess, roll.degree);
    const outcome = directOutcome || outcomeFromDegree(degree);
    if (outcome && degree !== null) {
      return {
        total: Number(roll.total ?? 0),
        outcome,
        degree,
        messageId: roll.message?.id ?? null
      };
    }
  }

  if (roll === null || roll === undefined) throw new Error("PF2e check was cancelled before a result was produced.");
  throw new Error("PF2e check completed without a readable degree of success.");
}
