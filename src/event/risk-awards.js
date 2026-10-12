import { RISK_CHOICE_IDS, applyAutomaticRiskChoice } from "./risk-choices.js";
export function riskResolutionLabel(id) {
  return "Automatic";
}

/** Clear awards saved by older builds using the new deterministic rules. */
export function resolveSavedRiskAwardsAutomatically(state, event = null) {
  const pending = state?.encounter?.pendingRiskAwards ?? [];
  if (!pending.length) return state;
  let next = state;
  for (const award of pending) {
    if (RISK_CHOICE_IDS.has(award.benefitId)) {
      next = applyAutomaticRiskChoice(next, award, event);
      continue;
    }
    const encounter = { ...next.encounter, notes: [...(next.encounter?.notes ?? [])] };
    const unresolved = (next.order ?? []).filter(id => !next.results?.[id]);
    const target = unresolved[0] ?? null;
    const critical = award.degreeKey === "criticalSuccess";
    const addBonus = (stationId, value) => {
      if (!stationId) return;
      encounter.checkBonuses = { ...(encounter.checkBonuses ?? {}) };
      encounter.checkBonuses[stationId] = Number(encounter.checkBonuses[stationId] ?? 0) + value;
      encounter.checkBonusSources = { ...(encounter.checkBonusSources ?? {}) };
      encounter.checkBonusSources[stationId] = [...(encounter.checkBonusSources[stationId] ?? []), `${award.name}: +${value}`];
    };
    switch (award.benefitId) {
      case "failure-softener": encounter.failureStrainGuard = Number(encounter.failureStrainGuard ?? 0) + 1; break;
      case "information-next-round":
        if (event?.rounds?.[Number(award.roundIndex ?? 0) + 1]) encounter.revealedInformation = [...(encounter.revealedInformation ?? []), { kind: "next-round", roundIndex: Number(award.roundIndex ?? 0) + 1, degreeKey: award.degreeKey, source: award.name }];
        else addBonus(target, critical ? 2 : 1);
        break;
      case "narrative-breakthrough":
        encounter.momentum = Math.min(3, Number(encounter.momentum ?? 0) + 1);
        if (critical) for (const stationId of unresolved) addBonus(stationId, 1); else addBonus(target, 1);
        break;
      case "hazard-deny-risk":
        encounter.riskOverrides = { ...(encounter.riskOverrides ?? {}) };
        for (const stationId of unresolved) encounter.riskOverrides[stationId] = true;
        if (critical) addBonus(target, 1);
        break;
      case "hazard-reveal-1": // Legacy saved reward; migrate to the current Hazard Strain guard.
      case "hazard-strain-guard-1": encounter.hazardStrainGuard = Number(encounter.hazardStrainGuard ?? 0) + (critical ? 2 : 1); break;
      case "lifeveil-miracle":
        encounter.lifeveilBreachGuard = true;
        if (critical && encounter.hazards?.length) encounter.suppressedHazards = [...new Set([...(encounter.suppressedHazards ?? []), encounter.hazards[0]])];
        break;
      case "information-choice":
        encounter.revealedInformation = [...(encounter.revealedInformation ?? []), { kind: "lower-consequence-option", roundIndex: Number(award.roundIndex ?? 0), source: award.name }];
        addBonus(target, critical ? 2 : 1);
        break;
      case "condition-suppress":
        for (const stationId of unresolved) addBonus(stationId, critical ? 2 : 1);
        break;
      case "condition-stabilize":
        next = { ...next, pendingShipEffects: [...(next.pendingShipEffects ?? []), { kind: "recover-most-severe-condition", steps: award.degreeKey === "criticalSuccess" ? 2 : 1, source: `${award.name}: automatic saved-award recovery` }] };
        break;
      case "arkengine-master":
        next = { ...next, pendingShipEffects: [...(next.pendingShipEffects ?? []), { kind: "gain-strain", value: -2, source: `${award.name}: automatic saved-award Strain reduction` }] };
        break;
      default: encounter.notes.push(`${award.name}: saved Risk reward was automatically closed during the rules update.`);
    }
    next = { ...next, encounter };
  }
  next.encounter = {
    ...next.encounter,
    pendingRiskAwards: [],
    riskAwardHistory: [...(next.encounter?.riskAwardHistory ?? []), ...pending.map(award => ({ ...award, automaticallyResolved: true, migrated: true, resolvedAt: Date.now() }))]
  };
  return next;
}
