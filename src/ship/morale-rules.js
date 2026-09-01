import { MORALE_BANDS } from "./ship-rules.js";

export const MORALE_RULES = Object.freeze({
  minimum: 0,
  maximum: 5,
  safeRestHours: 8,
  ordinaryRestCeiling: 3,
  inspiredStationBonus: 1,
  inspiredUsesPerRound: 1
});

function clampMorale(value) {
  const n = Math.trunc(Number(value) || 0);
  return Math.max(MORALE_RULES.minimum, Math.min(MORALE_RULES.maximum, n));
}

export function moraleState(value) {
  const morale = clampMorale(value);
  const band = MORALE_BANDS[morale];
  return Object.freeze({
    value: morale,
    band: band.id,
    label: band.label,
    display: Object.freeze({
      kind: "tankards",
      filled: morale,
      total: MORALE_RULES.maximum
    }),
    inspiredStationBonus: morale === 5 ? MORALE_RULES.inspiredStationBonus : 0,
    inspiredUsesPerRound: morale === 5 ? MORALE_RULES.inspiredUsesPerRound : 0,
    crewTacticsAvailable: morale > 0
  });
}

export function changeMorale(current, delta) {
  return clampMorale(clampMorale(current) + Math.trunc(Number(delta) || 0));
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
  const recovery = Math.max(0, 1 + Math.trunc(Number(recoveryBonus) || 0));
  const ceiling = Math.min(
    MORALE_RULES.maximum,
    MORALE_RULES.ordinaryRestCeiling + Math.max(0, Math.trunc(Number(ceilingBonus) || 0))
  );
  const next = Math.min(ceiling, morale + recovery);
  return Object.freeze({ morale: next, recovered: Math.max(0, next - morale) });
}
