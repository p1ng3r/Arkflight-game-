import test from "node:test";
import assert from "node:assert/strict";
import { SHIP_CATALOGS } from "../src/content/index.js";
import {
  DERIVED_STAT_REGISTRY,
  EFFECT_TARGET_PATHS,
  assertCanonicalEffectTarget,
  createDefaultDerivedStats,
  deriveResistanceProfile,
  derivedStatsByPresentation,
  isCanonicalEffectTarget,
  normalizeDerivedStats,
  validateComponentEffectTargets
} from "../src/ship/derived-stat-registry.js";

test("canonical derived stat registry owns the core ship stat vocabulary", () => {
  for (const path of [
    "armorClass", "hullIntegrity", "lifeveilCapacity", "strainCapacity", "cargoCapacity",
    "detection", "combatSpeed", "maneuverability", "roomCapacity", "shipModCapacity",
    "arkengineModCapacity", "supplyCapacity", "moraleCapacity", "arkengineFuelSlots",
    "hardBurnStrainCost", "voyageSpeedTravelHexDays", "crew.minimum", "crew.recommended", "crew.maximum"
  ]) assert.ok(DERIVED_STAT_REGISTRY[path], `${path} is registered`);
});

test("structured derived values are registered but cannot be overwritten by generic component effects", () => {
  for (const path of ["crew", "weaponMounts", "physicalResistances", "resistances"]) {
    assert.ok(DERIVED_STAT_REGISTRY[path], `${path} is registered`);
    assert.equal(isCanonicalEffectTarget(path), false, `${path} is not a generic effect target`);
  }
});

test("default derived stats are created from the registry", () => {
  const defaults = createDefaultDerivedStats();
  assert.equal(defaults.armorClass, 0);
  assert.equal(defaults.hullIntegrity, 0);
  assert.deepEqual(defaults.crew, { minimum: 0, recommended: 0, maximum: 0 });
  assert.deepEqual(defaults.weaponMounts, {});
  assert.deepEqual(defaults.physicalResistances, { bludgeoning: 0, piercing: 0, slashing: 0 });
  assert.deepEqual(defaults.resistances, { values: {}, conditional: [] });
});

test("every authored component effect targets a canonical derived stat", () => {
  for (const [catalogName, catalog] of Object.entries(SHIP_CATALOGS)) {
    for (const component of Object.values(catalog ?? {})) {
      const result = validateComponentEffectTargets(component);
      assert.equal(result.ok, true, `${catalogName}/${component.id}: unknown targets ${result.invalidTargets.join(", ")}`);
    }
  }
});

test("unknown derived stat effect targets fail loudly", () => {
  assert.equal(EFFECT_TARGET_PATHS.includes("combatSpeed"), true);
  assert.equal(isCanonicalEffectTarget("combatSpeeed"), false);
  assert.throws(() => assertCanonicalEffectTarget("combatSpeeed"), /Unknown Arkflight derived-stat effect target/);
});

test("presentation groups keep primary operational and technical stats distinct", () => {
  const primary = derivedStatsByPresentation("primary").map((entry) => entry.path);
  const operational = derivedStatsByPresentation("operational").map((entry) => entry.path);
  const technical = derivedStatsByPresentation("technical").map((entry) => entry.path);
  for (const path of ["armorClass", "hullIntegrity", "lifeveilCapacity", "strainCapacity", "cargoCapacity", "detection", "combatSpeed", "maneuverability"]) assert.ok(primary.includes(path));
  for (const path of ["hardness", "weaponAttackBonus", "supplyCapacity", "moraleCapacity", "resistances"]) assert.ok(operational.includes(path));
  for (const path of ["repairTimePercent", "actionBonus", "reactionBonus", "arkengineFuelSlots"]) assert.ok(technical.includes(path));
});

test("final stat floors prevent negative capacities while preserving meaningful negative modifiers", () => {
  const normalized = normalizeDerivedStats({
    hullIntegrity: -50, lifeveilCapacity: -10, strainCapacity: -2, cargoCapacity: -1,
    combatSpeed: -3, hardBurnStrainCost: -4, detection: -2, maneuverability: -3
  });
  assert.equal(normalized.hullIntegrity, 0);
  assert.equal(normalized.lifeveilCapacity, 0);
  assert.equal(normalized.strainCapacity, 0);
  assert.equal(normalized.cargoCapacity, 0);
  assert.equal(normalized.combatSpeed, 0);
  assert.equal(normalized.hardBurnStrainCost, 0);
  assert.equal(normalized.detection, -2);
  assert.equal(normalized.maneuverability, -3);
});

test("canonical resistance profile takes the strongest unconditional value and preserves conditions separately", () => {
  const profile = deriveResistanceProfile(
    { bludgeoning: 4, piercing: 3, slashing: 0 },
    [
      { id: "fire-shell", data: { resistances: [{ type: "fire", value: 10 }, { type: "piercing", value: 5 }] } },
      { id: "veil-refractor", data: { resistances: [{ type: "fire", value: 15, condition: "while Lifeveil is online" }, { type: "force", value: 5 }] } }
    ]
  );
  assert.deepEqual(profile.values, { bludgeoning: 4, piercing: 5, fire: 10, force: 5 });
  assert.deepEqual(profile.conditional, [{ type: "fire", value: 15, condition: "while Lifeveil is online", sourceId: "veil-refractor" }]);
});
