import test from "node:test";
import assert from "node:assert/strict";

import { SHIP_SCHEMA_VERSION, createShip, normalizeShip } from "../src/ship/ship-schema.js";

test("new ships use percentage Lifeveil and Morale resources", () => {
  const ship = createShip();
  assert.equal(SHIP_SCHEMA_VERSION, 8);
  assert.deepEqual(ship.resources.lifeveil, { value: 100, max: 100 });
  assert.deepEqual(ship.resources.morale, { value: 60, max: 100 });
});

test("legacy Lifeveil and Morale resources migrate proportionally to percent", () => {
  const ship = normalizeShip({
    schemaVersion: 6,
    resources: {
      lifeveil: { value: 27, max: 55 },
      morale: { value: 3, max: 5 }
    }
  });
  assert.deepEqual(ship.resources.lifeveil, { value: 49, max: 100 });
  assert.deepEqual(ship.resources.morale, { value: 60, max: 100 });
});

test("percentage resources clamp to zero through one hundred", () => {
  const ship = normalizeShip({
    resources: {
      lifeveil: { value: 125, max: 100 },
      morale: { value: -10, max: 100 }
    }
  });
  assert.deepEqual(ship.resources.lifeveil, { value: 100, max: 100 });
  assert.deepEqual(ship.resources.morale, { value: 0, max: 100 });
});
