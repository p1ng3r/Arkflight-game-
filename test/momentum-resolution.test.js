import test from "node:test";
import assert from "node:assert/strict";

import { selectedResolution } from "../src/event/resolution-engine.js";

const event = {
  rounds: [{
    stationActions: {
      captain: [{
        id: "test-action",
        name: "Test Action",
        skills: [{ id: "test-skill", label: "Diplomacy", skill: "diplomacy", dc: 18, riskBids: [] }]
      }]
    }
  }]
};

function state(momentum) {
  return {
    roundIndex: 0,
    selections: {
      captain: { actionId: "test-action", skillId: "test-skill", riskTier: null }
    },
    encounter: {
      momentum,
      pressure: {},
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
}

test("selectedResolution exposes current Crew Momentum as a station-check bonus", () => {
  assert.equal(selectedResolution(event, state(0), "captain").momentumBonus, 0);
  assert.equal(selectedResolution(event, state(1), "captain").momentumBonus, 1);
  assert.equal(selectedResolution(event, state(2), "captain").momentumBonus, 2);
  assert.equal(selectedResolution(event, state(3), "captain").momentumBonus, 3);
});

test("Momentum is clamped to the normal 0-3 range for checks", () => {
  assert.equal(selectedResolution(event, state(-4), "captain").momentumBonus, 0);
  assert.equal(selectedResolution(event, state(99), "captain").momentumBonus, 3);
});
