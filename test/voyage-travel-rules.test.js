import test from "node:test";
import assert from "node:assert/strict";

import { strategicRoutePlan, strategicTravelRate } from "../src/voyage/travel-rules.js";

test("strategic travel uses authored Arkengine days per galactic hex", () => {
  const ship = { progression: { level: 4, specializationId: null } };
  const engine = { data: { tier: 3 } };
  const derived = { stats: { voyageSpeedTravelHexDays: 4 } };
  const rate = strategicTravelRate({ ship, derived, engine });
  assert.equal(rate.tier, 3);
  assert.equal(rate.daysPerHex, 4);
  assert.equal(rate.hexesPerDay, 0.25);
});

test("route planning multiplies galactic hex costs rather than combat movement", () => {
  const ship = { progression: { level: 4, specializationId: null } };
  const engine = { data: { tier: 3 } };
  const derived = { stats: { voyageSpeedTravelHexDays: 4 } };
  const route = strategicRoutePlan({ ship, derived, engine, distanceHexes: 3, hexMultipliers: [1, 1.5, 2] });
  assert.equal(route.weightedHexes, 4.5);
  assert.equal(route.totalDays, 18);
});

test("Trader established routes reduce strategic travel time by 20 percent", () => {
  const ship = { progression: { level: 5, specializationId: "trader" } };
  const engine = { data: { tier: 3 } };
  const derived = { stats: { voyageSpeedTravelHexDays: 4 } };
  const route = strategicRoutePlan({ ship, derived, engine, distanceHexes: 2, knownRoute: true, establishedCommercialRoute: true });
  assert.equal(route.rawDays, 8);
  assert.equal(route.totalDays, 6.4);
  assert.equal(route.timeMultiplier, 0.8);
});
