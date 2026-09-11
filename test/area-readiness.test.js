import test from "node:test";
import assert from "node:assert/strict";

import {
  AREA_INTEGRITY_FRACTIONS,
  applyAreaIntegrityCaps,
  areaIntegrityFraction,
  effectiveIntegrityMax,
  pushedAbilityStrainOutcome,
  resolveStrainContribution,
  strainDegradationTarget,
  strainFlatCheckDC,
  strainRiskState
} from "../src/ship/area-readiness.js";
import { applyShipEffect } from "../src/ship/ship-effects.js";
import { AREA_STATES, createShip } from "../src/ship/ship-schema.js";

test("legacy Area integrity bands remain available for Hull during transition", () => {
  assert.equal(AREA_INTEGRITY_FRACTIONS[AREA_STATES.STABLE], 1);
  assert.equal(AREA_INTEGRITY_FRACTIONS[AREA_STATES.STRESSED], 0.90);
  assert.equal(AREA_INTEGRITY_FRACTIONS[AREA_STATES.DAMAGED], 0.65);
  assert.equal(AREA_INTEGRITY_FRACTIONS[AREA_STATES.CRITICAL], 0.25);
  assert.equal(AREA_INTEGRITY_FRACTIONS[AREA_STATES.DISABLED], 0);
  assert.equal(areaIntegrityFraction("unknown"), 1);
});

test("legacy Hull cap remains while Lifeveil stays percentage-native at max 100", () => {
  const ship = createShip({
    resources: {
      hull: { value: 180, max: 200 },
      lifeveil: { value: 80, max: 100 }
    },
    areas: {
      hull: { state: AREA_STATES.DAMAGED },
      lifeveil: { state: AREA_STATES.CRITICAL }
    }
  });

  const capped = applyAreaIntegrityCaps(ship, { hullBaseMax: 200 });
  assert.equal(effectiveIntegrityMax(200, AREA_STATES.DAMAGED), 130);
  assert.equal(capped.resources.hull.baseMax, 200);
  assert.equal(capped.resources.hull.max, 130);
  assert.equal(capped.resources.hull.value, 130);
  assert.equal(capped.resources.lifeveil.baseMax, 100);
  assert.equal(capped.resources.lifeveil.max, 100);
  assert.equal(capped.resources.lifeveil.value, 80);
});

test("improving the legacy Hull Area raises its cap but does not heal Current", () => {
  const ship = createShip({
    resources: { hull: { value: 130, max: 130 } },
    areas: { hull: { state: AREA_STATES.STRESSED } }
  });
  const capped = applyAreaIntegrityCaps(ship, { hullBaseMax: 200 });
  assert.equal(capped.resources.hull.max, 180);
  assert.equal(capped.resources.hull.value, 130);
});

test("direct Lifeveil depletion changes its percentage without a redundant Area cap", () => {
  const ship = createShip({
    resources: { lifeveil: { value: 20, max: 100 } },
    areas: { lifeveil: { state: AREA_STATES.STABLE } }
  });
  const result = applyShipEffect(ship, { kind: "damage-lifeveil", value: 20 });
  assert.equal(result.ship.resources.lifeveil.value, 0);
  assert.equal(result.ship.resources.lifeveil.max, 100);
});

test("Strain danger bands use no check, then DC 5, 10, and 15", () => {
  assert.equal(strainFlatCheckDC(9, 20), null);
  assert.equal(strainFlatCheckDC(10, 20), 5);
  assert.equal(strainFlatCheckDC(14, 20), 5);
  assert.equal(strainFlatCheckDC(15, 20), 10);
  assert.equal(strainFlatCheckDC(17, 20), 10);
  assert.equal(strainFlatCheckDC(18, 20), 15);
  assert.equal(strainFlatCheckDC(19, 20), 15);
  assert.equal(strainFlatCheckDC(20, 20), null);
  assert.equal(strainRiskState(18, 20).thresholdReached, false);
  assert.equal(strainRiskState(20, 20).thresholdReached, true);
});

test("failed Strain checks use the locked d8 degradation table", () => {
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

test("Strain below threshold accumulates and exposes the resulting flat-check DC", () => {
  const ship = createShip({ resources: { strain: { value: 1, max: 4 } } });
  const result = resolveStrainContribution(ship, { amount: 2, threatenedArea: "arkengine", strainLimit: 4 });
  assert.equal(result.thresholdCrossed, false);
  assert.equal(result.areaDegraded, false);
  assert.equal(result.ship.resources.strain.value, 3);
  assert.equal(result.flatCheckRequired, true);
  assert.equal(result.flatCheckDC, 10);
});

test("threshold crossing still degrades the threatened Area once, subtracts one limit, and keeps overflow", () => {
  const ship = createShip({
    resources: { strain: { value: 3, max: 4 } },
    areas: { rigging: { state: AREA_STATES.STABLE } }
  });
  const result = resolveStrainContribution(ship, { amount: 2, threatenedArea: "rigging", strainLimit: 4 });
  assert.equal(result.thresholdCrossed, true);
  assert.equal(result.areaDegraded, true);
  assert.equal(result.ship.areas.rigging.state, AREA_STATES.STRESSED);
  assert.equal(result.ship.resources.strain.value, 1);
  assert.equal(result.flatCheckRequired, false);
});

test("one discrete resolution can degrade at most one Area even when overflow remains above the limit", () => {
  const ship = createShip({
    resources: { strain: { value: 3, max: 4 } },
    areas: { hull: { state: AREA_STATES.STABLE } }
  });
  const result = resolveStrainContribution(ship, { amount: 10, threatenedArea: "hull", strainLimit: 4 });
  assert.equal(result.ship.areas.hull.state, AREA_STATES.STRESSED);
  assert.equal(result.ship.resources.strain.value, 9);
});

test("Event gain-strain exposes the same danger-band information", () => {
  const ship = createShip({
    resources: { strain: { value: 1, max: 4 } }
  });
  const result = applyShipEffect(ship, { kind: "gain-strain", area: "hull", value: 1 });
  assert.equal(result.ship.resources.strain.value, 2);
  assert.equal(result.strainResolution.flatCheckRequired, true);
  assert.equal(result.strainResolution.flatCheckDC, 5);
});
