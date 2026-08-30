import test from "node:test";
import assert from "node:assert/strict";

import { STATIONS } from "../src/event/event-schema.js";
import { createPlanningState, assignActor, selectMastery, eventSetupReady, startPlanning } from "../src/event/planning-state.js";
import { BASE_MASTERY } from "../src/content/base-mastery.js";
import { applyMasteryTechnique } from "../src/event/mastery-engine.js";
import { applyCrewTactic } from "../src/event/tactics-engine.js";

function readySetup(overrides = {}) {
  let state = createPlanningState({ eventId: "test-event", roundId: "r1" });
  STATIONS.forEach((stationId, index) => {
    state = assignActor(state, stationId, `actor-${index + 1}`);
    state = selectMastery(state, stationId, overrides[stationId] ?? BASE_MASTERY[stationId][0].id);
  });
  return state;
}

test("event setup requires five unique officers and one mastery per station", () => {
  let state = createPlanningState({ eventId: "test-event", roundId: "r1" });
  assert.equal(eventSetupReady(state), false);
  state = readySetup();
  assert.equal(eventSetupReady(state), true);
  const planning = startPlanning(state, 1000);
  assert.equal(planning.setupLocked, true);
  assert.equal(planning.phase, "planning");
});

test("station mastery applies its effect and becomes expended for the event", () => {
  let state = readySetup({ navigator: "navigator-find-another-way" });
  state = startPlanning(state, 1000);
  state = {
    ...state,
    encounter: {
      momentum: 0,
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

  state = applyMasteryTechnique(state, "navigator", { targetStationId: "engineer" });
  assert.equal(state.encounter.checkBonuses.engineer, 3);
  assert.equal(state.masteryUses.navigator.masteryId, "navigator-find-another-way");
  assert.throws(() => applyMasteryTechnique(state, "navigator", { targetStationId: "captain" }), /EXPENDED/);
});

test("crew tactic spends from the shared hand and applies a targeted effect", () => {
  let state = readySetup();
  state = startPlanning(state, 1000);
  state = {
    ...state,
    crewEdgeHand: ["clear-opening"],
    encounter: {
      momentum: 0,
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

  state = applyCrewTactic(state, "clear-opening", { targetStationId: "navigator" });
  assert.equal(state.encounter.dcAdjustments.navigator, -2);
  assert.deepEqual(state.crewEdgeHand, []);
});
