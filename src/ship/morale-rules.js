import { moraleBand } from "./ship-rules.js";

export const MORALE_RULES = Object.freeze({
  minimum: 0,
  maximum: 100,
  legacyPointPercent: 20,
  safeRestHours: 8,
  safeRestRecoveryPercent: 20,
  ordinaryRestCeiling: 60,
  inspiredStationBonus: 1,
  inspiredUsesPerRound: 1,
  degradationLossPercent: 20
});

function clampMorale(value) {
  const n = Math.round(Number(value) || 0);
  return Math.max(MORALE_RULES.minimum, Math.min(MORALE_RULES.maximum, n));
}

export function moraleState(value) {
  const morale = clampMorale(value);
  const band = moraleBand(morale);
  return Object.freeze({
    value: morale,
    band: band.id,
    label: band.label,
    display: Object.freeze({
      kind: "percent",
      value: morale,
      total: MORALE_RULES.maximum
    }),
    inspiredStationBonus: morale === 100 ? MORALE_RULES.inspiredStationBonus : 0,
    inspiredUsesPerRound: morale === 100 ? MORALE_RULES.inspiredUsesPerRound : 0,
    crewTacticsAvailable: morale > 0
  });
}

/** Change Morale by percentage points. A legacy 1-point Morale cost is now 20%. */
export function changeMorale(current, deltaPercent) {
  return clampMorale(clampMorale(current) + Number(deltaPercent || 0));
}

export function spendLegacyMoralePoint(current, points = 1) {
  const cost = Math.max(0, Number(points) || 0) * MORALE_RULES.legacyPointPercent;
  return changeMorale(current, -cost);
}

export function degradeMorale(current, steps = 1) {
  const loss = Math.max(0, Number(steps) || 0) * MORALE_RULES.degradationLossPercent;
  return changeMorale(current, -loss);
}

export function recoverMoraleFromSafeRest(current, {
  safeRest = false,
  hours = 0,
  recoveryBonus = 0,
  ceilingBonus = 0
} = {}) {
  const morale = clampMorale(current);
  if (!safeRest || Number(hours) < MORALE_RULES.safeRestHours) {
    return Object.freeze({ morale, recovered: 0 });
  }
  const recovery = Math.max(0, MORALE_RULES.safeRestRecoveryPercent + Number(recoveryBonus || 0));
  const ceiling = Math.min(
    MORALE_RULES.maximum,
    MORALE_RULES.ordinaryRestCeiling + Math.max(0, Number(ceilingBonus || 0))
  );
  const next = Math.min(ceiling, morale + recovery);
  return Object.freeze({ morale: next, recovered: Math.max(0, next - morale) });
}
