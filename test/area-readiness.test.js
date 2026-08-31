import test from "node:test";
import assert from "node:assert/strict";

import {
  AREA_INTEGRITY_FRACTIONS,
  applyAreaIntegrityCaps,
  areaIntegrityFraction,
  effectiveIntegrityMax,
  resolveStrainContribution
} from "../src/ship/area-readiness.js";
import { applyShipEffect } from "../src/ship/ship-effects.js";
import { AREA_STATES, createShip } from "../src/ship/ship-schema.js";

test("Area integrity bands remain 100/90/65/25/0", () => {
  assert.equal(AREA_INTEGRITY_FRACTIONS[AREA_STATES.STABLE], 1);
  assert.equal(AREA_INTEGRITY_FRACTIONS[AREA_STATES.STRESSED], 0.90);
  assert.equal(AREA_INTEGRITY_FRACTIONS[AREA_STATES.DAMAGED], 0.65);
  assert.equal(AREA_INTEGRITY_FRACTIONS[AREA_STATES.CRITICAL], 0.25);
  assert.equal(AREA_INTEGRITY_FRACTIONS[AREA_STATES.DISABLED], 0);
  assert.equal(areaIntegrityFraction("unknown"), 1);
});

test("Area degradation lowers effective Hull and Lifeveil maxima and caps Current", () => {
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

  const capped = applyAreaIntegrityCaps(ship, { hullBaseMax: 200, lifeveilBaseMax: 100 });
  assert.equal(effectiveIntegrityMax(200, AREA_STATES.DAMAGED), 130);
  assert.equal(capped.resources.hull.baseMax, 200);
  assert.equal(capped.resources.hull.max, 130);
  assert.equal(capped.resources.hull.value, 130);
  assert.equal(capped.resources.lifeveil.baseMax, 100);
  assert.equal(capped.resources.lifeveil.max, 25);
  assert.equal(capped.resources.lifeveil.value, 25);
});

test("improving an Area raises its cap but does not heal Current", () => {
  const ship = createShip({
    resources: { hull: { value: 130, max: 130 } },
    areas: { hull: { state: AREA_STATES.STRESSED } }
  });
  const capped = applyAreaIntegrityCaps(ship, { hullBaseMax: 200, lifeveilBaseMax: 0 });
  assert.equal(capped.resources.hull.max, 180);
  assert.equal(capped.resources.hull.value, 130);
});

test("direct Lifeveil depletion does not automatically degrade the Lifeveil Area", () => {
  const ship = createShip({
    resources: { lifeveil: { value: 20, max: 20 } },
    areas: { lifeveil: { state: AREA_STATES.STABLE } }
  });
  const result = applyShipEffect(ship, { kind: "damage-lifeveil", value: 20 });
  assert.equal(result.ship.resources.lifeveil.value, 0);
  assert.equal(result.ship.areas.lifeveil.state, AREA_STATES.STABLE);
});

test("Strain below threshold accumulates without Area degradation", () => {
  const ship = createShip({ resources: { strain: { value: 1, max: 4 } } });
  const result = resolveStrainContribution(ship, { amount: 2, threatenedArea: "arkengine", strainLimit: 4 });
  assert.equal(result.thresholdCrossed, false);
  assert.equal(result.areaDegraded, false);
  assert.equal(result.ship.resources.strain.value, 3);
  assert.equal(result.ship.areas.arkengine.state, AREA_STATES.STABLE);
});

test("threshold crossing degrades the threatened Area once, subtracts one limit, and keeps overflow", () => {
  const ship = createShip({
    resources: { strain: { value: 3, max: 4 } },
    areas: { rigging: { state: AREA_STATES.STABLE } }
  });
  const result = resolveStrainContribution(ship, { amount: 2, threatenedArea: "rigging", strainLimit: 4 });
  assert.equal(result.thresholdCrossed, true);
  assert.equal(result.areaDegraded, true);
  assert.equal(result.ship.areas.rigging.state, AREA_STATES.STRESSED);
  assert.equal(result.ship.resources.strain.value, 1);
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

test("a Disabled Area has no sixth state, but threshold consumption still occurs", () => {
  const ship = createShip({
    resources: { strain: { value: 4, max: 4 } },
    areas: { lifeveil: { state: AREA_STATES.DISABLED } }
  });
  const result = resolveStrainContribution(ship, { amount: 0, threatenedArea: "lifeveil", strainLimit: 4 });
  assert.equal(result.thresholdCrossed, true);
  assert.equal(result.areaDegraded, false);
  assert.equal(result.ship.areas.lifeveil.state, AREA_STATES.DISABLED);
  assert.equal(result.ship.resources.strain.value, 0);
});
