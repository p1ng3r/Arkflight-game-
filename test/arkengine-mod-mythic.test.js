import test from "node:test";
import assert from "node:assert/strict";
import { ARKENGINE_MODS } from "../src/content/arkengine-mod-catalog.js";
import { arkengineModAlphaTarget, arkengineModUpgradeReplacement, validateArkengineModProgression } from "../src/ship/arkengine-mod-rarity.js";

test("Mythic Arkengine catalog is inside its locked Alpha band", () => {
  const mythic = Object.values(ARKENGINE_MODS).filter((mod) => mod.data.rarity === "mythic");
  const target = arkengineModAlphaTarget("mythic");
  assert.equal(mythic.length, 5);
  assert.ok(mythic.length >= target.min);
  assert.ok(mythic.length <= target.max);
});

test("every Mythic Arkengine Mod passes progression validation and has a bounded rule exception", () => {
  const mythic = Object.values(ARKENGINE_MODS).filter((mod) => mod.data.rarity === "mythic");
  for (const mod of mythic) {
    const result = validateArkengineModProgression(mod);
    assert.equal(result.ok, true, `${mod.id}: ${result.errors.join(", ")}`);
    const exception = mod.data.coreRuleException;
    assert.ok(exception, `${mod.id} needs a Mythic core-rule exception`);
    assert.ok(exception.trigger, `${mod.id} exception needs a trigger`);
    assert.ok(exception.usage, `${mod.id} exception needs usage`);
    assert.ok(exception.limit, `${mod.id} exception needs a limit`);
  }
});

test("Mythic Arkengine upgrades replace Legendary predecessors and inherit their slots", () => {
  const expected = {
    "singularity-worldheart-dynamo": "worldheart-pressure-dynamo",
    "firmament-veil-heart": "aegis-sun-veil-reactor",
    "crown-of-the-first-burn": "crown-of-the-sovereign-burn",
    "godspark-emergency-nexus": "archon-overburn-forge",
    "saintfire-eternity-reliquary": "saintfire-fuel-reliquary"
  };
  for (const [id, predecessor] of Object.entries(expected)) {
    const replacement = arkengineModUpgradeReplacement(ARKENGINE_MODS[id]);
    assert.deepEqual(replacement, { mode: "replace", replaces: [predecessor], inheritsSlot: true });
  }
});

test("Mythic Arkengine exceptions cover the approved campaign-defining engine behaviors", () => {
  assert.equal(ARKENGINE_MODS["godspark-emergency-nexus"].data.coreRuleException.rule, "operate-disabled-arkengine");
  assert.equal(ARKENGINE_MODS["crown-of-the-first-burn"].data.coreRuleException.rule, "hard-burn-without-base-strain-cost");
  assert.equal(ARKENGINE_MODS["singularity-worldheart-dynamo"].data.coreRuleException.rule, "suppress-one-arkengine-area-threshold-degradation");
  assert.equal(ARKENGINE_MODS["firmament-veil-heart"].data.coreRuleException.rule, "sustain-lifeveil-with-disabled-arkengine");
  assert.equal(ARKENGINE_MODS["saintfire-eternity-reliquary"].data.coreRuleException.rule, "waive-one-authored-engine-fuel-requirement");
});

test("Mythic fuel behavior remains an authored hook and does not create universal fuel consumption", () => {
  const reliquary = ARKENGINE_MODS["saintfire-eternity-reliquary"];
  assert.ok(reliquary.data.fuelHooks.some((hook) => hook.kind === "fuel-memory"));
  assert.match(reliquary.data.coreRuleException.limit, /does not create fuel|universal fuel-consumption rule/i);
});
