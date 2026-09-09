import test from "node:test";
import assert from "node:assert/strict";

import { applyFreeHelmAllowance, canChangeFacingNow, helmRemaining } from "../src/combat/helm-rules.js";

function state(overrides = {}) {
  return {
    mobility: {
      speed: 5,
      maneuverability: 2,
      movement: { purchases: 0, allowance: 0, used: 0 },
      maneuver: { purchases: 0, allowance: 0, used: 0 },
      heading: 0,
      ...(overrides.mobility ?? {})
    },
    stationRuntime: overrides.stationRuntime ?? { used: {}, effects: [] }
  };
}

test("normal Helm movement and facing are free once per turn", () => {
  const next = applyFreeHelmAllowance(state());
  assert.equal(next.mobility.movement.allowance, 5);
  assert.equal(next.mobility.maneuver.allowance, 2);
  assert.deepEqual(helmRemaining(next), {
    speed: 5,
    maneuverability: 2,
    movementRemaining: 5,
    maneuverRemaining: 2,
    movementUsed: 0,
    maneuverUsed: 0,
    movementPurchases: 0,
    maneuverPurchases: 0
  });
});

test("AP movement and maneuver purchases stack on top of free Helm allowance", () => {
  const next = applyFreeHelmAllowance(state({
    mobility: {
      speed: 5,
      maneuverability: 2,
      movement: { purchases: 1, allowance: 5, used: 2 },
      maneuver: { purchases: 1, allowance: 2, used: 1 },
      heading: 0
    }
  }));
  assert.equal(next.mobility.movement.allowance, 10);
  assert.equal(next.mobility.maneuver.allowance, 4);
  assert.equal(helmRemaining(next).movementRemaining, 8);
  assert.equal(helmRemaining(next).maneuverRemaining, 3);
});

test("temporary movement bonuses are never erased by the free allowance", () => {
  const next = applyFreeHelmAllowance(state({
    mobility: {
      speed: 5,
      maneuverability: 2,
      movement: { purchases: 0, allowance: 8, used: 0 },
      maneuver: { purchases: 0, allowance: 4, used: 0 },
      heading: 0
    }
  }));
  assert.equal(next.mobility.movement.allowance, 8);
  assert.equal(next.mobility.maneuver.allowance, 4);
});

test("ordinary free facing requires movement but paid maneuver can pivot in place", () => {
  const base = applyFreeHelmAllowance(state());
  assert.equal(canChangeFacingNow(base, 1), false);
  assert.equal(canChangeFacingNow({ ...base, mobility: { ...base.mobility, movement: { ...base.mobility.movement, used: 1 } } }, 1), true);
  assert.equal(canChangeFacingNow({ ...base, mobility: { ...base.mobility, maneuver: { ...base.mobility.maneuver, purchases: 1 } } }, 1), true);
});
