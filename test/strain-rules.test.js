import test from "node:test";
import assert from "node:assert/strict";

import {
  applyStrainDegradation,
  pushedAbilityStrainOutcome,
  resolveStrainContribution,
  strainDegradationTarget,
  strainFlatCheckDC,
  strainRiskState
} from "../src/ship/strain-rules.js";
import { createShip } from "../src/ship/ship-schema.js";
import { shipConditionProfile } from "../src/ship/ship-conditions.js";

test("Strain danger bands use no check, then DC 5, 10, and 15", () => {
  assert.equal(strainFlatCheckDC(9, 20), null);
  assert.equal(strainFlatCheckDC(10, 20), 5);
  assert.equal(strainFlatCheckDC(14, 20), 5);
  assert.equal(strainFlatCheckDC(15, 20), 10);
  assert.equal(strainFlatCheckDC(17, 20), 10);
  assert.equal(strainFlatCheckDC(18, 20), 15);
  assert.equal(strainFlatCheckDC(19, 20), 15);
  assert.equal(strainFlatCheckDC(20, 20), null);
  assert.equal(strainRiskState(20, 20).thresholdReached, true);
});

test("failed Strain checks use the locked d8 Ship Condition table", () => {
  assert.equal(strainDegradationTarget(1), "hull");
  assert.equal(strainDegradationTarget(2), "morale");
  assert.equal(strainDegradationTarget(3), "drive");
  assert.equal(strainDegradationTarget(4), "drive");
  assert.equal(strainDegradationTarget(5), "lifeveil");
  assert.equal(strainDegradationTarget(6), "hull");
  assert.equal(strainDegradationTarget(7), "weapons");
  assert.equal(strainDegradationTarget(8), "player-choice");
});

test("pushed abilities preserve the maneuver while changing Strain/consequence by degree", () => {
  assert.deepEqual(pushedAbilityStrainOutcome("criticalSuccess"), { strain: 0, directDegradation: false, flatCheckEligible: false });
  assert.deepEqual(pushedAbilityStrainOutcome("success"), { strain: 1, directDegradation: false, flatCheckEligible: true });
  assert.deepEqual(pushedAbilityStrainOutcome("failure"), { strain: 1, directDegradation: true, flatCheckEligible: false });
  assert.deepEqual(pushedAbilityStrainOutcome("criticalFailure"), { strain: 2, directDegradation: true, flatCheckEligible: false });
});

test("Strain below the limit accumulates and exposes the resulting flat-check DC", () => {
  const ship = createShip({ resources: { strain: { value: 1, max: 4 } } });
  const result = resolveStrainContribution(ship, { amount: 2, strainLimit: 4 });
  assert.equal(result.thresholdCrossed, false);
  assert.equal(result.degradationRequired, false);
  assert.equal(result.ship.resources.strain.value, 3);
  assert.equal(result.flatCheckRequired, true);
  assert.equal(result.flatCheckDC, 10);
});

test("reaching the Strain Limit requests one automatic degradation and retains overflow", () => {
  const ship = createShip({ resources: { strain: { value: 3, max: 4 } } });
  const result = resolveStrainContribution(ship, { amount: 2, strainLimit: 4 });
  assert.equal(result.thresholdCrossed, true);
  assert.equal(result.degradationRequired, true);
  assert.equal(result.ship.resources.strain.value, 1);
  assert.equal(result.flatCheckRequired, false);
});

test("already-degraded resolutions cannot cascade another Strain degradation", () => {
  const ship = createShip({ resources: { strain: { value: 3, max: 4 } } });
  const result = resolveStrainContribution(ship, { amount: 2, strainLimit: 4, alreadyDegraded: true });
  assert.equal(result.thresholdCrossed, true);
  assert.equal(result.degradationRequired, false);
  assert.equal(result.ship.resources.strain.value, 1);
});

test("d8 degradation worsens the named Ship Condition", () => {
  const ship = createShip();
  const result = applyStrainDegradation(ship, 1);
  assert.equal(result.target, "hull");
  assert.equal(shipConditionProfile(result.ship, "hull").id, "battered");
});
