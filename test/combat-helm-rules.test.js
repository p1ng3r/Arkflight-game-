import test from "node:test";
import assert from "node:assert/strict";

import {
  applyFreeHelmAllowance,
  canChangeFacingNow,
  facingReconciliation,
  helmRemaining,
  settleFacingCost
} from "../src/combat/helm-rules.js";
import { recordFacingChange } from "../src/combat/combatant-state.js";

function state(overrides = {}) {
  return {
    economy: {
      ap: { value: overrides.ap ?? 4, max: 4 },
      rp: { value: 1, max: 1 }
    },
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

test("temporary maneuver bonuses are never erased by the free allowance", () => {
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

test("facing is freeform during the turn and cumulative usage can exceed allowance", () => {
  let next = applyFreeHelmAllowance(state());
  next = recordFacingChange(next, 1, 60);
  next = recordFacingChange(next, 1, 120);
  next = recordFacingChange(next, 1, 60);
  assert.equal(next.mobility.heading, 60);
  assert.equal(next.mobility.maneuver.used, 3);

  const status = facingReconciliation(next);
  assert.equal(status.free, 2);
  assert.equal(status.used, 3);
  assert.equal(status.uncovered, 1);
  assert.equal(status.apRequired, 1);
  assert.equal(status.affordable, true);
});

test("end-turn settlement spends one AP block of Maneuverability for excess facing", () => {
  let next = applyFreeHelmAllowance(state());
  next = recordFacingChange(next, 3, 180);
  const settled = settleFacingCost(next);
  assert.equal(settled.apSpent, 1);
  assert.equal(settled.state.economy.ap.value, 3);
  assert.equal(settled.state.mobility.maneuver.purchases, 1);
  assert.equal(settled.state.mobility.maneuver.allowance, 4);
  assert.equal(settled.after.uncovered, 0);
});

test("multiple excess facing blocks charge the minimum AP required", () => {
  let next = applyFreeHelmAllowance(state());
  next = recordFacingChange(next, 6, 0);
  const status = facingReconciliation(next);
  assert.equal(status.free, 2);
  assert.equal(status.uncovered, 4);
  assert.equal(status.apRequired, 2);
  const settled = settleFacingCost(next);
  assert.equal(settled.apSpent, 2);
  assert.equal(settled.state.economy.ap.value, 2);
});

test("Maneuverability zero gets no free facing and cannot buy normal facing", () => {
  const zero = applyFreeHelmAllowance(state({
    mobility: {
      speed: 2,
      maneuverability: 0,
      movement: { purchases: 0, allowance: 2, used: 0 },
      maneuver: { purchases: 0, allowance: 0, used: 0 },
      heading: 0
    }
  }));
  assert.equal(zero.mobility.maneuver.allowance, 0);
  assert.equal(canChangeFacingNow(zero), false);

  const turned = recordFacingChange(zero, 1, 60);
  const status = facingReconciliation(turned);
  assert.equal(status.impossible, true);
  assert.equal(status.apRequired, null);
  assert.throws(() => settleFacingCost(turned), /Maneuverability 0/);
});

test("insufficient AP blocks facing settlement", () => {
  let next = applyFreeHelmAllowance(state({ ap: 0 }));
  next = recordFacingChange(next, 3, 180);
  const status = facingReconciliation(next);
  assert.equal(status.apRequired, 1);
  assert.equal(status.affordable, false);
  assert.throws(() => settleFacingCost(next), /only 0 AP remain/);
});
