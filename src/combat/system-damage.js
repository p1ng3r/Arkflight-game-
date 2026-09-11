import { canonicalDamageTarget, driveConditionPenalties } from "../ship/ship-conditions.js";

export function weaponSystemThreat(weapon) {
  return canonicalDamageTarget(weapon?.data?.systemThreat ?? weapon?.systemThreat ?? "hull");
}

// Legacy direct-system-damage threshold is retired. Weapon hits deal Hull
// damage; critical hits add Strain, and Strain is the universal route to Ship
// Conditions unless a special authored effect explicitly worsens one.
export function systemDamageThreshold(_ship) {
  return Number.POSITIVE_INFINITY;
}

export function systemThreatTriggers(_ship, _options = {}) {
  return false;
}

export function areaMobilityPenalties(ship) {
  return driveConditionPenalties(ship);
}

export function applyWeaponSystemThreat(ship, { weapon = null, threat = null } = {}) {
  const threatenedArea = canonicalDamageTarget(threat ?? weaponSystemThreat(weapon));
  return Object.freeze({
    ship,
    triggered: false,
    degraded: false,
    threatenedArea,
    threshold: Number.POSITIVE_INFINITY,
    mobilityPenalties: driveConditionPenalties(ship)
  });
}
