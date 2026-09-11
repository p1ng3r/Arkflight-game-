import { SHIP_CONDITION_SYSTEMS, conditionProfileById } from "./ship-conditions.js";

export const REPAIR_PACKAGES = Object.freeze({
  patch: Object.freeze({ id: "patch", label: "Patch Repair", restoreFraction: 0.10, conditionSteps: 1, hours: 4, dc: 15, baseScrap: 2 }),
  standard: Object.freeze({ id: "standard", label: "Standard Repair", restoreFraction: 0.25, conditionSteps: 2, hours: 8, dc: 18, baseScrap: 4 }),
  full: Object.freeze({ id: "full", label: "Full Repair", restoreFraction: 0.50, conditionSteps: Infinity, hours: 16, dc: 22, baseScrap: 8 })
});

export const REPAIR_SERVICE_MULTIPLIERS = Object.freeze({ crew: 1, dock: 0.75, shipyard: 0.5 });

export function repairPackage(id) {
  return REPAIR_PACKAGES[id] ?? REPAIR_PACKAGES.patch;
}

export function repairScrapCost(packageId, serviceMode = "crew") {
  const pack = repairPackage(packageId);
  const multiplier = REPAIR_SERVICE_MULTIPLIERS[serviceMode] ?? 1;
  return Math.max(1, Math.ceil(pack.baseScrap * multiplier));
}

export function resourceRepairAmount(maximum, packageId) {
  const max = Math.max(0, Number(maximum) || 0);
  return Math.max(1, Math.ceil(max * repairPackage(packageId).restoreFraction));
}

export function improveConditionState(system, state, packageId) {
  if (!SHIP_CONDITION_SYSTEMS.includes(system)) throw new Error(`Unknown Ship Condition system: ${system}`);
  const current = conditionProfileById(system, state);
  const steps = repairPackage(packageId).conditionSteps;
  const severity = Number.isFinite(steps) ? Math.max(0, current.severity - Math.max(1, steps)) : 0;
  const rows = [0, 1, 2, 3];
  const targetSeverity = rows.includes(severity) ? severity : 0;
  const ids = {
    hull: ["sound", "battered", "breached", "shattered"],
    drive: ["responsive", "sluggish", "faltering", "unresponsive"],
    weapons: ["ready", "fouled", "malfunctioning", "barely-operable"]
  };
  return ids[system][targetSeverity];
}

// Compatibility alias for older repair UI code.
export function improveAreaState(state, packageId, system = "hull") {
  return improveConditionState(system, state, packageId);
}

export function repairTargetLabel(targetType, targetKey) {
  if (targetType === "resource") {
    if (targetKey === "lifeveil") return "Lifeveil";
    return "Hull Integrity";
  }
  const labels = { hull: "Hull Condition", drive: "Drive Condition", weapons: "Weapons Condition" };
  return labels[targetKey] ?? targetKey;
}

export function validRepairTarget(targetType, targetKey) {
  if (targetType === "resource") return ["hull", "lifeveil"].includes(targetKey);
  if (["condition", "area"].includes(targetType)) return SHIP_CONDITION_SYSTEMS.includes(targetKey);
  return false;
}
