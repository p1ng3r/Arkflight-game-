import test from "node:test";
import assert from "node:assert/strict";
import { auditBuild, BENCHMARK_BUILD_SPECS, compareBuilds, deriveBuild } from "../scripts/combat-build-lab.mjs";

test("stock named benchmarks derive through the real Arkflight catalogs", () => {
  const rum = deriveBuild("rum-stock-l5");
  const iron = deriveBuild("iron-stock-l5");
  assert.equal(rum.validation.ok, true, rum.validation.errors.join("; "));
  assert.equal(iron.validation.ok, true, iron.validation.errors.join("; "));
  assert.equal(rum.profile.chassis, "brigantine");
  assert.equal(iron.profile.chassis, "frigate");
  // Base hull AC is no longer the simulator AC: real ship-level progression is included.
  assert.equal(rum.profile.ac, 22);
  assert.equal(iron.profile.ac, 23);
  assert.equal(rum.profile.hullMax, 160);
  assert.equal(iron.profile.hullMax, 190);
  assert.ok(rum.identity.hullTraits.includes("flexible"));
  assert.ok(iron.identity.hullTraits.includes("warship"));
});

test("level-5 balanced Rum Runner refit strengthens real derived combat stats", () => {
  const stock = deriveBuild("rum-stock-l5");
  const refit = deriveBuild("rum-balanced-l5");
  assert.equal(refit.validation.ok, true, refit.validation.errors.join("; "));
  assert.ok(refit.profile.hullMax > stock.profile.hullMax);
  assert.ok(refit.profile.ac > stock.profile.ac);
  assert.ok(refit.profile.hardness > stock.profile.hardness);
  assert.ok(refit.profile.combatSpeed > stock.profile.combatSpeed);
  assert.ok(refit.profile.maneuverability > stock.profile.maneuverability);
  assert.ok(refit.profile.shipWeaponAttackBonus > stock.profile.shipWeaponAttackBonus);
});

test("level-10 racer package expresses a genuine mobility identity", () => {
  const racer = deriveBuild("rum-racer-l10");
  const iron = deriveBuild("iron-stock-l10");
  assert.equal(racer.validation.ok, true, racer.validation.errors.join("; "));
  assert.equal(iron.validation.ok, true, iron.validation.errors.join("; "));
  assert.ok(racer.profile.combatSpeed > iron.profile.combatSpeed);
  assert.ok(racer.profile.maneuverability > iron.profile.maneuverability);
  assert.ok(racer.identity.hullPatternTraits.includes("fast"));
  assert.ok(racer.identity.arkenginePatternTraits.includes("high-discharge"));
});

test("build audit identifies legal strengthening choices and preserves non-stat utility candidates", () => {
  const audit = auditBuild("rum-stock-l5");
  assert.ok(Array.isArray(audit.strengths));
  assert.ok(Array.isArray(audit.weaknesses));
  assert.ok(Array.isArray(audit.recommendations));
  assert.ok(audit.candidates.shipMods.length > 0);
  assert.ok(audit.candidates.arkengineMods.length > 0);
  assert.ok(audit.candidates.talents.length > 0);
  assert.ok(Array.isArray(audit.zeroStatComponents));
});

test("build comparison reports real derived stat deltas", () => {
  const comparison = compareBuilds("rum-balanced-l5", "rum-stock-l5");
  assert.ok(comparison.deltaLeftMinusRight.hullIntegrity > 0);
  assert.ok(comparison.deltaLeftMinusRight.combatSpeed > 0);
  assert.ok(comparison.deltaLeftMinusRight.maneuverability > 0);
});

test("benchmark build ids are unique and stable", () => {
  const ids = Object.keys(BENCHMARK_BUILD_SPECS);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes("rum-balanced-l5"));
  assert.ok(ids.includes("rum-racer-l10"));
  assert.ok(ids.includes("iron-line-l10"));
});
