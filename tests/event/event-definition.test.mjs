import test from "node:test";
import assert from "node:assert/strict";

import { scoreRound, clampMomentum } from "../../src/event/event-schema.js";
import { validateEventDefinition } from "../../src/event/validate-event.js";
import { FALLBACK_ACTIONS } from "../../src/content/fallback-actions.js";
import { RISK_BENEFITS, RISK_BENEFIT_BY_ID } from "../../src/content/risk-benefits.js";
import { GLASSBACK_CINDERWAKE } from "../../src/content/events/glassback-cinderwake.js";

test("Risk library contains at least 50 reusable benefits with extraordinary critical payoffs", () => {
  assert.ok(RISK_BENEFITS.length >= 50);
  for (const benefit of RISK_BENEFITS) {
    assert.ok([2, 5, 8].includes(benefit.tier));
    assert.ok(benefit.success);
    assert.ok(benefit.criticalSuccess);
    assert.notEqual(benefit.success, benefit.criticalSuccess);
  }
});

test("all five stations have fallback actions", () => {
  assert.deepEqual(Object.keys(FALLBACK_ACTIONS).sort(), ["battlewatch", "captain", "engineer", "navigator", "veilwarden"]);
});

test("PF2e degree scoring uses the locked universal bands", () => {
  assert.deepEqual(scoreRound(["criticalSuccess", "criticalSuccess", "success", "success", "success"]), { score: 7, bandId: "extraordinary", bandLabel: "Extraordinary", momentumDelta: 2 });
  assert.deepEqual(scoreRound(["success", "success", "success", "success", "failure"]), { score: 3, bandId: "strong-success", bandLabel: "Strong Success", momentumDelta: 1 });
  assert.deepEqual(scoreRound(["success", "success", "failure", "failure", "failure"]), { score: -1, bandId: "failure", bandLabel: "Failure", momentumDelta: -1 });
  assert.deepEqual(scoreRound(["success", "success", "success", "failure", "failure"]), { score: 1, bandId: "mixed-success", bandLabel: "Narrow Success", momentumDelta: 0 });
  assert.deepEqual(scoreRound(["criticalFailure", "failure", "failure", "failure", "failure"]), { score: -6, bandId: "disaster", bandLabel: "Disaster", momentumDelta: -2 });
});

test("Momentum is clamped from 0 through 3", () => {
  assert.equal(clampMomentum(-2), 0);
  assert.equal(clampMomentum(2), 2);
  assert.equal(clampMomentum(9), 3);
});

test("Glassback Cinderwake satisfies the new authored-event contract", () => {
  const result = validateEventDefinition(GLASSBACK_CINDERWAKE, { riskBenefits: RISK_BENEFIT_BY_ID });
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.equal(GLASSBACK_CINDERWAKE.planningSeconds, 180);
  assert.equal(GLASSBACK_CINDERWAKE.rounds.length, 3);
  for (const round of GLASSBACK_CINDERWAKE.rounds) {
    for (const actions of Object.values(round.stationActions)) assert.equal(actions.length, 3);
  }
});
