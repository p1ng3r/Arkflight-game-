import test from "node:test";
import assert from "node:assert/strict";

import {
  MORALE_RULES,
  changeMorale,
  degradeMorale,
  moraleState,
  recoverMoraleFromSafeRest,
  spendLegacyMoralePoint
} from "../src/ship/morale-rules.js";

test("Morale is a 0-100 percent resource", () => {
  const inspired = moraleState(100);
  assert.equal(inspired.label, "Inspired");
  assert.deepEqual(inspired.display, { kind: "percent", value: 100, total: 100 });
  assert.equal(moraleState(80).label, "Confident");
  assert.equal(moraleState(60).label, "Steady");
  assert.equal(moraleState(40).label, "Shaken");
  assert.equal(moraleState(20).label, "Faltering");
  assert.equal(moraleState(0).label, "Broken");
});

test("only 100 percent Inspired Morale grants the once-per-round station bonus", () => {
  assert.equal(moraleState(100).inspiredStationBonus, 1);
  assert.equal(moraleState(100).inspiredUsesPerRound, 1);
  for (const value of [0, 20, 40, 60, 80, 99]) {
    assert.equal(moraleState(value).inspiredStationBonus, 0);
    assert.equal(moraleState(value).inspiredUsesPerRound, 0);
  }
});

test("Broken morale disables Crew Tactics but positive Morale does not", () => {
  assert.equal(moraleState(0).crewTacticsAvailable, false);
  assert.equal(moraleState(1).crewTacticsAvailable, true);
  assert.equal(moraleState(100).crewTacticsAvailable, true);
});

test("Morale changes clamp from zero to one hundred", () => {
  assert.equal(changeMorale(80, 20), 100);
  assert.equal(changeMorale(100, 20), 100);
  assert.equal(changeMorale(20, -20), 0);
  assert.equal(changeMorale(0, -20), 0);
});

test("one legacy Morale point equals twenty percent", () => {
  assert.equal(MORALE_RULES.legacyPointPercent, 20);
  assert.equal(spendLegacyMoralePoint(100), 80);
  assert.equal(degradeMorale(80), 60);
});

test("eight hours safe rest restores twenty percent only up to Steady 60 percent", () => {
  assert.deepEqual(recoverMoraleFromSafeRest(20, { safeRest: true, hours: 8 }), { morale: 40, recovered: 20 });
  assert.deepEqual(recoverMoraleFromSafeRest(40, { safeRest: true, hours: 8 }), { morale: 60, recovered: 20 });
  assert.deepEqual(recoverMoraleFromSafeRest(60, { safeRest: true, hours: 8 }), { morale: 60, recovered: 0 });
  assert.deepEqual(recoverMoraleFromSafeRest(80, { safeRest: true, hours: 8 }), { morale: 60, recovered: 0 });
});

test("unsafe or too-short rest provides no Morale recovery", () => {
  assert.deepEqual(recoverMoraleFromSafeRest(20, { safeRest: false, hours: 24 }), { morale: 20, recovered: 0 });
  assert.deepEqual(recoverMoraleFromSafeRest(20, { safeRest: true, hours: 7 }), { morale: 20, recovered: 0 });
});

test("Mods and Talents can augment Morale recovery in percentage points", () => {
  const result = recoverMoraleFromSafeRest(20, {
    safeRest: true,
    hours: MORALE_RULES.safeRestHours,
    recoveryBonus: 20,
    ceilingBonus: 20
  });
  assert.deepEqual(result, { morale: 60, recovered: 40 });
});
