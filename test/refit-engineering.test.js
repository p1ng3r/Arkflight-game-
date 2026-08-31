import test from "node:test";
import assert from "node:assert/strict";
import { resolveEngineeringInstallOutcome } from "../src/ship/refit-engineering.js";

test("critical success installs in half time", () => {
  const result = resolveEngineeringInstallOutcome("criticalSuccess", 5);
  assert.equal(result.install, true);
  assert.equal(result.complication, false);
  assert.equal(result.timeHours, 3);
  assert.equal(result.timeMultiplier, 0.5);
});

test("success installs in listed time", () => {
  const result = resolveEngineeringInstallOutcome("success", 4);
  assert.equal(result.install, true);
  assert.equal(result.timeHours, 4);
  assert.equal(result.timeMultiplier, 1);
});

test("failure consumes listed installation time without installing", () => {
  const result = resolveEngineeringInstallOutcome("failure", 4);
  assert.equal(result.install, false);
  assert.equal(result.complication, false);
  assert.equal(result.timeHours, 4);
  assert.equal(result.timeMultiplier, 1);
});

test("critical failure consumes listed time and creates a complication outcome", () => {
  const result = resolveEngineeringInstallOutcome("criticalFailure", 4);
  assert.equal(result.install, false);
  assert.equal(result.complication, true);
  assert.equal(result.timeHours, 4);
  assert.equal(result.timeMultiplier, 1);
});
