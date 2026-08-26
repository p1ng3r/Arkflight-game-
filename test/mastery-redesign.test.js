import test from "node:test";
import assert from "node:assert/strict";
import { BASE_MASTERY } from "../src/content/base-mastery.js";
import { applyMasteryTechnique, applyMasteryConsequenceRedirects } from "../src/event/mastery-engine.js";

const STATIONS = ["captain", "engineer", "navigator", "battlewatch", "veilwarden"];
function baseState(stationId, masteryId) {
  return {
    setupLocked: true,
    phase: "resolution",
    roundIndex: 0,
    order: [...STATIONS],
    activeOrderIndex: 0,
    results: {},
    selections: Object.fromEntries(STATIONS.map((id) => [id, { actionId: "a", skillId: "s", riskTier: null }])),
    masterySelections: { [stationId]: masteryId },
    masteryUses: {},
    pendingShipEffects: [],
    encounter: { momentum: 0, hazards: [], checkBonuses: {}, dcAdjustments: {}, degreeLifts: {}, checkBonusSources: {}, dcAdjustmentSources: {}, degreeLiftSources: {}, notes: [], strainGuards: {}, generalStrainGuard: 0, hazardGuard: 0, momentumLossGuard: 0, riskOverrides: {}, hazardShelters: {}, suppressedHazards: [] }
  };
}

test("every station now has three redesigned Mastery Techniques", () => {
  for (const [station, rows] of Object.entries(BASE_MASTERY)) assert.equal(rows.length, 3, `${station} should have exactly three Masteries`);
  assert.deepEqual(BASE_MASTERY.captain.map((m) => m.id), ["captain-carry-the-deed", "captain-set-the-pace", "captain-not-like-this"]);
  assert.equal(BASE_MASTERY.engineer[0].id, "engineer-redline-the-arkengine");
  assert.equal(BASE_MASTERY.battlewatch[0].id, "battlewatch-call-the-true-opening");
});

test("Redline improves the chosen Engineer/Navigator check and schedules exactly 1 Strain threatening Arkengine", () => {
  const state = baseState("engineer", "engineer-redline-the-arkengine");
  const next = applyMasteryTechnique(state, "engineer", { targetStationId: "navigator" });
  assert.equal(next.encounter.degreeLifts.navigator, 1);
  assert.equal(next.masteryPostCheckShipEffects.navigator[0].kind, "gain-strain");
  assert.equal(next.masteryPostCheckShipEffects.navigator[0].value, 1);
  assert.equal(next.masteryPostCheckShipEffects.navigator[0].area, "arkengine");
  assert.equal(next.masteryUses.engineer.masteryId, "engineer-redline-the-arkengine");
});

test("Call the True Opening marks one Heroic Bid for a one-tier Risk reduction", () => {
  const state = baseState("battlewatch", "battlewatch-call-the-true-opening");
  state.selections.navigator.riskTier = 8;
  const next = applyMasteryTechnique(state, "battlewatch", { targetStationId: "navigator" });
  assert.equal(next.masteryRiskTierReductions.navigator, true);
  assert.equal(next.masteryUses.battlewatch.masteryId, "battlewatch-call-the-true-opening");
});

test("Not Like This improves Failure to Success and Critical Failure to Failure", () => {
  for (const [before, after] of [["failure", "success"], ["criticalFailure", "failure"]]) {
    const state = baseState("captain", "captain-not-like-this"); state.results.engineer = { degreeKey: before }; state.lastResolvedStationId = "engineer";
    const next = applyMasteryTechnique(state, "captain", { sourceStationId: "engineer" }); assert.equal(next.results.engineer.degreeKey, after);
  }
});

test("Crosswire redirects the threatened Area without moving or duplicating global Strain", () => {
  const state = baseState("engineer", "engineer-crosswire-the-systems"); state.phase = "round-result"; state.roundResult = { bandId: "failure" };
  const armed = applyMasteryTechnique(state, "engineer", { fromArea: "arkengine", toArea: "rigging" });
  const finalized = { ...armed, pendingShipEffects: [{ kind: "gain-strain", value: 3, area: "arkengine", source: "Event round consequence" }] };
  const redirected = applyMasteryConsequenceRedirects({}, armed, finalized);
  assert.equal(redirected.pendingShipEffects[0].value, 3);
  assert.equal(redirected.pendingShipEffects[0].area, "rigging");
  assert.equal(redirected.pendingShipEffects[0].redirectedFrom, "arkengine");
});
