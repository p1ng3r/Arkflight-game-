/** One serializable encounter copy for Risk, Tactics and Mastery. */
export function cloneEncounter(value = {}) {
  const copy = structuredClone(value ?? {});
  const { pressure: _pressure, strainGuards: _legacyGuards, ...rest } = copy;
  return {
    ...rest,
    momentum: Number(copy.momentum ?? 0),
    hazards: [...(copy.hazards ?? [])], notes: [...(copy.notes ?? [])],
    checkBonuses: { ...(copy.checkBonuses ?? {}) }, dcAdjustments: { ...(copy.dcAdjustments ?? {}) },
    degreeLifts: { ...(copy.degreeLifts ?? {}) },
    checkBonusSources: { ...(copy.checkBonusSources ?? {}) }, dcAdjustmentSources: { ...(copy.dcAdjustmentSources ?? {}) },
    degreeLiftSources: { ...(copy.degreeLiftSources ?? {}) },
    generalStrainGuard: Number(copy.generalStrainGuard ?? 0), hazardGuard: Number(copy.hazardGuard ?? 0),
    momentumLossGuard: Number(copy.momentumLossGuard ?? 0),
    riskOverrides: { ...(copy.riskOverrides ?? {}) }, hazardShelters: { ...(copy.hazardShelters ?? {}) },
    suppressedHazards: [...(copy.suppressedHazards ?? [])],
    rollTwiceBest: { ...(copy.rollTwiceBest ?? {}) }, riskTierOverrides: { ...(copy.riskTierOverrides ?? {}) },
    pendingRiskAwards: [...(copy.pendingRiskAwards ?? [])], riskAwardHistory: [...(copy.riskAwardHistory ?? [])]
  };
}
