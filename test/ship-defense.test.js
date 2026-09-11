import test from "node:test";
import assert from "node:assert/strict";

import { basicShipSaveMultiplier, shipCollisionDC, shipManeuverDC, shipManeuverSaveModifier } from "../src/combat/ship-defense.js";

test("Maneuver Save scales like an Arkflight whole-ship defense", () => {
  const ship = { progression: { level: 5 } };
  const derived = { stats: { maneuverability: 2, defensiveCheckBonus: 1 } };
  const modifier = shipManeuverSaveModifier({ ship, derived });
  assert.equal(shipManeuverDC({ ship, derived }), 10 + modifier);
  assert.ok(modifier > 0);
});

test("Collision DC derives from Maneuver DC without opposed d20 rolls", () => {
  const ship = { progression: { level: 5 } };
  const derived = { stats: { maneuverability: 2, defensiveCheckBonus: 0 } };
  assert.equal(shipCollisionDC({ ship, derived, circumstance: 2 }), shipManeuverDC({ ship, derived }) + 2);
});

test("ship basic saves use PF2e degree multipliers", () => {
  assert.equal(basicShipSaveMultiplier(2), 0);
  assert.equal(basicShipSaveMultiplier(1), 0.5);
  assert.equal(basicShipSaveMultiplier(0), 1);
  assert.equal(basicShipSaveMultiplier(-1), 2);
});
