import test from "node:test";
import assert from "node:assert/strict";

import { CREW_EDGE_CARDS, CREW_TACTIC_THEATERS } from "../../src/content/crew-edge-cards.js";
import { appendRoundHistory, scoreEvent, shiftEventResult, tacticAwardCountForResult } from "../../src/event/event-outcome.js";
import { applyCrewTactic } from "../../src/event/tactics-engine.js";

function history(scores) {
  let state = { eventHistory: [] };
  scores.forEach((score, roundIndex) => {
    state = appendRoundHistory(state, {
      roundId: `r${roundIndex + 1}`,
      roundIndex,
      roundResult: { score, bandId: score >= 3 ? "strong-success" : score >= 0 ? "mixed-success" : score >= -4 ? "failure" : "disaster", momentumDelta: 0 },
      momentumBefore: 0,
      momentumAfter: 0,
      results: {}
    });
  });
  return state.eventHistory;
}

test("every Crew Tactic declares one of the three theaters of play", () => {
  assert.deepEqual(CREW_TACTIC_THEATERS, ["planning", "resolution", "event-result"]);
  for (const card of Object.values(CREW_EDGE_CARDS)) assert.ok(CREW_TACTIC_THEATERS.includes(card.theater), `${card.id} has invalid theater`);
});

test("Event Result uses every completed round instead of only the final round", () => {
  const result = scoreEvent(history([8, 4, -3]));
  assert.equal(result.totalScore, 9);
  assert.equal(result.averageRoundScore, 3);
  assert.equal(result.id, "success");
});

test("aggregate Event Result has four final degrees", () => {
  assert.equal(scoreEvent(history([8, 8, 8])).id, "criticalSuccess");
  assert.equal(scoreEvent(history([2, 2, 2])).id, "success");
  assert.equal(scoreEvent(history([-2, -2, -2])).id, "failure");
  assert.equal(scoreEvent(history([-8, -6, -7])).id, "criticalFailure");
});

test("successful Event Results award more Crew Tactics", () => {
  assert.equal(tacticAwardCountForResult("criticalFailure"), 0);
  assert.equal(tacticAwardCountForResult("failure"), 0);
  assert.equal(tacticAwardCountForResult("success"), 1);
  assert.equal(tacticAwardCountForResult("criticalSuccess"), 2);
});

test("Event Result tactic can lift failure one step but cannot manufacture critical success", () => {
  const failure = scoreEvent(history([-2, -2, -2]));
  assert.equal(shiftEventResult(failure, 1, { failuresOnly: true }).id, "success");
  const success = scoreEvent(history([2, 2, 2]));
  assert.equal(shiftEventResult(success, 1, { failuresOnly: true }).id, "success");
});

test("Planning Tactics can modify every unresolved station for the round", () => {
  const order = ["captain", "engineer", "navigator", "battlewatch", "veilwarden"];
  const state = { phase: "planning", order, results: {}, crewEdgeHand: ["all-hands-together"], encounter: {} };
  const next = applyCrewTactic(state, "all-hands-together");
  for (const station of order) assert.equal(next.encounter.checkBonuses[station], 1);
  assert.equal(next.crewEdgeHand.length, 0);
});

test("Measured Gamble steps the rolled Heroic tier down but leaves the selected reward tier untouched", () => {
  const state = {
    phase: "resolution",
    order: ["captain"],
    results: {},
    selections: { captain: { riskTier: 8 } },
    crewEdgeHand: ["measured-gamble"],
    encounter: {}
  };
  const next = applyCrewTactic(state, "measured-gamble", { targetStationId: "captain" });
  assert.equal(next.selections.captain.riskTier, 8);
  assert.equal(next.encounter.riskTierOverrides.captain, 5);
});

test("Take the Better Line marks exactly one unresolved station for fortune resolution", () => {
  const state = { phase: "resolution", order: ["captain", "engineer"], results: {}, selections: {}, crewEdgeHand: ["take-the-better-line"], encounter: {} };
  const next = applyCrewTactic(state, "take-the-better-line", { targetStationId: "engineer" });
  assert.equal(next.encounter.rollTwiceBest.engineer, true);
  assert.equal(next.encounter.rollTwiceBest.captain, undefined);
});
