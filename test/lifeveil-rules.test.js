import test from "node:test";
import assert from "node:assert/strict";

import {
  LIFEVEIL,
  LIFEVEIL_RECOVERY,
  LIFEVEIL_RECOVERY_DEGREES,
  changeLifeveil,
  degradeLifeveil,
  lifeveilOperationalState,
  lifeveilState,
  resolveLifeveilRecovery
} from "../src/ship/lifeveil-rules.js";

test("Lifeveil is a 0-100 environmental envelope, not temporary HP", () => {
  assert.equal(LIFEVEIL.maximum, 100);
  assert.equal(LIFEVEIL.standardAbilityCostPercent, 5);
  assert.equal(LIFEVEIL.degradationLossPercent, 25);
  assert.equal(LIFEVEIL.protectsAtmosphere, true);
  assert.equal(LIFEVEIL.protectsEnvironment, true);
  assert.equal(LIFEVEIL.magicalShielding, true);
  assert.equal(LIFEVEIL.temporaryHitPoints, false);
});

test("Lifeveil bands are Stable, Degraded, Critical, and Collapsed", () => {
  assert.equal(lifeveilState(100).label, "Stable");
  assert.equal(lifeveilState(76).label, "Stable");
  assert.equal(lifeveilState(75).label, "Degraded");
  assert.equal(lifeveilState(51).label, "Degraded");
  assert.equal(lifeveilState(50).label, "Critical");
  assert.equal(lifeveilState(1).label, "Critical");
  assert.equal(lifeveilState(0).label, "Collapsed");
});

test("zero Lifeveil is offline and requires environmental exposure handling", () => {
  const offline = lifeveilOperationalState({ resources: { lifeveil: { value: 0, max: 100 } } });
  assert.equal(offline.id, "offline");
  assert.equal(offline.environmentalEnvelopeAvailable, false);
  assert.equal(offline.magicalShieldingAvailable, false);
  assert.equal(offline.exposureRequired, true);

  const online = lifeveilOperationalState({ resources: { lifeveil: { value: 1, max: 100 } } });
  assert.equal(online.id, "online");
  assert.equal(online.exposureRequired, false);
});

test("Lifeveil changes and degradation use percentage points", () => {
  assert.equal(changeLifeveil(100, -5), 95);
  assert.equal(degradeLifeveil(100), 75);
  assert.equal(degradeLifeveil(30, 2), 0);
});

test("Lifeveil stabilization uses one hour and the four approved PF2e skills", () => {
  assert.equal(LIFEVEIL_RECOVERY.hours, 1);
  assert.deepEqual(LIFEVEIL_RECOVERY.skills, ["arcana", "religion", "nature", "occultism"]);
  assert.equal(LIFEVEIL_RECOVERY.defaultConsumableCost, 0);
});

test("Lifeveil Success restores 10 percentage points and Critical Success restores 20", () => {
  const success = resolveLifeveilRecovery({ degree: LIFEVEIL_RECOVERY_DEGREES.SUCCESS });
  assert.equal(success.lifeveilRestored, 10);
  const critical = resolveLifeveilRecovery({ degree: LIFEVEIL_RECOVERY_DEGREES.CRITICAL_SUCCESS });
  assert.equal(critical.lifeveilRestored, 20);
});

test("Lifeveil Failure restores nothing and Critical Failure adds one Strain", () => {
  assert.equal(resolveLifeveilRecovery({ degree: LIFEVEIL_RECOVERY_DEGREES.FAILURE }).lifeveilRestored, 0);
  assert.equal(resolveLifeveilRecovery({ degree: LIFEVEIL_RECOVERY_DEGREES.CRITICAL_FAILURE }).strainGained, 1);
});

test("Mods and Talents can augment Lifeveil recovery without replacing the base rule", () => {
  const improved = resolveLifeveilRecovery({
    degree: LIFEVEIL_RECOVERY_DEGREES.SUCCESS,
    successPercentBonus: 5,
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
    criticalFailureStrainModifier: -1
  });
  assert.equal(protectedFailure.strainGained, 0);
});
