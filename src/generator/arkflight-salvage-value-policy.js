export const ARKFLIGHT_SALVAGE_VALUE_POLICY = Object.freeze({
  usable: Object.freeze({ countsAgainstPF2eBudget: true, rewardState: "recoverable-value" }),
  resellable: Object.freeze({ countsAgainstPF2eBudget: true, rewardState: "recoverable-value" }),
  damaged: Object.freeze({ countsAgainstPF2eBudget: false, rewardState: "narrative-salvage" }),
  ruined: Object.freeze({ countsAgainstPF2eBudget: false, rewardState: "narrative-salvage" })
});

export function salvageBudgetRule(condition = "usable") {
  return ARKFLIGHT_SALVAGE_VALUE_POLICY[condition] ?? ARKFLIGHT_SALVAGE_VALUE_POLICY.usable;
}

export function annotateSalvage(entry, condition = entry?.condition ?? "usable") {
  const rule = salvageBudgetRule(condition);
  return Object.freeze({
    ...entry,
    condition,
    countsAgainstPF2eBudget: rule.countsAgainstPF2eBudget,
    rewardState: rule.rewardState
  });
}
