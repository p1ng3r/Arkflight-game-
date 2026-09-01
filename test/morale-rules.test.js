import test from "node:test";
import assert from "node:assert/strict";

import {
  MORALE_RULES,
  changeMorale,
  moraleState,
  recoverMoraleFromSafeRest
} from "../src/ship/morale-rules.js";

test("Morale presents as tankards while remaining a 0-5 resource", () => {
  const inspired = moraleState(5);
  assert.equal(inspired.label, "Inspired");
  assert.deepEqual(inspired.display, { kind: "tankards", filled: 5, total: 5 });
  assert.equal(moraleState(0).label, "Broken");
});

test("only Inspired grants the once-per-round +1 station circumstance bonus", () => {
  assert.equal(moraleState(5).inspiredStationBonus, 1);
  assert.equal(moraleState(5).inspiredUsesPerRound, 1);
  for (const value of [0, 1, 2, 3, 4]) {
    assert.equal(moraleState(value).inspiredStationBonus, 0);
    assert.equal(moraleState(value).inspiredUsesPerRound, 0);
  }
});

test("Broken morale disables Crew Tactics but other bands do not", () => {
  assert.equal(moraleState(0).crewTacticsAvailable, false);
  assert.equal(moraleState(1).crewTacticsAvailable, true);
  assert.equal(moraleState(5).crewTacticsAvailable, true);
});

test("Morale changes clamp from zero to five", () => {
  assert.equal(changeMorale(4, 1), 5);
  assert.equal(changeMorale(5, 3), 5);
  assert.equal(changeMorale(1, -1), 0);
  assert.equal(changeMorale(0, -5), 0);
});

test("eight hours safe rest restores one Morale only up to Steady", () => {
  assert.deepEqual(recoverMoraleFromSafeRest(1, { safeRest: true, hours: 8 }), { morale: 2, recovered: 1 });
  assert.deepEqual(recoverMoraleFromSafeRest(2, { safeRest: true, hours: 8 }), { morale: 3, recovered: 1 });
  assert.deepEqual(recoverMoraleFromSafeRest(3, { safeRest: true, hours: 8 }), { morale: 3, recovered: 0 });
  assert.deepEqual(recoverMoraleFromSafeRest(4, { safeRest: true, hours: 8 }), { morale: 3, recovered: 0 });
});

test("unsafe or too-short rest provides no Morale recovery", () => {
  assert.deepEqual(recoverMoraleFromSafeRest(1, { safeRest: false, hours: 24 }), { morale: 1, recovered: 0 });
  assert.deepEqual(recoverMoraleFromSafeRest(1, { safeRest: true, hours: 7 }), { morale: 1, recovered: 0 });
});

test("Mods and Talents can augment Morale recovery through shared hooks", () => {
  const result = recoverMoraleFromSafeRest(1, {
    safeRest: true,
    hours: MORALE_RULES.safeRestHours,
    recoveryBonus: 1,
    ceilingBonus: 1
  });
  assert.deepEqual(result, { morale: 3, recovered: 2 });
});
