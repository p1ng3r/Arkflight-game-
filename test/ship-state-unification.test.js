import test from "node:test";
import assert from "node:assert/strict";

import { createShip, normalizeShip, SHIP_SCHEMA_VERSION } from "../src/ship/ship-schema.js";
import { applyShipEffect, applyShipEffects } from "../src/ship/ship-effects.js";
import { shipConditionProfile } from "../src/ship/ship-conditions.js";

test("schema v8 migrates Watchmaster and legacy systems into canonical Ship Conditions", () => {
  const migrated = normalizeShip({
    schemaVersion: 1,
    crew: { stations: { captain: "a", engineer: "b", navigator: "c", watchmaster: "d", veilwarden: "e" }, specialists: [] },
    resources: { hull: { value: 10, max: 10 }, lifeveil: { value: 5, max: 5 }, strain: { value: 0, max: 6 }, morale: { value: 3, max: 5 }, supplies: { value: 2, max: 10 } },
    systems: { hull: "functional", arkengine: "damaged", rigging: "disabled", lifeveil: "functional", command: "damaged", helm: "functional", weapons: "damaged" },
    conditions: []
  });
  assert.equal(SHIP_SCHEMA_VERSION, 8);
  assert.equal(migrated.schemaVersion, SHIP_SCHEMA_VERSION);
  assert.equal(migrated.crew.stations.battlewatch, "d");
  assert.equal("watchmaster" in migrated.crew.stations, false);
  assert.equal(shipConditionProfile(migrated, "drive").id, "unresponsive");
  assert.equal(shipConditionProfile(migrated, "weapons").id, "malfunctioning");
  assert.equal("systems" in migrated, false);
  assert.equal("areas" in migrated, false);
});

test("global Strain is ship-wide and no threatened Area is recorded", () => {
  const ship = createShip({ resources: { strain: { value: 2, max: 8 } } });
  const result = applyShipEffect(ship, { kind: "gain-strain", value: 2, area: "rigging" });
  assert.equal(result.ship.resources.strain.value, 4);
  assert.equal(result.threatenedArea, null);
  assert.equal(result.strainResolution.flatCheckRequired, true);
  assert.equal(result.strainResolution.flatCheckDC, 5);
  assert.equal("pressure" in result.ship, false);
});

test("shared ship effects damage resources and worsen canonical Ship Conditions", () => {
  const ship = createShip({
    resources: { hull: { value: 20, max: 20 }, lifeveil: { value: 100, max: 100 }, strain: { value: 0, max: 8 } }
  });
  const result = applyShipEffects(ship, [
    { kind: "damage-hull", value: 5 },
    { kind: "damage-lifeveil", value: 10 },
    { kind: "gain-strain", value: 1 },
    { kind: "degrade-system", system: "drive" }
  ]);
  assert.equal(result.ship.resources.hull.value, 15);
  assert.equal(result.ship.resources.lifeveil.value, 90);
  assert.equal(result.ship.resources.strain.value, 1);
  assert.equal(shipConditionProfile(result.ship, "drive").id, "sluggish");
  assert.deepEqual(result.affectedSystems, ["hull", "lifeveil", "drive"]);
});
