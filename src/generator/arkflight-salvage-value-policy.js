export const ARKFLIGHT_SALVAGE_VALUE_POLICY = Object.freeze({
  intact: Object.freeze({ countsAgainstPF2eBudget: true, rewardState: "recoverable-value" }),
  usable: Object.freeze({ countsAgainstPF2eBudget: true, rewardState: "recoverable-value" }),
  resellable: Object.freeze({ countsAgainstPF2eBudget: true, rewardState: "recoverable-value" }),
  damaged: Object.freeze({ countsAgainstPF2eBudget: false, rewardState: "narrative-salvage" }),
  ruined: Object.freeze({ countsAgainstPF2eBudget: false, rewardState: "narrative-salvage" })
});

export const ARKFLIGHT_SALVAGE_CONDITIONS = Object.freeze(["intact", "damaged", "ruined"]);

function seededRoll(seed = Date.now()) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  h += 0x6D2B79F5;
  let t = h;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rollSalvageCondition(seed = Date.now()) {
  const roll = seededRoll(seed);
  if (roll < 0.35) return "intact";
  if (roll < 0.75) return "damaged";
  return "ruined";
}

export function salvageBudgetRule(condition = "intact") {
  return ARKFLIGHT_SALVAGE_VALUE_POLICY[condition] ?? ARKFLIGHT_SALVAGE_VALUE_POLICY.intact;
}

export function annotateSalvage(entry, condition = entry?.condition ?? "intact") {
  const rule = salvageBudgetRule(condition);
  return Object.freeze({
    ...entry,
    condition,
    countsAgainstPF2eBudget: rule.countsAgainstPF2eBudget,
    rewardState: rule.rewardState
  });
}

export function rollAndAnnotateSalvage(entry, { seed = `${entry?.type ?? "salvage"}:${entry?.id ?? entry?.name ?? "unknown"}` } = {}) {
  return annotateSalvage(entry, rollSalvageCondition(seed));
}
