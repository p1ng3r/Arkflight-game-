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
