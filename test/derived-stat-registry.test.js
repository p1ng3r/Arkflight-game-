import test from "node:test";
import assert from "node:assert/strict";
import { SHIP_CATALOGS } from "../src/content/index.js";
import {
  DERIVED_STAT_REGISTRY,
  EFFECT_TARGET_PATHS,
  assertCanonicalEffectTarget,
  createDefaultDerivedStats,
  isCanonicalEffectTarget,
  validateComponentEffectTargets
} from "../src/ship/derived-stat-registry.js";

test("canonical derived stat registry owns the core ship stat vocabulary", () => {
  for (const path of [
    "armorClass", "hullIntegrity", "lifeveilCapacity", "strainCapacity", "cargoCapacity",
    "detection", "combatSpeed", "maneuverability", "roomCapacity", "shipModCapacity",
    "arkengineModCapacity", "supplyCapacity", "moraleCapacity", "arkengineFuelSlots",
    "hardBurnStrainCost", "voyageSpeedTravelHexDays", "crew.minimum", "crew.recommended", "crew.maximum"
  ]) {
    assert.ok(DERIVED_STAT_REGISTRY[path], `${path} is registered`);
  }
});

test("structured derived values are registered but cannot be overwritten by generic component effects", () => {
  for (const path of ["crew", "weaponMounts", "physicalResistances"]) {
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
