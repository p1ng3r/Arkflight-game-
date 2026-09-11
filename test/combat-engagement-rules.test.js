import test from "node:test";
import assert from "node:assert/strict";

import {
  adjacencyDistanceLimit,
  beginBoardingEngagement,
  breakGrappleOutcome,
  clearEngagement,
  grappleOutcome,
  isAdjacentShip,
  isMooredWith,
  moorEngagement,
  ramDamageAmounts,
  ramImpactProfile
} from "../src/combat/index.js";

test("large ship token footprints count edge adjacency instead of center-only adjacency", () => {
  assert.equal(adjacencyDistanceLimit({ sourceWidth: 1, sourceHeight: 1, targetWidth: 1, targetHeight: 1 }), 1);
  assert.equal(adjacencyDistanceLimit({ sourceWidth: 2, sourceHeight: 2, targetWidth: 2, targetHeight: 2 }), 2);
  assert.equal(isAdjacentShip({ distanceHexes: 2, sourceWidth: 2, sourceHeight: 2, targetWidth: 2, targetHeight: 2 }), true);
  assert.equal(isAdjacentShip({ distanceHexes: 2.5, sourceWidth: 2, sourceHeight: 2, targetWidth: 2, targetHeight: 2 }), false);
});

test("grapple save degrees produce Moored and boarding opportunity states", () => {
  assert.equal(grappleOutcome(2).moored, false);
  assert.equal(grappleOutcome(1).moored, false);
  assert.equal(grappleOutcome(0).moored, true);
  assert.equal(grappleOutcome(0).boardingOpportunity, false);
  assert.equal(grappleOutcome(-1).moored, true);
  assert.equal(grappleOutcome(-1).boardingOpportunity, true);
});

test("break grapple succeeds on success or critical success", () => {
  assert.equal(breakGrappleOutcome(2).escaped, true);
  assert.equal(breakGrappleOutcome(1).escaped, true);
  assert.equal(breakGrappleOutcome(0).escaped, false);
  assert.equal(breakGrappleOutcome(-1).escaped, false);
});

test("engagement state records Moored and boarding then clears cleanly", () => {
  const moored = moorEngagement({}, "enemy", { boardingOpportunity: true });
  assert.equal(isMooredWith(moored, "enemy"), true);
  assert.equal(moored.boardingOpportunity, true);
  const boarded = beginBoardingEngagement(moored, "enemy", "player");
  assert.equal(boarded.boardingActive, true);
  assert.equal(boarded.boardingInitiator, "player");
  assert.equal(clearEngagement(boarded).mooredTo, null);
});

test("ram impact scales with hull tier and approach while ramships reduce recoil", () => {
  const normal = ramImpactProfile({ hullTier: 3, movementUsed: 4, ramship: false });
  const ramship = ramImpactProfile({ hullTier: 3, movementUsed: 4, ramship: true });
  assert.equal(normal.formula, "5d10");
  assert.equal(ramship.formula, "6d10");
  assert.equal(normal.recoilFactor, 0.5);
  assert.equal(ramship.recoilFactor, 0.25);
});

test("ram damage uses PF2e basic-save scaling and applies Hardness after the save", () => {
  const success = ramDamageAmounts({ rolled: 20, targetSaveDegree: 1, targetHardness: 4, attackerHardness: 3, recoilFactor: 0.5 });
  assert.equal(success.targetIncoming, 10);
  assert.equal(success.targetHullDamage, 6);
  assert.equal(success.recoilIncoming, 5);
  assert.equal(success.attackerHullDamage, 2);

  const criticalSuccess = ramDamageAmounts({ rolled: 20, targetSaveDegree: 2, targetHardness: 4, attackerHardness: 3, recoilFactor: 0.5 });
  assert.equal(criticalSuccess.targetHullDamage, 0);
  assert.equal(criticalSuccess.attackerHullDamage, 0);

  const criticalFailure = ramDamageAmounts({ rolled: 20, targetSaveDegree: -1, targetHardness: 4, attackerHardness: 3, recoilFactor: 0.5 });
  assert.equal(criticalFailure.targetIncoming, 40);
  assert.equal(criticalFailure.targetHullDamage, 36);
  assert.equal(criticalFailure.recoilIncoming, 10);
});
