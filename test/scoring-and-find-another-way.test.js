import test from "node:test";
import assert from "node:assert/strict";
import { scoreRound } from "../src/event/event-schema.js";
import { applyMasteryTechnique } from "../src/event/mastery-engine.js";

test("round scoring is symmetric and zero is Narrow Success", () => {
  assert.equal(scoreRound(["criticalSuccess","success","failure","failure","criticalFailure"]).score, -1);
  assert.equal(scoreRound(["success","success","failure","failure","success"]).score, 1);
  assert.equal(scoreRound(["success","success","failure","failure","failure"]).score, -1);
  const zero = scoreRound(["criticalSuccess","success","failure","failure","failure"]);
  assert.equal(zero.score, 0);
  assert.equal(zero.bandId, "mixed-success");
  assert.equal(zero.bandLabel, "Narrow Success");
});

test("Find Another Way grants +3 to one unresolved station check", () => {
  const state = {
    setupLocked: true,
    phase: "resolution",
    roundIndex: 0,
    order: ["captain","engineer","navigator","watchmaster","veilwarden"],
    results: {},
    masterySelections: { navigator: "navigator-find-another-way" },
    masteryUses: {},
    encounter: {
      momentum: 0,
      pressure: {},
      hazards: [],
      checkBonuses: {},
      dcAdjustments: {},
      degreeLifts: {},
      checkBonusSources: {},
      dcAdjustmentSources: {},
      degreeLiftSources: {},
      notes: [],
      pressureGuards: {},
      generalPressureGuard: 0,
      hazardGuard: 0,
      momentumLossGuard: 0,
      riskOverrides: {},
      hazardShelters: {},
      suppressedHazards: []
    }
  };
  const next = applyMasteryTechnique(state, "navigator", { targetStationId: "engineer" });
  assert.equal(next.encounter.checkBonuses.engineer, 3);
  assert.match(next.encounter.checkBonusSources.engineer[0], /\+3/);
  assert.equal(next.masteryUses.navigator.masteryId, "navigator-find-another-way");
});
