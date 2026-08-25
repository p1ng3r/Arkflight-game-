import test from "node:test";
import assert from "node:assert/strict";
import { BASE_MASTERY } from "../src/content/base-mastery.js";
import { applyMasteryTechnique, applyMasteryConsequenceRedirects } from "../src/event/mastery-engine.js";

function baseState(stationId, masteryId) {
  return {
    setupLocked: true,
    phase: "resolution",
    roundIndex: 0,
    order: ["captain", "engineer", "navigator", "watchmaster", "veilwarden"],
    activeOrderIndex: 0,
    results: {},
    selections: Object.fromEntries(["captain", "engineer", "navigator", "watchmaster", "veilwarden"].map((id) => [id, { actionId: "a", skillId: "s", riskTier: null }])),
    masterySelections: { [stationId]: masteryId },
    masteryUses: {},
    encounter: {
      momentum: 0,
      pressure: { hull: 0, arkengine: 0, lifeveil: 0, rigging: 0 },
      hazards: [],
      checkBonuses: {}, dcAdjustments: {}, degreeLifts: {},
      checkBonusSources: {}, dcAdjustmentSources: {}, degreeLiftSources: {},
      notes: [], pressureGuards: {}, generalPressureGuard: 0, hazardGuard: 0,
      momentumLossGuard: 0, riskOverrides: {}, hazardShelters: {}, suppressedHazards: []
    }
  };
}

test("every station now has three redesigned Mastery Techniques", () => {
  for (const [station, rows] of Object.entries(BASE_MASTERY)) {
    assert.equal(rows.length, 3, `${station} should have exactly three Masteries`);
  }
  assert.deepEqual(BASE_MASTERY.captain.map((m) => m.id), ["captain-carry-the-deed", "captain-set-the-pace", "captain-not-like-this"]);
  assert.equal(BASE_MASTERY.engineer[0].id, "engineer-redline-the-arkengine");
  assert.equal(BASE_MASTERY.watchmaster[0].id, "watchmaster-call-the-true-opening");
});

test("Redline improves the chosen Engineer/Navigator check and schedules exactly 1 Arkengine Pressure", () => {
  const state = baseState("engineer", "engineer-redline-the-arkengine");
  const next = applyMasteryTechnique(state, "engineer", { targetStationId: "navigator" });
  assert.equal(next.encounter.degreeLifts.navigator, 1);
  assert.equal(next.masteryPostCheckPressure.navigator.value, 1);
  assert.equal(next.masteryPostCheckPressure.navigator.system, "arkengine");
  assert.equal(next.masteryUses.engineer.masteryId, "engineer-redline-the-arkengine");
});

test("Call the True Opening marks one Heroic Bid for a one-tier Risk reduction", () => {
  const state = baseState("watchmaster", "watchmaster-call-the-true-opening");
  state.selections.navigator.riskTier = 8;
  const next = applyMasteryTechnique(state, "watchmaster", { targetStationId: "navigator" });
  assert.equal(next.masteryRiskTierReductions.navigator, true);
  assert.equal(next.masteryUses.watchmaster.masteryId, "watchmaster-call-the-true-opening");
});

test("Not Like This improves Failure to Success and Critical Failure to Failure", () => {
  for (const [before, after] of [["failure", "success"], ["criticalFailure", "failure"]]) {
    const state = baseState("captain", "captain-not-like-this");
    state.results.engineer = { degreeKey: before };
    state.lastResolvedStationId = "engineer";
    const next = applyMasteryTechnique(state, "captain", { sourceStationId: "engineer" });
    assert.equal(next.results.engineer.degreeKey, after);
  }
});

test("Crosswire redirects up to 2 Pressure from the authored consequence", () => {
  const state = baseState("engineer", "engineer-crosswire-the-systems");
  state.phase = "round-result";
  state.roundResult = { bandId: "failure" };
  const armed = applyMasteryTechnique(state, "engineer", { fromSystem: "arkengine", toSystem: "rigging" });
  const event = { rounds: [{ outcomes: { failure: { effects: [{ kind: "pressure", system: "arkengine", value: 3 }] } } }] };
  const finalized = { ...armed, encounter: { ...armed.encounter, pressure: { ...armed.encounter.pressure, arkengine: 3, rigging: 0 } } };
  const redirected = applyMasteryConsequenceRedirects(event, armed, finalized);
  assert.equal(redirected.encounter.pressure.arkengine, 1);
  assert.equal(redirected.encounter.pressure.rigging, 2);
});
