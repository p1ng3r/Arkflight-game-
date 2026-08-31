import test from "node:test";
import assert from "node:assert/strict";

import {
  CARGO_BEARING_CATEGORIES,
  HULL_REPAIR_DEGREES,
  HULL_ZERO_STATE,
  INSTALLED_HARDWARE_CARGO_EXEMPT,
  WRECK_RECOMMISSION,
  canRecommissionWreck,
  hullOperationalState,
  isCargoBearingCategory,
  isInstalledHardwareCargoExempt,
  moraleBand,
  recommissionHullValue,
  resolveHullRepair
} from "../src/ship/ship-rules.js";

import { syncResourceMaxima } from "../src/ship/derive-ship.js";
import { applyShipEffect } from "../src/ship/ship-effects.js";
import { AREA_STATES, createShip } from "../src/ship/ship-schema.js";

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

test("ordinary Hull damage does not automatically degrade the Hull Area", () => {
  const ship = createShip({
    resources: { hull: { value: 100, max: 100 } },
    areas: { hull: { state: AREA_STATES.STABLE } }
  });
  const result = applyShipEffect(ship, { kind: "damage-hull", value: 25 });
  assert.equal(result.ship.resources.hull.value, 75);
  assert.equal(result.ship.areas.hull.state, AREA_STATES.STABLE);
});

test("Hull repair uses one Salvage Part per 10 Hull on success and 20 on critical success", () => {
  const success = resolveHullRepair({ degree: HULL_REPAIR_DEGREES.SUCCESS, salvagePartsCommitted: 1 });
  assert.deepEqual(success, { success: true, hullRestored: 10, salvagePartsConsumed: 1 });

  const critical = resolveHullRepair({ degree: HULL_REPAIR_DEGREES.CRITICAL_SUCCESS, salvagePartsCommitted: 1 });
  assert.deepEqual(critical, { success: true, hullRestored: 20, salvagePartsConsumed: 1 });
});

test("Hull repair failure preserves Salvage Parts while critical failure loses them", () => {
  const failure = resolveHullRepair({ degree: HULL_REPAIR_DEGREES.FAILURE, salvagePartsCommitted: 2 });
  assert.deepEqual(failure, { success: false, hullRestored: 0, salvagePartsConsumed: 0 });

  const criticalFailure = resolveHullRepair({ degree: HULL_REPAIR_DEGREES.CRITICAL_FAILURE, salvagePartsCommitted: 2 });
  assert.deepEqual(criticalFailure, { success: false, hullRestored: 0, salvagePartsConsumed: 2 });
});

test("Mods and Talents can augment Hull repair without replacing the base rule", () => {
  const result = resolveHullRepair({
    degree: HULL_REPAIR_DEGREES.SUCCESS,
    salvagePartsCommitted: 2,
    hullPerPartBonus: 5,
    repairMultiplier: 2
  });
  assert.deepEqual(result, { success: true, hullRestored: 60, salvagePartsConsumed: 2 });
});

test("wreck recommission requires a shipyard and is forbidden in the Void", () => {
  assert.equal(WRECK_RECOMMISSION.requiresShipyard, true);
  assert.equal(WRECK_RECOMMISSION.allowedInVoid, false);
  assert.equal(canRecommissionWreck({ atShipyard: false, inVoid: false }), false);
  assert.equal(canRecommissionWreck({ atShipyard: true, inVoid: true }), false);
  assert.equal(canRecommissionWreck({ atShipyard: true, inVoid: false }), true);
});

test("successful wreck recommission restores 10 percent of Base Max Hull", () => {
  assert.equal(recommissionHullValue(200), 20);
  assert.equal(recommissionHullValue(155), 15);
});

test("syncing derived maxima preserves a legitimate zero Hull value", () => {
  const ship = createShip({
    resources: {
      hull: { value: 0, max: 100 },
      lifeveil: { value: 0, max: 50 },
      strain: { value: 0, max: 4 },
      supplies: { value: 0, max: 10 },
      morale: { value: 3, max: 5 }
    }
  });
  const synced = syncResourceMaxima(ship, { stats: { hullIntegrity: 120, lifeveilCapacity: 60, strainCapacity: 4 } });
  assert.equal(synced.resources.hull.value, 0);
  assert.equal(synced.resources.lifeveil.value, 0);
  assert.equal(synced.resources.hull.max, 120);
});
