import test from "node:test";
import assert from "node:assert/strict";

import { SHIP_CATALOGS } from "../src/content/index.js";
import { createShip, STATION_KEYS } from "../src/ship/ship-schema.js";
import { deriveShip } from "../src/ship/derive-ship.js";

test("core Hull provides three ship-derived Masteries to every station", () => {
  const ship = createShip({ hull: { chassisId: "cutter", patternId: "standard" } });
  const derived = deriveShip(ship, SHIP_CATALOGS);
  for (const station of STATION_KEYS) {
    assert.equal(derived.stationCapabilities[station].masteries.length, 3, `${station} should receive three core Hull Masteries`);
  }
  assert.deepEqual(derived.stationCapabilities.battlewatch.masteries, [
    "battlewatch-call-the-true-opening",
    "battlewatch-nothing-surprises-me",
    "battlewatch-exploit-the-break"
  ]);
});
