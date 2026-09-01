import test from "node:test";
import assert from "node:assert/strict";
import { ARKENGINE_MODS } from "../src/content/arkengine-mods.js";
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

test("baseline Standard Arkengine Mod catalog is inside its locked Alpha band", () => {
  const standard = Object.values(ARKENGINE_MODS).filter((mod) => mod.data.rarity === "standard");
  const target = arkengineModAlphaTarget("standard");
  assert.ok(standard.length >= target.min, `only ${standard.length} Standard Arkengine Mods`);
  assert.ok(standard.length <= target.max, `${standard.length} Standard Arkengine Mods exceeds Alpha target`);
});

test("every baseline Arkengine Mod has a valid rarity and real mechanical purpose", () => {
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
});

test("Arkengine upgrade chains replace predecessors and inherit their slot", () => {
  const mod = {
    id: "rare-governor",
    data: {
      rarity: "rare",
      minShipLevel: 3,
      effectFamily: "hard-burn",
      upgradeChain: { requiresArkengineMods: ["hard-burn-governor"] }
    },
    capabilities: ["rare-governed-burn"]
  };
  assert.deepEqual(arkengineModUpgradeReplacement(mod), {
    mode: "replace",
    replaces: ["hard-burn-governor"],
    inheritsSlot: true
  });
  assert.equal(validateArkengineModProgression(mod).ok, true);
});

test("Arkengine synergies may include Ship Mods and three-component sets begin at Epic", () => {
  assert.equal(ARKENGINE_MOD_SYNERGY_RULES.shipModCrossSynergyAllowed, true);
  const epic = {
    id: "epic-drive-governor",
    data: {
      rarity: "epic",
      minShipLevel: 7,
      effectFamily: "hard-burn",
      synergies: [{
        id: "racing-drive-triad",
        requiresArkengineMods: ["quickspark-injectors"],
        requiresShipMods: ["black-tide-racing-sails"],
        effects: [{ target: "combatSpeed", mode: "add", value: 1 }]
      }]
    },
    capabilities: ["epic-drive-governor"]
  };
  assert.equal(activeArkengineModSynergies(epic, {
    installedArkengineModIds: ["quickspark-injectors"],
    installedShipModIds: ["black-tide-racing-sails"]
  }).length, 1);
  assert.equal(validateArkengineModProgression(epic).ok, true);

  const rare = {
    id: "rare-illegal-set",
    data: {
      rarity: "rare",
      minShipLevel: 3,
      effectFamily: "hard-burn",
      synergies: [{
        id: "too-early",
        requiresArkengineMods: ["a"],
        requiresShipMods: ["b"],
        effects: [{ target: "combatSpeed", mode: "add", value: 1 }]
      }]
    },
    capabilities: ["bad-set"]
  };
  assert.ok(validateArkengineModProgression(rare).errors.includes("three-mod-synergy-below-epic"));
});

test("Mythic Arkengine core-rule exceptions must be bounded", () => {
  const invalid = {
    id: "unbounded-core",
    data: { rarity: "mythic", minShipLevel: 17, effectFamily: "emergency-power", coreRuleException: { rule: "ignore-disabled-arkengine" } },
    capabilities: ["mythic-power"]
  };
  assert.ok(validateArkengineModProgression(invalid).errors.includes("unbounded-mythic-rule-exception"));

  const valid = {
    id: "bounded-core",
    data: { rarity: "mythic", minShipLevel: 17, effectFamily: "emergency-power", coreRuleException: { rule: "operate-disabled-arkengine", usage: "once-per-event", cost: "+3 Strain" } },
    capabilities: ["mythic-power"]
  };
  assert.equal(validateArkengineModProgression(valid).ok, true);
});

test("Arkengine level gates are enforced", () => {
  assert.equal(arkengineModAvailableAtLevel({ data: { rarity: "rare", minShipLevel: 3 } }, 2), false);
  assert.equal(arkengineModAvailableAtLevel({ data: { rarity: "rare", minShipLevel: 3 } }, 3), true);
});
