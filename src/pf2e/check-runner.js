import { DEGREE } from "../game/constants.js";

function degreeFromOutcome(outcome) {
  const slug = String(outcome ?? "").toLowerCase().replaceAll("_", "-");
  if (slug === "critical-success") return DEGREE.CRITICAL_SUCCESS;
  if (slug === "success") return DEGREE.SUCCESS;
  if (slug === "failure") return DEGREE.FAILURE;
  if (slug === "critical-failure") return DEGREE.CRITICAL_FAILURE;
  return null;
}

export async function rollPf2eStatistic({ actor, statisticSlug, dc, label = "Arkflight Station Check", options = [] }) {
  if (!actor) throw new Error("A PF2e actor is required.");
  const statistic = actor.getStatistic?.(statisticSlug) ?? actor.skills?.[statisticSlug];
  if (!statistic?.check?.roll) throw new Error(`PF2e statistic is unavailable: ${statisticSlug}`);

  let captured = null;
  await statistic.check.roll({
    dc: { value: Number(dc) },
    label,
    options,
    callback: (roll, outcome, message) => {
      captured = {
        total: Number(roll?.total ?? 0),
        outcome: String(outcome ?? ""),
        degree: degreeFromOutcome(outcome),
        messageId: message?.id ?? null
      };
    }
  });

  if (!captured) throw new Error("PF2e check completed without a result callback.");
  return captured;
}
