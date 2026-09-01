import test from "node:test";
import assert from "node:assert/strict";
import { SHIP_MODS } from "../src/content/ship-mod-catalog.js";
import { shipModAlphaTarget, validateShipModProgression } from "../src/ship/ship-mod-rarity.js";

test("legendary alpha catalog is inside its locked density band", () => {
  const mods = Object.values(SHIP_MODS).filter((mod) => mod.data.rarity === "legendary");
  const target = shipModAlphaTarget("legendary");
  assert.ok(mods.length >= target.min, `only ${mods.length} legendary mods`);
  assert.ok(mods.length <= target.max, `${mods.length} legendary mods exceeds Alpha target`);
  assert.equal(mods.length, 15);
});

test("legendary mods remain valid under the shared progression contract", () => {
  const mods = Object.values(SHIP_MODS).filter((mod) => mod.data.rarity === "legendary");
  for (const mod of mods) {
    const result = validateShipModProgression(mod);
    assert.equal(result.ok, true, `${mod.id}: ${result.errors.join(", ")}`);
  }
});

test("legendary structural chain is build-defining", () => {
  const frame = SHIP_MODS["worldroot-keel-frame"];
  assert.deepEqual(frame.data.upgradeChain.requiresMods, ["living-adamant-frame"]);
  assert.ok(frame.effects.some((effect) => effect.target === "hullIntegrity" && effect.value === 85));
  assert.ok(frame.effects.some((effect) => effect.target === "armorClass" && effect.value === 2));

  const fortress = SHIP_MODS["fortress-of-nine-bulkheads"];
  assert.equal(fortress.data.synergies[0].requiresMods.length, 2);
  assert.ok(fortress.capabilities.includes("multi-compartment-breach-isolation"));
});

test("legendary resistance suites materially exceed epic versions", () => {
  assert.deepEqual(SHIP_MODS["phoenix-heart-mantle"].data.resistances, [
    { type: "fire", value: 20 },
    { type: "acid", value: 10 }
  ]);
  assert.deepEqual(SHIP_MODS["star-iron-voidweave"].data.resistances, [
    { type: "cold", value: 15 },
    { type: "void", value: 15 },
    { type: "force", value: 5 }
  ]);
  assert.equal(SHIP_MODS["sevenfold-prismatic-aegis"].data.resistances.length, 4);
});

test("legendary drive suite combines speed maneuver and three-mod synergy", () => {
  const sails = SHIP_MODS["sunpiercer-void-sails"];
  assert.ok(sails.effects.some((effect) => effect.target === "combatSpeed" && effect.value === 5));

  const vanes = SHIP_MODS["seraphic-vector-vanes"];
  assert.ok(vanes.effects.some((effect) => effect.target === "maneuverability" && effect.value === 5));
  assert.equal(vanes.data.synergies[0].requiresMods.length, 2);
  assert.equal(vanes.data.synergies[0].id, "seraphic-drive-suite");
});

test("legendary command and salvage fittings change play rather than only numbers", () => {
  assert.ok(SHIP_MODS["admirals-living-command-web"].capabilities.includes("distributed-station-control"));
  assert.ok(SHIP_MODS["all-seeing-battlewatch-oracle"].capabilities.includes("ambush-negation-support"));
  assert.equal(SHIP_MODS["grand-fleet-concordance"].data.synergies[0].requiresMods.length, 2);
  assert.ok(SHIP_MODS["leviathan-salvage-foundry"].data.ruleModifiers.some((rule) => rule.kind === "salvage-yield-bonus-fraction" && rule.value === 0.25));
});
