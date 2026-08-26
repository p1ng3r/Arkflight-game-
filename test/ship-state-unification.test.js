import test from "node:test";
import assert from "node:assert/strict";
import { createShip, normalizeShip, SHIP_SCHEMA_VERSION } from "../src/ship/ship-schema.js";
import { applyShipEffect, applyShipEffects } from "../src/ship/ship-effects.js";

test("schema v2 migrates Watchmaster and legacy systems into five Areas", () => {
  const migrated = normalizeShip({
    schemaVersion: 1,
    crew: { stations: { captain: "a", engineer: "b", navigator: "c", watchmaster: "d", veilwarden: "e" }, specialists: [] },
    resources: { hull: { value: 10, max: 10 }, lifeveil: { value: 5, max: 5 }, strain: { value: 0, max: 6 }, morale: { value: 3, max: 5 }, supplies: { value: 2, max: 10 } },
    systems: { hull: "functional", arkengine: "damaged", rigging: "disabled", lifeveil: "functional", command: "damaged", helm: "functional", weapons: "functional" },
    conditions: []
  });
  assert.equal(migrated.schemaVersion, SHIP_SCHEMA_VERSION);
  assert.equal(migrated.crew.stations.battlewatch, "d");
  assert.equal("watchmaster" in migrated.crew.stations, false);
  assert.equal(migrated.areas.arkengine.state, "damaged");
  assert.equal(migrated.areas.rigging.state, "disabled");
  assert.equal(migrated.areas.morale.state, "damaged");
  assert.equal("systems" in migrated, false);
});

test("global Strain records one threatened Area without creating Pressure", () => {
  const ship = createShip({ resources: { strain: { value: 2, max: 8 } } });
  const result = applyShipEffect(ship, { kind: "gain-strain", value: 2, area: "rigging" });
  assert.equal(result.ship.resources.strain.value, 4);
  assert.equal(result.threatenedArea, "rigging");
  assert.equal("pressure" in result.ship, false);
});

test("shared ship effects can damage resources and degrade persistent Areas", () => {
  const ship = createShip({ resources: { hull: { value: 20, max: 20 }, lifeveil: { value: 12, max: 12 }, strain: { value: 0, max: 8 } } });
  const result = applyShipEffects(ship, [
    { kind: "damage-hull", value: 5 },
    { kind: "damage-lifeveil", value: 2 },
    { kind: "gain-strain", value: 1, area: "arkengine" },
    { kind: "degrade-area", area: "arkengine", steps: 1 }
  ]);
  assert.equal(result.ship.resources.hull.value, 15);
  assert.equal(result.ship.resources.lifeveil.value, 10);
  assert.equal(result.ship.resources.strain.value, 1);
  assert.equal(result.ship.areas.arkengine.state, "stressed");
  assert.deepEqual(result.threatenedAreas, ["hull", "lifeveil", "arkengine"]);
});
