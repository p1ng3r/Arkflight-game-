import test from "node:test";
import assert from "node:assert/strict";

import {
  LIFEVEIL,
  LIFEVEIL_RECOVERY,
  LIFEVEIL_RECOVERY_DEGREES,
  lifeveilOperationalState,
  resolveLifeveilRecovery
} from "../src/ship/lifeveil-rules.js";

test("Lifeveil is an environmental envelope and magical shield, not temporary HP", () => {
  assert.equal(LIFEVEIL.protectsAtmosphere, true);
  assert.equal(LIFEVEIL.protectsEnvironment, true);
  assert.equal(LIFEVEIL.magicalShielding, true);
  assert.equal(LIFEVEIL.temporaryHitPoints, false);
});

test("zero Lifeveil is offline and requires environmental exposure handling", () => {
  const offline = lifeveilOperationalState({ resources: { lifeveil: { value: 0 } } });
  assert.equal(offline.id, "offline");
  assert.equal(offline.environmentalEnvelopeAvailable, false);
  assert.equal(offline.magicalShieldingAvailable, false);
  assert.equal(offline.exposureRequired, true);

  const online = lifeveilOperationalState({ resources: { lifeveil: { value: 1 } } });
  assert.equal(online.id, "online");
  assert.equal(online.exposureRequired, false);
});

test("Lifeveil stabilization uses one hour and the four approved PF2e skills", () => {
  assert.equal(LIFEVEIL_RECOVERY.hours, 1);
  assert.deepEqual(LIFEVEIL_RECOVERY.skills, ["arcana", "religion", "nature", "occultism"]);
  assert.equal(LIFEVEIL_RECOVERY.defaultConsumableCost, 0);
});

test("Lifeveil Success restores 10 percent and Critical Success restores 20 percent of Base Max", () => {
  const success = resolveLifeveilRecovery({
    degree: LIFEVEIL_RECOVERY_DEGREES.SUCCESS,
    baseMaxLifeveil: 100
  });
  assert.deepEqual(success, {
    success: true,
    lifeveilRestored: 10,
    strainGained: 0,
    consumablesConsumed: 0,
    timeHours: 1
  });

  const critical = resolveLifeveilRecovery({
    degree: LIFEVEIL_RECOVERY_DEGREES.CRITICAL_SUCCESS,
    baseMaxLifeveil: 100
  });
  assert.deepEqual(critical, {
    success: true,
    lifeveilRestored: 20,
    strainGained: 0,
    consumablesConsumed: 0,
    timeHours: 1
  });
});

test("Lifeveil Failure restores nothing and Critical Failure adds one Strain", () => {
  const failure = resolveLifeveilRecovery({
    degree: LIFEVEIL_RECOVERY_DEGREES.FAILURE,
    baseMaxLifeveil: 100
  });
  assert.deepEqual(failure, {
    success: false,
    lifeveilRestored: 0,
    strainGained: 0,
    consumablesConsumed: 0,
    timeHours: 1
  });

  const criticalFailure = resolveLifeveilRecovery({
    degree: LIFEVEIL_RECOVERY_DEGREES.CRITICAL_FAILURE,
    baseMaxLifeveil: 100
  });
  assert.deepEqual(criticalFailure, {
    success: false,
    lifeveilRestored: 0,
    strainGained: 1,
    consumablesConsumed: 0,
    timeHours: 1
  });
});

test("Mods and Talents can augment Lifeveil recovery without replacing the base rule", () => {
  const improved = resolveLifeveilRecovery({
    degree: LIFEVEIL_RECOVERY_DEGREES.SUCCESS,
    baseMaxLifeveil: 100,
    successFractionBonus: 0.05,
    recoveryMultiplier: 2,
    hoursModifier: -0.5
  });
  assert.deepEqual(improved, {
    success: true,
    lifeveilRestored: 30,
    strainGained: 0,
    consumablesConsumed: 0,
    timeHours: 0.5
  });

  const protectedFailure = resolveLifeveilRecovery({
    degree: LIFEVEIL_RECOVERY_DEGREES.CRITICAL_FAILURE,
    baseMaxLifeveil: 100,
    criticalFailureStrainModifier: -1
  });
  assert.equal(protectedFailure.strainGained, 0);
});
