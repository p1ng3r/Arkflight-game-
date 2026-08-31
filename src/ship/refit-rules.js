export const SHIP_MOD_SLOT_CLASSES = Object.freeze([
  "weapon",
  "structural",
  "rigging",
  "lifeveil",
  "support",
  "utility"
]);

export const ARKENGINE_MOD_SLOT_CLASSES = Object.freeze([
  "power",
  "stability",
  "lifeveil",
  "utility"
]);

export const FLEXIBLE_SLOT_CLASS = "flexible";

export const REFIT_JOB_TYPES = Object.freeze({
  BUILD: "build",
  INSTALL: "install",
  REMOVE: "remove",
  REPAIR: "repair"
});

export const REFIT_METHODS = Object.freeze({
  CREW: "crew",
  SHIPYARD: "shipyard"
});

export const REFIT_JOB_STATES = Object.freeze({
  PLANNED: "planned",
  WORKING: "working",
  COMPLETE: "complete",
  COMPLICATION: "complication"
});

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.trunc(number));
}

function positiveInteger(value, fallback = 1) {
  return Math.max(1, nonNegativeInteger(value, fallback));
}

export function refitSpec({
  family,
  slotClass,
  tier = 1,
  slotCost = 1,
  blueprintRequired = true,
  buildPartsCost = 0,
  buildTimeHours = 0,
  buildDC = 0,
  installPartsCost = 0,
  installTimeHours = 0,
  installDC = 0,
  shipyardBuildGold = 0,
  shipyardInstallGold = 0
} = {}) {
  if (!family) throw new Error("Arkflight refit spec requires a family.");
  if (!slotClass) throw new Error("Arkflight refit spec requires a slotClass.");

  return Object.freeze({
    family,
    slotClass,
    tier: positiveInteger(tier),
    slotCost: positiveInteger(slotCost),
    blueprintRequired: Boolean(blueprintRequired),
    build: Object.freeze({
      partsCost: nonNegativeInteger(buildPartsCost),
      timeHours: nonNegativeInteger(buildTimeHours),
      dc: nonNegativeInteger(buildDC),
      shipyardGold: nonNegativeInteger(shipyardBuildGold)
    }),
    install: Object.freeze({
      partsCost: nonNegativeInteger(installPartsCost),
      timeHours: nonNegativeInteger(installTimeHours),
      dc: nonNegativeInteger(installDC),
      shipyardGold: nonNegativeInteger(shipyardInstallGold)
    })
  });
}

export function defaultRefitCosts(tier = 1, slotCost = 1) {
  const safeTier = positiveInteger(tier);
  const safeSlots = positiveInteger(slotCost);
  return Object.freeze({
    buildPartsCost: safeTier * 2 + safeSlots * 2,
    buildTimeHours: 8 * safeTier * safeSlots,
    buildDC: 14 + safeTier * 2,
    installPartsCost: Math.max(1, safeSlots),
    installTimeHours: 4 * safeTier * safeSlots,
    installDC: 13 + safeTier * 2,
    shipyardBuildGold: (safeTier * 10 + safeSlots * 5),
    shipyardInstallGold: (safeTier * 6 + safeSlots * 4)
  });
}

export function createRefitJob({
  id = "",
  type,
  method,
  componentFamily = "",
  componentId = "",
  quantity = 1,
  workerActorUuid = "",
  craftingDC = 0,
  partsCost = 0,
  goldCost = 0,
  durationHours = 0,
  remainingHours = durationHours,
  status = REFIT_JOB_STATES.PLANNED,
  result = null,
  createdAt = null,
  startedAt = null,
  completedAt = null
} = {}) {
  if (!Object.values(REFIT_JOB_TYPES).includes(type)) throw new Error(`Unknown Arkflight refit job type: ${type}`);
  if (!Object.values(REFIT_METHODS).includes(method)) throw new Error(`Unknown Arkflight refit method: ${method}`);
  if (!Object.values(REFIT_JOB_STATES).includes(status)) throw new Error(`Unknown Arkflight refit job state: ${status}`);

  return Object.freeze({
    id: String(id),
    type,
    method,
    componentFamily: String(componentFamily),
    componentId: String(componentId),
    quantity: positiveInteger(quantity),
    workerActorUuid: String(workerActorUuid),
    craftingDC: nonNegativeInteger(craftingDC),
    partsCost: nonNegativeInteger(partsCost),
    goldCost: nonNegativeInteger(goldCost),
    durationHours: nonNegativeInteger(durationHours),
    remainingHours: nonNegativeInteger(remainingHours),
    status,
    result,
    createdAt,
    startedAt,
    completedAt
  });
}
