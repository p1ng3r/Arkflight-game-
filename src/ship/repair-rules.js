import { AREA_STATES, SHIP_AREA_KEYS } from "./ship-schema.js";

export const REPAIR_PACKAGES = Object.freeze({
  patch: Object.freeze({ id: "patch", label: "Patch Repair", restoreFraction: 0.10, areaSteps: 1, hours: 4, dc: 15, baseScrap: 2 }),
  standard: Object.freeze({ id: "standard", label: "Standard Repair", restoreFraction: 0.25, areaSteps: 2, hours: 8, dc: 18, baseScrap: 4 }),
  full: Object.freeze({ id: "full", label: "Full Repair", restoreFraction: 0.50, areaSteps: Infinity, hours: 16, dc: 22, baseScrap: 8 })
});

export const REPAIR_SERVICE_MULTIPLIERS = Object.freeze({ crew: 1, dock: 0.75, shipyard: 0.5 });

const AREA_ORDER = Object.freeze([
  AREA_STATES.DISABLED,
  AREA_STATES.CRITICAL,
  AREA_STATES.DAMAGED,
  AREA_STATES.STRESSED,
  AREA_STATES.STABLE
]);

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

export function improveAreaState(state, packageId) {
  const currentIndex = AREA_ORDER.indexOf(state);
  if (currentIndex < 0 || state === AREA_STATES.STABLE) return AREA_STATES.STABLE;
  const steps = repairPackage(packageId).areaSteps;
  if (!Number.isFinite(steps)) return AREA_STATES.STABLE;
  return AREA_ORDER[Math.min(AREA_ORDER.length - 1, currentIndex + Math.max(1, steps))];
}

export function repairTargetLabel(targetType, targetKey) {
  if (targetType === "resource") return targetKey === "lifeveil" ? "Lifeveil" : "Hull Integrity";
  const labels = { hull: "Hull Area", arkengine: "Arkengine", rigging: "Rigging", lifeveil: "Lifeveil Area", morale: "Morale" };
  return labels[targetKey] ?? targetKey;
}

export function validRepairTarget(targetType, targetKey) {
  if (targetType === "resource") return ["hull", "lifeveil"].includes(targetKey);
  if (targetType === "area") return SHIP_AREA_KEYS.includes(targetKey);
  return false;
}
