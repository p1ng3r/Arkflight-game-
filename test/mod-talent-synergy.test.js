import test from "node:test";
import assert from "node:assert/strict";

import { createShip } from "../src/ship/ship-schema.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { ACTIVE_SHIP_MODS } from "../src/content/ship-mod-catalog.js";
import { ARKENGINE_MODS } from "../src/content/arkengine-mod-catalog.js";
import { SHIP_TALENTS } from "../src/content/ship-talents.js";
import { activeModTalentSynergies, ruleModifierTotal } from "../src/ship/mod-talent-synergy.js";

function vessel({ level = 8, talents = [], shipMods = [], arkengineMods = [] } = {}) {
  return createShip({
    hull: { chassisId: "galleon", patternId: "standard" },
    arkengine: { chassisId: "furnaceheart-drive", patternId: "standard", modIds: arkengineMods },
    shipMods,
    progression: { level, xp: 0, talentIds: talents, arkcraftUpgrades: {} }
  });
}

function interactionDelta({ stat, talent, shipMod = null, arkengineMod = null, level = 8 }) {
  const mods = shipMod ? [shipMod] : [];
  const engineMods = arkengineMod ? [arkengineMod] : [];
  const base = deriveShip(vessel({ level }), SHIP_CATALOGS).stats[stat];
  const talentOnly = deriveShip(vessel({ level, talents: [talent] }), SHIP_CATALOGS).stats[stat];
  const modOnly = deriveShip(vessel({ level, shipMods: mods, arkengineMods: engineMods }), SHIP_CATALOGS).stats[stat];
  const together = deriveShip(vessel({ level, talents: [talent], shipMods: mods, arkengineMods: engineMods }), SHIP_CATALOGS).stats[stat];
  return together - talentOnly - modOnly + base;
}

test("every active mod advertises whole-ship Talent complements using valid Talent ids", () => {
  for (const mod of [...Object.values(ACTIVE_SHIP_MODS), ...Object.values(ARKENGINE_MODS)]) {
    assert.ok(mod.data.complementsTalents?.length > 0, `${mod.id} should advertise Talent complements`);
    for (const id of mod.data.complementsTalents) assert.ok(SHIP_TALENTS[id], `${mod.id} references unknown Talent ${id}`);
    assert.equal(mod.data.requiresTalent, undefined, `${mod.id} must not hard-require a Talent`);
  }
});

test("standard fittings stay simple while rare+ fittings gain optional Talent synergy hooks", () => {
  for (const mod of [...Object.values(ACTIVE_SHIP_MODS), ...Object.values(ARKENGINE_MODS)]) {
    const rarity = mod.data.rarity;
    if (rarity === "standard") assert.equal(mod.data.talentSynergies.length, 0, `${mod.id} standard fitting should stay simple`);
    else if (["rare", "epic", "legendary", "mythic"].includes(rarity)) assert.ok(mod.data.talentSynergies.length > 0, `${mod.id} should have an optional Talent synergy`);
  }
});

test("Lifeveil hardware gains a real derived bonus only when its matching ship Talent is present", () => {
  const delta = interactionDelta({ stat: "lifeveilCapacity", talent: "reinforced-lifeveil", shipMod: "veil-harmonic-capacitors", level: 8 });
  assert.equal(delta, 5);

  const mod = ACTIVE_SHIP_MODS["veil-harmonic-capacitors"];
  assert.equal(activeModTalentSynergies(mod, []).length, 0);
  assert.ok(activeModTalentSynergies(mod, ["reinforced-lifeveil"]).some((entry) => entry.label === "Veil Doctrine Link"));
});

test("Arkengine strain hardware complements the whole-ship Strain talent line", () => {
  const delta = interactionDelta({ stat: "strainCapacity", talent: "deep-strain-reserves", arkengineMod: "pressure-lattice-governor", level: 8 });
  assert.equal(delta, 1);

  const derived = deriveShip(vessel({ level: 8, talents: ["deep-strain-reserves"], arkengineMods: ["pressure-lattice-governor"] }), SHIP_CATALOGS);
  assert.ok(derived.capabilities.includes("talent-linked-strain-lattice"));
  assert.ok(derived.modTalentSynergies.some((entry) => entry.modId === "pressure-lattice-governor"));
});

test("battle hardware exposes conditional targeting support without adding permanent weapon accuracy", () => {
  const mod = ACTIVE_SHIP_MODS["battlewatch-augury-array"];
  const active = activeModTalentSynergies(mod, ["battle-trained"]);
  const modifiers = active.flatMap((entry) => entry.ruleModifiers ?? []);
  assert.equal(ruleModifierTotal(modifiers, "acquire-target-bonus"), 1);
  assert.equal(active.flatMap((entry) => entry.effects ?? []).some((effect) => effect.target === "weaponAttackBonus"), false);
});

test("mythic fittings keep their bounded rule exceptions while gaining Talent-aware complements", () => {
  const frame = ACTIVE_SHIP_MODS["eternity-worldroot-frame"];
  assert.equal(frame.name, "Eternity Worldroot Frame");
  assert.equal(frame.data.rarity, "mythic");
  assert.equal(frame.data.coreRuleException.rule, "hull-zero-survival");
  assert.ok(frame.data.complementsTalents.includes("ship-will-not-die"));
  assert.ok(frame.data.talentSynergies.length > 0);
});
