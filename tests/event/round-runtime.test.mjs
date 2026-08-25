import test from "node:test";
import assert from "node:assert/strict";

import { applyEarnedRiskBenefit, checkAdjustments, encounterFromEvent, finalizeRound } from "../../src/event/round-runtime.js";

const baseEvent = {
  startingState: { momentum: 0, pressure: { hull: 0, arkengine: 0, lifeveil: 0, rigging: 0 }, hazards: [] },
  rounds: [{
    id: "r1",
    title: "The Wreck's Ember Wake",
    outcomes: {
      "mixed-success": {
        narrative: "The ship clears the lane, but burning wreckage hammers the hull and adds 1 Hull Pressure.",
        effects: [{ kind: "pressure", system: "hull", value: 1 }]
      }
    }
  }]
};

test("earned Ease Their Burden reduces the target station DC", () => {
  const state = {
    order: ["navigator", "watchmaster", "engineer", "captain", "veilwarden"],
    activeOrderIndex: 1,
    results: { navigator: { degreeKey: "success" } },
    encounter: encounterFromEvent(baseEvent)
  };
  const chosen = {
    riskBid: { benefitId: "dc-next-1", parameters: { targetStationId: "watchmaster" } },
    riskBenefit: { id: "dc-next-1", name: "Ease Their Burden" }
  };
  const next = applyEarnedRiskBenefit(state, chosen, "success");
  assert.equal(checkAdjustments(next, "watchmaster").dc, -1);
});

test("critical Ease Their Burden reduces the target station DC by 2", () => {
  const state = {
    order: ["navigator", "watchmaster", "engineer", "captain", "veilwarden"],
    activeOrderIndex: 1,
    results: { navigator: { degreeKey: "criticalSuccess" } },
    encounter: encounterFromEvent(baseEvent)
  };
  const chosen = {
    riskBid: { benefitId: "dc-next-1", parameters: { targetStationId: "watchmaster" } },
    riskBenefit: { id: "dc-next-1", name: "Ease Their Burden" }
  };
  const next = applyEarnedRiskBenefit(state, chosen, "criticalSuccess");
  assert.equal(checkAdjustments(next, "watchmaster").dc, -2);
});

test("Mixed Success keeps Momentum and applies authored Hull Pressure", () => {
  const state = {
    phase: "round-result",
    roundIndex: 0,
    roundResult: { score: 2, bandId: "mixed-success", momentumDelta: 0 },
    results: {
      captain: { actionName: "Mark the Beast", degreeKey: "failure", riskEarned: false },
      engineer: { actionName: "Brace the Arkengine", degreeKey: "failure", riskEarned: false },
      navigator: { actionName: "Plot the Wake", degreeKey: "success", riskEarned: true, riskBenefitName: "Ease Their Burden" },
      watchmaster: { actionName: "Shadow the Beast", degreeKey: "failure", riskEarned: false },
      veilwarden: { actionName: "Sing the Pressure", degreeKey: "success", riskEarned: false }
    },
    encounter: encounterFromEvent(baseEvent)
  };
  const next = finalizeRound(baseEvent, state);
  assert.equal(next.encounter.momentum, 0);
  assert.equal(next.encounter.pressure.hull, 1);
  assert.equal(next.consequenceApplied, true);
  assert.match(next.roundNarrative, /crew|ship/i);
  assert.match(next.roundNarrative, /Ease Their Burden/);
});
