import test from "node:test";
import assert from "node:assert/strict";
import { ARKENGINE_MODS } from "../src/content/arkengine-mod-catalog.js";
import {
  ARKENGINE_MOD_RARITIES,
  ARKENGINE_MOD_RARITY_RULES,
  ARKENGINE_MOD_EFFECT_FAMILIES,
  ARKENGINE_MOD_SYNERGY_RULES,
  arkengineModAlphaTarget,
  arkengineModAvailableAtLevel,
  arkengineModUpgradeReplacement,
  activeArkengineModSynergies,
  validateArkengineModProgression
} from "../src/ship/arkengine-mod-rarity.js";

test("Arkengine Mod rarity ladder and level gates are locked", () => {
  assert.deepEqual(ARKENGINE_MOD_RARITIES, ["standard", "rare", "epic", "legendary", "mythic"]);
  assert.equal(ARKENGINE_MOD_RARITY_RULES.standard.minShipLevel, 1);
  assert.equal(ARKENGINE_MOD_RARITY_RULES.rare.minShipLevel, 3);
  assert.equal(ARKENGINE_MOD_RARITY_RULES.epic.minShipLevel, 7);
  assert.equal(ARKENGINE_MOD_RARITY_RULES.legendary.minShipLevel, 12);
  assert.equal(ARKENGINE_MOD_RARITY_RULES.mythic.minShipLevel, 17);
});

test("Arkengine Mod Alpha density targets are locked", () => {
  assert.deepEqual(arkengineModAlphaTarget("standard"), { min: 18, max: 22 });
  assert.deepEqual(arkengineModAlphaTarget("rare"), { min: 14, max: 16 });
  assert.deepEqual(arkengineModAlphaTarget("epic"), { min: 10, max: 12 });
  assert.deepEqual(arkengineModAlphaTarget("legendary"), { min: 7, max: 8 });
  assert.deepEqual(arkengineModAlphaTarget("mythic"), { min: 4, max: 5 });
});

for (const rarity of ["standard", "rare", "epic", "legendary"]) {
  test(`${rarity} Arkengine Mod catalog is inside its locked Alpha band`, () => {
    const mods = Object.values(ARKENGINE_MODS).filter((mod) => mod.data.rarity === rarity);
    const target = arkengineModAlphaTarget(rarity);
    assert.ok(mods.length >= target.min, `only ${mods.length} ${rarity} Arkengine Mods`);
    assert.ok(mods.length <= target.max, `${mods.length} ${rarity} Arkengine Mods exceeds Alpha target`);
  });
}

test("every current Arkengine Mod has a valid rarity and real mechanical purpose", () => {
  for (const mod of Object.values(ARKENGINE_MODS)) {
    const result = validateArkengineModProgression(mod);
    assert.equal(result.ok, true, `${mod.id}: ${result.errors.join(", ")}`);
  }
});

test("Arkengine Mod identity remains engine-linked", () => {
  for (const family of ["power-output", "strain", "hard-burn", "fuel", "lifeveil", "cooling", "stability", "travel-speed", "emergency-power"]) {
    assert.ok(ARKENGINE_MOD_EFFECT_FAMILIES.includes(family));
  }
  assert.equal(ARKENGINE_MODS["hard-burn-governor"].data.effectFamily, "hard-burn");
  assert.equal(ARKENGINE_MODS["cooling-loop-expansion"].data.effectFamily, "cooling");
  assert.equal(ARKENGINE_MODS["lifeveil-harmonic-prism"].data.effectFamily, "lifeveil");
});

test("fuel remains authored hooks rather than a mandatory subsystem", () => {
  assert.deepEqual(ARKENGINE_MODS["fuel-matrix-efficiency"].data.fuelHooks, [{ kind: "fuel-efficiency" }]);
  assert.deepEqual(ARKENGINE_MODS["refined-fuel-siphons"].data.fuelHooks, [{ kind: "fuel-capacity", value: 1 }]);
  assert.deepEqual(ARKENGINE_MODS["refined-fuel-matrix"].data.fuelHooks, [{ kind: "fuel-efficiency", value: 2 }]);
  assert.deepEqual(ARKENGINE_MODS["deep-reserve-fuel-siphons"].data.fuelHooks, [{ kind: "fuel-capacity", value: 2 }, { kind: "reserve-fuel-access", value: 1 }]);
  assert.ok(ARKENGINE_MODS["consecrated-fuel-crucible"].data.fuelHooks.some((hook) => hook.kind === "ritual-fuel-conversion"));
  assert.ok(ARKENGINE_MODS["saintfire-fuel-reliquary"].data.fuelHooks.some((hook) => hook.kind === "fuel-efficiency"));
});

test("Rare Arkengine band includes direct upgrades and cross-family synergies", () => {
  assert.deepEqual(ARKENGINE_MODS["pressure-lattice-governor"].data.upgradeChain.requiresArkengineMods, ["pressure-lattice-tuning"]);
  assert.deepEqual(ARKENGINE_MODS["precision-hard-burn-governor"].data.upgradeChain.requiresArkengineMods, ["hard-burn-governor"]);
  assert.equal(ARKENGINE_MODS["stormwake-twin-injectors"].data.synergies[0].requiresShipMods[0], "stormproof-void-sails");
  assert.equal(ARKENGINE_MODS["prismatic-lifeveil-feed"].data.synergies[0].requiresShipMods[0], "veil-harmonic-capacitors");
  assert.equal(ARKENGINE_MODS["silent-hushglass-shroud"].data.synergies[0].requiresShipMods[0], "occult-signal-refractors");
});

test("Epic Arkengine band changes play and includes three-component sets", () => {
  assert.equal(Object.values(ARKENGINE_MODS).filter((mod) => mod.data.rarity === "epic").length, 10);
  assert.deepEqual(ARKENGINE_MODS["harmonic-pressure-dynamo"].data.upgradeChain.requiresArkengineMods, ["pressure-lattice-governor"]);
  assert.ok(ARKENGINE_MODS["tempest-triad-injectors"].effects.some((effect) => effect.target === "combatSpeed"));
  assert.equal(ARKENGINE_MODS["tempest-triad-injectors"].data.synergies[0].requiresShipMods.length, 2);
  assert.equal(ARKENGINE_MODS["phoenix-overburn-chamber"].data.synergies[0].requiresArkengineMods.length, 1);
  assert.equal(ARKENGINE_MODS["phoenix-overburn-chamber"].data.synergies[0].requiresShipMods.length, 1);
  assert.ok(ARKENGINE_MODS["sovereign-hard-burn-governor"].effects.some((effect) => effect.target === "hardBurnStrainCost"));
});

test("Legendary Arkengine band is build-defining without Mythic core-rule exceptions", () => {
  const legendary = Object.values(ARKENGINE_MODS).filter((mod) => mod.data.rarity === "legendary");
  assert.equal(legendary.length, 8);
  assert.deepEqual(ARKENGINE_MODS["worldheart-pressure-dynamo"].data.upgradeChain.requiresArkengineMods, ["harmonic-pressure-dynamo"]);
  assert.ok(ARKENGINE_MODS["aegis-sun-veil-reactor"].effects.some((effect) => effect.target === "lifeveilCapacity"));
  assert.equal(ARKENGINE_MODS["aegis-sun-veil-reactor"].data.synergies[0].requiresShipMods.length, 2);
  assert.ok(ARKENGINE_MODS["thunderlord-tempest-injectors"].effects.some((effect) => effect.target === "combatSpeed"));
  assert.ok(ARKENGINE_MODS["crown-of-the-sovereign-burn"].effects.some((effect) => effect.target === "hardBurnStrainCost"));
  assert.ok(ARKENGINE_MODS["archon-overburn-forge"].data.synergies[0].requiresArkengineMods.includes("winterstar-recirculation-crown"));
  assert.ok(legendary.every((mod) => !mod.data.coreRuleException));
});

test("Arkengine upgrade chains replace predecessors and inherit their slot", () => {
  const mod = {
    id: "rare-governor",
    data: { rarity: "rare", minShipLevel: 3, effectFamily: "hard-burn", upgradeChain: { requiresArkengineMods: ["hard-burn-governor"] } },
    capabilities: ["rare-governed-burn"]
  };
  assert.deepEqual(arkengineModUpgradeReplacement(mod), { mode: "replace", replaces: ["hard-burn-governor"], inheritsSlot: true });
  assert.equal(validateArkengineModProgression(mod).ok, true);
});

test("Arkengine synergies may include Ship Mods and three-component sets begin at Epic", () => {
  assert.equal(ARKENGINE_MOD_SYNERGY_RULES.shipModCrossSynergyAllowed, true);
  const epic = {
    id: "epic-drive-governor",
    data: { rarity: "epic", minShipLevel: 7, effectFamily: "hard-burn", synergies: [{ id: "racing-drive-triad", requiresArkengineMods: ["quickspark-injectors"], requiresShipMods: ["black-tide-racing-sails"], effects: [{ target: "combatSpeed", mode: "add", value: 1 }] }] },
    capabilities: ["epic-drive-governor"]
  };
  assert.equal(activeArkengineModSynergies(epic, { installedArkengineModIds: ["quickspark-injectors"], installedShipModIds: ["black-tide-racing-sails"] }).length, 1);
  assert.equal(validateArkengineModProgression(epic).ok, true);

  const rare = {
    id: "rare-illegal-set",
    data: { rarity: "rare", minShipLevel: 3, effectFamily: "hard-burn", synergies: [{ id: "too-early", requiresArkengineMods: ["a"], requiresShipMods: ["b"], effects: [{ target: "combatSpeed", mode: "add", value: 1 }] }] },
    capabilities: ["bad-set"]
  };
  assert.ok(validateArkengineModProgression(rare).errors.includes("three-mod-synergy-below-epic"));
});

test("Mythic Arkengine core-rule exceptions must be bounded", () => {
  const invalid = { id: "unbounded-core", data: { rarity: "mythic", minShipLevel: 17, effectFamily: "emergency-power", coreRuleException: { rule: "ignore-disabled-arkengine" } }, capabilities: ["mythic-power"] };
  assert.ok(validateArkengineModProgression(invalid).errors.includes("unbounded-mythic-rule-exception"));
  const valid = { id: "bounded-core", data: { rarity: "mythic", minShipLevel: 17, effectFamily: "emergency-power", coreRuleException: { rule: "operate-disabled-arkengine", usage: "once-per-event", cost: "+3 Strain" } }, capabilities: ["mythic-power"] };
  assert.equal(validateArkengineModProgression(valid).ok, true);
});

test("Arkengine level gates are enforced", () => {
  assert.equal(arkengineModAvailableAtLevel({ data: { rarity: "rare", minShipLevel: 3 } }, 2), false);
  assert.equal(arkengineModAvailableAtLevel({ data: { rarity: "rare", minShipLevel: 3 } }, 3), true);
});
