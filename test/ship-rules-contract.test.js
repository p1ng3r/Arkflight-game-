import test from "node:test";
import assert from "node:assert/strict";

import {
  CARGO_BEARING_CATEGORIES,
  HULL_ZERO_STATE,
  INSTALLED_HARDWARE_CARGO_EXEMPT,
  hullOperationalState,
  isCargoBearingCategory,
  isInstalledHardwareCargoExempt,
  moraleBand
} from "../src/ship/ship-rules.js";

test("0 Hull means disabled/wrecked, not destroyed", () => {
  const state = hullOperationalState({ resources: { hull: { value: 0 } } });
  assert.equal(state, HULL_ZERO_STATE);
  assert.equal(state.id, "wrecked");
  assert.equal(state.destroyed, false);
  assert.equal(state.normalOperationAvailable, false);
  assert.equal(state.salvageable, true);
  assert.equal(state.repairable, true);
});

test("positive Hull remains operational", () => {
  const state = hullOperationalState({ resources: { hull: { value: 1 } } });
  assert.equal(state.id, "operational");
  assert.equal(state.normalOperationAvailable, true);
});

test("Morale uses the locked 0-5 named bands", () => {
  assert.equal(moraleBand(5).label, "Inspired");
  assert.equal(moraleBand(4).label, "Confident");
  assert.equal(moraleBand(3).label, "Steady");
  assert.equal(moraleBand(2).label, "Shaken");
  assert.equal(moraleBand(1).label, "Faltering");
  assert.equal(moraleBand(0).label, "Broken");
  assert.equal(moraleBand(99).label, "Inspired");
  assert.equal(moraleBand(-4).label, "Broken");
});

test("physical stores and uninstalled hardware are cargo-bearing", () => {
  for (const category of [
    "supplies",
    "salvageParts",
    "uninstalledShipMods",
    "uninstalledArkengineMods",
    "uninstalledWeapons",
    "ordinaryCargo"
  ]) {
    assert.equal(isCargoBearingCategory(category), true, category);
  }
  assert.deepEqual(CARGO_BEARING_CATEGORIES.length, 6);
});

test("installed hardware occupies installation capacity instead of Cargo", () => {
  for (const category of ["installedShipMods", "installedArkengineMods", "installedWeapons"]) {
    assert.equal(isInstalledHardwareCargoExempt(category), true, category);
    assert.equal(isCargoBearingCategory(category), false, category);
  }
  assert.deepEqual(INSTALLED_HARDWARE_CARGO_EXEMPT.length, 3);
});
