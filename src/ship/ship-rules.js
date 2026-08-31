export const HULL_ZERO_STATE = Object.freeze({
  id: "wrecked",
  label: "Disabled / Wrecked",
  destroyed: false,
  normalOperationAvailable: false,
  salvageable: true,
  repairable: true
});

export const MORALE_BANDS = Object.freeze({
  5: Object.freeze({ value: 5, id: "inspired", label: "Inspired" }),
  4: Object.freeze({ value: 4, id: "confident", label: "Confident" }),
  3: Object.freeze({ value: 3, id: "steady", label: "Steady" }),
  2: Object.freeze({ value: 2, id: "shaken", label: "Shaken" }),
  1: Object.freeze({ value: 1, id: "faltering", label: "Faltering" }),
  0: Object.freeze({ value: 0, id: "broken", label: "Broken" })
});

export const CARGO_BEARING_CATEGORIES = Object.freeze([
  "supplies",
  "salvageParts",
  "uninstalledShipMods",
  "uninstalledArkengineMods",
  "uninstalledWeapons",
  "ordinaryCargo"
]);

export const INSTALLED_HARDWARE_CARGO_EXEMPT = Object.freeze([
  "installedShipMods",
  "installedArkengineMods",
  "installedWeapons"
]);

export const HULL_REPAIR = Object.freeze({
  skill: "crafting",
  hullPerSalvagePart: 10,
  criticalMultiplier: 2,
  hoursPerSalvagePart: 1,
  dcShipLevelOffset: 5,
  requiresSafeRepairSite: true,
  allowedWhileUnderwayInVoid: false
});

export const HULL_REPAIR_DEGREES = Object.freeze({
  CRITICAL_SUCCESS: "criticalSuccess",
  SUCCESS: "success",
  FAILURE: "failure",
  CRITICAL_FAILURE: "criticalFailure"
});

export const WRECK_RECOMMISSION = Object.freeze({
  requiresShipyard: true,
  allowedInVoid: false,
  days: 7,
  costFractionOfReplacementValue: 0.25,
  restoredFractionOfBaseMax: 0.10,
  requiresCraftingCheck: false
});

function clampInteger(value, min, max) {
  const number = Math.trunc(Number(value) || 0);
  return Math.max(min, Math.min(max, number));
}

export function moraleBand(value) {
  return MORALE_BANDS[clampInteger(value, 0, 5)];
}

export function hullOperationalState(ship) {
  const value = Math.max(0, Number(ship?.resources?.hull?.value ?? 0));
  if (value > 0) {
    return Object.freeze({
      id: "operational",
      label: "Operational",
      destroyed: false,
      normalOperationAvailable: true,
      salvageable: true,
      repairable: true
    });
  }
  return HULL_ZERO_STATE;
}

export function isCargoBearingCategory(category) {
  return CARGO_BEARING_CATEGORIES.includes(category);
}

export function isInstalledHardwareCargoExempt(category) {
  return INSTALLED_HARDWARE_CARGO_EXEMPT.includes(category);
}

export function hullRepairDcLevel(shipLevel) {
  return Math.max(0, Math.trunc(Number(shipLevel) || 0) + HULL_REPAIR.dcShipLevelOffset);
}

export function canAttemptHullRepair({ safeRepairSite = false, underwayInVoid = false } = {}) {
  if (underwayInVoid && !HULL_REPAIR.allowedWhileUnderwayInVoid) return false;
  if (HULL_REPAIR.requiresSafeRepairSite && !safeRepairSite) return false;
  return true;
}

/**
 * Resolve one Hull HP repair attempt.
 *
 * A caller supplies how many physical Salvage Parts are committed and may pass
 * explicit permanent modifiers from installed Mods/Talents. The base rule stays
 * centralized here instead of being copied into UI, Event, or GM code.
 */
export function resolveHullRepair({
  degree,
  salvagePartsCommitted = 1,
  hullPerPartBonus = 0,
  repairMultiplier = 1,
  hoursPerPartModifier = 0
} = {}) {
  const parts = Math.max(0, Math.trunc(Number(salvagePartsCommitted) || 0));
  const perPart = Math.max(0, HULL_REPAIR.hullPerSalvagePart + Number(hullPerPartBonus || 0));
  const permanentMultiplier = Math.max(0, Number(repairMultiplier) || 0);
  const hoursPerPart = Math.max(0, HULL_REPAIR.hoursPerSalvagePart + Number(hoursPerPartModifier || 0));
  const timeHours = parts * hoursPerPart;

  switch (degree) {
    case HULL_REPAIR_DEGREES.CRITICAL_SUCCESS:
      return Object.freeze({
        success: true,
        hullRestored: Math.floor(parts * perPart * permanentMultiplier * HULL_REPAIR.criticalMultiplier),
        salvagePartsConsumed: parts,
        timeHours
      });
    case HULL_REPAIR_DEGREES.SUCCESS:
      return Object.freeze({
        success: true,
        hullRestored: Math.floor(parts * perPart * permanentMultiplier),
        salvagePartsConsumed: parts,
        timeHours
      });
    case HULL_REPAIR_DEGREES.FAILURE:
      return Object.freeze({ success: false, hullRestored: 0, salvagePartsConsumed: 0, timeHours });
    case HULL_REPAIR_DEGREES.CRITICAL_FAILURE:
      return Object.freeze({ success: false, hullRestored: 0, salvagePartsConsumed: parts, timeHours });
    default:
      throw new Error(`Unknown Hull repair degree: ${degree}`);
  }
}

export function canRecommissionWreck({ atShipyard = false, inVoid = false } = {}) {
  if (inVoid && !WRECK_RECOMMISSION.allowedInVoid) return false;
  if (WRECK_RECOMMISSION.requiresShipyard && !atShipyard) return false;
  return true;
}

export function recommissionHullValue(baseMaxHull) {
  const base = Math.max(0, Number(baseMaxHull) || 0);
  return Math.max(1, Math.floor(base * WRECK_RECOMMISSION.restoredFractionOfBaseMax));
}

export function recommissionCost(replacementValue) {
  const value = Math.max(0, Number(replacementValue) || 0);
  return value * WRECK_RECOMMISSION.costFractionOfReplacementValue;
}
