import test from "node:test";
import assert from "node:assert/strict";

import {
  applyFreeHelmAllowance,
  canChangeFacingNow,
  facingReconciliation,
  helmRemaining,
  settleFacingCost
} from "../src/combat/helm-rules.js";
import { commitFacing, previewFacing } from "../src/combat/combatant-state.js";

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
      committedHeading: 0,
      facing: { usedDegrees: 0, commits: 0, lastReason: null },
      ...(overrides.mobility ?? {})
    },
    stationRuntime: overrides.stationRuntime ?? { used: {}, effects: [] }
  };
}

test("normal Helm grants Maneuverability x 60 degrees of free committed turning", () => {
  const next = applyFreeHelmAllowance(state());
  assert.equal(next.mobility.movement.allowance, 5);
  assert.equal(next.mobility.maneuver.allowance, 2);
  assert.deepEqual(helmRemaining(next), {
    speed: 5,
    maneuverability: 2,
    movementRemaining: 5,
    facingRemainingDegrees: 120,
    movementUsed: 0,
    facingUsedDegrees: 0,
    movementPurchases: 0,
    maneuverPurchases: 0
  });
});

test("AP maneuver purchases stack another Maneuverability-sized 60-degree block", () => {
  const next = applyFreeHelmAllowance(state({
    mobility: {
      speed: 5,
      maneuverability: 2,
      movement: { purchases: 1, allowance: 5, used: 2 },
      maneuver: { purchases: 1, allowance: 2, used: 0 },
      heading: 0,
      committedHeading: 0,
      facing: { usedDegrees: 30, commits: 1, lastReason: "move" }
    }
  }));
  assert.equal(next.mobility.movement.allowance, 10);
  assert.equal(next.mobility.maneuver.allowance, 4);
  assert.equal(helmRemaining(next).movementRemaining, 8);
  assert.equal(helmRemaining(next).facingRemainingDegrees, 210);
});

test("temporary maneuver step bonuses convert to 60 degrees each", () => {
  const next = applyFreeHelmAllowance(state({
    mobility: {
      speed: 5,
      maneuverability: 2,
      movement: { purchases: 0, allowance: 8, used: 0 },
      maneuver: { purchases: 0, allowance: 4, used: 0 },
      heading: 0,
      committedHeading: 0,
      facing: { usedDegrees: 0, commits: 0, lastReason: null }
    }
  }));
  const status = facingReconciliation(next);
  assert.equal(status.freeDegrees, 120);
  assert.equal(status.allowanceDegrees, 240);
  assert.equal(status.bonusDegrees, 120);
});

test("preview rotation is free and never accumulates facing cost", () => {
  let next = applyFreeHelmAllowance(state());
  next = previewFacing(next, 30);
  next = previewFacing(next, 180);
  next = previewFacing(next, 330);
  next = previewFacing(next, 90);
  assert.equal(next.mobility.heading, 90);
  assert.equal(next.mobility.committedHeading, 0);
  assert.equal(next.mobility.facing.usedDegrees, 0);
});

test("commits count shortest heading distance once, regardless of preview spins", () => {
  let next = applyFreeHelmAllowance(state());
  next = previewFacing(next, 300);
  next = previewFacing(next, 30);
  next = previewFacing(next, 120);
  next = commitFacing(next, next.mobility.heading, "fire");
  assert.equal(next.mobility.committedHeading, 120);
  assert.equal(next.mobility.facing.usedDegrees, 120);

  next = previewFacing(next, 330);
  next = previewFacing(next, 180);
  next = commitFacing(next, next.mobility.heading, "move");
  assert.equal(next.mobility.facing.usedDegrees, 180);
  assert.equal(next.mobility.facing.commits, 2);
});

test("end-turn projection commits current preview and charges the minimum AP block", () => {
  let next = applyFreeHelmAllowance(state());
  next = previewFacing(next, 150);
  const projected = facingReconciliation(next, { includePreview: true });
  assert.equal(projected.usedDegrees, 150);
  assert.equal(projected.freeDegrees, 120);
  assert.equal(projected.uncoveredDegrees, 30);
  assert.equal(projected.apRequired, 1);

  const settled = settleFacingCost(next);
  assert.equal(settled.apSpent, 1);
  assert.equal(settled.state.economy.ap.value, 3);
  assert.equal(settled.state.mobility.committedHeading, 150);
  assert.equal(settled.state.mobility.maneuver.purchases, 1);
  assert.equal(settled.after.uncoveredDegrees, 0);
});

test("multiple committed turns can require multiple AP blocks", () => {
  let next = applyFreeHelmAllowance(state());
  next = commitFacing(previewFacing(next, 180), 180, "fire");
  next = commitFacing(previewFacing(next, 0), 0, "move");
  const status = facingReconciliation(next);
  assert.equal(status.usedDegrees, 360);
  assert.equal(status.freeDegrees, 120);
  assert.equal(status.uncoveredDegrees, 240);
  assert.equal(status.apRequired, 2);
  const settled = settleFacingCost(next, { includePreview: false });
  assert.equal(settled.apSpent, 2);
  assert.equal(settled.state.economy.ap.value, 2);
});

test("Maneuverability zero may preview but cannot commit unpaid normal turning", () => {
  const zero = applyFreeHelmAllowance(state({
    mobility: {
      speed: 2,
      maneuverability: 0,
      movement: { purchases: 0, allowance: 2, used: 0 },
      maneuver: { purchases: 0, allowance: 0, used: 0 },
      heading: 0,
      committedHeading: 0,
      facing: { usedDegrees: 0, commits: 0, lastReason: null }
    }
  }));
  assert.equal(zero.mobility.maneuver.allowance, 0);
  assert.equal(canChangeFacingNow(zero), true);

  const preview = previewFacing(zero, 30);
  assert.equal(preview.mobility.facing.usedDegrees, 0);
  const committed = commitFacing(preview, 30, "end-turn");
  const status = facingReconciliation(committed);
  assert.equal(status.impossible, true);
  assert.equal(status.apRequired, null);
  assert.throws(() => settleFacingCost(committed, { includePreview: false }), /Maneuverability 0/);
});

test("insufficient AP blocks end-turn facing settlement", () => {
  let next = applyFreeHelmAllowance(state({ ap: 0 }));
  next = previewFacing(next, 150);
  const status = facingReconciliation(next, { includePreview: true });
  assert.equal(status.apRequired, 1);
  assert.equal(status.affordable, false);
  assert.throws(() => settleFacingCost(next), /only 0 AP remain/);
});
