import test from "node:test";
import assert from "node:assert/strict";
import { applyEarnedRiskBenefit } from "../src/event/round-runtime.js";

test("Controlled Overdrive critical rewards the next unresolved Engineer or Navigator", () => {
  const state = {
    order: ["captain", "engineer", "navigator", "watchmaster", "veilwarden"],
    results: { captain: {}, engineer: {} },
    activeOrderIndex: 2,
    encounter: {
      momentum: 2,
      pressure: { hull: 0, arkengine: 0, lifeveil: 0, rigging: 0 },
      hazards: [],
      checkBonuses: {},
      dcAdjustments: {},
      degreeLifts: {},
      checkBonusSources: {},
      dcAdjustmentSources: {},
      degreeLiftSources: {},
      notes: []
    }
  };

  const chosen = {
    stationId: "engineer",
    riskBid: { parameters: { targetStationId: "watchmaster" } },
    riskBenefit: { id: "arkengine-overdrive", name: "Controlled Overdrive" }
  };

  const next = applyEarnedRiskBenefit(state, chosen, "criticalSuccess");
  assert.equal(next.encounter.checkBonuses.navigator, 3);
  assert.equal(next.encounter.checkBonuses.watchmaster, undefined);
  assert.match(next.encounter.checkBonusSources.navigator[0], /Controlled Overdrive/);
});
