import test from "node:test";
import assert from "node:assert/strict";
import { ARKENGINE_MODS } from "../src/content/arkengine-mods.js";
import { SHIP_MODS } from "../src/content/ship-mods.js";
import { ARKENGINE_MOD_SLOT_CLASSES, SHIP_MOD_SLOT_CLASSES } from "../src/ship/refit-rules.js";

function assertWorkSpec(work, label) {
  assert.ok(work, `${label} work spec exists`);
  assert.ok(Number.isInteger(work.partsCost) && work.partsCost >= 0, `${label} partsCost`);
  assert.ok(Number.isInteger(work.timeHours) && work.timeHours >= 0, `${label} timeHours`);
  assert.ok(Number.isInteger(work.dc) && work.dc >= 0, `${label} dc`);
  assert.ok(Number.isInteger(work.shipyardGold) && work.shipyardGold >= 0, `${label} shipyardGold`);
}

function assertCatalog(catalog, family, validSlots) {
  assert.ok(Object.keys(catalog).length > 0);
  for (const [id, mod] of Object.entries(catalog)) {
    const spec = mod.data?.refit;
    assert.ok(spec, `${id} has refit metadata`);
    assert.equal(spec.family, family, `${id} family`);
    assert.ok(validSlots.includes(spec.slotClass), `${id} slotClass ${spec.slotClass}`);
    const compatibilityTier = mod.data.legacyRefitTier ?? mod.data.tier;
    assert.equal(spec.tier, compatibilityTier, `${id} tier mirrors legacy Refit tier`);
    assert.equal(spec.slotCost, mod.capacityCost, `${id} slot cost mirrors capacity cost`);
    assert.equal(spec.blueprintRequired, true, `${id} requires a blueprint to build`);
    assertWorkSpec(spec.build, `${id} build`);
    assertWorkSpec(spec.install, `${id} install`);
    assert.ok(spec.build.partsCost >= spec.install.partsCost, `${id} build costs at least as many Parts as installation`);
    assert.ok(spec.build.timeHours >= spec.install.timeHours, `${id} building is not faster than installation`);
    assert.ok(spec.build.dc >= spec.install.dc, `${id} build DC is not lower than install DC`);
  }
}

test("every Arkengine mod has complete explicit Refit Alpha metadata", () => {
  assertCatalog(ARKENGINE_MODS, "arkengineMod", ARKENGINE_MOD_SLOT_CLASSES);
});

test("every ship mod has complete explicit Refit Alpha metadata", () => {
  assertCatalog(SHIP_MODS, "shipMod", SHIP_MOD_SLOT_CLASSES);
});

test("representative mod families resolve to intended socket classes", () => {
  assert.equal(ARKENGINE_MODS["stormwake-injector"].data.refit.slotClass, "power");
  assert.equal(ARKENGINE_MODS["pressure-lattice-tuning"].data.refit.slotClass, "stability");
  assert.equal(ARKENGINE_MODS["veil-projector-focusing"].data.refit.slotClass, "lifeveil");
  assert.equal(ARKENGINE_MODS["cooling-loop-expansion"].data.refit.slotClass, "utility");

  assert.equal(SHIP_MODS["reinforced-ram-prow"].data.refit.slotClass, "weapon");
  assert.equal(SHIP_MODS["reinforced-structural-ribbing"].data.refit.slotClass, "structural");
  assert.equal(SHIP_MODS["reinforced-void-sails"].data.refit.slotClass, "rigging");
  assert.equal(SHIP_MODS["expanded-lifeveil-array"].data.refit.slotClass, "lifeveil");
  assert.equal(SHIP_MODS["expanded-cargo-lattice"].data.refit.slotClass, "support");
  assert.equal(SHIP_MODS["void-anchor-array"].data.refit.slotClass, "utility");
});
