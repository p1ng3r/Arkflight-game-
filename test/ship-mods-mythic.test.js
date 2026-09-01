import test from "node:test";
import assert from "node:assert/strict";
import { SHIP_MODS } from "../src/content/ship-mod-catalog.js";
import {
  shipModAlphaTarget,
  shipModOrdinaryPurchaseAllowed,
  shipModUpgradeReplacement,
  validateShipModProgression
} from "../src/ship/ship-mod-rarity.js";

test("mythic alpha catalog is inside its locked density band", () => {
  const mythic = Object.values(SHIP_MODS).filter((mod) => mod.data.rarity === "mythic");
  const target = shipModAlphaTarget("mythic");
  assert.ok(mythic.length >= target.min, `only ${mythic.length} Mythic mods`);
  assert.ok(mythic.length <= target.max, `${mythic.length} Mythic mods exceeds Alpha target`);
  assert.equal(mythic.length, 8);
});

test("mythic ship mods are campaign rewards rather than ordinary purchases", () => {
  assert.equal(shipModOrdinaryPurchaseAllowed("mythic"), false);
});

test("mythic catalog contains bounded core-rule exceptions", () => {
  const ids = [
    "eternity-worldroot-frame",
    "worldfire-arkengine-nexus",
    "wings-of-the-first-dawn",
    "veil-of-the-first-firmament",
    "sovereign-concordance-of-five-stations",
    "singularity-strain-vault"
  ];

  for (const id of ids) {
    const mod = SHIP_MODS[id];
    assert.ok(mod, `${id} missing`);
    assert.ok(mod.data.coreRuleException, `${id} missing coreRuleException`);
    assert.equal(validateShipModProgression(mod).ok, true, `${id} failed progression validation`);
    const exception = mod.data.coreRuleException;
    assert.ok(exception.limit || exception.cost || exception.trigger || exception.usage);
  }
});

test("mythic upgrade chains replace legendary predecessors and inherit slots", () => {
  const expectations = {
    "eternity-worldroot-frame": "worldroot-keel-frame",
    "worldfire-arkengine-nexus": "arkengine-sovereign-distribution-grid",
    "wings-of-the-first-dawn": "sunpiercer-void-sails",
    "veil-of-the-first-firmament": "aegis-of-the-star-sea",
    "oracle-of-the-last-horizon": "all-seeing-battlewatch-oracle",
    "sovereign-concordance-of-five-stations": "grand-fleet-concordance",
    "singularity-strain-vault": "harmonic-strain-reservoir"
  };

  for (const [id, predecessor] of Object.entries(expectations)) {
    const replacement = shipModUpgradeReplacement(SHIP_MODS[id]);
    assert.equal(replacement.mode, "replace");
    assert.equal(replacement.inheritsSlot, true);
    assert.deepEqual(replacement.replaces, [predecessor]);
  }
});

test("mythic catalog spans hull, arkengine, rigging, lifeveil, command, detection, and strain", () => {
  assert.ok(SHIP_MODS["eternity-worldroot-frame"].effects.some((effect) => effect.target === "hullIntegrity" && effect.value === 120));
  assert.ok(SHIP_MODS["worldfire-arkengine-nexus"].effects.some((effect) => effect.target === "strainCapacity" && effect.value === 12));
  assert.ok(SHIP_MODS["wings-of-the-first-dawn"].effects.some((effect) => effect.target === "combatSpeed" && effect.value === 7));
  assert.ok(SHIP_MODS["veil-of-the-first-firmament"].effects.some((effect) => effect.target === "lifeveilCapacity" && effect.value === 80));
  assert.equal(SHIP_MODS["sovereign-concordance-of-five-stations"].data.effectFamily, "morale-command");
  assert.ok(SHIP_MODS["oracle-of-the-last-horizon"].effects.some((effect) => effect.target === "detection" && effect.value === 12));
  assert.ok(SHIP_MODS["singularity-strain-vault"].effects.some((effect) => effect.target === "strainCapacity" && effect.value === 10));
});

test("mythic defensive and drive sets carry high-tier bonuses", () => {
  assert.deepEqual(SHIP_MODS["crown-of-the-ninefold-fortress"].data.resistances, [
    { type: "physical", value: 15 },
    { type: "force", value: 10 }
  ]);
  assert.equal(SHIP_MODS["crown-of-the-ninefold-fortress"].data.synergies[0].requiresMods.length, 2);
  assert.equal(SHIP_MODS["wings-of-the-first-dawn"].data.synergies[0].requiresMods.length, 2);
  assert.equal(SHIP_MODS["singularity-strain-vault"].data.synergies[0].requiresMods.length, 2);
});

test("every mythic mod satisfies shared progression validation", () => {
  for (const mod of Object.values(SHIP_MODS).filter((entry) => entry.data.rarity === "mythic")) {
    const result = validateShipModProgression(mod);
    assert.equal(result.ok, true, `${mod.id}: ${result.errors.join(", ")}`);
  }
});
