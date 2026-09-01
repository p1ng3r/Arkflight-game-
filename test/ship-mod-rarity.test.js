import test from "node:test";
import assert from "node:assert/strict";
import { SHIP_MODS } from "../src/content/ship-mod-catalog.js";
import {
  SHIP_MOD_RARITIES,
  SHIP_MOD_RARITY_RULES,
  SHIP_MOD_ACQUISITION_RULES,
  SHIP_MOD_EFFECT_FAMILIES,
  SHIP_MOD_SYNERGY_RULES,
  shipModAvailableAtLevel,
  shipModAlphaTarget,
  shipModOrdinaryPurchaseAllowed,
  shipModPrerequisitesMet,
  shipModUpgradeReplacement,
  activeShipModSynergies,
  shipModInstallEligibility,
  validateShipModProgression
} from "../src/ship/ship-mod-rarity.js";

test("ship mod rarity ladder and level gates are locked", () => {
  assert.deepEqual(SHIP_MOD_RARITIES, ["standard", "rare", "epic", "legendary", "mythic"]);
  assert.equal(SHIP_MOD_RARITY_RULES.standard.minShipLevel, 1);
  assert.equal(SHIP_MOD_RARITY_RULES.rare.minShipLevel, 3);
  assert.equal(SHIP_MOD_RARITY_RULES.epic.minShipLevel, 7);
  assert.equal(SHIP_MOD_RARITY_RULES.legendary.minShipLevel, 12);
  assert.equal(SHIP_MOD_RARITY_RULES.mythic.minShipLevel, 17);
});

test("alpha catalog density targets are locked", () => {
  assert.deepEqual(shipModAlphaTarget("standard"), { min: 22, max: 26 });
  assert.deepEqual(shipModAlphaTarget("rare"), { min: 20, max: 22 });
  assert.deepEqual(shipModAlphaTarget("epic"), { min: 18, max: 20 });
  assert.deepEqual(shipModAlphaTarget("legendary"), { min: 15, max: 16 });
  assert.deepEqual(shipModAlphaTarget("mythic"), { min: 8, max: 9 });
});

for (const rarity of ["standard", "rare", "epic"]) {
  test(`${rarity} alpha catalog is inside its locked density band`, () => {
    const mods = Object.values(SHIP_MODS).filter((mod) => mod.data.rarity === rarity);
    const target = shipModAlphaTarget(rarity);
    assert.ok(mods.length >= target.min, `only ${mods.length} ${rarity} mods`);
    assert.ok(mods.length <= target.max, `${mods.length} ${rarity} mods exceeds Alpha target`);
  });
}

test("standard alpha catalog includes broad ship-profile options", () => {
  assert.deepEqual(SHIP_MODS["firebreak-plating"].data.resistances, [{ type: "fire", value: 5 }]);
  assert.deepEqual(SHIP_MODS["stormgrounding-mesh"].data.resistances, [{ type: "electricity", value: 5 }]);
  assert.ok(SHIP_MODS["trim-sail-regulators"].effects.some((effect) => effect.target === "combatSpeed" && effect.value === 1));
  assert.equal(SHIP_MODS["crew-muster-bell-network"].data.effectFamily, "morale-command");
  assert.equal(SHIP_MODS["veil-warded-bulkheads"].data.effectFamily, "lifeveil");
});

test("rare alpha catalog includes upgrades, resistances, command, and synergies", () => {
  assert.deepEqual(SHIP_MODS["aether-bound-ribbing"].data.upgradeChain.requiresMods, ["reinforced-structural-ribbing"]);
  assert.deepEqual(SHIP_MODS["stormglass-firebreak-shell"].data.resistances, [{ type: "fire", value: 10 }]);
  assert.deepEqual(SHIP_MODS["deep-void-armor-web"].data.resistances, [{ type: "cold", value: 5 }, { type: "void", value: 5 }]);
  assert.equal(SHIP_MODS["crew-cohesion-network"].data.effectFamily, "morale-command");
  assert.ok(SHIP_MODS["battlewake-control-fins"].data.synergies.length > 0);
});

test("epic alpha catalog includes stronger upgrades and three-mod sets", () => {
  assert.deepEqual(SHIP_MODS["living-adamant-frame"].data.upgradeChain.requiresMods, ["aether-bound-ribbing"]);
  assert.ok(SHIP_MODS["living-adamant-frame"].effects.some((effect) => effect.target === "hullIntegrity" && effect.value === 55));
  assert.deepEqual(SHIP_MODS["phoenix-firebreak-mantle"].data.resistances, [{ type: "fire", value: 15 }, { type: "acid", value: 5 }]);
  assert.equal(SHIP_MODS["battlewake-vector-vanes"].data.synergies[0].requiresMods.length, 2);
  assert.equal(SHIP_MODS["fleet-command-concordance"].data.synergies[0].requiresMods.length, 2);
  assert.equal(SHIP_MODS["harmonic-strain-reservoir"].data.synergies[0].requiresMods.length, 2);
});

test("ship mods may target broad ship statistics and systems", () => {
  for (const family of ["armor-class", "resistance", "maneuverability", "speed", "cargo", "detection", "cross-system"]) {
    assert.ok(SHIP_MOD_EFFECT_FAMILIES.includes(family));
  }
});

test("legendary and mythic ship mods are not ordinary purchases", () => {
  assert.equal(shipModOrdinaryPurchaseAllowed("standard"), true);
  assert.equal(shipModOrdinaryPurchaseAllowed("rare"), true);
  assert.equal(shipModOrdinaryPurchaseAllowed("epic"), true);
  assert.equal(shipModOrdinaryPurchaseAllowed("legendary"), false);
  assert.equal(shipModOrdinaryPurchaseAllowed("mythic"), false);
  assert.equal(SHIP_MOD_ACQUISITION_RULES.legendary.exceptionalSourceRequired, true);
  assert.equal(SHIP_MOD_ACQUISITION_RULES.mythic.exceptionalSourceRequired, true);
});

test("every current ship mod has a valid rarity and real mechanical purpose", () => {
  for (const mod of Object.values(SHIP_MODS)) {
    const result = validateShipModProgression(mod);
    assert.equal(result.ok, true, `${mod.id}: ${result.errors.join(", ")}`);
  }
});

test("rarity level gates are enforced", () => {
  const rare = { data: { rarity: "rare", minShipLevel: 3 } };
  assert.equal(shipModAvailableAtLevel(rare, 2), false);
  assert.equal(shipModAvailableAtLevel(rare, 3), true);
  const epic = { data: { rarity: "epic", minShipLevel: 7 } };
  assert.equal(shipModAvailableAtLevel(epic, 6), false);
  assert.equal(shipModAvailableAtLevel(epic, 7), true);
  const mythic = { data: { rarity: "mythic", minShipLevel: 17 } };
  assert.equal(shipModAvailableAtLevel(mythic, 16), false);
  assert.equal(shipModAvailableAtLevel(mythic, 17), true);
});

test("upgrade-chain mods replace their predecessor and inherit its slot", () => {
  const mod = {
    id: "aether-bound-ribbing",
    data: { rarity: "rare", minShipLevel: 3, upgradeChain: { requiresMods: ["reinforced-structural-ribbing"] } },
    effects: [{ target: "hullIntegrity", mode: "add", value: 30 }]
  };
  assert.equal(shipModPrerequisitesMet(mod, []), false);
  assert.equal(shipModPrerequisitesMet(mod, ["reinforced-structural-ribbing"]), true);
  assert.equal(shipModInstallEligibility(mod, { shipLevel: 3, installedModIds: [] }).ok, false);
  assert.equal(shipModInstallEligibility(mod, { shipLevel: 3, installedModIds: ["reinforced-structural-ribbing"] }).ok, true);
  assert.deepEqual(shipModUpgradeReplacement(mod), { mode: "replace", replaces: ["reinforced-structural-ribbing"], inheritsSlot: true });
  assert.equal(validateShipModProgression(mod).ok, true);
});

test("two-mod synergies mean two total fittings and three-mod sets are epic plus", () => {
  assert.equal(SHIP_MOD_SYNERGY_RULES.normalTotalMods, 2);
  assert.equal(SHIP_MOD_SYNERGY_RULES.epicPlusSetBonusTotalMods, 3);

  const epic = {
    id: "battlewake-control-fins",
    data: {
      rarity: "epic",
      minShipLevel: 7,
      synergies: [
        { id: "battlewake-drive-suite", requiresMods: ["reinforced-void-sails"], effects: [{ target: "combatSpeed", mode: "add", value: 1 }] },
        { id: "battlewake-grand-suite", requiresMods: ["reinforced-void-sails", "arc-conduit-stabilizers"], effects: [{ target: "maneuverability", mode: "add", value: 1 }] }
      ]
    },
    capabilities: ["battlewake-control"]
  };
  assert.equal(activeShipModSynergies(epic, []).length, 0);
  assert.equal(activeShipModSynergies(epic, ["reinforced-void-sails"]).length, 1);
  assert.equal(activeShipModSynergies(epic, ["reinforced-void-sails", "arc-conduit-stabilizers"]).length, 2);
  assert.equal(validateShipModProgression(epic).ok, true);

  const rareThreePiece = {
    id: "too-early-set",
    data: { rarity: "rare", minShipLevel: 3, synergies: [{ id: "too-early", requiresMods: ["a", "b"], effects: [{ target: "armorClass", mode: "add", value: 1 }] }] },
    capabilities: ["set-piece"]
  };
  assert.ok(validateShipModProgression(rareThreePiece).errors.includes("three-mod-synergy-below-epic"));
});

test("resistance mods use explicit PF2e-style values and may be conditional", () => {
  const mod = {
    id: "stormglass-grounding-web",
    data: { rarity: "rare", minShipLevel: 3, effectFamily: "resistance", resistances: [{ type: "electricity", value: 5 }, { type: "fire", value: 5, condition: "while Lifeveil is online" }] }
  };
  assert.equal(validateShipModProgression(mod).ok, true);

  const bad = { id: "bad-resistance", data: { rarity: "rare", minShipLevel: 3, effectFamily: "resistance", resistances: [{ type: "electricity", value: 0 }] } };
  assert.ok(validateShipModProgression(bad).errors.includes("invalid-resistance-value"));
});

test("mythic core-rule exceptions must be bounded", () => {
  const invalid = { id: "mythic-unbounded", data: { rarity: "mythic", minShipLevel: 17, coreRuleException: { rule: "ignore-strain" } }, capabilities: ["mythic-rule-change"] };
  assert.ok(validateShipModProgression(invalid).errors.includes("unbounded-mythic-rule-exception"));
  const valid = { id: "mythic-bounded", data: { rarity: "mythic", minShipLevel: 17, coreRuleException: { rule: "ignore-strain-threshold", usage: "once-per-event" } }, capabilities: ["mythic-rule-change"] };
  assert.equal(validateShipModProgression(valid).ok, true);
});

test("detection-family mods are differentiated by capability identity", () => {
  assert.ok(SHIP_MODS["lookout-spire"].capabilities.includes("battlewatch-immediate-threat-spotting"));
  assert.ok(SHIP_MODS["detection-spire"].capabilities.includes("navigator-anomaly-detection"));
  assert.ok(SHIP_MODS["void-scout-observation-spire"].capabilities.includes("long-range-route-scouting"));
  assert.ok(SHIP_MODS["longwatch-lookout-platform"].capabilities.includes("sustained-watch"));
});
